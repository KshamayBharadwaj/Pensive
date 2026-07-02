import { supabaseAdmin } from "@/lib/supabase/server";
import { driveTrash } from "@/lib/google-drive/client";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";

type Ctx = { params: { id: string } };

// DELETE /api/folders/[id]/delete — refuse to silently trash non-empty folders (PRD §10)
