import { describe, expect, it } from "vitest";
import { roomBus, type BusEvent, type RoomSubscriber } from "./bus";

/**
 * The unicast and teardown paths that WebRTC signaling depends on.
 *
 * Broadcast fan-out is exercised everywhere in the app; `sendTo` is not — and
 * an SDP offer delivered to the whole room instead of one peer would be
 * answered by everybody.
 */

let seq = 0;

function subscriber(overrides: Partial<RoomSubscriber> = {}) {
  seq += 1;
  const received: BusEvent[] = [];
  const sub: RoomSubscriber = {
    connectionId: `conn-${seq}`,
    userId: `user-${seq}`,
    name: null,
    image: null,
    isStaff: true,
    send: (event) => received.push(event),
    presence: { cursor: null, viewport: null, selection: [] },
    updatedAt: Date.now(),
    ...overrides,
  };
  return { sub, received };
}

const SIGNAL: BusEvent = {
  type: "rtc",
  from: "conn-a",
  fromUserId: "user-a",
  signal: { candidate: "x" },
};

describe("sendTo", () => {
  it("delivers to exactly one connection", () => {
    const room = "room-unicast";
    const a = subscriber();
    const b = subscriber();
    const unsubA = roomBus.subscribe(room, a.sub);
    const unsubB = roomBus.subscribe(room, b.sub);

    try {
      expect(roomBus.sendTo(room, b.sub.connectionId, SIGNAL)).toBe(true);
      expect(b.received).toContainEqual(SIGNAL);
      // The other participant must never see someone else's offer.
      expect(a.received).not.toContainEqual(SIGNAL);
    } finally {
      unsubA();
      unsubB();
    }
  });

  it("reports a miss instead of swallowing it", () => {
    // The caller turns this into "that peer is gone" rather than waiting on an
    // answer that can never arrive.
    const room = "room-miss";
    const a = subscriber();
    const unsub = roomBus.subscribe(room, a.sub);
    try {
      expect(roomBus.sendTo(room, "conn-ghost", SIGNAL)).toBe(false);
      expect(roomBus.sendTo("room-that-does-not-exist", a.sub.connectionId, SIGNAL)).toBe(
        false
      );
    } finally {
      unsub();
    }
  });

  it("reports a miss when the target's socket throws", () => {
    const room = "room-dead-socket";
    const dead = subscriber({
      send: () => {
        throw new Error("socket closed");
      },
    });
    const unsub = roomBus.subscribe(room, dead.sub);
    try {
      expect(roomBus.sendTo(room, dead.sub.connectionId, SIGNAL)).toBe(false);
    } finally {
      unsub();
    }
  });
});

describe("ownsConnection", () => {
  it("only recognises the session that opened the stream", () => {
    // Connection ids are broadcast to the whole room in every presence
    // roster, so quoting one must not be enough to act as its owner.
    const room = "room-ownership";
    const a = subscriber();
    const b = subscriber();
    const unsubA = roomBus.subscribe(room, a.sub);
    const unsubB = roomBus.subscribe(room, b.sub);

    try {
      expect(roomBus.ownsConnection(room, a.sub.connectionId, a.sub.userId)).toBe(true);
      // B quoting A's connection id — mute them, drop them from a call.
      expect(roomBus.ownsConnection(room, a.sub.connectionId, b.sub.userId)).toBe(false);
      expect(roomBus.ownsConnection(room, "conn-ghost", a.sub.userId)).toBe(false);
      expect(roomBus.ownsConnection("other-room", a.sub.connectionId, a.sub.userId)).toBe(
        false
      );
    } finally {
      unsubA();
      unsubB();
    }
  });

  it("stops recognising a connection once its stream is gone", () => {
    const room = "room-ownership-gone";
    const a = subscriber();
    const unsub = roomBus.subscribe(room, a.sub);
    unsub();
    expect(roomBus.ownsConnection(room, a.sub.connectionId, a.sub.userId)).toBe(false);
  });
});

describe("onDisconnect", () => {
  it("fires with the connection that went away", () => {
    const room = "room-disconnect";
    const seen: Array<[string, string, string]> = [];
    roomBus.onDisconnect("test", (roomId, connectionId, userId) =>
      seen.push([roomId, connectionId, userId])
    );

    const a = subscriber();
    const b = subscriber();
    const unsubA = roomBus.subscribe(room, a.sub);
    const unsubB = roomBus.subscribe(room, b.sub);
    unsubB();

    expect(seen).toContainEqual([room, b.sub.connectionId, b.sub.userId]);

    // The LAST connection leaving must fire too: that path also deletes the
    // room map, and a call whose final participant vanished still needs
    // cleaning up.
    seen.length = 0;
    unsubA();
    expect(seen).toContainEqual([room, a.sub.connectionId, a.sub.userId]);

    // Replaced by name rather than stacked, so a hot reload cannot accumulate
    // a handler per edit.
    roomBus.onDisconnect("test", () => {});
  });
});
