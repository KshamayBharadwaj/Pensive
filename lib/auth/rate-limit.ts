// Simple in-memory rate limiter for login attempts (per instance).
// For multi-instance production, replace with Redis/Upstash.

type Entry = { count: number; firstAt: number; blockedUntil: number };

const attempts = new Map<string, Entry>();
const WINDOW_MS = 10 * 60 * 1000; // 10 min
const MAX_ATTEMPTS = 8;
const BLOCK_MS = 5 * 60 * 1000; // 5 min lockout

export function loginRateLimit(key: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const e = attempts.get(key);
  if (e && e.blockedUntil > now) {
    return { allowed: false, retryAfterSec: Math.ceil((e.blockedUntil - now) / 1000) };
  }
  if (!e || now - e.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now, blockedUntil: 0 });
    return { allowed: true, retryAfterSec: 0 };
  }
  e.count += 1;
  if (e.count > MAX_ATTEMPTS) {
    e.blockedUntil = now + BLOCK_MS;
    return { allowed: false, retryAfterSec: BLOCK_MS / 1000 };
  }
  return { allowed: true, retryAfterSec: 0 };
}
