import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { getFileUrl } from "@/lib/utils";

/**
 * Storage adapter: Cloudinary for media within free-plan caps, local disk
 * (public/uploads, served by the nginx alias) for everything else.
 *
 * Cloudinary free-plan per-file caps: 10MB image / 100MB video / 10MB raw.
 * Documents (pdf/zip/docx…) always stay local — the free plan blocks PDF/ZIP
 * delivery by default and raw files gain nothing from a media CDN.
 */

const CLOUDINARY_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const CLOUDINARY_MAX_VIDEO_BYTES = 100 * 1024 * 1024;
// Above this, use the SDK's chunked upload to stay clear of single-request limits.
const CHUNKED_UPLOAD_THRESHOLD_BYTES = 20 * 1024 * 1024;

export type StorageProvider = "cloudinary" | "local";
export type StorageResourceType = "image" | "video" | "raw";

export interface StorageTarget {
  provider: StorageProvider;
  resourceType: StorageResourceType;
}

export interface UploadOptions {
  mime: string;
  size: number;
  /** Cloudinary folder, e.g. `paxala/<projectId>` or `paxala/portfolio`. */
  cloudFolder: string;
  /** Directory under public/uploads for the local fallback, e.g. `portfolio`. */
  localDir: string;
  /** Exact filename the route would have used on disk. */
  localName: string;
}

export interface UploadResult {
  /** Absolute URL: Cloudinary secure_url, or getFileUrl() of the local path. */
  url: string;
  /** Cloudinary public_id; null means the file lives on local disk. */
  publicId: string | null;
  provider: StorageProvider;
  resourceType: StorageResourceType;
}

export function isCloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

let cloudinaryConfigured = false;
function configureCloudinary(): void {
  if (cloudinaryConfigured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  cloudinaryConfigured = true;
}

export function classifyResource(mime: string): StorageResourceType {
  if (mime.startsWith("image/")) return "image";
  // Cloudinary stores audio under the "video" resource type.
  if (mime.startsWith("video/") || mime.startsWith("audio/")) return "video";
  return "raw";
}

/**
 * Pure gate deciding where a file goes. Cloudinary only for media within the
 * free-plan caps; documents and oversized files stay on local disk.
 */
export function pickStorageTarget(mime: string, size: number): StorageTarget {
  const resourceType = classifyResource(mime);
  if (resourceType === "image" && size <= CLOUDINARY_MAX_IMAGE_BYTES) {
    return { provider: "cloudinary", resourceType };
  }
  if (resourceType === "video" && size <= CLOUDINARY_MAX_VIDEO_BYTES) {
    return { provider: "cloudinary", resourceType };
  }
  return { provider: "local", resourceType };
}

function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: Exclude<StorageResourceType, "raw">
): Promise<UploadApiResponse> {
  configureCloudinary();
  const uploader =
    buffer.length > CHUNKED_UPLOAD_THRESHOLD_BYTES
      ? cloudinary.uploader.upload_chunked_stream.bind(cloudinary.uploader)
      : cloudinary.uploader.upload_stream.bind(cloudinary.uploader);
  return new Promise((resolve, reject) => {
    const stream = uploader(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload returned no result"));
        } else {
          resolve(result);
        }
      }
    );
    stream.end(buffer);
  });
}

async function writeLocalUpload(
  buffer: Buffer,
  localDir: string,
  localName: string
): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads", localDir);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, localName), buffer);
  return getFileUrl(`/uploads/${localDir}/${localName}`);
}

/**
 * Upload a file to Cloudinary when eligible, local disk otherwise.
 *
 * A Cloudinary failure with valid-looking config throws (fail fast — the
 * routes' error handlers turn it into a 500); it never silently falls back,
 * so a misconfigured account can't quietly fill the disk instead.
 */
export async function uploadFile(
  buffer: Buffer,
  opts: UploadOptions
): Promise<UploadResult> {
  const target = pickStorageTarget(opts.mime, opts.size);

  if (target.provider === "cloudinary" && isCloudinaryConfigured()) {
    const result = await uploadBufferToCloudinary(
      buffer,
      opts.cloudFolder,
      target.resourceType as Exclude<StorageResourceType, "raw">
    );
    return {
      url: result.secure_url,
      publicId: result.public_id,
      provider: "cloudinary",
      resourceType: target.resourceType,
    };
  }

  const url = await writeLocalUpload(buffer, opts.localDir, opts.localName);
  return { url, publicId: null, provider: "local", resourceType: target.resourceType };
}

/**
 * Delete a stored file wherever it lives. Best-effort like deleteLocalUpload:
 * failures are logged, never thrown, so a missing blob can't block a DB delete.
 */
export async function deleteUpload(ref: {
  publicId: string | null;
  resourceType: string | null;
  url: string;
}): Promise<void> {
  if (ref.publicId) {
    try {
      configureCloudinary();
      await cloudinary.uploader.destroy(ref.publicId, {
        resource_type: ref.resourceType ?? "image",
      });
    } catch (error) {
      console.error("deleteUpload: could not remove Cloudinary asset", {
        publicId: ref.publicId,
        error,
      });
    }
    return;
  }
  await deleteLocalUpload(ref.url);
}

/**
 * Derived thumbnail URL for a Cloudinary asset. One transformation per unique
 * URL (then CDN-cached), so this costs credits once, not per view.
 */
export function getCloudinaryThumbUrl(
  publicId: string,
  resourceType: Exclude<StorageResourceType, "raw">
): string {
  configureCloudinary();
  if (resourceType === "video") {
    // so_0 = poster frame at t=0, delivered as jpg.
    return cloudinary.url(publicId, {
      resource_type: "video",
      format: "jpg",
      transformation: "so_0,c_limit,w_480,q_auto",
      secure: true,
    });
  }
  return cloudinary.url(publicId, {
    resource_type: "image",
    transformation: "c_limit,w_480,f_auto,q_auto",
    secure: true,
  });
}

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
