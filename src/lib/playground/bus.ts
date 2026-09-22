/**
 * In-process fan-out for Playground rooms.
 *
 * Presence and live updates are broadcast through a module singleton held on
 * `globalThis` — the same shape, and the same documented limitation, as the
 * rate-limit buckets in @/lib/security.
 *
 * WHY globalThis UNCONDITIONALLY, not only in development the way
 * src/lib/db.ts does it: Turbopack re-evaluates a route module on every hot
 * reload, and a plain module-level Map would be orphaned each time — the old
 * subscribers keep their SSE sockets open while every new publish goes to a
 * fresh, empty Map. The symptom is "live updates stop working after I edit a
 * file", which reads as a bug in the feature rather than in the bundler.
 *
 * SINGLE-INSTANCE INVARIANT: this is per-process. Running two app containers
 * gives two buses, each seeing only its own subscribers, with NO error — just
 * silently missing updates. docker-compose.yml defines one app service with no
 * replicas, so this holds today. Moving to Postgres LISTEN/NOTIFY is a change to
 * `publish` and `subscribe` alone, but it is NOT dependency-free: Prisma 5
 * exposes no async-notification callback, so it needs `pg` on its own
 * connection.
 */

import type { CallControlCommand, CallSnapshot } from "./call/types";

export type PresenceState = {
  cursor: { x: number; y: number } | null;
  /** World-space viewport, so "follow me" can match another person's view. */
  viewport: { x: number; y: number; z: number } | null;
  selection: string[];
};

export type Participant = {
  connectionId: string;
  userId: string;
  name: string | null;
  image: string | null;
  presence: PresenceState;
  /** Epoch ms of the last presence update, for stale-cursor cleanup. */
  updatedAt: number;
};

export type BusEvent =
  | {
      type: "ops";
      seq: number;
      /** Seq of the batch's FIRST op, so clients can gap-check multi-op frames. */
      firstSeq?: number;
      ops: unknown[];
      actorId: string;
    }
  | { type: "message"; channel: "TEAM" | "SHARED"; messageId: string }
  | { type: "comment"; nodeId: string | null; commentId: string }
  | { type: "reaction"; nodeId: string }
  | { type: "decision"; decisionId: string }
  | { type: "presence"; participants: Participant[] }
  | { type: "joined"; participant: Participant }
  | { type: "left"; connectionId: string; userId: string }
  | { type: "room"; reason: "updated" | "archived" }
  /** The call roster changed — someone joined, left, muted, raised a hand. */
  | { type: "call"; call: CallSnapshot }
  /**
   * One peer's WebRTC signal for one other peer. The ONLY unicast event:
   * an SDP offer broadcast to the room would be answered by everybody.
   * `from` is stamped server-side so a participant cannot impersonate a peer.
   */
  | { type: "rtc"; from: string; fromUserId: string; signal: unknown }
  /**
   * A host acted on this participant — unicast to the target only. The
   * browser carries out mute / camera / share itself (the server cannot
   * reach into a peer-to-peer media path); removal is already enforced
   * server-side by the time this arrives.
   */
  | { type: "call-control"; command: CallControlCommand; byName: string | null }
  | { type: "resync" };

type Subscriber = {
  connectionId: string;
  userId: string;
  name: string | null;
  image: string | null;
  /**
   * Whether this connection may receive internal traffic.
   *
   * Carried on the SUBSCRIPTION rather than looked up at publish time so the
   * check is impossible to forget: `broadcast` takes an audience and the bus
   * enforces it, instead of every caller remembering who is listening.
   */
  isStaff: boolean;
  send: (event: BusEvent) => void;
  presence: PresenceState;
  updatedAt: number;
};

/**
 * Who an event is for.
 *
 * `staff` exists because event METADATA leaks too. Telling a client's stream
 * that a TEAM message was posted reveals that internal discussion is happening
 * about them, even without its contents.
 */
export type Audience = "all" | "staff";

/** How often coalesced presence is flushed to a room. */
const PRESENCE_FLUSH_MS = 100;
/** A cursor older than this is dropped — the tab probably went away. */
const PRESENCE_TTL_MS = 60_000;

/**
 * Told when a connection goes away, so a feature holding per-connection state
 * (the call roster) can react without the bus importing that feature — which
 * would be a cycle, since the feature broadcasts through the bus.
 *
 * Keyed by name rather than a plain Set: a hot reload re-evaluates the
 * registering module, and a Set would accumulate a stale handler per edit.
 */
export type DisconnectHandler = (
  roomId: string,
  connectionId: string,
  userId: string
) => void;

class RoomBus {
  private rooms = new Map<string, Map<string, Subscriber>>();
  private presenceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private disconnectHandlers = new Map<string, DisconnectHandler>();

  subscribe(roomId: string, subscriber: Subscriber): () => void {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Map();
      this.rooms.set(roomId, room);
    }
    room.set(subscriber.connectionId, subscriber);

    this.broadcast(roomId, {
      type: "joined",
      participant: toParticipant(subscriber),
    }, subscriber.connectionId);

