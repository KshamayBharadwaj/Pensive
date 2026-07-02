import { supabaseAdmin } from "@/lib/supabase/server";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";

// GET /api/search?q=&type=&limit= — metadata search only, never Drive per keystroke (PRD §17)
export async function GET(req: Request) {
  const g = await guard();
  if (!g.authed) return g.response;
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 200);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 100);
    if (!q) return ok({ files: [], folders: [] });
    // Basic validation: reject control characters / excessively odd input
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001F\u007F]/.test(q)) {
      return fail("INVALID_INPUT", "Invalid search term.", 400);
    }
    const db = supabaseAdmin();
    const like = `%${q}%`;
    const [{ data: files, error: ferr }, { data: folders, error: oerr }] = await Promise.all([
      db.from("files").select("*, folders!files_folder_id_fkey(id,name)").eq("is_trashed", false).ilike("name", like).order("google_modified_at", { ascending: false }).limit(limit),
      db.from("folders").select("*").eq("is_trashed", false).ilike("name", like).order("name").limit(20),
    ]);
    // Fallback when FK embedding name differs: files query without join
    if (ferr) {
      const { data: f2, error: e2 } = await db.from("files").select("*").eq("is_trashed", false).ilike("name", like).order("google_modified_at", { ascending: false }).limit(limit);
      if (e2) throw e2;
      return ok({ files: f2 ?? [], folders: folders ?? [] });
    }
    if (oerr) throw oerr;
    return ok({ files: files ?? [], folders: folders ?? [] });
  } catch (e) {
    const u = toUserError(e);
    return fail(u.code, u.message, u.status);
  }
}
