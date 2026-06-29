import { supabaseAdmin } from "@/lib/supabase/server";
import { driveDownload } from "@/lib/google-drive/client";
import { logActivity } from "@/lib/db/activity";
import { guard, fail, toUserError } from "@/lib/api/respond";

type Ctx = { params: { id: string } };

// GET /api/files/[id]/download — stream from Drive, never expose credentials
