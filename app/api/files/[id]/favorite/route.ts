import { supabaseAdmin } from "@/lib/supabase/server";
import { logActivity } from "@/lib/db/activity";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";

type Ctx = { params: { id: string } };

// POST /api/files/[id]/favorite — toggle or set { favorite?: boolean }
export async function POST(req: Request, { params }: Ctx) {
  const g = await guard();
  if (!g.authed) return g.response;
  try {
    const body = await req.json().catch(() => ({}));
    const db = supabaseAdmin();
    const { data: file, error } = await db.from("files").select("*").eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!file || file.is_trashed) return fail("FILE_NOT_FOUND", "The requested file could not be found.", 404);
    const next = typeof body?.favorite === "boolean" ? body.favorite : !file.is_favorite;
    const { data: updated, error: uerr } = await db
      .from("files").update({ is_favorite: next }).eq("id", params.id).select().single();
    if (uerr) throw uerr;
    await logActivity(file.id, next ? "FAVORITE" : "UNFAVORITE");
    return ok({ file: updated });
  } catch (e) {
    const u = toUserError(e);
    return fail(u.code, u.message, u.status);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const g = await guard();
  if (!g.authed) return g.response;
  try {
    const db = supabaseAdmin();
    const { data: updated, error } = await db
      .from("files").update({ is_favorite: false }).eq("id", params.id).select().single();
    if (error) throw error;
    await logActivity(params.id, "UNFAVORITE");
    return ok({ file: updated });
  } catch (e) {
    const u = toUserError(e);
    return fail(u.code, u.message, u.status);
  }
}
