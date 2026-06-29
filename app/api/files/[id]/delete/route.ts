import { supabaseAdmin } from "@/lib/supabase/server";
import { driveTrash } from "@/lib/google-drive/client";
import { logActivity } from "@/lib/db/activity";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";

type Ctx = { params: { id: string } };

// DELETE /api/files/[id]/delete — soft delete: Drive trash + metadata flag (PRD §21)
export async function DELETE(_req: Request, { params }: Ctx) {
  const g = await guard();
  if (!g.authed) return g.response;
  try {
    const db = supabaseAdmin();
    const { data: file, error } = await db.from("files").select("*").eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!file || file.is_trashed) return fail("FILE_NOT_FOUND", "The requested file could not be found.", 404);

    await driveTrash(file.google_drive_id as string);
    const { error: uerr } = await db.from("files").update({ is_trashed: true }).eq("id", params.id);
    if (uerr) return fail("RECONCILE", "Trashed in Drive but metadata update failed. Run sync.", 500);
    await logActivity(file.id, "DELETE");
    return ok({ deleted: true });
  } catch (e) {
    const u = toUserError(e);
    return fail(u.code, u.message, u.status);
  }
}
