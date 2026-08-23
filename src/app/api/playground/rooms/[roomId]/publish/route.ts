import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PlaygroundEventType } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/security";
import { resolveRoomActor, requireStudioActor } from "@/lib/playground/actors";
import { roomBus } from "@/lib/playground/bus";
import { isPublishableKind } from "@/lib/playground/client-scope";
import {
  getMembership,
  getRoomForAccess,
  readPublishSource,
  setClientVisibility,
  touchRoom,
} from "@/lib/playground/repo";

/**
 * POST /api/playground/rooms/[roomId]/publish
 *
 * "Present to client" — the deliberate act that makes Studio work visible.
 *
 * Publishing requires THREE things to agree, and no single mistake is enough:
 *   1. the caller is a Studio actor with PUBLISH,
 *   2. the node's own visibility is not TEAM_ONLY (enforced in the UPDATE's
 *      WHERE clause, so a bulk publish cannot sweep up an internal note),
 *   3. the node kind is publishable at all — a raw AI generation never is,
 *      whatever visibility someone sets on it.
 *
 * `publish: false` retracts. That is the recovery path for the mistake that
 * actually happens, and it is why Client Mode reads live rows behind a gate
 * rather than a frozen copy that cannot be taken back.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const room = await getRoomForAccess(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const membership = await getMembership(roomId, session.user.id);
    const access = resolveRoomActor(session, { room, membership });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    // Studio only: publishing from a client-preview view would be nonsensical
    // and is exactly the kind of confusion the mode indicator exists to prevent.
    if (!requireStudioActor(access.actor) || !access.actor.can("PUBLISH")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limit = rateLimit(`pg-publish:${access.actor.userId}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many publish actions. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const publish = body.publish !== false;
    const requested: string[] = Array.isArray(body.nodeIds)
      ? (body.nodeIds as unknown[]).filter((id): id is string => typeof id === "string")
      : [];

    if (requested.length === 0) {
      return NextResponse.json({ error: "Select something to publish" }, { status: 400 });
    }

    // Kind-level refusal, independent of visibility.
    const { nodes } = await readPublishSource(roomId);
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const refused: string[] = [];
    const allowed = requested.filter((id) => {
      const node = byId.get(id);
      if (!node) return false;
      if (publish && !isPublishableKind(node.kind)) {
        refused.push(id);
        return false;
      }
      return true;
    });

    const result = await setClientVisibility(roomId, allowed, publish);

    void touchRoom(roomId);
    // Everyone is told, clients included: a published node appearing in their
    // view without their stream knowing would leave the board stale until reload.
    roomBus.broadcast(roomId, { type: "resync" });

    return NextResponse.json({
      updated: result.count,
      // Reported rather than silently dropped, so the UI can say WHY something
      // the user selected did not go across.
      refused,
      event: publish
        ? PlaygroundEventType.PUBLISHED_TO_CLIENT
        : PlaygroundEventType.UNPUBLISHED_FROM_CLIENT,
    });
  } catch (error) {
    console.error("Playground publish error:", error);
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }
}
