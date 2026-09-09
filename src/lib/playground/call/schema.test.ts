import { describe, expect, it } from "vitest";
import {
  MAX_SIGNAL_BYTES,
  parseCallAction,
  parseConnectionId,
  withinSignalBudget,
} from "./schema";

const CONNECTION = "6f0a2c9e-1b3d-4e5f-8a7b-9c0d1e2f3a4b";

describe("parseConnectionId", () => {
  it("accepts the server-minted uuid shape", () => {
    expect(parseConnectionId(CONNECTION)).toBe(CONNECTION);
  });

  it("rejects anything else", () => {
    expect(parseConnectionId("not-a-uuid")).toBeUndefined();
    expect(parseConnectionId(42)).toBeUndefined();
    expect(parseConnectionId(null)).toBeUndefined();
    expect(parseConnectionId("")).toBeUndefined();
  });
});

describe("parseCallAction", () => {
  it("parses the simple actions", () => {
    expect(parseCallAction({ action: "join" })).toEqual({ action: "join" });
    expect(parseCallAction({ action: "leave" })).toEqual({ action: "leave" });
  });

  it("rejects unknown or missing actions", () => {
    expect(parseCallAction({ action: "hangup" })).toBeUndefined();
    expect(parseCallAction({})).toBeUndefined();
    expect(parseCallAction(null)).toBeUndefined();
    expect(parseCallAction("join")).toBeUndefined();
  });

  it("takes only the four known state flags, and only as booleans", () => {
    expect(
      parseCallAction({ action: "state", state: { muted: true, handRaised: false } })
    ).toEqual({ action: "state", state: { muted: true, handRaised: false } });

    // The roster is broadcast to everyone, so an unknown key would be an
    // arbitrary write into what every other participant renders.
    expect(
      parseCallAction({ action: "state", state: { muted: true, isAdmin: true } })
    ).toEqual({ action: "state", state: { muted: true } });

    expect(parseCallAction({ action: "state", state: { muted: "yes" } })).toBeUndefined();
    expect(parseCallAction({ action: "state", state: {} })).toBeUndefined();
    expect(parseCallAction({ action: "state" })).toBeUndefined();
  });

  it("requires a valid target and a body for a signal", () => {
    const signal = { description: { type: "offer", sdp: "v=0" } };
    expect(parseCallAction({ action: "signal", to: CONNECTION, signal })).toEqual({
      action: "signal",
      to: CONNECTION,
      signal,
    });

    expect(parseCallAction({ action: "signal", to: "nope", signal })).toBeUndefined();
    expect(parseCallAction({ action: "signal", to: CONNECTION })).toBeUndefined();
    expect(
      parseCallAction({ action: "signal", to: CONNECTION, signal: null })
    ).toBeUndefined();
  });

  it("refuses an oversized signal rather than relaying it to a peer", () => {
    const huge = { sdp: "x".repeat(MAX_SIGNAL_BYTES + 1) };
    expect(
      parseCallAction({ action: "signal", to: CONNECTION, signal: huge })
    ).toBeUndefined();
  });
});

describe("withinSignalBudget", () => {
  it("measures the serialised form, which is what crosses the wire", () => {
    expect(withinSignalBudget({ sdp: "v=0" })).toBe(true);
    expect(withinSignalBudget({ sdp: "x".repeat(MAX_SIGNAL_BYTES) })).toBe(false);
  });

  it("rejects a circular structure instead of throwing", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(withinSignalBudget(circular)).toBe(false);
  });
});
