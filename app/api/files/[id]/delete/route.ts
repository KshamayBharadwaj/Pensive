import { supabaseAdmin } from "@/lib/supabase/server";
import { driveTrash } from "@/lib/google-drive/client";
import { logActivity } from "@/lib/db/activity";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";

type Ctx = { params: { id: string } };

// DELETE /api/files/[id]/delete — soft delete: Drive trash + metadata flag (PRD §21)
