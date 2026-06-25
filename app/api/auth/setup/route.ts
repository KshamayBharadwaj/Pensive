export const dynamic = "force-dynamic";

import { getVaultSettings, createVaultSettings, getPasswordUpdatedAt } from "@/lib/db/vault";
import { hashPassword } from "@/lib/auth/password";
import { signSession, setSessionCookie } from "@/lib/auth/session";
import { setupSchema } from "@/lib/validation/schemas";
import { ok, fail } from "@/lib/api/respond";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid input.";
      return fail("INVALID_INPUT", msg, 400);
    }
    const existing = await getVaultSettings().catch(() => null);
    if (existing) return fail("ALREADY_INITIALIZED", "Vault is already initialized. Please log in.", 409);

    const hash = await hashPassword(parsed.data.password);
    const row = await createVaultSettings(hash);
    const token = await signSession(row.updated_at);
    await setSessionCookie(token);
    return ok({ initialized: true }, 201);
  } catch (e) {
    const msg = (e as Error)?.message ?? "";
    if (msg.includes("not configured") || msg.includes("Supabase")) {
      return fail("DB_UNAVAILABLE", "Database is unavailable. Check Supabase configuration.", 503);
    }
    return fail("SETUP_FAILED", "Unable to create the vault. Please try again.", 500);
  }
}

export async function GET() {
  try {
    const existing = await getVaultSettings().catch(() => null);
    const pwd = await getPasswordUpdatedAt().catch(() => null);
    void pwd;
    return ok({ initialized: existing !== null });
  } catch {
    return fail("DB_UNAVAILABLE", "Database is unavailable.", 503);
  }
}
