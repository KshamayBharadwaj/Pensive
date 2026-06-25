import { getVaultSettings } from "@/lib/db/vault";
import { verifyPassword } from "@/lib/auth/password";
import { signSession, setSessionCookie } from "@/lib/auth/session";
import { loginRateLimit, loginSucceeded } from "@/lib/auth/rate-limit";
import { loginSchema } from "@/lib/validation/schemas";
import { ok, fail, clientIp } from "@/lib/api/respond";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = loginRateLimit(`login:${ip}`);
  if (!rl.allowed) {
    return fail("RATE_LIMITED", `Too many attempts. Try again in ${rl.retryAfterSec}s.`, 429);
  }
  try {
    const body = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) return fail("INVALID_INPUT", "Password is required.", 400);

    const vault = await getVaultSettings().catch(() => null);
    if (!vault) return fail("UNINITIALIZED", "Vault is not initialized. Please set it up first.", 409);

    const valid = await verifyPassword(parsed.data.password, vault.password_hash);
    if (!valid) return fail("INVALID_PASSWORD", "Incorrect password. Please try again.", 401);

    loginSucceeded(`login:${ip}`);
    const token = await signSession(vault.updated_at);
    await setSessionCookie(token);
    return ok({ authenticated: true });
  } catch {
    return fail("LOGIN_FAILED", "Unable to log in. Please try again.", 500);
  }
}
