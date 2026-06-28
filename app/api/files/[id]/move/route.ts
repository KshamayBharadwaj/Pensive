import { supabaseAdmin } from "@/lib/supabase/server";
import { driveMove } from "@/lib/google-drive/client";
import { logActivity } from "@/lib/db/activity";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";

type Ctx = { params: { id: string } };

// PATCH /api/files/[id]/move { folderId: string | null }
export async function PATCH(req: Request, { params }: Ctx) {
  const g = await guard();
  if (!g.authed) return g.response;
  try {
    const body = await req.json().catch(() => null);
    const folderId = (body?.folderId as string | null | undefined) ?? null;
    const db = supabaseAdmin();
    const { data: file, error } = await db.from("files").select("*").eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!file || file.is_trashed) return fail("FILE_NOT_FOUND", "The requested file could not be found.", 404);

    let newDriveParent: string | null = null;
    let oldDriveParent: string | null = null;
    if (folderId) {
      const { data: folder } = await db.from("folders").select("id,google_drive_id").eq("id", folderId).maybeSingle();
      if (!folder) return fail("FOLDER_NOT_FOUND", "The target folder could not be found.", 404);
      newDriveParent = (folder.google_drive_id as string | null) ?? null;
    }
    if (file.folder_id) {
      const { data: old } = await db.from("folders").select("google_drive_id").eq("id", file.folder_id).maybeSingle();
      oldDriveParent = (old?.google_drive_id as string | null) ?? null;
    }

    await driveMove(file.google_drive_id as string, newDriveParent, oldDriveParent ?? undefined);
    const { data: updated, error: uerr } = await db
      .from("files").update({ folder_id: folderId }).eq("id", params.id).select().single();
    if (uerr) return fail("RECONCILE", "Moved in Drive but metadata update failed. Run sync to reconcile.", 500);
    await logActivity(file.id, "MOVE");
    return ok({ file: updated });
  } catch (e) {
    const u = toUserError(e);
    return fail(u.code, u.message, u.status);
  }
}
