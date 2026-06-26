import { supabaseAdmin } from "@/lib/supabase/server";
import { driveUpload } from "@/lib/google-drive/client";
import { logActivity } from "@/lib/db/activity";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST /api/files/upload  (multipart/form-data: files[], folderId?)
export async function POST(req: Request) {
  const g = await guard();
  if (!g.authed) return g.response;
  try {
    const form = await req.formData();
    const folderId = (form.get("folderId") as string | null) || null;
    const blobs = form.getAll("files").filter((v) => v instanceof File) as File[];
    const single = form.get("file");
    if (single instanceof File && blobs.length === 0) blobs.push(single);
    if (blobs.length === 0) return fail("NO_FILES", "No files provided.", 400);
    if (blobs.length > 20) return fail("TOO_MANY", "Upload at most 20 files at once.", 400);

    const db = supabaseAdmin();
    let folderDriveId: string | null = null;
    if (folderId) {
      const { data, error } = await db.from("folders").select("id,google_drive_id").eq("id", folderId).maybeSingle();
      if (error || !data) return fail("FOLDER_NOT_FOUND", "The target folder could not be found.", 404);
      folderDriveId = (data.google_drive_id as string | null) ?? null;
    }

    const uploaded = [];
    for (const f of blobs) {
      if (f.size > 500 * 1024 * 1024) {
        return fail("FILE_TOO_LARGE", `File ${f.name} exceeds 500 MB.`, 413);
      }
      const buf = Buffer.from(await f.arrayBuffer());
      // Drive upload FIRST — only create metadata on success (PRD §11)
      const driveFile = await driveUpload(f.name, f.type || "application/octet-stream", buf, folderDriveId);
      const { data, error } = await db.from("files").insert({
        google_drive_id: driveFile.id,
        name: driveFile.name,
        mime_type: driveFile.mimeType,
        size: driveFile.size ?? f.size,
        folder_id: folderId,
        google_created_at: driveFile.createdTime ?? new Date().toISOString(),
        google_modified_at: driveFile.modifiedTime ?? new Date().toISOString(),
      }).select().single();
      if (error) {
        // Drive succeeded but metadata failed → report for reconciliation, don't pretend success
        return fail("METADATA_FAILED", `Uploaded ${f.name} to Drive but failed to save metadata. It will appear after sync.`, 500);
      }
      await logActivity(data.id, "UPLOAD");
      uploaded.push(data);
    }
    return ok({ files: uploaded }, 201);
  } catch (e) {
    const u = toUserError(e);
    return fail(u.code, u.message, u.status);
  }
}
