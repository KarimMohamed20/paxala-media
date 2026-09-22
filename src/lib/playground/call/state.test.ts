import { describe, expect, it } from "vitest";
import {
  RECONNECT_GRACE_MS,
  connectionLost,
  dropExpired,
  emptyRoom,
  isIdle,
  join,
  leave,
  removeMember,
  setMemberState,
  snapshotOf,
} from "./state";
import { MAX_CALL_PARTICIPANTS } from "./types";

/**
 * The call roster's time-dependent rules. Every case here is one a live call
 * hits routinely — a 15-minute stream recycle, a closed laptop, a second tab —
 * and none of them is observable without controlling the clock.
 */

const T0 = 1_000_000;

function member(n: number) {
  return {
    connectionId: `conn-${n}`,
    userId: `user-${n}`,
    name: `User ${n}`,
    image: null,
  };
}

describe("join", () => {
  it("starts the call and stamps who started it", () => {
    const room = emptyRoom();
    const result = join(room, member(1), T0);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.started).toBe(true);
    expect(result.snapshot.active).toBe(true);
    expect(result.snapshot.startedAt).toBe(T0);
    expect(result.snapshot.startedByUserId).toBe("user-1");
  });

  it("joins the mic live and the camera dark", () => {
    const room = emptyRoom();
    const result = join(room, member(1), T0);
    if (!result.ok) return;
    const [only] = result.snapshot.members;
    expect(only.muted).toBe(false);
    expect(only.cameraOn).toBe(false);
    expect(only.sharing).toBe(false);
    expect(only.handRaised).toBe(false);
  });

  it("reports started=false for everyone after the first", () => {
    const room = emptyRoom();
    join(room, member(1), T0);
    const second = join(room, member(2), T0 + 500);
    if (!second.ok) return;
    expect(second.started).toBe(false);
    expect(second.snapshot.startedAt).toBe(T0);
    expect(second.snapshot.members).toHaveLength(2);
  });

  it("refuses the sixth participant rather than degrading the mesh", () => {
    const room = emptyRoom();
    for (let i = 1; i <= MAX_CALL_PARTICIPANTS; i++) {
      expect(join(room, member(i), T0).ok).toBe(true);
    }
    const overflow = join(room, member(99), T0);
    expect(overflow).toEqual({ ok: false, reason: "full" });
  });

  it("takes over a user's own seat instead of seating them twice", () => {
    // A second tab, or a retried join. Two live seats for one person means
    // two microphones in one room feeding each other.
    const room = emptyRoom();
    join(room, member(1), T0);
    const again = join(
      room,
      { ...member(1), connectionId: "conn-1b" },
      T0 + 100
    );

    if (!again.ok) return;
    expect(again.snapshot.members).toHaveLength(1);
    expect(again.snapshot.members[0].connectionId).toBe("conn-1b");
    // The takeover is not a new call.
    expect(again.snapshot.startedAt).toBe(T0);
  });

  it("counts reconnecting members against capacity", () => {
    // Streams recycle every 15 minutes, so a busy call routinely has members
    // inside the grace window. They still hold a tile, and their seats must
    // not be handed to newcomers.
    const room = emptyRoom();
    for (let i = 1; i <= MAX_CALL_PARTICIPANTS; i++) join(room, member(i), T0);
    connectionLost(room, "conn-4", T0 + 1);
    connectionLost(room, "conn-5", T0 + 1);

    expect(join(room, member(98), T0 + 2)).toEqual({ ok: false, reason: "full" });
  });

  it("lets a member whose stream recycled back into their own call", () => {
    // The failure this prevents: two people's streams recycle, two newcomers
    // take the free-looking seats, and the originals are told the call they
    // are already on is full.
    const room = emptyRoom();
    for (let i = 1; i <= MAX_CALL_PARTICIPANTS; i++) join(room, member(i), T0);
    connectionLost(room, "conn-5", T0 + 1);

    const rejoin = join(
      room,
      { ...member(5), connectionId: "conn-5b" },
      T0 + 2
    );
    expect(rejoin.ok).toBe(true);
    if (!rejoin.ok) return;
    expect(rejoin.snapshot.members).toHaveLength(MAX_CALL_PARTICIPANTS);
  });

  it("re-opens the seat once the grace window passes", () => {
    const room = emptyRoom();
    for (let i = 1; i <= MAX_CALL_PARTICIPANTS; i++) join(room, member(i), T0);
    connectionLost(room, "conn-5", T0);

    expect(join(room, member(98), T0 + 1).ok).toBe(false);
    expect(join(room, member(98), T0 + RECONNECT_GRACE_MS).ok).toBe(true);
  });

  it("frees the seat a takeover releases, so capacity is per user", () => {
    const room = emptyRoom();
    for (let i = 1; i <= MAX_CALL_PARTICIPANTS; i++) join(room, member(i), T0);
    // The same user reconnecting must not be refused for being "full".
    const rejoin = join(
      room,
      { ...member(3), connectionId: "conn-3b" },
      T0 + 100
    );
    expect(rejoin.ok).toBe(true);
  });
});

