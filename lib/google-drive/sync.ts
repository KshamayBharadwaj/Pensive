import { supabaseAdmin } from "@/lib/supabase/server";
import { driveList, driveRootId } from "@/lib/google-drive/client";

/**
 * Reconcile Drive → Supabase metadata.
 * - Inserts Drive files/folders missing in Supabase.
 * - Marks Supabase rows stale/trashed when the Drive file disappeared.
 * Runs on refresh / entering All Files / after mutations (best-effort).
 */
export async function syncDriveMetadata(folderId: string | null = null): Promise<{ added: number; markedStale: number }> {
  const db = supabaseAdmin();
  let added = 0;
  let markedStale = 0;

  let folderDriveId: string | null = null;
  if (folderId) {
    const { data } = await db.from("folders").select("google_drive_id").eq("id", folderId).maybeSingle();
    folderDriveId = (data?.google_drive_id as string | null) ?? null;
  }

  let driveFiles: Awaited<ReturnType<typeof driveList>> = [];
  try {
    driveFiles = await driveList(folderDriveId);
  } catch {
    return { added: 0, markedStale: 0 }; // Drive unavailable → never mutate metadata
  }

  const driveIds = new Set(driveFiles.map((f) => f.id));

  // Existing metadata in scope
  const [{ data: files }, { data: folders }] = await Promise.all([
    folderId
      ? db.from("files").select("id,google_drive_id").eq("folder_id", folderId).eq("is_trashed", false)
      : db.from("files").select("id,google_drive_id").is("folder_id", null).eq("is_trashed", false),
    folderId
      ? db.from("folders").select("id,google_drive_id").eq("parent_folder_id", folderId).eq("is_trashed", false)
      : db.from("folders").select("id,google_drive_id").is("parent_folder_id", null).eq("is_trashed", false),
  ]);

  const known = new Set<string>([
    ...((files ?? []).map((f) => f.google_drive_id as string)),
    ...((folders ?? []).map((f) => f.google_drive_id as string)),
  ]);

  const missing = driveFiles.filter((f) => !known.has(f.id));
  for (const f of missing) {
    try {
      if (f.mimeType === "application/vnd.google-apps.folder") {
        await db.from("folders").insert({
          google_drive_id: f.id,
          name: f.name,
          parent_folder_id: folderId,
        });
      } else {
        await db.from("files").insert({
          google_drive_id: f.id,
          name: f.name,
          mime_type: f.mimeType,
          size: f.size ?? null,
          folder_id: folderId,
          google_created_at: f.createdTime ?? null,
          google_modified_at: f.modifiedTime ?? null,
        });
      }
      added += 1;
    } catch {
      // ignore individual failures
    }
  }

  // Mark stale: metadata whose Drive id no longer lists here (only when Drive responded OK)
  void driveRootId;
  const staleFiles = (files ?? []).filter((f) => !driveIds.has(f.google_drive_id as string));
  for (const s of staleFiles) {
    await db.from("files").update({ is_trashed: true }).eq("id", s.id);
    markedStale += 1;
  }

  return { added, markedStale };
}
