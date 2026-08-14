import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/security";
import { resolveRoomActor } from "@/lib/playground/actors";
import { roomBus, type BusEvent } from "@/lib/playground/bus";
import {
  getMembership,
  getRoomForAccess,
  readEventsSince,
} from "@/lib/playground/repo";

/**
 * GET /api/playground/rooms/[roomId]/stream — the live channel.
 *
 * Server-Sent Events, not WebSockets: an App Router route handler receives a
 * `Request`, never the underlying socket, so there is no way to complete an
 * upgrade handshake without abandoning `output: "standalone"`. SSE carries
 * server -> client, and the ops endpoint carries client -> server.
 *
 * FOUR RESPONSE HEADERS, ALL LOAD-BEARING:
 *
 *   Content-Type: text/event-stream        the protocol
 *   Connection: keep-alive                 the protocol
 *   Cache-Control: no-cache, no-transform  `no-transform` disables NEXT'S OWN
 *       compression middleware, which is enabled by default in its router
 *       server and sits in front of every response. Without it the stream is
 *       gzipped and buffered, and nothing arrives until the buffer fills.
 *   X-Accel-Buffering: no                  nginx has `proxy_buffering` on and
 *       does not set `proxy_ignore_headers`, so this is what actually releases
 *       each frame. The dedicated `location /api/playground/` block in
 *       docker/nginx also sets `proxy_buffering off` — belt and braces, because
 *       this failure is invisible against `next dev` and against the published
 *       :3000 port, both of which bypass nginx entirely.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Comment frame every 20s. nginx `proxy_read_timeout` is 900s in the
 *  playground location; this keeps the connection well inside it and detects a
 *  dead peer promptly. */
const HEARTBEAT_MS = 20_000;
/** Streams are recycled rather than left open forever; EventSource reconnects. */
const MAX_STREAM_MS = 15 * 60_000;
/** Membership is re-checked on this cadence — see the note below. */
const AUTH_RECHECK_MS = 10_000;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const { searchParams } = new URL(request.url);

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const room = await getRoomForAccess(roomId);
  if (!room) return new Response("Not found", { status: 404 });

  const membership = await getMembership(roomId, session.user.id);
  const access = resolveRoomActor(session, {
    room,
    membership,
    requestedMode: searchParams.get("mode"),
  });
  if (!access.ok) {
    return new Response(access.error, { status: access.status });
  }

  const { actor } = access;

  // Bound stream OPENING, not stream lifetime. A client whose backoff is broken
  // — or a tab loop — would otherwise hold a new connection every second, and
  // each one costs a subscriber slot and a database round trip on the auth
  // re-check. Generous enough that a genuine reconnect storm after a network
  // blip still gets through.
  const opens = rateLimit(`pg-stream:${actor.userId}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!opens.ok) {
    return new Response("Too many reconnections", {
      status: 429,
      headers: { "Retry-After": String(opens.retryAfterSec) },
    });
  }

  // EventSource replays from its last seen id on reconnect. The browser sends it
  // back as `Last-Event-ID`; the query parameter is the manual fallback for a
  // first connection that already has a snapshot.
  const lastEventId =
    request.headers.get("last-event-id") ?? searchParams.get("since");
  const since = lastEventId ? Number.parseInt(lastEventId, 10) : null;

  const connectionId = crypto.randomUUID();
  const encoder = new TextEncoder();

  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let authCheck: ReturnType<typeof setInterval> | null = null;
  let lifespan: ReturnType<typeof setTimeout> | null = null;
  let unsubscribe: (() => void) | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Peer went away between our check and the write.
          closed = true;
        }
      };

      const sendEvent = (event: BusEvent, id?: number) => {
        const lines = [
          id !== undefined ? `id: ${id}` : null,
          `event: ${event.type}`,
          `data: ${JSON.stringify(event)}`,
          "",
          "",
        ].filter((line) => line !== null);
        write(lines.join("\n"));
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        if (authCheck) clearInterval(authCheck);
        if (lifespan) clearTimeout(lifespan);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      };

      // Cleanup is wired to the request signal, not to a `cancel` callback
      // alone: an aborted fetch, a closed tab and a network drop all surface
      // here, and a subscriber that outlives its socket leaks the room forever.
      request.signal.addEventListener("abort", cleanup);

      // A retry hint the browser honours on reconnect.
      write("retry: 3000\n\n");

      unsubscribe = roomBus.subscribe(roomId, {
        connectionId,
        userId: actor.userId,
        name: actor.name,
        image: session.user.image ?? null,
        // Studio mode only: a staff member previewing as a client must not
        // receive internal traffic on that connection either.
        isStaff: actor.isStaff && actor.mode === "STUDIO",
        presence: { cursor: null, viewport: null, selection: [] },
        updatedAt: Date.now(),
        send: (event) =>
          sendEvent(event, event.type === "ops" ? event.seq : undefined),
      });

      sendEvent({
        type: "presence",
        participants: roomBus.participants(roomId),
      });
      write(
        `event: hello\ndata: ${JSON.stringify({
          connectionId,
          mode: actor.mode,
          userId: actor.userId,
        })}\n\n`
      );

      // ---- reconnect: catch up --------------------------------------------
      //
      // A reconnecting client is brought up to date with a SNAPSHOT REFETCH, not
      // by replaying stored events, and that is a deliberate choice rather than
      // a shortcut.
      //
      // PlaygroundEvent rows are an audit log, not a redo log: their payloads
      // are lossy on purpose. A NODE_CREATE event records kind and geometry but
      // not the node's text, data or style, because the row itself already holds
      // those and duplicating them would double the write. Replaying such an
      // event into a client store would therefore reconstruct a node with its
      // content missing — a board that looks subtly wrong and never corrects
      // itself, which is far worse than a moment's reload.
      //
      // Making replay work would mean fattening every event payload into a
      // complete redo record. That is a real option if reconnects ever become
      // frequent enough to matter, and the sequence plumbing here already
      // supports it — but a snapshot for a bounded board is cheap, and correct
      // by construction.
      if (since !== null && Number.isFinite(since)) {
        try {
          const missed = await readEventsSince(roomId, since, 1);
          if (missed.length > 0) sendEvent({ type: "resync" });
        } catch {
          // Unknown whether anything was missed — assume it was. Staying silent
          // would leave the client showing a board it will never correct.
          sendEvent({ type: "resync" });
        }
      }

      heartbeat = setInterval(() => {
        // A comment frame: ignored by EventSource, but it keeps intermediaries
        // from reaping an idle connection and surfaces a dead peer to us.
        write(": ping\n\n");
      }, HEARTBEAT_MS);

      /**
       * Re-check membership periodically.
       *
       * Authorization is decided when the stream opens, and a long-lived stream
       * would otherwise keep delivering a room's contents to someone who was
       * removed from it ten minutes ago. Ten seconds is the window during which
       * a revoked member can still receive updates; closing the stream forces a
       * reconnect, which re-runs the full check and refuses them.
       */
      authCheck = setInterval(async () => {
        try {
          const current = await getRoomForAccess(roomId);
          if (!current) return cleanup();
          const nextMembership = await getMembership(roomId, actor.userId);
          const recheck = resolveRoomActor(session, {
            room: current,
            membership: nextMembership,
          });
          if (!recheck.ok) cleanup();
        } catch {
          // A transient database error must not disconnect a live meeting.
        }
      }, AUTH_RECHECK_MS);

      lifespan = setTimeout(cleanup, MAX_STREAM_MS);
    },

    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
      if (authCheck) clearInterval(authCheck);
      if (lifespan) clearTimeout(lifespan);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
