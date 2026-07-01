import { supabaseAdmin } from "@/lib/supabase/server";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";

type Ctx = { params: { id: string } };
