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

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getSecret());
    if (payload.sub !== "vault" || typeof payload.pwd !== "string") return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionToken(): Promise<string | null> {
  return cookies().get(SESSION_COOKIE)?.value ?? null;
}

/** Verify cookie session AND that password hasn't changed since issue. */
