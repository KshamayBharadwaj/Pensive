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
