/**
 * Backfill existing local uploads (public/uploads/**) to Cloudinary and
 * rewrite the absolute URLs frozen in the database.
 *
 *   npx tsx scripts/backfill-cloudinary.ts --dry-run
 *   npx tsx scripts/backfill-cloudinary.ts --model=ProjectFile --limit=10
 *   npx tsx scripts/backfill-cloudinary.ts --normalize-hosts
 *
 * Idempotent: public_ids are derived deterministically from the disk path and
 * uploaded with `overwrite: false`, so a re-run converges on the same assets
 * instead of duplicating them — no state file needed. URLs already on
 * res.cloudinary.com are skipped, external URLs (Unsplash seeds, YouTube
 * links, OAuth avatars) are ignored, and rows whose file is missing on disk
 * are reported and left untouched.
 *
 * Files outside the free-plan caps (images >10MB, video >100MB, documents)
 * stay on local disk; --normalize-hosts additionally rewrites their stale
 * hosts (old domain / localhost) to the current NEXT_PUBLIC_SITE_URL.
 *
 * Run on the VPS host from the repo checkout (the standalone Docker image has
 * no tsx) with production DATABASE_URL and CLOUDINARY_* in the environment.
 */
import { existsSync, statSync } from "fs";
import path from "path";
import { Prisma, PrismaClient } from "@prisma/client";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import {
  getCloudinaryThumbUrl,
  isCloudinaryConfigured,
  pickStorageTarget,
  type StorageResourceType,
} from "../src/lib/storage";

// tsx does not load .env the way `next dev` does. Node's loader never
// overrides variables already exported in the shell, so this is a no-op
// wherever the environment is set up properly (e.g. the VPS).
try {
  process.loadEnvFile(".env");
} catch {
  // No .env here — rely on the exported environment.
}

const db = new PrismaClient();

const DRY_RUN = process.argv.includes("--dry-run");
const NORMALIZE_HOSTS = process.argv.includes("--normalize-hosts");
const MODEL_FILTER =
  process.argv.find((a) => a.startsWith("--model="))?.slice("--model=".length) ??
  null;
