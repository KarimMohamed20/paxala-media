import { roomBus } from "../bus";
import {
  connectionLost,
  dropExpired,
  emptyRoom,
  isIdle,
  join,
  leave,
  removeMember,
  setMemberState,
  snapshotOf,
  type CallRoom,
  type JoinInput,
  type JoinResult,
} from "./state";
import type { TargetStatus } from "./moderation";
import {
  EMPTY_CALL,
  type CallControlCommand,
  type CallMemberState,
  type CallSnapshot,
} from "./types";

/**
 * Live calls, per room, in this process.
 *
 * Held on `globalThis` for exactly the reasons the bus documents: Turbopack
 * re-evaluates route modules on every hot reload, and a plain module-level Map
 * would orphan every in-progress call behind an unreachable reference.
 *
 * SAME SINGLE-INSTANCE INVARIANT AS THE BUS. A second app container would get
 * its own registry and its own idea of who is on the call, with no error. One
 * app service, no replicas — see bus.ts.
 *
 * Nothing here is persisted. A call is a thing happening right now; when the
 * server restarts there is no call, which is the truth. (An audit trail would
 * be a PlaygroundEvent, deliberately out of scope: signaling through the event
 * log would serialize on the room row and inflate the op sequence that every
 * client's gap detector watches.)
 */

const GLOBAL_KEY = Symbol.for("pmp.playground.calls");
const SWEEP_INTERVAL_MS = 10_000;

type Registry = {
  rooms: Map<string, CallRoom>;
  sweep: ReturnType<typeof setInterval> | null;
};

const store = globalThis as unknown as { [GLOBAL_KEY]?: Registry };
const registry: Registry = (store[GLOBAL_KEY] ??= {
  rooms: new Map(),
  sweep: null,
});

function roomOf(roomId: string): CallRoom {
  let room = registry.rooms.get(roomId);
  if (!room) {
    room = emptyRoom();
    registry.rooms.set(roomId, room);
  }
  return room;
}

/** Push the roster to everyone in the room, including the person who changed it. */
function publish(roomId: string, snapshot: CallSnapshot): void {
  roomBus.broadcast(roomId, { type: "call", call: snapshot });
  if (!snapshot.active) registry.rooms.delete(roomId);
}

export function callSnapshot(roomId: string, now = Date.now()): CallSnapshot {
  const room = registry.rooms.get(roomId);
  if (!room) return EMPTY_CALL;
  dropExpired(room, now);
  return snapshotOf(room);
}

/** True when no call is running — the gate for "only staff may START one". */
export function callIsIdle(roomId: string, now = Date.now()): boolean {
  const room = registry.rooms.get(roomId);
  return !room || isIdle(room, now);
}

export function joinCall(
  roomId: string,
  input: JoinInput,
  now = Date.now()
): JoinResult {
  const result = join(roomOf(roomId), input, now);
  if (result.ok) publish(roomId, result.snapshot);
  return result;
}

export function leaveCall(
  roomId: string,
  connectionId: string,
  now = Date.now()
): CallSnapshot {
  const room = registry.rooms.get(roomId);
  if (!room) return EMPTY_CALL;
  const snapshot = leave(room, connectionId, now);
  publish(roomId, snapshot);
  return snapshot;
}

export function updateCallMember(
  roomId: string,
  connectionId: string,
  patch: Partial<CallMemberState>,
  now = Date.now()
): CallSnapshot {
  const room = registry.rooms.get(roomId);
  if (!room) return EMPTY_CALL;
  const snapshot = setMemberState(room, connectionId, patch, now);
  publish(roomId, snapshot);
  return snapshot;
}

/** Is this connection actually on the call? Guards signal forwarding. */
export function isOnCall(roomId: string, connectionId: string): boolean {
  const room = registry.rooms.get(roomId);
  return room?.members.has(connectionId) ?? false;
}

/**
 * Where a connection stands: connected, holding a seat through a reconnect,
 * or not on the call. Moderation needs the distinction — a pending member can
 * be removed but cannot receive a mute request.
 */
export function seatStatus(roomId: string, connectionId: string): TargetStatus {
  const room = registry.rooms.get(roomId);
  if (!room) return "absent";
  if (room.members.has(connectionId)) return "live";
  if (room.pending.has(connectionId)) return "pending";
  return "absent";
}

/**
 * Apply a host command to the roster.
 *
 * Only what the SERVER can truthfully know is applied here: a removal and a
 * lowered hand (a hand is just a flag). Mute, camera and share are left to
 * the target's own browser, which reports back through an ordinary state
 * update once it has complied. Setting `muted` here instead would make the
 * roster claim a microphone is off while a modified client is still sending
 * audio — the roster has to describe the call, not the host's wishes.
 */
export function applyModeration(
  roomId: string,
  targetConnectionId: string,
  command: CallControlCommand,
  now = Date.now()
): CallSnapshot | null {
  const room = registry.rooms.get(roomId);
  if (!room) return null;

  if (command === "remove") {
    const snapshot = removeMember(room, targetConnectionId, now);
    if (snapshot) publish(roomId, snapshot);
    return snapshot;
  }

  if (command === "lowerHand") {
    const snapshot = setMemberState(
      room,
      targetConnectionId,
      { handRaised: false },
      now
    );
    publish(roomId, snapshot);
    return snapshot;
  }

  return snapshotOf(room);
}

/**
 * A stream died. The member keeps their seat for the grace window, because the
 * overwhelmingly common cause is the 15-minute stream recycle rather than
 * someone leaving.
 */
function onConnectionLost(roomId: string, connectionId: string): void {
  const room = registry.rooms.get(roomId);
  if (!room || (!room.members.has(connectionId) && !room.pending.has(connectionId))) {
    return;
  }
  publish(roomId, connectionLost(room, connectionId, Date.now()));
}

/**
 * Expire abandoned seats even when nothing else touches the room.
 *
 * Without this, the last participant closing their laptop would leave the call
 * showing them forever: every other code path is triggered by a request, and
 * there are no more requests. `unref` so the sweep never holds the process up.
 */
function startSweep(): void {
  if (registry.sweep) return;
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of registry.rooms) {
      if (dropExpired(room, now)) publish(roomId, snapshotOf(room));
      if (room.members.size === 0 && room.pending.size === 0) {
        registry.rooms.delete(roomId);
      }
    }
  }, SWEEP_INTERVAL_MS);
  timer.unref?.();
  registry.sweep = timer;
}

// Registered by name so a hot reload replaces the handler instead of stacking
// a new one on every edit.
roomBus.onDisconnect("calls", onConnectionLost);
startSweep();
