import { syncDriveMetadata } from "@/lib/google-drive/sync";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";

// POST /api/sync { folderId?: string | null } — discover Drive-side changes (PRD §23)
export async function POST(req: Request) {
  const g = await guard();
  if (!g.authed) return g.response;
  try {
    const body = await req.json().catch(() => ({}));
    const folderId = (body?.folderId as string | null) ?? null;
    const result = await syncDriveMetadata(folderId);
    return ok(result);
  } catch (e) {
    const u = toUserError(e);
    return fail(u.code, u.message, u.status);
  }
}
