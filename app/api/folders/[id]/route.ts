import { supabaseAdmin } from "@/lib/supabase/server";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";
import { renameFolderById } from "@/lib/db/rename-folder";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const g = await guard();
  if (!g.authed) return g.response;
  try {
    const db = supabaseAdmin();
    const { data, error } = await db.from("folders").select("*").eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!data || data.is_trashed) return fail("FOLDER_NOT_FOUND", "Folder could not be found.", 404);
    return ok({ folder: data });
  } catch (e) {
    const u = toUserError(e);
    return fail(u.code, u.message, u.status);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  return renameFolderById(req, params.id);
}
