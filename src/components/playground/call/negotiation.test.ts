import { describe, expect, it } from "vitest";
import {
  diffPeers,
  isPolite,
  peersOf,
  selfMember,
  videoBitrateFor,
} from "./negotiation";
import type { CallMember, CallSnapshot } from "@/lib/playground/call/types";

function member(connectionId: string, userId = connectionId): CallMember {
  return {
    connectionId,
    userId,
    name: userId,
    image: null,
    muted: false,
    cameraOn: false,
    sharing: false,
    handRaised: false,
    joinedAt: 0,
  };
}

function call(...ids: string[]): CallSnapshot {
  return {
    active: ids.length > 0,
    startedAt: ids.length > 0 ? 1 : null,
    startedByUserId: ids[0] ?? null,
    members: ids.map((id) => member(id)),
  };
}

describe("isPolite", () => {
  it("makes exactly one side of every pair polite", () => {
    // Both peers compute this independently and must reach opposite answers,
    // or a simultaneous offer deadlocks the connection.
    expect(isPolite("aaa", "bbb")).toBe(true);
    expect(isPolite("bbb", "aaa")).toBe(false);
  });

  it("is consistent across a whole roster", () => {
    const ids = ["c3", "a1", "b2", "d4"];
    for (const self of ids) {
      for (const peer of ids) {
        if (self === peer) continue;
        expect(isPolite(self, peer)).toBe(!isPolite(peer, self));
      }
    }
  });
});

describe("peersOf", () => {
  it("is everyone but me", () => {
    expect(peersOf(call("a", "b", "c"), "b").map((m) => m.connectionId)).toEqual([
      "a",
      "c",
    ]);
  });

  it("is empty when I am alone", () => {
    expect(peersOf(call("a"), "a")).toEqual([]);
  });
});

describe("diffPeers", () => {
  it("reports arrivals and departures", () => {
    const diff = diffPeers(["a", "b"], call("me", "b", "c"), "me");
    expect(diff.added.map((m) => m.connectionId)).toEqual(["c"]);
    expect(diff.removed).toEqual(["a"]);
  });

  it("sees a reconnect as one peer leaving and another arriving", () => {
    // A reconnecting peer comes back under a new connection id, and that is
    // precisely the signal to rebuild the RTCPeerConnection to its new address.
    const diff = diffPeers(["old"], call("me", "new"), "me");
    expect(diff.removed).toEqual(["old"]);
    expect(diff.added.map((m) => m.connectionId)).toEqual(["new"]);
  });

  it("reports nothing when the roster is unchanged", () => {
    const diff = diffPeers(["a"], call("me", "a"), "me");
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it("never counts me as my own peer", () => {
    const diff = diffPeers([], call("me", "a"), "me");
    expect(diff.added.map((m) => m.connectionId)).toEqual(["a"]);
  });
});

describe("selfMember", () => {
  it("finds me, and copes with no connection yet", () => {
    expect(selfMember(call("a", "b"), "b")?.connectionId).toBe("b");
    expect(selfMember(call("a"), "zzz")).toBeNull();
    expect(selfMember(call("a"), null)).toBeNull();
  });
});

describe("videoBitrateFor", () => {
  it("gives a screen share more headroom than a face", () => {
    expect(videoBitrateFor("screen", 1)).toBeGreaterThan(
      videoBitrateFor("camera", 1)
    );
  });

  it("tightens the budget as the mesh grows", () => {
    // Every extra participant is another full copy of the outgoing stream.
    expect(videoBitrateFor("camera", 4)).toBeLessThan(videoBitrateFor("camera", 2));
  });

  it("always returns a usable positive rate", () => {
    for (const peers of [0, 1, 2, 3, 4, 5]) {
      expect(videoBitrateFor("camera", peers)).toBeGreaterThan(100_000);
    }
  });
});
