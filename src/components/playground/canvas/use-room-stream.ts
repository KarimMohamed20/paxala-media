"use client";

import * as React from "react";
import { shouldResync } from "@/lib/playground/stream-protocol";
import type { Participant } from "@/lib/playground/bus";
import {
  CALL_CONTROL_COMMANDS,
  type CallControlCommand,
  type CallSnapshot,
} from "@/lib/playground/call/types";

/**
 * The live channel: subscribe to a room's SSE stream and keep presence current.
 *
 * RECONNECTION IS THE HARD PART, not the happy path. EventSource reconnects on
 * its own, but silently — a tab that slept through twenty changes reconnects
 * cheerfully and shows a stale board forever. So:
 *
 *   - Every ops frame carries its room sequence as the SSE `id`, which the
 *     browser sends back as `Last-Event-ID` on reconnect, and the server
 *     replays from there.
 *   - A GAP between the last sequence we saw and the next one we receive means
 *     frames were lost; we ask for a full resync rather than carrying on with a
 *     board we know is wrong.
 *   - The server sends `resync` outright when a reconnecting client is too far
 *     behind to replay economically.
 *
 * Mobile Safari is why this matters. It suspends timers and drops connections
 * for a backgrounded tab, so "reconnected but stale" is the NORMAL case there,
 * not an edge case.
 */

export type StreamStatus = "connecting" | "live" | "reconnecting" | "offline";

export type RoomStreamOptions = {
  roomId: string;
  /** CLIENT mode gets the published projection on the server side too. */
  mode?: "STUDIO" | "CLIENT";
  enabled?: boolean;
  /** Latest room sequence the caller has applied, used for replay on connect. */
  getSeq: () => number;
  /** Server-confirmed ops from another participant. */
  onOps: (ops: unknown[], seq: number, actorId: string) => void;
  /** The board is stale beyond repair — refetch the snapshot. */
  onResync: () => void;
  /** The call roster changed. Absent when the caller does not do calls. */
  onCall?: (call: CallSnapshot) => void;
  /** A WebRTC signal addressed to this connection specifically. */
  onRtc?: (from: string, fromUserId: string, signal: unknown) => void;
  /** A host muted, unshared or removed THIS participant. */
  onCallControl?: (command: CallControlCommand, byName: string | null) => void;
};

