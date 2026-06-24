export const dynamic = "force-dynamic";

import { getVaultSettings, createVaultSettings, getPasswordUpdatedAt } from "@/lib/db/vault";
import { hashPassword } from "@/lib/auth/password";
import { signSession, setSessionCookie } from "@/lib/auth/session";
import { setupSchema } from "@/lib/validation/schemas";
import { ok, fail } from "@/lib/api/respond";
