import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/security";
import { requireStudioActor, resolveRoomActor } from "@/lib/playground/actors";
import { roomBus } from "@/lib/playground/bus";
import { getMembership, getRoomForAccess } from "@/lib/playground/repo";
import { iceServersFor } from "@/lib/playground/call/ice";
import { checkModeration } from "@/lib/playground/call/moderation";
import {
  applyModeration,
  callIsIdle,
  callSnapshot,
  isOnCall,
  joinCall,
  leaveCall,
  seatStatus,
  updateCallMember,
} from "@/lib/playground/call/registry";
import { parseCallAction, parseConnectionId } from "@/lib/playground/call/schema";

/**
 * Call signaling.
 *
 * The client→server half of WebRTC negotiation. The server→client half is the
 * room's existing SSE stream, because an App Router route handler never sees
 * the socket and cannot complete a WebSocket upgrade (the same constraint the
 * ops pipeline works around — see stream/route.ts).
 *
 * The server relays; it never inspects. Offers, answers and ICE candidates are
 * opaque blobs forwarded to exactly one peer, with `from` stamped here so a
 * participant cannot pose as somebody else's connection.
 *
 * WHO MAY DO WHAT. Joining needs VIEW, which every room member including a
 * client has — the point of the feature is talking to clients. STARTING a call
 * (joining when none is running) is staff-only: a client ringing a room nobody
 * is watching is a worse experience than not being able to ring at all.
 *
 * Nothing here is persisted. See call/registry.ts.
 */

async function resolve(roomId: string, requestedMode?: string | null) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }
  const room = await getRoomForAccess(roomId);
  if (!room) {
    return { ok: false as const, status: 404 as const, error: "Room not found" };
  }
  const membership = await getMembership(roomId, session.user.id);
  const access = resolveRoomActor(session, { room, membership, requestedMode });
  // RoomActor carries no avatar, and a call tile needs one for the very common
  // case of somebody joining with their camera off.
  return access.ok
    ? { ...access, image: session.user.image ?? null }
    : access;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { searchParams } = new URL(request.url);

    const access = await resolve(roomId, searchParams.get("mode"));
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    return NextResponse.json({ call: callSnapshot(roomId) });
  } catch (error) {
    console.error("Playground call GET error:", error);
    return NextResponse.json({ error: "Failed to load call" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const access = await resolve(roomId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    // VIEW, not EDIT: clients are approvers and must be able to take a call.
    if (!access.actor.can("VIEW")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // A five-way mesh exchanges roughly a dozen messages per peer while it
    // negotiates, and ICE trickles for a few seconds after that. This ceiling
    // matches the ops route's and is far above an honest join.
    const limit = rateLimit(`pg-call:${access.actor.userId}`, {
      limit: 300,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many call updates. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await request.json().catch(() => null);
    const connectionId = parseConnectionId(
      (body as Record<string, unknown> | null)?.connectionId
    );
    if (!connectionId) {
      return NextResponse.json(
        { error: "A live room connection is required" },
        { status: 400 }
      );
    }

    // The connection id arrives in the body, and it is NOT a secret — every
    // presence roster broadcasts it to the whole room. Quoting somebody
    // else's would otherwise be enough to mute them, drop them from the call
    // or sign offers in their name, so the claim is checked against the
    // session that actually opened that stream.
    if (!roomBus.ownsConnection(roomId, connectionId, access.actor.userId)) {
      return NextResponse.json(
        { error: "That connection is not yours" },
        { status: 403 }
      );
    }

    const command = parseCallAction(body);
    if (!command) {
      return NextResponse.json({ error: "Invalid call action" }, { status: 400 });
    }

    switch (command.action) {
      case "join": {
        if (callIsIdle(roomId) && !access.actor.isStaff) {
          return NextResponse.json(
            { error: "staffOnlyStart", code: "STAFF_ONLY_START" },
            { status: 403 }
          );
        }

        const result = joinCall(roomId, {
          connectionId,
          userId: access.actor.userId,
          name: access.actor.name,
          image: access.image,
          state: command.state,
        });

        if (!result.ok) {
          // 403 for a removal, 409 for capacity: the client tells the user
          // two very different things ("you were removed" vs "try later").
          return result.reason === "removed"
            ? NextResponse.json(
                { error: "removed", code: "REMOVED_FROM_CALL" },
                { status: 403 }
              )
            : NextResponse.json(
                { error: "full", code: "CALL_FULL" },
                { status: 409 }
              );
        }

        return NextResponse.json({
          call: result.snapshot,
          // Minted per join so a long meeting never outlives its credentials.
          iceServers: iceServersFor(access.actor.userId),
        });
      }

      case "leave":
        return NextResponse.json({ call: leaveCall(roomId, connectionId) });

      case "state":
        return NextResponse.json({
          call: updateCallMember(roomId, connectionId, command.state),
        });

      case "signal": {
        // Only participants may signal, and only about themselves: without
        // this check any room member could spray offers at people on a call.
        if (!isOnCall(roomId, connectionId)) {
          return NextResponse.json(
            { error: "Not in this call" },
            { status: 409 }
          );
        }

        const delivered = roomBus.sendTo(roomId, command.to, {
          type: "rtc",
          from: connectionId,
          fromUserId: access.actor.userId,
          signal: command.signal,
        });

        // A missed signal is reported rather than swallowed: the caller drops
        // that peer instead of waiting on an answer that can never arrive.
        return NextResponse.json({ delivered });
      }

      case "moderate": {
        // Every rule — staff only, from inside the call, never on yourself,
        // only on someone reachable — lives in moderation.ts, where it is
        // tested. The route only gathers the facts.
        const verdict = checkModeration({
          command: command.command,
          moderatorIsStaff: requireStudioActor(access.actor),
          moderatorOnCall: isOnCall(roomId, connectionId),
          moderatorConnectionId: connectionId,
          targetConnectionId: command.target,
          targetStatus: seatStatus(roomId, command.target),
        });

        if (!verdict.ok) {
          const status =
            verdict.reason === "notStaff" || verdict.reason === "notOnCall"
              ? 403
              : verdict.reason === "self"
                ? 400
                : 404;
          return NextResponse.json({ error: verdict.reason }, { status });
        }

        const call = applyModeration(roomId, command.target, command.command);

        // Tell the target. For mute / camera / share this IS the action —
        // their browser carries it out. For removal it is a courtesy: the
        // roster has already dropped them and their signals are refused.
        // A dead target just means there is nobody left to tell.
        roomBus.sendTo(roomId, command.target, {
          type: "call-control",
          command: command.command,
          byName: access.actor.name,
        });

        return NextResponse.json({ call });
      }
    }
  } catch (error) {
    console.error("Playground call POST error:", error);
    return NextResponse.json({ error: "Call action failed" }, { status: 500 });
  }
}