export function useRoomStream({
  roomId,
  mode,
  enabled = true,
  getSeq,
  onOps,
  onResync,
  onCall,
  onRtc,
  onCallControl,
}: RoomStreamOptions) {
  const [status, setStatus] = React.useState<StreamStatus>("connecting");
  const [participants, setParticipants] = React.useState<Participant[]>([]);
  const [connectionId, setConnectionId] = React.useState<string | null>(null);

  const lastSeqRef = React.useRef(0);
  const handlersRef = React.useRef({
    onOps,
    onResync,
    getSeq,
    onCall,
    onRtc,
    onCallControl,
  });
  React.useEffect(() => {
    handlersRef.current = { onOps, onResync, getSeq, onCall, onRtc, onCallControl };
  });

  React.useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let disposed = false;

    const connect = () => {
      if (disposed) return;

      const since = Math.max(lastSeqRef.current, handlersRef.current.getSeq());
      const query = new URLSearchParams();
      if (since > 0) query.set("since", String(since));
      if (mode === "CLIENT") query.set("mode", "client");

      const url = `/api/playground/rooms/${roomId}/stream${
        query.toString() ? `?${query}` : ""
      }`;
      source = new EventSource(url);

      source.addEventListener("open", () => {
        attempt = 0;
        setStatus("live");
      });

      source.addEventListener("hello", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          setConnectionId(data.connectionId ?? null);
        } catch {
          // Malformed hello is not fatal; presence simply will not be sent.
        }
      });

      source.addEventListener("presence", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          setParticipants(data.participants ?? []);
        } catch {
          /* ignore a malformed frame rather than tearing down the stream */
        }
      });

      const onRoster = () => {
        // joined/left arrive ahead of the next coalesced presence frame; the
        // authoritative list follows within 100ms, so nothing is done here
        // beyond keeping the connection marked live.
        setStatus("live");
      };
      source.addEventListener("joined", onRoster);
      source.addEventListener("left", onRoster);

      source.addEventListener("ops", (event) => {
        const message = event as MessageEvent;
        try {
          const data = JSON.parse(message.data);
          const seq = typeof data.seq === "number" ? data.seq : 0;

          // Gap detection. The frame is stamped with the seq AFTER its whole
          // batch; `firstSeq` says where the batch started, so a multi-op
          // frame is not mistaken for dropped frames. Decision logic lives in
          // stream-protocol.ts where it is unit-tested.
          const parsedStamp = Number.parseInt(message.lastEventId ?? "", 10);
          const stamped = Number.isFinite(parsedStamp) ? parsedStamp : null;
          const firstSeq =
            typeof data.firstSeq === "number" ? data.firstSeq : null;
          if (shouldResync(lastSeqRef.current, stamped, firstSeq)) {
            handlersRef.current.onResync();
          } else {
            handlersRef.current.onOps(data.ops ?? [], seq, data.actorId ?? "");
          }

          if (stamped !== null) lastSeqRef.current = stamped;
          else if (seq > lastSeqRef.current) lastSeqRef.current = seq;
        } catch {
          handlersRef.current.onResync();
        }
      });

      // Call frames carry no SSE `id:`, so they never touch lastSeqRef and
      // cannot be mistaken for a gap in the op sequence.
      source.addEventListener("call", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          if (data.call) handlersRef.current.onCall?.(data.call as CallSnapshot);
        } catch {
          // A malformed roster frame is not worth tearing the stream down;
          // the next state change re-broadcasts the whole roster anyway.
        }
      });

      source.addEventListener("rtc", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          if (typeof data.from === "string") {
            handlersRef.current.onRtc?.(
              data.from,
              typeof data.fromUserId === "string" ? data.fromUserId : "",
              data.signal
            );
          }
        } catch {
          // Dropping one malformed signal costs at most one renegotiation.
        }
      });

      source.addEventListener("call-control", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data);
          // Checked against the known list: this frame makes the browser
          // turn off its own mic or camera, so an unrecognised command is
          // dropped rather than guessed at.
          if (CALL_CONTROL_COMMANDS.includes(data.command)) {
            handlersRef.current.onCallControl?.(
              data.command as CallControlCommand,
              typeof data.byName === "string" ? data.byName : null
            );
          }
        } catch {
          // A malformed control frame is ignored; the roster still reflects
          // any server-side part of it (a removal, a lowered hand).
        }
      });

      source.addEventListener("resync", () => {
        handlersRef.current.onResync();
      });

      source.addEventListener("error", () => {
        // EventSource retries by itself, but its cadence is fixed and it will
        // hammer a server that is down. Take over: close, then back off.
        source?.close();
        source = null;
        if (disposed) return;

        setStatus(navigator.onLine === false ? "offline" : "reconnecting");

        attempt += 1;
        // Exponential backoff with jitter. Without jitter, every participant in
        // a meeting reconnects in lockstep after a blip and the server is hit by
        // a thundering herd at exactly the moment it is recovering.
        const base = Math.min(1000 * 2 ** (attempt - 1), 30_000);
        const delay = base * (0.5 + Math.random() * 0.5);
        retryTimer = setTimeout(connect, delay);
      });
    };

    connect();

    // Coming back online should not wait out a 30s backoff.
    const onOnline = () => {
      if (disposed || source) return;
      if (retryTimer) clearTimeout(retryTimer);
      attempt = 0;
      connect();
    };
    window.addEventListener("online", onOnline);

    return () => {
      disposed = true;
      window.removeEventListener("online", onOnline);
      if (retryTimer) clearTimeout(retryTimer);
      source?.close();
    };
  }, [enabled, mode, roomId]);

  /**
   * Advance the gap detector from OUTSIDE the stream — the ops POST response.
   * The author is excluded from their own broadcast, so without this their
   * own writes leave lastSeq behind and the next remote frame false-positives
   * as a gap, forcing a needless resync after every local edit.
   */
  const noteSeq = React.useCallback((seq: number) => {
    if (seq > lastSeqRef.current) lastSeqRef.current = seq;
  }, []);

  return { status, participants, connectionId, noteSeq };
}
