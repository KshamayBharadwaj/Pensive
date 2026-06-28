import { supabaseAdmin } from "@/lib/supabase/server";
import { logActivity } from "@/lib/db/activity";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";

type Ctx = { params: { id: string } };

// POST /api/files/[id]/favorite — toggle or set { favorite?: boolean }
