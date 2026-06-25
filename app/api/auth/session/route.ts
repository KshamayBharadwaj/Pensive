export const dynamic = "force-dynamic";

import { getVaultSettings, getPasswordUpdatedAt } from "@/lib/db/vault";
import { requireSession } from "@/lib/auth/session";
import { ok } from "@/lib/api/respond";

export async function GET() {
  try {
    const vault = await getVaultSettings().catch(() => null);
    if (!vault) return ok({ initialized: false, authenticated: false });
    const s = await requireSession(getPasswordUpdatedAt);
    return ok({ initialized: true, authenticated: s.ok });
  } catch (e) {
    console.error("[session] failed:", (e as Error)?.message ?? e);
    return ok({ initialized: false, authenticated: false });
  }
}
