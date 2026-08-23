/**
 * Verify the CLOUDINARY_* credentials in the current environment.
 *
 *   npx tsx scripts/check-cloudinary.ts
 *
 * Pings the Admin API for account usage, then round-trips a tiny generated
 * image through the real upload path and deletes it again. Run this after
 * setting credentials locally, and again on the VPS before the backfill —
 * it fails loudly on a wrong secret instead of silently falling back to disk.
 */
import { v2 as cloudinary } from "cloudinary";
import { isCloudinaryConfigured } from "../src/lib/storage";

// tsx does not load .env the way `next dev` does. Node's loader never
// overrides variables already exported in the shell, so this is a no-op
// wherever the environment is set up properly (e.g. the VPS).
try {
  process.loadEnvFile(".env");
} catch {
  // No .env here — rely on the exported environment.
}

// 1x1 transparent PNG — small enough to cost nothing, real enough to upload.
const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

async function main(): Promise<void> {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Missing credentials. All three must be set: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
    );
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  console.log(`Cloud name: ${process.env.CLOUDINARY_CLOUD_NAME}`);

  const usage = await cloudinary.api.usage();
  const credits = usage.credits;
  if (credits) {
    console.log(
      `Plan: ${usage.plan} — credits used ${credits.usage} / ${credits.limit} (${credits.used_percent}%)`
    );
  } else {
    console.log(`Plan: ${usage.plan}`);
  }
  console.log(
    `Storage: ${(usage.storage.usage / 1024 / 1024).toFixed(1)} MB, ` +
      `bandwidth: ${(usage.bandwidth.usage / 1024 / 1024).toFixed(1)} MB, ` +
      `assets: ${usage.resources}`
  );

  const publicId = "paxala/_healthcheck";
  const uploaded = await new Promise<{ secure_url: string; public_id: string }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { public_id: publicId, overwrite: true, resource_type: "image" },
        (error, result) => {
          if (error || !result) reject(error ?? new Error("no result"));
          else resolve(result);
        }
      );
      stream.end(PIXEL_PNG);
    }
  );
  console.log(`Upload OK:  ${uploaded.secure_url}`);

  await cloudinary.uploader.destroy(uploaded.public_id, { resource_type: "image" });
  console.log(`Delete OK:  ${uploaded.public_id}`);
  console.log("\nCredentials are valid — uploads will go to Cloudinary.");
}

main().catch((error: unknown) => {
  const message =
    error && typeof error === "object" && "error" in error
      ? JSON.stringify((error as { error: unknown }).error)
      : String(error);
  console.error(`\nFAILED: ${message}`);
  console.error(
    "\nIf this says 'cloud_name mismatch' or 'Invalid Signature', re-copy the " +
      "three values from the Cloudinary Console dashboard (Settings > Access Keys)."
  );
  process.exitCode = 1;
});
