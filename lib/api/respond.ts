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
export async function guard() {
  try {
    const r = await requireSession(getPasswordUpdatedAt);
    if (!r.ok) {
      const msg =
        r.error === "UNINITIALIZED"
          ? "Vault is not initialized."
          : "Your session has expired. Please unlock Pensieve again.";
      return { authed: false as const, response: fail("UNAUTHENTICATED", msg, 401) };
    }
    return { authed: true as const };
  } catch {
    return {
      authed: false as const,
      response: fail("SERVICE_UNAVAILABLE", "Service is temporarily unavailable.", 503),
    };
  }
}

export function toUserError(e: unknown): { code: string; message: string; status: number } {
  const err = e as { name?: string; message?: string };
  if (err?.name === "DriveUnavailableError") {
    return { code: "DRIVE_UNAVAILABLE", message: "Google Drive is currently unavailable. Please try again later.", status: 502 };
  }
  if (String(err?.message ?? "").includes("not configured")) {
    return { code: "NOT_CONFIGURED", message: "Server storage is not configured. Check environment variables.", status: 500 };
  }
  return { code: "INTERNAL", message: "Unable to complete the request. Please try again.", status: 500 };
}