describe("leave", () => {
  it("frees the seat immediately — no grace for a deliberate exit", () => {
    const room = emptyRoom();
    join(room, member(1), T0);
    join(room, member(2), T0);

    const snapshot = leave(room, "conn-1", T0 + 10);
    expect(snapshot.members.map((m) => m.connectionId)).toEqual(["conn-2"]);
    expect(room.pending.size).toBe(0);
  });

  it("ends the call when the last participant leaves", () => {
    const room = emptyRoom();
    join(room, member(1), T0);
    const snapshot = leave(room, "conn-1", T0 + 10);

    expect(snapshot.active).toBe(false);
    expect(snapshot.startedAt).toBeNull();
    expect(isIdle(room, T0 + 10)).toBe(true);
  });
});

describe("reconnect grace", () => {
  it("keeps a dropped member visible while their stream reconnects", () => {
    // This is the 15-minute stream recycle, which every long call hits.
    const room = emptyRoom();
    join(room, member(1), T0);
    join(room, member(2), T0);

    const snapshot = connectionLost(room, "conn-2", T0 + 1000);
    expect(snapshot.members).toHaveLength(2);
    expect(snapshot.active).toBe(true);
  });

  it("hands the seat back to the same user under their new connection", () => {
    const room = emptyRoom();
    join(room, member(1), T0);
    join(room, member(2), T0);
    connectionLost(room, "conn-2", T0 + 1000);

    const rejoin = join(
      room,
      { ...member(2), connectionId: "conn-2b" },
      T0 + 2000
    );

    if (!rejoin.ok) return;
    expect(rejoin.snapshot.members).toHaveLength(2);
    expect(rejoin.snapshot.members.map((m) => m.connectionId)).toContain("conn-2b");
    expect(room.pending.size).toBe(0);
  });

  it("drops a member who never comes back", () => {
    const room = emptyRoom();
    join(room, member(1), T0);
    join(room, member(2), T0);
    connectionLost(room, "conn-2", T0);

    // Still held one tick before the deadline...
    expect(snapshotOf(room).members).toHaveLength(2);
    dropExpired(room, T0 + RECONNECT_GRACE_MS - 1);
    expect(snapshotOf(room).members).toHaveLength(2);

    // ...and gone once it passes.
    dropExpired(room, T0 + RECONNECT_GRACE_MS);
    expect(snapshotOf(room).members).toHaveLength(1);
  });

  it("ends the call when the last member's grace expires", () => {
    const room = emptyRoom();
    join(room, member(1), T0);
    connectionLost(room, "conn-1", T0);

    expect(isIdle(room, T0 + 1)).toBe(false);
    expect(isIdle(room, T0 + RECONNECT_GRACE_MS)).toBe(true);
    expect(snapshotOf(room).active).toBe(false);
  });

  it("does not restart the clock when a lone member reconnects", () => {
    // Otherwise the header's call duration resets mid-conversation.
    const room = emptyRoom();
    join(room, member(1), T0);
    connectionLost(room, "conn-1", T0 + 5000);

    const rejoin = join(
      room,
      { ...member(1), connectionId: "conn-1b" },
      T0 + 6000
    );
    if (!rejoin.ok) return;
    expect(rejoin.started).toBe(false);
    expect(rejoin.snapshot.startedAt).toBe(T0);
  });
});

