import { supabaseAdmin } from "@/lib/supabase/server";
import { driveTrash } from "@/lib/google-drive/client";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";

type Ctx = { params: { id: string } };

// DELETE /api/folders/[id]/delete — refuse to silently trash non-empty folders (PRD §10)
export async function DELETE(req: Request, { params }: Ctx) {
  const g = await guard();
  if (!g.authed) return g.response;
  try {
    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";
    const db = supabaseAdmin();
    const { data: folder, error } = await db.from("folders").select("*").eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!folder || folder.is_trashed) return fail("FOLDER_NOT_FOUND", "Folder could not be found.", 404);

    const [{ count: fileCount }, { count: subCount }] = await Promise.all([
      db.from("files").select("id", { count: "exact", head: true }).eq("folder_id", params.id).eq("is_trashed", false),
      db.from("folders").select("id", { count: "exact", head: true }).eq("parent_folder_id", params.id).eq("is_trashed", false),
    ]);
    if (!force && ((fileCount ?? 0) > 0 || (subCount ?? 0) > 0)) {
      return fail("FOLDER_NOT_EMPTY", "Folder is not empty. Move or delete its contents first, or retry with force=true.", 409);
    }
    if (folder.google_drive_id) await driveTrash(folder.google_drive_id as string);
    await db.from("folders").update({ is_trashed: true }).eq("id", params.id);
    return ok({ deleted: true });
  } catch (e) {
    const u = toUserError(e);
    return fail(u.code, u.message, u.status);
  }
}
