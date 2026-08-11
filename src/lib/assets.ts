/**
 * Shared vocabulary and matching rules for the Asset Library (ProjectFile +
 * Folder).
 *
 * Assets can be attached to a folder in two ways:
 *   - `folderId` — a real `Folder` row (created via /api/folders)
 *   - `folder`   — a legacy free-text folder name, which is what every upload
 *                  used before folders became first-class rows
 *
 * Both live side by side in the database, so every place that groups, counts or
 * filters assets by folder has to honour both. Keeping the rule in one place is
 * what stops the API and the UI from disagreeing about which assets a folder
 * contains.
 */

export const DEFAULT_FOLDER_NAME = "General";

/**
 * Per-file upload ceiling, enforced on the server in /api/files and checked in
 * the browser before sending. Shared so the client can reject an oversized file
 * instantly instead of pushing it over a mobile connection only to get a 413.
 */
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB

/** How many uploads run at once. Keeps a large batch from starving the tab. */
export const UPLOAD_CONCURRENCY = 3;

export const ASSET_CATEGORIES = [
  "Video",
  "Photography",
  "Design",
  "Brand Files",
  "Web & Digital",
  "Documents",
] as const;

export const ASSET_STATUSES = [
  "New",
  "In Review",
  "Approved",
  "Approved Final",
  "Shared",
  "Final",
  "Archived",
] as const;

/** Folder names the product ships with, offered even before a row exists. */
export const SUGGESTED_FOLDER_NAMES = [
  DEFAULT_FOLDER_NAME,
  "Brand Identity",
  "Campaigns 2026",
  "Video Masters",
  "Photography",
  "Website & Digital",
  "Documents",
] as const;

export type FolderLike = {
  id?: string | null;
  name: string;
};

export type AssetFolderFields = {
  folder?: string | null;
  folderId?: string | null;
};

/**
 * Does `asset` live in `folder`?
 *
 * An asset matches on `folderId` when it has one; otherwise it falls back to a
 * name match so legacy uploads still show up under the folder card that carries
 * their name.
 */
export function assetBelongsToFolder(
  asset: AssetFolderFields,
  folder: FolderLike
): boolean {
  if (asset.folderId) return !!folder.id && asset.folderId === folder.id;
  return (asset.folder || DEFAULT_FOLDER_NAME) === folder.name;
}

/** Bytes -> "1.4 GB". Shared by the API responses and the upload modal. */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
