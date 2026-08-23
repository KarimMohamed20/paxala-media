"use client";

import * as React from "react";
import type { Participant } from "@/lib/playground/bus";

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
};

export function useRoomStream({
  roomId,
  mode,
  enabled = true,
  getSeq,
  onOps,
  onResync,
}: RoomStreamOptions) {
  const [status, setStatus] = React.useState<StreamStatus>("connecting");
  const [participants, setParticipants] = React.useState<Participant[]>([]);
  const [connectionId, setConnectionId] = React.useState<string | null>(null);

  const lastSeqRef = React.useRef(0);
  const handlersRef = React.useRef({ onOps, onResync, getSeq });
  React.useEffect(() => {
    handlersRef.current = { onOps, onResync, getSeq };
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

          // Gap detection. `lastEventId` is the id the server stamped on this
          // frame; if it has jumped past what we last applied by more than one
          // step, frames were dropped and the board is now wrong.
          const stamped = Number.parseInt(message.lastEventId ?? "", 10);
          const expected = lastSeqRef.current;
          if (
            Number.isFinite(stamped) &&
            expected > 0 &&
            stamped > expected + 1
          ) {
            handlersRef.current.onResync();
          } else {
            handlersRef.current.onOps(data.ops ?? [], seq, data.actorId ?? "");
          }

          if (Number.isFinite(stamped)) lastSeqRef.current = stamped;
          else if (seq > lastSeqRef.current) lastSeqRef.current = seq;
        } catch {
          handlersRef.current.onResync();
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

  return { status, participants, connectionId };
}
