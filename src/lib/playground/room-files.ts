import { MAX_UPLOAD_BYTES } from "@/lib/assets";

/**
 * Room upload limits, shared VERBATIM by the picker (`accept`), the client
 * pre-check and the server route. Before this module the picker accepted
 * `image/*` while the server refused HEIC/SVG/BMP — an iPhone photo passed
 * the dialog and came back as a 415 after fully uploading.
 *
 * Isomorphic on purpose: no server imports, so the client bundle can read it.
 */

/**
 * Accepted types, deliberately narrower than the Asset Library's list: a
 * canvas renders images, video and documents, and there is no reason for a
 * room to accept a zip or an executable-adjacent archive.
 */
export const ROOM_UPLOAD_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

/** Cap below the Asset Library's 500MB: a canvas reference is not a master. */
export const MAX_ROOM_UPLOAD_BYTES = Math.min(MAX_UPLOAD_BYTES, 50 * 1024 * 1024);

/**
 * The picker's `accept` attribute: the exact server allow-list, plus extension
 * fallbacks for document types — Windows pickers match Office files by
 * extension more reliably than by their long-form mime strings.
 */
export const ROOM_UPLOAD_ACCEPT = [
  ...ROOM_UPLOAD_ALLOWED_MIME,
  ".doc",
  ".docx",
  ".pptx",
  ".txt",
].join(",");
