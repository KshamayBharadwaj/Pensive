import { supabaseAdmin } from "@/lib/supabase/server";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";
import { renameFolderById } from "@/lib/db/rename-folder";

type Ctx = { params: { id: string } };
