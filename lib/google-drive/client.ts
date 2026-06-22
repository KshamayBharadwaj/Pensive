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
