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

export async function isVaultInitialized(): Promise<boolean> {
  try {
    return (await getVaultSettings()) !== null;
  } catch {
    return false;
  }
}

export async function getPasswordUpdatedAt(): Promise<string | null> {
  const v = await getVaultSettings();
  return v?.updated_at ?? null;
}

export async function createVaultSettings(passwordHash: string): Promise<VaultSettings> {
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("vault_settings")
    .insert({ password_hash: passwordHash })
    .select()
    .single();
  if (error) throw error;
  return data as VaultSettings;
}

export async function updatePasswordHash(passwordHash: string): Promise<VaultSettings> {
  const db = supabaseAdmin();
  const current = await getVaultSettings();
  if (!current) throw new Error("Vault not initialized.");
  const { data, error } = await db
    .from("vault_settings")
    .update({ password_hash: passwordHash, updated_at: new Date().toISOString() })
    .eq("id", current.id)
    .select()
    .single();
  if (error) throw error;
  // Best-effort: clear server-side sessions if table is in use
  try {
    await db.from("sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  } catch {
    // ignore
  }
  return data as VaultSettings;
}
