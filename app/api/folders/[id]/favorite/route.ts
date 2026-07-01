import { supabaseAdmin } from "@/lib/supabase/server";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";

type Ctx = { params: { id: string } };

export async function POST(req: Request, { params }: Ctx) {
  const g = await guard();
  if (!g.authed) return g.response;
  try {
    const body = await req.json().catch(() => ({}));
    const db = supabaseAdmin();
    const { data: folder, error } = await db.from("folders").select("*").eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!folder || folder.is_trashed) return fail("FOLDER_NOT_FOUND", "Folder could not be found.", 404);
    const next = typeof body?.favorite === "boolean" ? body.favorite : !folder.is_favorite;
    const { data: updated, error: uerr } = await db.from("folders").update({ is_favorite: next }).eq("id", params.id).select().single();
    if (uerr) throw uerr;
    return ok({ folder: updated });
  } catch (e) {
    const u = toUserError(e);
    return fail(u.code, u.message, u.status);
  }
}
