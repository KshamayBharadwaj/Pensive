import { supabaseAdmin } from "@/lib/supabase/server";
import { driveMove } from "@/lib/google-drive/client";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";

type Ctx = { params: { id: string } };

// PATCH /api/folders/[id]/move { parentFolderId: string | null }
