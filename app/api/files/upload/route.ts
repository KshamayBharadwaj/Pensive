import { supabaseAdmin } from "@/lib/supabase/server";
import { driveUpload } from "@/lib/google-drive/client";
import { logActivity } from "@/lib/db/activity";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST /api/files/upload  (multipart/form-data: files[], folderId?)
