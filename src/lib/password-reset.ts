import crypto from "crypto";

/**
 * Stateless password-reset tokens.
 *
 * The HMAC key mixes NEXTAUTH_SECRET with the user's CURRENT password hash, so
 * a token stops verifying the moment the password changes — single-use without
 * a token table or migration. TTL is enforced by the signed expiry timestamp.
 *
 * Known limitation of the stateless design: resetting the password does NOT
 * revoke already-issued login sessions — NextAuth JWTs keep working until they
 * expire (default 30 days). Revocation-on-reset needs server-side session
 * state or a password-version claim in the JWT; revisit if that threat matters.
 */

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function sign(data: string, passwordHash: string): string {
  const base = process.env.NEXTAUTH_SECRET;
  if (!base) {
    throw new Error("NEXTAUTH_SECRET must be set to issue reset tokens");
  }
  return crypto
    .createHmac("sha256", `${base}:${passwordHash}`)
    .update(data)
    .digest("base64url");
}

export function createResetToken(user: {
  id: string;
  password: string;
}): string {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const data = `${user.id}.${expiresAt}`;
  return `${Buffer.from(data, "utf8").toString("base64url")}.${sign(data, user.password)}`;
}

export interface ParsedResetToken {
  userId: string;
  expiresAt: number;
  data: string;
  signature: string;
}

/** Structural parse only — no verification. Returns null for malformed input. */
export function parseResetToken(token: string): ParsedResetToken | null {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  // Buffer.from never throws on malformed base64url; a mangled decode simply
  // fails the HMAC check downstream.
  const data = Buffer.from(parts[0], "base64url").toString("utf8");

  // User ids are cuids (no dots), so the last dot separates id from expiry.
  const sep = data.lastIndexOf(".");
  if (sep <= 0) return null;
  const userId = data.slice(0, sep);
  const expiresAt = Number(data.slice(sep + 1));
  if (!userId || !Number.isFinite(expiresAt)) return null;

  return { userId, expiresAt, data, signature: parts[1] };
}

/** Full check: expiry + HMAC against the user's current password hash. */
export function verifyResetToken(
  parsed: ParsedResetToken,
  passwordHash: string
): boolean {
  if (parsed.expiresAt < Date.now()) return false;

  const expected = Buffer.from(sign(parsed.data, passwordHash), "utf8");
  const provided = Buffer.from(parsed.signature, "utf8");
  return (
    expected.length === provided.length &&
    crypto.timingSafeEqual(expected, provided)
  );
}
