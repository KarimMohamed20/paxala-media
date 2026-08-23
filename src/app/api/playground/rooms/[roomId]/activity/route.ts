import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/security";
import { requireStudioActor, resolveRoomActor } from "@/lib/playground/actors";
import {
  getMembership,
  getRoomForAccess,
  listActivity,
} from "@/lib/playground/repo";

/**
 * GET /api/playground/rooms/[roomId]/activity?before=<seq>
 *
 * The room's history: who joined, who changed what, who decided.
 *
 * STUDIO ONLY, and deliberately so. Every row here derives from PlaygroundEvent,
 * whose payloads carry raw op data — the `before` text of each edit and the full
 * body of every deleted node. Even with `payload` unselected (it is), the
 * sequence of "X edited the budget note" is internal. A client's view of what
 * happened is the decision list and the approval record, both curated.
 *
 * Paginated by SEQUENCE rather than by timestamp: seq is gapless and totally
 * ordered within a room, so a page boundary can never drop or duplicate a row
 * the way two events sharing a millisecond can.
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
    const access = resolveRoomActor(session, { room, membership });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    if (!requireStudioActor(access.actor)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limit = rateLimit(`pg-activity:${access.actor.userId}`, {
      limit: 120,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const beforeParam = searchParams.get("before");
    const before = beforeParam ? Number.parseInt(beforeParam, 10) : undefined;

    const events = await listActivity(roomId, {
      before: before !== undefined && Number.isFinite(before) ? before : undefined,
      take: 50,
    });

    return NextResponse.json({
      events,
      // The caller pages with this rather than recomputing it from the last row,
      // so an empty page terminates cleanly.
      nextBefore: events.length > 0 ? events[events.length - 1].seq : null,
    });
  } catch (error) {
    console.error("Playground activity GET error:", error);
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }
}
