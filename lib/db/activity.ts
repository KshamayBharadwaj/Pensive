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
