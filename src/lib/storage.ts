import { unlink } from "fs/promises";
import path from "path";

/**
 * Best-effort removal of a locally-stored upload, given its public URL or path.
 *
 * Only files under /public/uploads are eligible — anything else (an external
 * link, a NAS URL, or a path-traversal attempt) is ignored, so this can never
 * delete an arbitrary file on the host. Failures are logged, not thrown, so a
 * missing-file case never blocks the DB delete that calls it.
 */
export async function deleteLocalUpload(
  urlOrPath: string | null | undefined
): Promise<void> {
  if (!urlOrPath) return;
  try {
    let pathname = urlOrPath;
    try {
      // Absolute URL (e.g. https://paxaland.com/uploads/<id>/<file>) -> pathname
      pathname = new URL(urlOrPath).pathname;
    } catch {
      // Already a relative path; use as-is.
    }

    if (!pathname.startsWith("/uploads/")) return;

    const baseDir = path.join(process.cwd(), "public", "uploads");
    const target = path.normalize(path.join(process.cwd(), "public", pathname));

    // Containment guard: the resolved path must stay inside /public/uploads.
    if (target !== baseDir && !target.startsWith(baseDir + path.sep)) return;

    await unlink(target);
  } catch (error) {
    // File may already be gone or never existed on disk — log and continue.
    console.error("deleteLocalUpload: could not remove file", { urlOrPath, error });
  }
}
