import { google, drive_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export function isDriveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}

export function getOAuthClient(): OAuth2Client {
  const oauth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oauth;
}

export function getDrive(): drive_v3.Drive {
  if (!isDriveConfigured()) throw new Error("Google Drive is not configured.");
  return google.drive({ version: "v3", auth: getOAuthClient() });
}

export function driveRootId(): string | undefined {
  return process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || undefined;
}

export class DriveUnavailableError extends Error {
  constructor(message = "Google Drive is currently unavailable. Please try again later.") {
    super(message);
    this.name = "DriveUnavailableError";
  }
}

function wrap<T>(p: Promise<T>): Promise<T> {
  return p.catch((e: unknown) => {
    const err = e as { code?: number; message?: string };
    if (err?.code === 401 || err?.code === 403) {
      throw new DriveUnavailableError("Google Drive authorization failed. Check server credentials.");
    }
    throw new DriveUnavailableError(err?.message ?? "Google Drive request failed.");
  });
}

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  parents?: string[];
  createdTime?: string;
  modifiedTime?: string;
  trashed?: boolean;
};

export async function driveList(folderDriveId?: string | null, pageSize = 100): Promise<DriveFile[]> {
  const drive = getDrive();
  const parent = folderDriveId ?? driveRootId() ?? "root";
  // NOTE: when using a dedicated root folder, Drive children use `'id' in parents`.
  const q = `'${parent.replace(/'/g, "")}' in parents and trashed = false`;
  const res = await wrap(
    drive.files.list({
      q,
      pageSize,
      fields: "files(id,name,mimeType,size,parents,createdTime,modifiedTime,trashed)",
      orderBy: "modifiedTime desc",
    })
  );
  return (res.data.files ?? []).map((f) => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType ?? "application/octet-stream",
    size: f.size ? Number(f.size) : undefined,
    parents: f.parents ?? undefined,
    createdTime: f.createdTime ?? undefined,
    modifiedTime: f.modifiedTime ?? undefined,
    trashed: f.trashed ?? false,
  }));
}

export async function driveCreateFolder(name: string, parentDriveId?: string | null): Promise<DriveFile> {
  const drive = getDrive();
  const parent = parentDriveId ?? driveRootId() ?? "root";
  const res = await wrap(
    drive.files.create({
      requestBody: {
        name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parent],
      },
      fields: "id,name,mimeType,createdTime,modifiedTime",
    })
  );
  return {
    id: res.data.id!,
    name: res.data.name!,
    mimeType: "application/vnd.google-apps.folder",
    createdTime: res.data.createdTime ?? undefined,
    modifiedTime: res.data.modifiedTime ?? undefined,
  };
}

export async function driveUpload(
  name: string,
  mimeType: string,
  bytes: Buffer,
  parentDriveId?: string | null
): Promise<DriveFile> {
  const drive = getDrive();
  const { Readable } = await import("stream");
  const parent = parentDriveId ?? driveRootId() ?? "root";
  const res = await wrap(
    drive.files.create({
      requestBody: { name, parents: [parent] },
      media: { mimeType, body: Readable.from(bytes) },
      fields: "id,name,mimeType,size,createdTime,modifiedTime",
    })
  );
  return {
    id: res.data.id!,
    name: res.data.name!,
    mimeType: res.data.mimeType ?? mimeType,
    size: res.data.size ? Number(res.data.size) : bytes.length,
    createdTime: res.data.createdTime ?? undefined,
    modifiedTime: res.data.modifiedTime ?? undefined,
  };
}

export async function driveDownload(fileId: string): Promise<{ bytes: Buffer; name: string; mimeType: string }> {
  const drive = getDrive();
  const meta = await wrap(drive.files.get({ fileId, fields: "id,name,mimeType,size" }));
  const res = await wrap(
    drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" })
  );
  const buf = Buffer.from(res.data as ArrayBuffer);
  return {
    bytes: buf,
    name: meta.data.name ?? "download",
    mimeType: meta.data.mimeType ?? "application/octet-stream",
  };
}

export async function driveRename(fileId: string, name: string) {
  const drive = getDrive();
  await wrap(drive.files.update({ fileId, requestBody: { name }, fields: "id,name" }));
}

export async function driveMove(fileId: string, newParentDriveId: string | null, oldParentDriveId?: string | null) {
  const drive = getDrive();
  const newParent = newParentDriveId ?? driveRootId() ?? "root";
  let removeParents: string | undefined;
  if (oldParentDriveId) removeParents = oldParentDriveId;
  else {
    const meta = await wrap(drive.files.get({ fileId, fields: "parents" }));
    removeParents = (meta.data.parents ?? []).join(",");
  }
  await wrap(
    drive.files.update({
      fileId,
      addParents: newParent,
      removeParents: removeParents || undefined,
      fields: "id,parents",
    })
  );
}

export async function driveTrash(fileId: string) {
  const drive = getDrive();
  await wrap(drive.files.update({ fileId, requestBody: { trashed: true }, fields: "id" }));
}
