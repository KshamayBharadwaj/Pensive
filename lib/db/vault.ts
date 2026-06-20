import { supabaseAdmin } from "@/lib/supabase/server";

export type VaultSettings = {
  id: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

export async function getVaultSettings(): Promise<VaultSettings | null> {
  const db = supabaseAdmin();
  const { data, error } = await db.from("vault_settings").select("*").limit(1).maybeSingle();
  if (error) throw error;
  return data as VaultSettings | null;
}
