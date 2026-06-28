import { supabaseAdmin } from "@/lib/supabase/server";
import { driveRename } from "@/lib/google-drive/client";
import { logActivity } from "@/lib/db/activity";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";
import { folderNameSchema } from "@/lib/validation/schemas";

type Ctx = { params: { id: string } };

// PATCH /api/files/[id]/rename { name }
export async function PATCH(req: Request, { params }: Ctx) {
  const g = await guard();
  if (!g.authed) return g.response;
  try {
    const body = await req.json().catch(() => null);
    const parsed = folderNameSchema.safeParse(body?.name);
    if (!parsed.success) return fail("INVALID_INPUT", "Invalid file name.", 400);
    const db = supabaseAdmin();
    const { data: file, error } = await db.from("files").select("*").eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!file || file.is_trashed) return fail("FILE_NOT_FOUND", "The requested file could not be found.", 404);

    await driveRename(file.google_drive_id as string, parsed.data);
    const { data: updated, error: uerr } = await db
      .from("files").update({ name: parsed.data, google_modified_at: new Date().toISOString() })
      .eq("id", params.id).select().single();
    if (uerr) {
      // Drive renamed but metadata failed → needs reconciliation
      return fail("RECONCILE", "Renamed in Drive but metadata update failed. Run sync to reconcile.", 500);
    }
    await logActivity(file.id, "RENAME");
    return ok({ file: updated });
  } catch (e) {
    const u = toUserError(e);
    return fail(u.code, u.message, u.status);
  }
}
