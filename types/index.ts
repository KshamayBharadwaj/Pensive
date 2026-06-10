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

export type FolderRow = {
  id: string;
  google_drive_id: string | null;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  is_trashed: boolean;
};

export type ActivityRow = {
  id: string;
  file_id: string | null;
  action: ActivityAction;
  created_at: string;
};

export type ActivityAction =
  | "UPLOAD"
  | "DOWNLOAD"
  | "OPEN"
  | "RENAME"
  | "MOVE"
  | "FAVORITE"
  | "UNFAVORITE"
  | "DELETE";

export type VaultView = "all" | "recent" | "favorites";

export type SortKey = "name" | "modified" | "created" | "size" | "type";
export type SortDir = "asc" | "desc";

export type FileFilter =
  | "all"
  | "documents"
  | "images"
  | "videos"
  | "audio"
  | "archives"
  | "code"
  | "favorites";
