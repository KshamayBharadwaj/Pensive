import { getVaultSettings, updatePasswordHash } from "@/lib/db/vault";
import { verifyPassword, hashPassword } from "@/lib/auth/password";
import { requireSession, getSessionToken, clearSessionCookie } from "@/lib/auth/session";
import { getPasswordUpdatedAt } from "@/lib/db/vault";
import { changePasswordSchema } from "@/lib/validation/schemas";
import { ok, fail } from "@/lib/api/respond";

export async function POST(req: Request) {
  const token = await getSessionToken().catch(() => null);
  void token;
  const s = await requireSession(getPasswordUpdatedAt).catch(() => null);
  if (!s || !s.ok) {
    return fail("UNAUTHENTICATED", "Your session has expired. Please unlock Pensieve again.", 401);
  }
  try {
    const body = await req.json().catch(() => null);
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return fail("INVALID_INPUT", parsed.error.issues[0]?.message ?? "Invalid input.", 400);
    }
    const vault = await getVaultSettings();
    if (!vault) return fail("UNINITIALIZED", "Vault is not initialized.", 409);
    const valid = await verifyPassword(parsed.data.currentPassword, vault.password_hash);
    if (!valid) return fail("INVALID_PASSWORD", "Current password is incorrect.", 401);

    const hash = await hashPassword(parsed.data.newPassword);
    await updatePasswordHash(hash);
    // Invalidate old sessions: token embeds old pwd updated_at → rejected after this.
    await clearSessionCookie();
    return ok({ changed: true });
  } catch {
    return fail("CHANGE_FAILED", "Unable to change password. Please try again.", 500);
  }
}
