import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import {
  TURN_CREDENTIAL_TTL_SECONDS,
  iceServersFor,
  turnConfigFromEnv,
} from "./ice";

const TURN = { url: "turn:example.com:3478", secret: "s3cr3t" };
const NOW = 1_700_000_000_000;

describe("turnConfigFromEnv", () => {
  it("requires both the url and the secret", () => {
    expect(turnConfigFromEnv({ TURN_URL: TURN.url, TURN_SECRET: TURN.secret })).toEqual(
      TURN
    );
    // Half a configuration would mint credentials coturn always rejects.
    expect(turnConfigFromEnv({ TURN_URL: TURN.url })).toBeNull();
    expect(turnConfigFromEnv({ TURN_SECRET: TURN.secret })).toBeNull();
    expect(turnConfigFromEnv({})).toBeNull();
    expect(turnConfigFromEnv({ TURN_URL: "  ", TURN_SECRET: TURN.secret })).toBeNull();
  });
});

describe("iceServersFor", () => {
  it("returns public STUN only when TURN is not configured", () => {
    const servers = iceServersFor("user-1", { turn: null });
    expect(servers).toHaveLength(1);
    expect(String(servers[0].urls)).toContain("stun:");
    expect(servers[0].username).toBeUndefined();
  });

  it("mints a time-limited credential coturn can recompute", () => {
    const [, turn] = iceServersFor("user-1", { turn: TURN, now: NOW });

    const expiry = Math.floor(NOW / 1000) + TURN_CREDENTIAL_TTL_SECONDS;
    expect(turn.username).toBe(`${expiry}:user-1`);
    // Exactly what coturn does with its own copy of the secret.
    expect(turn.credential).toBe(
      createHmac("sha1", TURN.secret).update(`${expiry}:user-1`).digest("base64")
    );
    expect(turn.urls).toBe(TURN.url);
  });

  it("never returns the shared secret itself", () => {
    const servers = iceServersFor("user-1", { turn: TURN, now: NOW });
    expect(JSON.stringify(servers)).not.toContain(TURN.secret);
  });

  it("gives different users different credentials", () => {
    const [, a] = iceServersFor("user-1", { turn: TURN, now: NOW });
    const [, b] = iceServersFor("user-2", { turn: TURN, now: NOW });
    expect(a.credential).not.toBe(b.credential);
  });

  it("keeps STUN alongside TURN so direct paths are still tried first", () => {
    const servers = iceServersFor("user-1", { turn: TURN, now: NOW });
    expect(servers).toHaveLength(2);
    expect(String(servers[0].urls)).toContain("stun:");
  });
});
