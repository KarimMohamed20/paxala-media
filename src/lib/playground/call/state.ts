import {
  EMPTY_CALL,
  MAX_CALL_PARTICIPANTS,
  type CallMember,
  type CallMemberState,
  type CallSnapshot,
} from "./types";

/**
 * The call roster, as a pure state machine.
 *
 * Every rule that decides who is in a call lives here rather than in the route
 * handler, because the interesting cases are all about TIME — a reconnect
 * grace window, a stale member expiring — and time is the one thing a route
 * test cannot control. Every function takes `now` explicitly; nothing in this
 * file reads the clock.
 *
 * Members are keyed by CONNECTION because that is the signaling address, but
 * a user holds at most ONE seat: joining from a second tab takes the seat over
 * rather than adding a tile. Two live media sessions for one person means two
 * microphones in the same room feeding each other — an echo loop — and it
 * would also let one person eat two of the five mesh slots.
 *
 * THE RECONNECT PROBLEM. The SSE stream is force-recycled every 15 minutes and
 * reconnects with a NEW connectionId, so during a long call every participant
 * silently changes address at least once. Dropping a member the instant their
 * stream dies would eject everybody on a timer. Instead a dead connection is
 * marked `pending` with a deadline: if the same user reappears within the
 * window the entry is replaced (that is a reconnect), and if the window passes
 * they are removed (that is a closed laptop). An explicit "leave" skips the
 * grace entirely — the user said what they meant.
 */

/** How long a dropped connection keeps its seat while the stream reconnects. */
export const RECONNECT_GRACE_MS = 25_000;

type PendingMember = CallMember & { pendingUntil: number };

export type CallRoom = {
  startedAt: number | null;
  startedByUserId: string | null;
  /** Live members, keyed by connectionId. */
  members: Map<string, CallMember>;
  /** Members whose stream died and may yet come back, keyed by connectionId. */
  pending: Map<string, PendingMember>;
};

export function emptyRoom(): CallRoom {
  return {
    startedAt: null,
    startedByUserId: null,
    members: new Map(),
    pending: new Map(),
  };
}

export type JoinInput = {
  connectionId: string;
  userId: string;
  name: string | null;
  image: string | null;
};

export type JoinResult =
  | { ok: true; snapshot: CallSnapshot; started: boolean }
  | { ok: false; reason: "full" };

/**
 * Add a participant.
 *
 * A user rejoining reclaims any seat they already hold — pending (their stream
 * reconnected) or live (a duplicate join after a retry). Without that, a flaky
 * connection would accumulate ghost tiles of the same person.
 */
export function join(room: CallRoom, input: JoinInput, now: number): JoinResult {
  dropExpired(room, now);

  // Read BEFORE reclaiming: a lone participant whose stream recycled would
  // otherwise look like an empty room and restart the call's clock, resetting
  // the duration in the header mid-conversation.
  const started = room.members.size === 0 && room.pending.size === 0;

  // Reclaim any seat this user already holds, so the capacity check counts
  // them once and a reconnect does not leave a ghost tile behind.
  releaseUser(room, input.userId);

  // Pending members count against capacity because they are still ON the
  // call — they hold a tile and they are coming back. Counting only live
  // members would let newcomers fill the seats of people whose streams merely
  // recycled, and those people would then be told the call they are already
  // in is full.
  if (occupancy(room) >= MAX_CALL_PARTICIPANTS) {
    return { ok: false, reason: "full" };
  }

  if (started) {
    room.startedAt = now;
    room.startedByUserId = input.userId;
  }

  room.members.set(input.connectionId, {
    connectionId: input.connectionId,
    userId: input.userId,
    name: input.name,
    image: input.image,
    // Joins with the mic live and the camera dark: the normal way a work call
    // starts, and it keeps four inbound video streams off a phone by default.
    muted: false,
    cameraOn: false,
    sharing: false,
    handRaised: false,
    joinedAt: now,
  });

  return { ok: true, snapshot: snapshotOf(room), started };
}

/** Deliberate departure — no grace, the seat is free immediately. */
export function leave(
  room: CallRoom,
  connectionId: string,
  now: number
): CallSnapshot {
  room.members.delete(connectionId);
  room.pending.delete(connectionId);
  dropExpired(room, now);
  if (room.members.size === 0 && room.pending.size === 0) endCall(room);
  return snapshotOf(room);
}

/**
 * The connection died without saying goodbye — usually the 15-minute stream
 * recycle, sometimes a closed laptop. Hold the seat and let the deadline
 * decide which it was.
 */
export function connectionLost(
  room: CallRoom,
  connectionId: string,
  now: number
): CallSnapshot {
  const member = room.members.get(connectionId);
  if (member) {
    room.members.delete(connectionId);
    room.pending.set(connectionId, {
      ...member,
      pendingUntil: now + RECONNECT_GRACE_MS,
    });
  }
  dropExpired(room, now);
  return snapshotOf(room);
}

/** Mute / camera / share / hand. Unknown connections are ignored. */
export function setMemberState(
  room: CallRoom,
  connectionId: string,
  patch: Partial<CallMemberState>,
  now: number
): CallSnapshot {
  dropExpired(room, now);
  const member = room.members.get(connectionId);
  if (member) room.members.set(connectionId, { ...member, ...patch });
  return snapshotOf(room);
}

/**
 * Expire pending members whose grace has run out, and close the call when the
 * last one goes. Called at the top of every operation so a room that nobody
 * touches for an hour still reports an empty call the moment it is read.
 */
export function dropExpired(room: CallRoom, now: number): boolean {
  let changed = false;
  for (const [connectionId, member] of room.pending) {
    if (member.pendingUntil <= now) {
      room.pending.delete(connectionId);
      changed = true;
    }
  }
  if (changed && room.members.size === 0 && room.pending.size === 0) {
    endCall(room);
  }
  return changed;
}

/**
 * The public view of a call.
 *
 * Pending members are INCLUDED and rendered like anyone else: from the other
 * participants' side a 15-minute stream recycle should look like nothing at
 * all, not like the person blinking out and back.
 */
export function snapshotOf(room: CallRoom): CallSnapshot {
  const members: CallMember[] = [
    ...room.members.values(),
    // `pendingUntil` is server bookkeeping and is stripped rather than shipped.
    ...[...room.pending.values()].map((member) => {
      const { pendingUntil, ...rest } = member;
      void pendingUntil;
      return rest;
    }),
  ].sort(
    (a, b) => a.joinedAt - b.joinedAt || a.connectionId.localeCompare(b.connectionId)
  );

  if (members.length === 0) return EMPTY_CALL;

  return {
    active: true,
    startedAt: room.startedAt,
    startedByUserId: room.startedByUserId,
    members,
  };
}

/** True when nobody is on the call — the gate for "who may start one". */
export function isIdle(room: CallRoom, now: number): boolean {
  dropExpired(room, now);
  return room.members.size === 0 && room.pending.size === 0;
}

/** Everyone holding a seat: connected, plus those inside the grace window. */
export function occupancy(room: CallRoom): number {
  return room.members.size + room.pending.size;
}

function endCall(room: CallRoom): void {
  room.startedAt = null;
  room.startedByUserId = null;
}

/** Remove every seat held by a user, live or pending. */
function releaseUser(room: CallRoom, userId: string): void {
  for (const [connectionId, member] of room.members) {
    if (member.userId === userId) room.members.delete(connectionId);
  }
  for (const [connectionId, member] of room.pending) {
    if (member.userId === userId) room.pending.delete(connectionId);
  }
}
