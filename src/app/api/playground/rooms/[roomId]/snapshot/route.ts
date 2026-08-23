import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/security";
import { resolveRoomActor } from "@/lib/playground/actors";
import { getMembership, getRoomForAccess, readSnapshot } from "@/lib/playground/repo";

/**
 * GET /api/playground/rooms/[roomId]/snapshot?mode=client
 *
 * The canvas cold load: every node and edge the caller may see, plus the room
 * sequence they are consistent at. The client stores that sequence and asks for
 * everything after it when reconnecting.
 *
 * CLIENT-mode callers get the published projection via clientNodeWhere /
 * clientNodeSelect — the same chokepoint every other read goes through. A staff
 * member with ?mode=client hits the identical code path, which is what makes
 * "Preview as client" a preview rather than a reimplementation that drifts.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { searchParams } = new URL(request.url);

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const room = await getRoomForAccess(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const membership = await getMembership(roomId, session.user.id);
    const access = resolveRoomActor(session, {
      room,
      membership,
      requestedMode: searchParams.get("mode"),
    });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // A snapshot reads every node in the room, so it is the most expensive read
    // here. Legitimate callers hit it on load and on resync — a handful of times
    // a session — so this only catches a loop.
    const limit = rateLimit(`pg-snapshot:${access.actor.userId}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many refreshes. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const snapshot = await readSnapshot(access.actor);

    return NextResponse.json(snapshot, {
      // Canvas state is per-viewer (Studio and Client see different boards) and
      // changes constantly. A shared cache here would serve one viewer's
      // projection to another.
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Playground snapshot GET error:", error);
    return NextResponse.json({ error: "Failed to load canvas" }, { status: 500 });
  }
}
