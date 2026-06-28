import { supabaseAdmin } from "@/lib/supabase/server";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";
import { logActivity } from "@/lib/db/activity";

type Ctx = { params: { id: string } };

// GET /api/files/[id] — details + location path
export async function GET(_req: Request, { params }: Ctx) {
  const g = await guard();
  if (!g.authed) return g.response;
  try {
    const db = supabaseAdmin();
    const { data: file, error } = await db.from("files").select("*").eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!file || file.is_trashed) return fail("FILE_NOT_FOUND", "The requested file could not be found.", 404);

    // Build location breadcrumb
    const path: { id: string; name: string }[] = [];
    let folderId = file.folder_id as string | null;
    for (let i = 0; i < 20 && folderId; i++) {
      const { data: f } = await db.from("folders").select("id,name,parent_folder_id").eq("id", folderId).maybeSingle();
      if (!f) break;
      path.unshift({ id: f.id, name: f.name });
      folderId = f.parent_folder_id;
    }
    await logActivity(file.id, "OPEN");
    return ok({ file, path });
  } catch (e) {
    const u = toUserError(e);
    return fail(u.code, u.message, u.status);
  }
}
