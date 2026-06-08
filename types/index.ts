export type ApiSuccess<T = unknown> = { success: true; data: T };
export type ApiError = {
  success: false;
  error: { code: string; message: string };
};

export type FileRow = {
  id: string;
  google_drive_id: string;
  name: string;
  mime_type: string | null;
  size: number | null;
  folder_id: string | null;
  google_created_at: string | null;
  google_modified_at: string | null;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  is_trashed: boolean;
};
