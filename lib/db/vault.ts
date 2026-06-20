import { supabaseAdmin } from "@/lib/supabase/server";

export type VaultSettings = {
  id: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
};
