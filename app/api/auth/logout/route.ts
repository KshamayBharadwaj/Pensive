import { clearSessionCookie } from "@/lib/auth/session";
import { ok } from "@/lib/api/respond";

export async function POST() {
  await clearSessionCookie();
  return ok({ loggedOut: true });
}
