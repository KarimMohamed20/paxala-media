import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clampString, rateLimit } from "@/lib/security";
import { resolveRoomActor } from "@/lib/playground/actors";
import { roomBus } from "@/lib/playground/bus";
import {
  getMembership,
  getRoomForAccess,
  listReactions,
  readNodes,
  toggleReaction,
  touchRoom,
} from "@/lib/playground/repo";

/**
 * Reactions and votes.
 *
 * One model serves both: a vote is a reaction whose `kind` is a ballot value.
 * The unique index on (nodeId, userId, kind) is what makes a tally trustworthy —
 * a double-click cannot produce two votes and a retried request cannot inflate
 * a count, without any application-level bookkeeping.
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
  return resolveRoomActor(session, { room, membership, requestedMode });
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

    const all = await listReactions(roomId);

    // Tallies are scoped to the nodes this actor can see. Returning counts for
    // an internal node would confirm it exists and how popular it is.
    const visible = new Set((await readNodes(access.actor)).map((n) => n.id));

    return NextResponse.json({
      reactions: all
        .filter((r) => visible.has(r.nodeId))
        .map((r) => ({
          nodeId: r.nodeId,
          kind: r.kind,
          // Own-vote state needs the viewer's id only; other voters are named,
          // which is deliberate — a room should know who backed what.
          mine: r.userId === access.actor.userId,
          name: r.user?.name ?? null,
        })),
    });
  } catch (error) {
    console.error("Playground reactions GET error:", error);
    return NextResponse.json({ error: "Failed to load reactions" }, { status: 500 });
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
    if (!access.actor.can("VOTE")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limit = rateLimit(`pg-react:${access.actor.userId}`, {
      limit: 240,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many reactions. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const nodeId = typeof body.nodeId === "string" ? body.nodeId : "";
    const kind = clampString(body.kind, 32);
    if (!nodeId || !kind) {
      return NextResponse.json(
        { error: "nodeId and kind are required" },
        { status: 400 }
      );
    }

    // The node must be in this actor's own projection: without this a client
    // could vote on — and therefore confirm the existence of — internal work.
    const visible = await readNodes(access.actor);
    if (!visible.some((node) => node.id === nodeId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const result = await toggleReaction({
      nodeId,
      userId: access.actor.userId,
      kind,
    });

    void touchRoom(roomId);
    roomBus.broadcast(roomId, { type: "reaction", nodeId });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Playground reactions POST error:", error);
    return NextResponse.json({ error: "Failed to react" }, { status: 500 });
  }
}
