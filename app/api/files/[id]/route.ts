import { supabaseAdmin } from "@/lib/supabase/server";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";
import { logActivity } from "@/lib/db/activity";

type Ctx = { params: { id: string } };

// GET /api/files/[id] — details + location path
