import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

// Lightweight edge guard: presence check only; validity is verified in API routes.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasCookie = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  const isAuthPage = pathname === "/login" || pathname === "/setup";

  if ((pathname === "/" || pathname.startsWith("/settings") || pathname.startsWith("/files")) && !hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (isAuthPage && hasCookie && pathname === "/login") {
    // Let client verify validity; don't force-redirect here.
    return NextResponse.next();
  }
  return NextResponse.next();
}
