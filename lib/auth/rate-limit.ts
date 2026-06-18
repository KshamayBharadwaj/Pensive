// Simple in-memory rate limiter for login attempts (per instance).
// For multi-instance production, replace with Redis/Upstash.

type Entry = { count: number; firstAt: number; blockedUntil: number };

const attempts = new Map<string, Entry>();
const WINDOW_MS = 10 * 60 * 1000; // 10 min
const MAX_ATTEMPTS = 8;
const BLOCK_MS = 5 * 60 * 1000; // 5 min lockout
