import { NextResponse } from "next/server";
import { getPasswordUpdatedAt } from "@/lib/db/vault";
import { requireSession } from "@/lib/auth/session";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

export function clientIp(req: Request): string {
  const h = (name: string) => req.headers.get(name) ?? "";
  return h("x-forwarded-for").split(",")[0].trim() || h("x-real-ip") || "unknown";
}

/** Guard for protected routes. Returns null and sends 401 when unauthenticated. */
