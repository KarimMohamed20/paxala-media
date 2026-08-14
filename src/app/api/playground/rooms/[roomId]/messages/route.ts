import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { MessageChannel } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { clampString, rateLimit } from "@/lib/security";
import { resolveRoomActor, type RoomActor } from "@/lib/playground/actors";
import { roomBus } from "@/lib/playground/bus";
import {
  createMessage,
  getMembership,
  getRoomForAccess,
  readMessages,
  touchRoom,
} from "@/lib/playground/repo";

/**
 * Room chat.
 *
 * TWO CHANNELS, and the split is a security boundary rather than a UI filter:
 *
 *   TEAM    internal PMP conversation — feasibility, budget, "the client will
 *           hate this". Staff only.
 *   SHARED  the conversation the client is part of.
 *
 * A non-staff actor asking for TEAM is refused BEFORE the database is touched,
 * and `clientMessageWhere()` would refuse them again at the query. Two
 * independent layers, because a single missed check here would put the internal
 * conversation in front of the person being discussed.
 */

const MAX_MESSAGE_LENGTH = 4000;

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
  return resolveRoomActor(session, { room, membership, requestedMode });
}

function parseChannel(value: unknown): MessageChannel | null {
  if (value === "TEAM") return MessageChannel.TEAM;
  if (value === "SHARED") return MessageChannel.SHARED;
  return null;
}

/**
 * May this actor use this channel?
 *
 * TEAM requires being on the agency side AND being in Studio mode — a staff
 * member previewing as a client must not be able to post internally from a view
 * that is pretending to be the client's.
 */
function canUseChannel(actor: RoomActor, channel: MessageChannel): boolean {
  if (channel === MessageChannel.TEAM) {
    return actor.isStaff && actor.mode === "STUDIO";
  }
  return actor.can("COMMENT");
}

// GET /api/playground/rooms/[roomId]/messages?channel=TEAM|SHARED&before=<iso>
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

    const requested = parseChannel(searchParams.get("channel"));
    // Refused here, before any query runs.
    if (requested && !canUseChannel(access.actor, requested)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const beforeParam = searchParams.get("before");
    const before = beforeParam ? new Date(beforeParam) : undefined;

    const messages = await readMessages(access.actor, {
      before: before && !Number.isNaN(before.getTime()) ? before : undefined,
      take: 50,
    });

    // readMessages returns newest-first for pagination; the UI reads oldest-first.
    const ordered = [...messages].reverse();

    return NextResponse.json({
      messages: requested
        ? ordered.filter((m) => m.channel === requested)
        : ordered,
      canPostTeam: canUseChannel(access.actor, MessageChannel.TEAM),
    });
  } catch (error) {
    console.error("Playground messages GET error:", error);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
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

    const body = await request.json();
    const channel = parseChannel(body.channel) ?? MessageChannel.SHARED;

    // Again before the DB: a client posting to TEAM never reaches a write.
    if (!canUseChannel(access.actor, channel)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limit = rateLimit(`pg-msg:${access.actor.userId}`, {
      limit: 120,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many messages. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const text = clampString(body.body, MAX_MESSAGE_LENGTH);
    if (!text) {
      return NextResponse.json({ error: "Message is empty" }, { status: 400 });
    }

    const message = await createMessage({
      roomId,
      channel,
      body: text,
      nodeId: typeof body.nodeId === "string" ? body.nodeId : null,
      replyToId: typeof body.replyToId === "string" ? body.replyToId : null,
      authorId: access.actor.userId,
      authorName: access.actor.name,
      authorRole: access.actor.role,
    });

    void touchRoom(roomId);

    // Fan out so the room sees it without polling.
    //
    // A TEAM message is broadcast to the STAFF AUDIENCE ONLY. Sending even its
    // id to every subscriber would tell a client that internal discussion about
    // them is happening — metadata is a leak too.
    roomBus.broadcast(
      roomId,
      { type: "message", channel, messageId: message.id },
      undefined,
      channel === MessageChannel.TEAM ? "staff" : "all"
    );

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Playground messages POST error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
