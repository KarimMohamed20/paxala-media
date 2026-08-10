import bcrypt from "bcryptjs";

/**
 * Shared helpers for the seed scripts (`prisma/seed.ts`, `scripts/seed-content.ts`).
 *
 * Kept in its own module because `prisma/seed.ts` calls `main()` at module scope —
 * importing it from another script would run the whole base seed as a side effect.
 */

/**
 * Read a seed password from the environment, warning loudly when it falls back.
 * Production databases must never get the hardcoded defaults (DEP-04).
 */
export function seedPw(envVar: string, fallback: string): string {
  const v = process.env[envVar];
  if (!v) {
    console.warn(
      `⚠️  ${envVar} not set — using a default seed password. Set it (and change it) before seeding any shared/production database.`
    );
  }
  return v || fallback;
}

/** seedPw + bcrypt, at the cost factor used across the app. */
export async function hashSeedPw(envVar: string, fallback: string): Promise<string> {
  return bcrypt.hash(seedPw(envVar, fallback), 12);
}

export const SEED_PASSWORD_DEFAULTS = {
  admin: { env: "SEED_ADMIN_PASSWORD", fallback: "ChangeMe!Admin2026" },
  staff: { env: "SEED_STAFF_PASSWORD", fallback: "ChangeMe!Staff2026" },
  client: { env: "SEED_CLIENT_PASSWORD", fallback: "ChangeMe!Client2026" },
} as const;
