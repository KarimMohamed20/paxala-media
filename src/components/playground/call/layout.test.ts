import { describe, expect, it } from "vitest";
import { carryPin, raisedHands, resolveStage, stripMembers } from "./layout";
import type { CallMember } from "@/lib/playground/call/types";

function member(
  connectionId: string,
  overrides: Partial<CallMember> = {}
): CallMember {
  return {
    connectionId,
    userId: `user-${connectionId}`,
    name: connectionId,
    image: null,
    muted: false,
    cameraOn: false,
    sharing: false,
    handRaised: false,
    joinedAt: 0,
    ...overrides,
  };
}

describe("resolveStage", () => {
  it("has no stage when nobody is pinned or sharing", () => {
    expect(resolveStage([member("a"), member("b")], null)).toBeNull();
  });

  it("puts a screen share on the stage by itself", () => {
    // A shared screen in a 192px tile is unreadable — the whole point of
    // sharing is lost unless it gets room automatically.
    const members = [member("a"), member("b", { sharing: true })];
    expect(resolveStage(members, null)?.connectionId).toBe("b");
  });

  it("lets an explicit pin win over a screen share", () => {
    const members = [member("a"), member("b", { sharing: true })];
    expect(resolveStage(members, "a")?.connectionId).toBe("a");
  });

  it("falls back when the pinned person has gone", () => {
    const members = [member("a"), member("b", { sharing: true })];
    expect(resolveStage(members, "left-the-call")?.connectionId).toBe("b");
    expect(resolveStage([member("a")], "left-the-call")).toBeNull();
  });
});

describe("stripMembers", () => {
  it("excludes the stage member instead of showing them twice", () => {
    const members = [member("a"), member("b"), member("c")];
    const stage = members[1];
    expect(stripMembers(members, stage).map((m) => m.connectionId)).toEqual(["a", "c"]);
  });

  it("is everyone when there is no stage", () => {
    const members = [member("a"), member("b")];
    expect(stripMembers(members, null)).toHaveLength(2);
  });
});

describe("carryPin", () => {
  it("keeps a pin whose connection is still present", () => {
    expect(carryPin([member("a")], "a", "user-a")).toBe("a");
  });

  it("follows the same USER to their new connection after a reconnect", () => {
    // The 15-minute stream recycle hands everyone a new connection id; a pin
    // keyed on the old one would silently stop matching.
    const reconnected = member("a2", { userId: "user-a" });
    expect(carryPin([reconnected], "a", "user-a")).toBe("a2");
  });

  it("drops the pin when that person has actually left", () => {
    expect(carryPin([member("b")], "a", "user-a")).toBeNull();
  });

  it("is null when nothing was pinned", () => {
    expect(carryPin([member("a")], null, null)).toBeNull();
  });
});

describe("raisedHands", () => {
  it("lists other people's raised hands, never your own", () => {
    const members = [
      member("me", { handRaised: true }),
      member("a", { handRaised: true }),
      member("b"),
    ];
    expect(raisedHands(members, "me").map((m) => m.connectionId)).toEqual(["a"]);
  });
});
