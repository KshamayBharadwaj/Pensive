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
export async function POST(req: Request) {
  const g = await guard();
  if (!g.authed) return g.response;
  try {
    const body = await req.json().catch(() => null);
    const parsed = folderNameSchema.safeParse(body?.name);
    if (!parsed.success) return fail("INVALID_INPUT", "Invalid folder name.", 400);
    const parentFolderId = (body?.parentFolderId as string | null) ?? null;
    const db = supabaseAdmin();

    let parentDriveId: string | null = null;
    if (parentFolderId) {
      const { data: parent } = await db.from("folders").select("id,google_drive_id").eq("id", parentFolderId).maybeSingle();
      if (!parent) return fail("FOLDER_NOT_FOUND", "Parent folder could not be found.", 404);
      parentDriveId = (parent.google_drive_id as string | null) ?? null;
    }

    const driveFolder = await driveCreateFolder(parsed.data, parentDriveId);
    const { data, error } = await db.from("folders").insert({
      google_drive_id: driveFolder.id,
      name: parsed.data,
      parent_folder_id: parentFolderId,
    }).select().single();
    if (error) return fail("METADATA_FAILED", "Created in Drive but failed to save metadata. It will appear after sync.", 500);
    return ok({ folder: data }, 201);
  } catch (e) {
    const u = toUserError(e);
    return fail(u.code, u.message, u.status);
  }
}