    // Returns an unsubscribe rather than exposing removal, so a caller cannot
    // accidentally evict a DIFFERENT connection for the same user — which is
    // exactly what a userId-keyed map would do in React StrictMode, where the
    // second connect lands before the first disconnect.
    return () => {
      const current = this.rooms.get(roomId);
      if (!current) return;
      current.delete(subscriber.connectionId);

      // Before the room-empty shortcut below: a call's last participant
      // dropping still has to be recorded, and that path deletes the room map.
      for (const handler of this.disconnectHandlers.values()) {
        try {
          handler(roomId, subscriber.connectionId, subscriber.userId);
        } catch {
          // A misbehaving listener must not strand the unsubscribe.
        }
      }

      if (current.size === 0) {
        this.rooms.delete(roomId);
        const timer = this.presenceTimers.get(roomId);
        if (timer) {
          clearTimeout(timer);
          this.presenceTimers.delete(roomId);
        }
      } else {
        this.broadcast(roomId, {
          type: "left",
          connectionId: subscriber.connectionId,
          userId: subscriber.userId,
        });
      }
    };
  }

  /** Send to every subscriber in a room, optionally skipping the originator. */
  broadcast(
    roomId: string,
    event: BusEvent,
    exceptConnectionId?: string,
    audience: Audience = "all"
  ): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    for (const subscriber of room.values()) {
      if (subscriber.connectionId === exceptConnectionId) continue;
      if (audience === "staff" && !subscriber.isStaff) continue;
      try {
        subscriber.send(event);
      } catch {
        // A dead socket must not stop the rest of the room from receiving the
        // event. The stream's own abort handler removes it.
      }
    }
  }

  /**
   * Send to exactly ONE connection.
   *
   * WebRTC signaling is the reason this exists: an SDP offer is addressed to a
   * single peer, and `broadcast(..., exceptConnectionId)` is the inverse —
   * everyone BUT one. Returns false when the target is gone, which the caller
   * reports as a dead peer rather than silently dropping the negotiation.
   */
  sendTo(roomId: string, connectionId: string, event: BusEvent): boolean {
    const subscriber = this.rooms.get(roomId)?.get(connectionId);
    if (!subscriber) return false;
    try {
      subscriber.send(event);
      return true;
    } catch {
      return false;
    }
  }

  /** Register (or replace, by name) a listener for connection teardown. */
  onDisconnect(name: string, handler: DisconnectHandler): void {
    this.disconnectHandlers.set(name, handler);
  }

  /**
   * Does this connection belong to this user?
   *
   * A client tells the server which connection it is acting as, and a
   * connection id is not a secret — it is broadcast to the whole room inside
   * every presence roster. Without this check, quoting somebody else's id
   * would be enough to act as them: mute them, drop them from a call, or send
   * signalling in their name. Ownership is decided here, against the session
   * that opened the stream, and never from the request body.
   */
  ownsConnection(roomId: string, connectionId: string, userId: string): boolean {
    return this.rooms.get(roomId)?.get(connectionId)?.userId === userId;
  }

  /**
   * Record a participant's cursor and schedule a coalesced flush.
   *
   * Presence is NEVER written to Postgres. At six participants moving their
   * mice, per-move persistence would be a few hundred writes a second for data
   * that is worthless one second later.
   */
  updatePresence(
    roomId: string,
    connectionId: string,
    presence: Partial<PresenceState>
  ): void {
    const room = this.rooms.get(roomId);
    const subscriber = room?.get(connectionId);
    if (!subscriber) return;

    subscriber.presence = { ...subscriber.presence, ...presence };
    subscriber.updatedAt = Date.now();

    // Coalesce: one presence frame per room per 100ms, however many people are
    // moving. Broadcasting per update would be O(participants^2) messages.
    if (this.presenceTimers.has(roomId)) return;
    this.presenceTimers.set(
      roomId,
      setTimeout(() => {
        this.presenceTimers.delete(roomId);
        this.broadcast(roomId, {
          type: "presence",
          participants: this.participants(roomId),
        });
      }, PRESENCE_FLUSH_MS)
    );
  }

  /** Everyone currently in a room, minus anyone whose cursor has gone stale. */
  participants(roomId: string): Participant[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    const now = Date.now();
    return [...room.values()]
      .filter((s) => now - s.updatedAt < PRESENCE_TTL_MS)
      .map(toParticipant);
  }

  /** Distinct user ids present in a room. Used for the People tab. */
  onlineUserIds(roomId: string): string[] {
    return [...new Set(this.participants(roomId).map((p) => p.userId))];
  }

  /** Close a specific connection's stream — used when membership is revoked. */
  evict(roomId: string, connectionId: string): void {
    const subscriber = this.rooms.get(roomId)?.get(connectionId);
    if (!subscriber) return;
    try {
      subscriber.send({ type: "resync" });
    } catch {
      // Closing anyway.
    }
  }

  get roomCount(): number {
    return this.rooms.size;
  }
}

function toParticipant(subscriber: Subscriber): Participant {
  // `isStaff` is deliberately NOT projected into Participant: the roster is sent
  // to every subscriber, and who is internal is not a client's business.
  return {
    connectionId: subscriber.connectionId,
    userId: subscriber.userId,
    name: subscriber.name,
    image: subscriber.image,
    presence: subscriber.presence,
    updatedAt: subscriber.updatedAt,
  };
}

const globalForBus = globalThis as unknown as { playgroundBus?: RoomBus };

export const roomBus: RoomBus = globalForBus.playgroundBus ?? new RoomBus();
globalForBus.playgroundBus = roomBus;

export type { Subscriber as RoomSubscriber };
