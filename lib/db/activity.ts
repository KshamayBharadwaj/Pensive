import { supabaseAdmin } from "@/lib/supabase/server";
import type { ActivityAction } from "@/types";

export async function logActivity(fileId: string | null, action: ActivityAction) {
  try {
    const db = supabaseAdmin();
    await db.from("activity").insert({ file_id: fileId, action });
  } catch {
    // Activity logging must never break the main flow.
  }
}

export async function recentFileIds(limit = 50): Promise<string[]> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("activity")
    .select("file_id, created_at")
    .order("created_at", { ascending: false })
    .limit(limit * 3);
  const seen = new Set<string>();
  const rows = data ?? [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as { file_id?: string | null };
    if (row.file_id && !seen.has(row.file_id)) seen.add(row.file_id);
    if (seen.size >= limit) break;
  }
  return Array.from(seen);
}