const LIMIT = ((): number | undefined => {
  const raw = process.argv.find((a) => a.startsWith("--limit="));
  if (!raw) return undefined;
  const n = Number.parseInt(raw.slice("--limit=".length), 10);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid --limit: ${raw}`);
  return n;
})();

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");
const CHUNKED_UPLOAD_THRESHOLD_BYTES = 20 * 1024 * 1024;

const EXT_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".mkv": "video/x-matroska",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
};

const stats = {
  migrated: 0,
  wouldMigrate: 0,
  bytesToCloud: 0,
  keptLocal: 0,
  normalized: 0,
  alreadyCloud: 0,
  external: 0,
  missing: [] as string[],
  rowsUpdated: 0,
};

type Outcome =
  | { action: "migrated"; url: string; publicId: string; resourceType: StorageResourceType }
  | { action: "would-migrate" }
  | { action: "normalized"; url: string }
  | { action: "unchanged" };

/** `/uploads/...` pathname of a stored value, or null for external/cloud URLs. */
function localUploadsPathname(value: string): string | null {
  let pathname = value;
  try {
    const url = new URL(value);
    if (url.hostname === "res.cloudinary.com") {
      stats.alreadyCloud += 1;
      return null;
    }
    pathname = url.pathname;
  } catch {
    // Already a relative path.
  }
  if (!pathname.startsWith("/uploads/")) {
    stats.external += 1;
    return null;
  }
  return pathname;
}

/** Deterministic public_id: /uploads/portfolio/a b.jpg -> paxala/portfolio/a_b */
function publicIdForPathname(pathname: string): string {
  const withoutPrefix = pathname.slice("/uploads/".length);
  const withoutExt = withoutPrefix.replace(/\.[^./]+$/, "");
  return `paxala/${withoutExt.replace(/[^a-zA-Z0-9/_-]/g, "_")}`;
}

async function uploadPathToCloudinary(
  diskPath: string,
  publicId: string,
  resourceType: Exclude<StorageResourceType, "raw">,
  size: number
): Promise<UploadApiResponse> {
  const options = {
    public_id: publicId,
    overwrite: false,
    unique_filename: false,
    resource_type: resourceType,
  };
  if (size > CHUNKED_UPLOAD_THRESHOLD_BYTES) {
    return (await cloudinary.uploader.upload_large(diskPath, options)) as UploadApiResponse;
  }
  return cloudinary.uploader.upload(diskPath, options);
}

function normalizedUrl(pathname: string, original: string): Outcome {
  if (NORMALIZE_HOSTS) {
    const next = `${SITE_URL}${pathname}`;
    if (next !== original) {
      stats.normalized += 1;
      return { action: "normalized", url: next };
    }
  }
  stats.keptLocal += 1;
  return { action: "unchanged" };
}

/** Migrate one stored URL: Cloudinary when eligible, host-normalize otherwise. */
async function processUrl(value: string | null | undefined): Promise<Outcome> {
  if (!value) return { action: "unchanged" };
  const pathname = localUploadsPathname(value);
  if (!pathname) return { action: "unchanged" };

  const diskPath = path.normalize(path.join(process.cwd(), "public", pathname));
  if (!diskPath.startsWith(UPLOADS_ROOT + path.sep)) {
    stats.external += 1;
    return { action: "unchanged" };
  }
  if (!existsSync(diskPath)) {
    stats.missing.push(value);
    return { action: "unchanged" };
  }

  const size = statSync(diskPath).size;
  const mime = EXT_MIME[path.extname(pathname).toLowerCase()] ?? "application/octet-stream";
  const target = pickStorageTarget(mime, size);
  if (target.provider === "local") return normalizedUrl(pathname, value);

  stats.bytesToCloud += size;
  if (DRY_RUN) {
    stats.wouldMigrate += 1;
    return { action: "would-migrate" };
  }
  const resourceType = target.resourceType as Exclude<StorageResourceType, "raw">;
  const result = await uploadPathToCloudinary(
    diskPath,
    publicIdForPathname(pathname),
    resourceType,
    size
  );
  stats.migrated += 1;
  return {
    action: "migrated",
    url: result.secure_url,
    publicId: result.public_id,
    resourceType,
  };
}

/** Local-only fields (playground WebP thumbs): never migrate, only fix hosts. */
function processLocalOnlyUrl(value: string | null): string | null {
  if (!value || !NORMALIZE_HOSTS) return null;
  const pathname = localUploadsPathname(value);
  if (!pathname) return null;
  const outcome = normalizedUrl(pathname, value);
  return outcome.action === "normalized" ? outcome.url : null;
}

function touches(outcome: Outcome): boolean {
  return outcome.action !== "unchanged";
}

/** Shared runner for models whose file fields are plain single URLs. */
async function migrateSingleFields(
  rows: Array<{ id: string; fields: Record<string, string | null> }>,
  update: (id: string, data: Record<string, string>) => Promise<unknown>
): Promise<void> {
  for (const row of rows) {
    const data: Record<string, string> = {};
    let touched = false;
    for (const [field, value] of Object.entries(row.fields)) {
      const outcome = await processUrl(value);
      touched = touched || touches(outcome);
      if (outcome.action === "migrated" || outcome.action === "normalized") {
        data[field] = outcome.url;
      }
    }
    if (touched) stats.rowsUpdated += 1;
    if (!DRY_RUN && Object.keys(data).length > 0) await update(row.id, data);
  }
}

async function migrateUrlArray(
  values: string[]
): Promise<{ value: string[] | null; touched: boolean }> {
  let changed = false;
  let touched = false;
  const next: string[] = [];
  for (const value of values) {
    const outcome = await processUrl(value);
    touched = touched || touches(outcome);
    if (outcome.action === "migrated" || outcome.action === "normalized") {
      next.push(outcome.url);
      changed = true;
    } else {
      next.push(value);
    }
  }
  return { value: changed ? next : null, touched };
}

async function runProjectFiles(): Promise<void> {
  const rows = await db.projectFile.findMany({
    take: LIMIT,
    select: { id: true, url: true, thumbnail: true },
  });
  for (const row of rows) {
    const data: Prisma.ProjectFileUpdateInput = {};
    const main = await processUrl(row.url);
    if (main.action === "migrated") {
      data.url = main.url;
      data.storagePublicId = main.publicId;
      data.storageResourceType = main.resourceType;
    } else if (main.action === "normalized") {
      data.url = main.url;
    }
    const thumb = await processUrl(row.thumbnail);
    if (thumb.action === "migrated" || thumb.action === "normalized") {
      data.thumbnail = thumb.url;
    }
    if (touches(main) || touches(thumb)) stats.rowsUpdated += 1;
    if (!DRY_RUN && Object.keys(data).length > 0) {
      await db.projectFile.update({ where: { id: row.id }, data });
    }
  }
}

async function runPlaygroundFiles(): Promise<void> {
  const rows = await db.playgroundFile.findMany({
    take: LIMIT,
    select: { id: true, url: true, thumbUrl: true },
  });
  for (const row of rows) {
    const data: Prisma.PlaygroundFileUpdateInput = {};
    const main = await processUrl(row.url);
    if (main.action === "migrated") {
      data.url = main.url;
      data.storagePublicId = main.publicId;
      data.storageResourceType = main.resourceType;
      if (main.resourceType !== "raw") {
        // Old -thumb.webp files stay on disk until the post-cutover cleanup.
        data.thumbUrl = getCloudinaryThumbUrl(main.publicId, main.resourceType);
      }
    } else if (main.action === "normalized") {
      data.url = main.url;
      const thumb = processLocalOnlyUrl(row.thumbUrl);
      if (thumb) data.thumbUrl = thumb;
    }
    if (touches(main)) stats.rowsUpdated += 1;
    if (!DRY_RUN && Object.keys(data).length > 0) {
      await db.playgroundFile.update({ where: { id: row.id }, data });
    }
  }
}

async function runPortfolio(): Promise<void> {
  const rows = await db.portfolio.findMany({
    take: LIMIT,
    select: { id: true, thumbnail: true, images: true, videoUrl: true },
  });
  for (const row of rows) {
    const data: Prisma.PortfolioUpdateInput = {};
    const thumb = await processUrl(row.thumbnail);
    if (thumb.action === "migrated" || thumb.action === "normalized") data.thumbnail = thumb.url;
    const video = await processUrl(row.videoUrl);
    if (video.action === "migrated" || video.action === "normalized") data.videoUrl = video.url;
    const images = await migrateUrlArray(row.images);
    if (images.value) data.images = images.value;
    if (touches(thumb) || touches(video) || images.touched) stats.rowsUpdated += 1;
    if (!DRY_RUN && Object.keys(data).length > 0) {
      await db.portfolio.update({ where: { id: row.id }, data });
    }
  }
}

async function runProject(): Promise<void> {
  const rows = await db.project.findMany({
    take: LIMIT,
    select: { id: true, thumbnail: true, images: true, videoUrl: true },
  });
  for (const row of rows) {
    const data: Prisma.ProjectUpdateInput = {};
    const thumb = await processUrl(row.thumbnail);
    if (thumb.action === "migrated" || thumb.action === "normalized") data.thumbnail = thumb.url;
    const video = await processUrl(row.videoUrl);
    if (video.action === "migrated" || video.action === "normalized") data.videoUrl = video.url;
    const images = await migrateUrlArray(row.images);
    if (images.value) data.images = images.value;
    if (touches(thumb) || touches(video) || images.touched) stats.rowsUpdated += 1;
    if (!DRY_RUN && Object.keys(data).length > 0) {
      await db.project.update({ where: { id: row.id }, data });
    }
  }
}

const TARGETS: Record<string, () => Promise<void>> = {
  ProjectFile: runProjectFiles,
  PlaygroundFile: runPlaygroundFiles,
  Portfolio: runPortfolio,
  Project: runProject,
  TeamMember: async () =>
    migrateSingleFields(
      (
        await db.teamMember.findMany({ take: LIMIT, select: { id: true, image: true } })
      ).map((r) => ({ id: r.id, fields: { image: r.image } })),
      (id, data) => db.teamMember.update({ where: { id }, data })
    ),
  Service: async () =>
    migrateSingleFields(
      (
        await db.service.findMany({ take: LIMIT, select: { id: true, icon: true, image: true } })
      ).map((r) => ({ id: r.id, fields: { icon: r.icon, image: r.image } })),
      (id, data) => db.service.update({ where: { id }, data })
    ),
  Testimonial: async () =>
    migrateSingleFields(
      (
        await db.testimonial.findMany({ take: LIMIT, select: { id: true, image: true } })
      ).map((r) => ({ id: r.id, fields: { image: r.image } })),
      (id, data) => db.testimonial.update({ where: { id }, data })
    ),
  BlogPost: async () =>
    migrateSingleFields(
      (
        await db.blogPost.findMany({ take: LIMIT, select: { id: true, coverImage: true } })
      ).map((r) => ({ id: r.id, fields: { coverImage: r.coverImage } })),
      (id, data) => db.blogPost.update({ where: { id }, data })
    ),
  ClientLogo: async () =>
    migrateSingleFields(
      (
        await db.clientLogo.findMany({ take: LIMIT, select: { id: true, logo: true } })
      ).map((r) => ({ id: r.id, fields: { logo: r.logo } })),
      (id, data) => db.clientLogo.update({ where: { id }, data })
    ),
  HomePageContent: async () =>
    migrateSingleFields(
      (
        await db.homePageContent.findMany({ take: LIMIT, select: { id: true, aboutImage: true } })
      ).map((r) => ({ id: r.id, fields: { aboutImage: r.aboutImage } })),
      (id, data) => db.homePageContent.update({ where: { id }, data })
    ),
  User: async () =>
    migrateSingleFields(
      (
        await db.user.findMany({ take: LIMIT, select: { id: true, image: true } })
      ).map((r) => ({ id: r.id, fields: { image: r.image } })),
      (id, data) => db.user.update({ where: { id }, data })
    ),
  PlanDeliverable: async () =>
    migrateSingleFields(
      (
        await db.planDeliverable.findMany({ take: LIMIT, select: { id: true, icon: true } })
      ).map((r) => ({ id: r.id, fields: { icon: r.icon } })),
      (id, data) => db.planDeliverable.update({ where: { id }, data })
    ),
};

async function main(): Promise<void> {
  if (!DRY_RUN && !isCloudinaryConfigured()) {
    throw new Error(
      "CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET must be set (or use --dry-run)."
    );
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const names = MODEL_FILTER ? [MODEL_FILTER] : Object.keys(TARGETS);
  for (const name of names) {
    const run = TARGETS[name];
    if (!run) throw new Error(`Unknown --model=${name}. Known: ${Object.keys(TARGETS).join(", ")}`);
    console.log(`\n=== ${name} ===`);
    const before = { ...stats, missing: stats.missing.length };
    await run();
    console.log(
      `migrated ${DRY_RUN ? stats.wouldMigrate - before.wouldMigrate : stats.migrated - before.migrated}, ` +
        `kept local ${stats.keptLocal - before.keptLocal}, ` +
        `normalized ${stats.normalized - before.normalized}, ` +
        `missing ${stats.missing.length - before.missing}`
    );
  }

  console.log(`\n=== Summary${DRY_RUN ? " (dry run — nothing written)" : ""} ===`);
  console.log(`Rows to update:      ${stats.rowsUpdated}`);
  console.log(`To Cloudinary:       ${DRY_RUN ? stats.wouldMigrate : stats.migrated} files, ${(stats.bytesToCloud / 1024 / 1024).toFixed(1)} MB (~${(stats.bytesToCloud / 1024 / 1024 / 1024).toFixed(2)} storage credits)`);
  console.log(`Kept on local disk:  ${stats.keptLocal} (over free-plan caps or documents)`);
  console.log(`Hosts normalized:    ${stats.normalized}`);
  console.log(`Already Cloudinary:  ${stats.alreadyCloud}`);
  console.log(`External (ignored):  ${stats.external}`);
  if (stats.missing.length > 0) {
    console.log(`\nMissing on disk (${stats.missing.length}) — URLs left untouched:`);
    for (const url of stats.missing) console.log(`  ${url}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