describe("setMemberState", () => {
  it("applies only the fields given", () => {
    const room = emptyRoom();
    join(room, member(1), T0);

    setMemberState(room, "conn-1", { muted: true }, T0 + 1);
    const snapshot = setMemberState(room, "conn-1", { handRaised: true }, T0 + 2);

    const [only] = snapshot.members;
    expect(only.muted).toBe(true);
    expect(only.handRaised).toBe(true);
    expect(only.cameraOn).toBe(false);
  });

  it("ignores an unknown connection instead of inventing a member", () => {
    const room = emptyRoom();
    join(room, member(1), T0);
    const snapshot = setMemberState(room, "ghost", { muted: true }, T0 + 1);
    expect(snapshot.members).toHaveLength(1);
    expect(snapshot.members[0].muted).toBe(false);
  });
});

describe("snapshotOf", () => {
  it("orders by join time so tiles do not shuffle on every update", () => {
    const room = emptyRoom();
    join(room, member(2), T0 + 10);
    join(room, member(1), T0);
    join(room, member(3), T0 + 20);

    expect(snapshotOf(room).members.map((m) => m.userId)).toEqual([
      "user-1",
      "user-2",
      "user-3",
    ]);
  });

  it("never leaks the grace deadline to the browser", () => {
    const room = emptyRoom();
    join(room, member(1), T0);
    connectionLost(room, "conn-1", T0);

    const [only] = snapshotOf(room).members;
    expect(only).not.toHaveProperty("pendingUntil");
  });
});

describe("initial state from the pre-join screen", () => {
  it("seats someone muted and on camera when they chose that", () => {
    const room = emptyRoom();
    const result = join(room, { ...member(1), state: { muted: true, cameraOn: true } }, T0);
    if (!result.ok) return;
    const [only] = result.snapshot.members;
    expect(only.muted).toBe(true);
    expect(only.cameraOn).toBe(true);
  });

  it("keeps the defaults for anything not chosen", () => {
    const room = emptyRoom();
    const result = join(room, { ...member(1), state: { muted: true } }, T0);
    if (!result.ok) return;
    expect(result.snapshot.members[0].cameraOn).toBe(false);
  });
});

describe("removeMember", () => {
  it("drops the member and blocks them from rejoining this call", () => {
    const room = emptyRoom();
    join(room, member(1), T0);
    join(room, member(2), T0);

    const snapshot = removeMember(room, "conn-2", T0 + 1);
    expect(snapshot?.members.map((m) => m.userId)).toEqual(["user-1"]);

    // Same user, new tab: still out.
    expect(join(room, { ...member(2), connectionId: "conn-2b" }, T0 + 2)).toEqual({
      ok: false,
      reason: "removed",
    });
  });

  it("removes a member who is mid-reconnect, not just a live one", () => {
    const room = emptyRoom();
    join(room, member(1), T0);
    join(room, member(2), T0);
    connectionLost(room, "conn-2", T0 + 1);

    const snapshot = removeMember(room, "conn-2", T0 + 2);
    expect(snapshot?.members).toHaveLength(1);
    expect(room.pending.size).toBe(0);
  });

  it("answers null for someone not on the call instead of pretending", () => {
    const room = emptyRoom();
    join(room, member(1), T0);
    expect(removeMember(room, "ghost", T0 + 1)).toBeNull();
  });

  it("lifts the block when the call ends — a removal is per meeting", () => {
    const room = emptyRoom();
    join(room, member(1), T0);
    join(room, member(2), T0);
    removeMember(room, "conn-2", T0 + 1);
    leave(room, "conn-1", T0 + 2);

    // A fresh call: the previously removed user may join.
    expect(join(room, member(2), T0 + 3).ok).toBe(true);
  });

  it("frees the removed member's seat for capacity", () => {
    const room = emptyRoom();
    for (let i = 1; i <= MAX_CALL_PARTICIPANTS; i++) join(room, member(i), T0);
    removeMember(room, "conn-5", T0 + 1);
    expect(join(room, member(98), T0 + 2).ok).toBe(true);
  });
});
