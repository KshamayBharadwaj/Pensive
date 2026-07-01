import { supabaseAdmin } from "@/lib/supabase/server";
import { driveMove } from "@/lib/google-drive/client";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";

type Ctx = { params: { id: string } };

// PATCH /api/folders/[id]/move { parentFolderId: string | null }
export async function PATCH(req: Request, { params }: Ctx) {
  const g = await guard();
  if (!g.authed) return g.response;
  try {
    const body = await req.json().catch(() => null);
    const parentFolderId = (body?.parentFolderId as string | null) ?? null;
    if (parentFolderId === params.id) return fail("INVALID_INPUT", "A folder cannot be moved into itself.", 400);
    const db = supabaseAdmin();
    const { data: folder, error } = await db.from("folders").select("*").eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!folder || folder.is_trashed) return fail("FOLDER_NOT_FOUND", "Folder could not be found.", 404);

    let newDriveParent: string | null = null;
    if (parentFolderId) {
      const { data: parent } = await db.from("folders").select("id,google_drive_id").eq("id", parentFolderId).maybeSingle();
      if (!parent) return fail("FOLDER_NOT_FOUND", "Target folder could not be found.", 404);
      newDriveParent = (parent.google_drive_id as string | null) ?? null;
    }
    if (folder.google_drive_id) {
      await driveMove(folder.google_drive_id as string, newDriveParent, (folder as { google_drive_id?: string }).google_drive_id ? undefined : undefined).catch(async () => {
        // fallback: move with explicit old parent lookup
        let oldDrive: string | undefined;
        if (folder.parent_folder_id) {
          const { data: old } = await db.from("folders").select("google_drive_id").eq("id", folder.parent_folder_id).maybeSingle();
          oldDrive = (old?.google_drive_id as string | null) ?? undefined;
        }
        const { driveMove: mv } = await import("@/lib/google-drive/client");
        await mv(folder.google_drive_id as string, newDriveParent, oldDrive);
      });
    }
    const { data: updated, error: uerr } = await db
      .from("folders").update({ parent_folder_id: parentFolderId }).eq("id", params.id).select().single();
    if (uerr) return fail("RECONCILE", "Moved in Drive but metadata update failed. Run sync.", 500);
    return ok({ folder: updated });
  } catch (e) {
    const u = toUserError(e);
    return fail(u.code, u.message, u.status);
  }
}
