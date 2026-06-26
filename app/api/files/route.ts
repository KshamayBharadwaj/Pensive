import { supabaseAdmin } from "@/lib/supabase/server";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";
import { filesQuerySchema } from "@/lib/validation/schemas";
import { categorize } from "@/lib/utils/format";
import { recentFileIds } from "@/lib/db/activity";

const SORT_COL: Record<string, string> = {
  name: "name",
  modified: "google_modified_at",
  created: "google_created_at",
  size: "size",
  type: "mime_type",
};

// GET /api/files?folderId=&view=all|recent|favorites&sort=&order=&filter=&q=&page=&limit=
export async function GET(req: Request) {
  const g = await guard();
  if (!g.authed) return g.response;
  try {
    const url = new URL(req.url);
    const parsed = filesQuerySchema.safeParse({
      folderId: url.searchParams.get("folderId"),
      view: url.searchParams.get("view") ?? "all",
      sort: url.searchParams.get("sort") ?? "modified",
      order: url.searchParams.get("order") ?? "desc",
      filter: url.searchParams.get("filter") ?? "all",
      q: url.searchParams.get("q") ?? undefined,
      page: url.searchParams.get("page") ?? "1",
      limit: url.searchParams.get("limit") ?? "100",
    });
    if (!parsed.success) return fail("INVALID_INPUT", "Invalid query parameters.", 400);
    const q = parsed.data;
    const db = supabaseAdmin();

    // Folders in scope
    let folderQuery = db.from("folders").select("*").eq("is_trashed", false).order("name", { ascending: true });
    if (q.view !== "all") {
      // for recent/favorites views, folders listed separately (favorites only for favorites view)
      if (q.view === "favorites") folderQuery = folderQuery.eq("is_favorite", true);
      else folderQuery = folderQuery.limit(0);
    } else if (q.folderId) {
      folderQuery = folderQuery.eq("parent_folder_id", q.folderId);
    } else if (!q.q) {
      folderQuery = folderQuery.is("parent_folder_id", null);
    }
    if (q.q) {
      folderQuery = folderQuery.ilike("name", `%${q.q}%`);
    }
    const { data: folders, error: ferr } = await folderQuery;
    if (ferr) throw ferr;

    // Files
    let fileQuery = db.from("files").select("*", { count: "exact" }).eq("is_trashed", false);

    if (q.view === "favorites" || q.filter === "favorites") fileQuery = fileQuery.eq("is_favorite", true);
    if (q.view === "recent") {
      const ids = await recentFileIds(50);
      if (ids.length === 0) {
        fileQuery = fileQuery.order("google_modified_at", { ascending: false }).limit(50);
      } else {
        fileQuery = fileQuery.in("id", ids);
      }
    } else if (q.folderId) {
      fileQuery = fileQuery.eq("folder_id", q.folderId);
    } else if (!q.q) {
      fileQuery = fileQuery.is("folder_id", null);
    }
    if (q.q) fileQuery = fileQuery.ilike("name", `%${q.q}%`);

    const col = SORT_COL[q.sort] ?? "google_modified_at";
    fileQuery = fileQuery.order(col, { ascending: q.order === "asc", nullsFirst: false });

    const from = (q.page - 1) * q.limit;
    fileQuery = fileQuery.range(from, from + q.limit - 1);

    const { data: files, error: eerr, count } = await fileQuery;
    if (eerr) throw eerr;

    let filtered = files ?? [];
    if (q.filter !== "all" && q.filter !== "favorites") {
      filtered = filtered.filter((f) => categorize(f.mime_type, f.name) === q.filter);
    }
    // For recent view ordered by activity, keep Drive modified order as approximation + sort applied
    if (q.view === "recent") {
      const ids = await recentFileIds(50);
      const pos = new Map(ids.map((id, i) => [id, i]));
      filtered = [...filtered].sort((a, b) => (pos.get(a.id) ?? 999) - (pos.get(b.id) ?? 999));
    }

    return ok({
      folders: folders ?? [],
      files: filtered,
      page: q.page,
      limit: q.limit,
      total: count ?? filtered.length,
    });
  } catch (e) {
    const u = toUserError(e);
    return fail(u.code, u.message, u.status);
  }
}
