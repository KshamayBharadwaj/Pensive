import * as jose from "jose";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "pensieve_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET ?? "";
  if (s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters.");
  return new TextEncoder().encode(s);
}

export type SessionPayload = {
  /** "authenticated" marker — single-user vault, no user id */
  sub: "vault";
  /** password updatedAt at issue time; used to invalidate old sessions after change */
  pwd: string;
  iat: number;
  exp: number;
};

/** Create a signed session JWT. pwd = vault_settings.updated_at */
export async function signSession(pwdUpdatedAt: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return await new jose.SignJWT({ sub: "vault", pwd: pwdUpdatedAt })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_TTL_SECONDS)
    .sign(getSecret());
}
