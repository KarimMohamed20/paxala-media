import { createHmac } from "crypto";
import type { IceServerConfig } from "./types";

/**
 * ICE servers for a call, minted per join.
 *
 * SERVER-SIDE ONLY. The TURN shared secret must never reach a browser, so the
 * credentials handed out here are derived, time-limited and per-user — the
 * coturn "REST API" scheme (`use-auth-secret` / `static-auth-secret`):
 *
 *   username   = <unix expiry>:<userId>
 *   credential = base64(HMAC-SHA1(secret, username))
 *
 * coturn recomputes the same HMAC from its own copy of the secret, so nothing
 * is stored on its side and a leaked credential dies on its own within hours.
 * This is why the secret is never a NEXT_PUBLIC_ var — see
 * docs/playground-configuration.md.
 *
 * TURN IS OPTIONAL. With no TURN configured this returns public STUN alone,
 * which is enough for most home and office networks; the calls that fail
 * without a relay are the carrier-NAT mobile ones. Degrading quietly is
 * deliberate — a missing relay should cost reliability, not the whole feature.
 */

/** Google's public STUN, the de-facto default. Discovery only, no media. */
const PUBLIC_STUN = ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"];

/** Long enough to outlive a meeting, short enough that a leak expires. */
export const TURN_CREDENTIAL_TTL_SECONDS = 4 * 60 * 60;

export type TurnConfig = {
  url: string;
  secret: string;
};

/**
 * Reads the environment. Absent or half-configured TURN yields null.
 *
 * Typed as a plain string map rather than NodeJS.ProcessEnv so a test can pass
 * exactly the two keys under test instead of a whole synthetic environment.
 */
export function turnConfigFromEnv(
  env: Record<string, string | undefined> = process.env
): TurnConfig | null {
  const url = env.TURN_URL?.trim();
  const secret = env.TURN_SECRET?.trim();
  // Half a configuration is a misconfiguration: minting credentials against a
  // missing secret would hand out an empty HMAC that coturn always rejects.
  if (!url || !secret) return null;
  return { url, secret };
}

/**
 * The ice server list for one user.
 *
 * `now` is injected so the credential is reproducible in tests; callers pass
 * nothing in production.
 */
export function iceServersFor(
  userId: string,
  options: { turn?: TurnConfig | null; now?: number } = {}
): IceServerConfig[] {
  const servers: IceServerConfig[] = [{ urls: PUBLIC_STUN }];

  const turn = options.turn === undefined ? turnConfigFromEnv() : options.turn;
  if (!turn) return servers;

  const now = options.now ?? Date.now();
  const expiry = Math.floor(now / 1000) + TURN_CREDENTIAL_TTL_SECONDS;
  const username = `${expiry}:${userId}`;

  servers.push({
    urls: turn.url,
    username,
    credential: createHmac("sha1", turn.secret).update(username).digest("base64"),
  });

  return servers;
}
