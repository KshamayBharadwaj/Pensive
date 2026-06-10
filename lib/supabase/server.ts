import { createClient } from "@supabase/supabase-js";

// Server-side client with service-role key. NEVER import in client components.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server env vars are not configured.");
  return createClient(url, key, { auth: { persistSession: false } });
}
