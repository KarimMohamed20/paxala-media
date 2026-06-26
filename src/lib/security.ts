/**
 * Lightweight, dependency-free protections for public (unauthenticated) endpoints
 * like the contact and booking forms — which create DB rows and send emails, so
 * they are an abuse / email-relay surface.
 *
 * The rate limiter is in-memory and therefore PER-INSTANCE. This app deploys as
 * `output: "standalone"` (a single long-running Node process), so module-level
 * state persists across requests and this is effective. For a multi-instance /
 * serverless deployment, back it with Redis/Upstash instead.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10000;

/** Honeypot field name — hidden in the UI; real users never fill it, bots do. */
export const HONEYPOT_FIELD = "website";

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): { ok: boolean; remaining: number; retryAfterSec: number } {
  const now = Date.now();

  // Bound the map. First drop expired buckets; if still at the hard cap (a flood
  // of unique keys within one window), evict oldest entries by insertion order so
  // memory cannot grow without limit.
  if (buckets.size >= MAX_BUCKETS) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    if (buckets.size >= MAX_BUCKETS) {
      let toEvict = buckets.size - MAX_BUCKETS + 1;
      for (const k of buckets.keys()) {
        if (toEvict-- <= 0) break;
        buckets.delete(k);
      }
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, retryAfterSec: 0 };
  }
  if (existing.count >= opts.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true, remaining: opts.limit - existing.count, retryAfterSec: 0 };
}

/**
 * Best-effort client IP for the rate-limit key. Prefers `x-real-ip` (set by a
 * trusted reverse proxy to the real peer), then the RIGHT-most X-Forwarded-For
 * entry (the hop added by the closest trusted proxy). The LEFT-most XFF value is
 * client-supplied and spoofable, so it is never used as the key.
 *
 * NOTE: correctness depends on your proxy topology — ensure the proxy sets
 * `x-real-ip` (e.g. nginx `proxy_set_header X-Real-IP $remote_addr`), or adjust
 * which XFF hop to trust for a multi-proxy deployment.
 */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1]!;
  }
  return "unknown";
}

/** True if `value` is a present, non-empty honeypot — i.e. a likely bot. */
export function isHoneypotTripped(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Trim and hard-cap a string field; returns "" for non-strings. */
export function clampString(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
