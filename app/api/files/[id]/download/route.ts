import { supabaseAdmin } from "@/lib/supabase/server";
import { driveDownload } from "@/lib/google-drive/client";
import { logActivity } from "@/lib/db/activity";
import { guard, fail, toUserError } from "@/lib/api/respond";

type Ctx = { params: { id: string } };

// GET /api/files/[id]/download — stream from Drive, never expose credentials
export async function GET(_req: Request, { params }: Ctx) {
  const g = await guard();
  if (!g.authed) return g.response;
  try {
    const db = supabaseAdmin();
    const { data: file, error } = await db.from("files").select("*").eq("id", params.id).maybeSingle();
    if (error) throw error;
    if (!file || file.is_trashed) return fail("FILE_NOT_FOUND", "The requested file could not be found.", 404);

    const dl = await driveDownload(file.google_drive_id as string);
    await logActivity(file.id, "DOWNLOAD");
    const bytes = dl.bytes as unknown as BodyInit;
    return new Response(bytes as BodyInit, {
      headers: {
        "Content-Type": dl.mimeType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(dl.name)}`,
        "Content-Length": String((dl.bytes as Buffer).length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    const u = toUserError(e);
    return fail(u.code, u.message, u.status);
  }
}
