import { renameFolderById } from "@/lib/db/rename-folder";

type Ctx = { params: { id: string } };
export async function PATCH(req: Request, { params }: Ctx) {
  return renameFolderById(req, params.id);
}
