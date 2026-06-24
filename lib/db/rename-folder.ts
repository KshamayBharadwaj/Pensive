import { supabaseAdmin } from "@/lib/supabase/server";
import { driveRename } from "@/lib/google-drive/client";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";
import { folderNameSchema } from "@/lib/validation/schemas";

export async function renameFolderById(req: Request, id: string) {
  const g = await guard();
  if (!g.authed) return g.response;
  try {
    const body = await req.json().catch(() => null);
    const parsed = folderNameSchema.safeParse(body?.name);
    if (!parsed.success) return fail("INVALID_INPUT", "Invalid folder name.", 400);
    const db = supabaseAdmin();
    const { data: folder, error } = await db.from("folders").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!folder || (folder as { is_trashed?: boolean }).is_trashed) return fail("FOLDER_NOT_FOUND", "Folder could not be found.", 404);
    if ((folder as { google_drive_id?: string | null }).google_drive_id) {
      await driveRename((folder as { google_drive_id: string }).google_drive_id, parsed.data);
    }
    const { data: updated, error: uerr } = await db.from("folders").update({ name: parsed.data }).eq("id", id).select().single();
    if (uerr) return fail("RECONCILE", "Renamed in Drive but metadata update failed. Run sync.", 500);
    return ok({ folder: updated });
  } catch (e) {
    const u = toUserError(e);
    return fail(u.code, u.message, u.status);
  }
}
