import { supabaseAdmin } from "@/lib/supabase/server";
import { guard, ok, fail, toUserError } from "@/lib/api/respond";
import { filesQuerySchema } from "@/lib/validation/schemas";
import { categorize } from "@/lib/utils/format";
import { recentFileIds } from "@/lib/db/activity";

const SORT_COL: Record<string, string> = {
  name: "name",
  modified: "google_modified_at",
  created: "google_created_at",
  size: "size",
  type: "mime_type",
};

// GET /api/files?folderId=&view=all|recent|favorites&sort=&order=&filter=&q=&page=&limit=
