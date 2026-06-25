export const dynamic = "force-dynamic";

import { getVaultSettings, getPasswordUpdatedAt } from "@/lib/db/vault";
import { requireSession } from "@/lib/auth/session";
import { ok } from "@/lib/api/respond";
