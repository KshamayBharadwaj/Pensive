import { supabaseAdmin } from "@/lib/supabase/server";
import { driveRename } from "@/lib/google-drive/client";
import { logActivity } from "@/lib/db/activity";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";
import { folderNameSchema } from "@/lib/validation/schemas";

type Ctx = { params: { id: string } };

// PATCH /api/files/[id]/rename { name }
