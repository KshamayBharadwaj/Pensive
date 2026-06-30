import { supabaseAdmin } from "@/lib/supabase/server";
import { driveCreateFolder } from "@/lib/google-drive/client";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";
import { folderNameSchema } from "@/lib/validation/schemas";

// GET /api/folders?parentId=&q=
export async function GET(req: Request) {
  const g = await guard();
  if (!g.authed) return g.response;
  try {
    const url = new URL(req.url);
    const parentId = url.searchParams.get("parentId");
    const q = url.searchParams.get("q") ?? undefined;
    const db = supabaseAdmin();
    let query = db.from("folders").select("*").eq("is_trashed", false).order("name", { ascending: true });
    if (q) query = query.ilike("name", `%${q}%`);
    else if (parentId) query = query.eq("parent_folder_id", parentId);
    else if (parentId === null && !q) query = query.is("parent_folder_id", null);
    const { data, error } = await query;
    if (error) throw error;
    return ok({ folders: data ?? [] });
  } catch (e) {
    const u = toUserError(e);
    return fail(u.code, u.message, u.status);
  }
}

// POST /api/folders { name, parentFolderId?: string | null }
