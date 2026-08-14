import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { RoomApprovalAction, RoomApprovalStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { clampString, rateLimit } from "@/lib/security";
import { resolveRoomActor, type RoomActor } from "@/lib/playground/actors";
import { roomBus } from "@/lib/playground/bus";
import {
  getApproval,
  getMembership,
  getRoomForAccess,
  respondToApproval,
  touchRoom,
} from "@/lib/playground/repo";

/**
 * POST /api/playground/rooms/[roomId]/approvals/[approvalId]/respond
 *
 * The client's verdict.
 *
 * Modelled on the content-calendar approve route, which is the platform's
 * established pattern for this: a transition matrix decides what is legal, an
 * optimistic guard stops a second responder clobbering the first, and the status
 * change and its audit row are written in ONE transaction — so an approval can
 * never have moved without a record of who moved it.
 *
 * `responderRole` is snapshotted on the log row, which is what distinguishes a
 * genuine client approval from an agency override after the fact.
 */

/** What each action means, and which state it produces. */
const TRANSITIONS: Record<
  RoomApprovalAction,
  { from: RoomApprovalStatus[]; to: RoomApprovalStatus }
> = {
  [RoomApprovalAction.SUBMITTED]: {
    from: [RoomApprovalStatus.CHANGES_REQUESTED, RoomApprovalStatus.WITHDRAWN],
    to: RoomApprovalStatus.PENDING,
  },
  [RoomApprovalAction.APPROVED]: {
    from: [RoomApprovalStatus.PENDING],
    to: RoomApprovalStatus.APPROVED,
  },
  [RoomApprovalAction.CHANGES_REQUESTED]: {
    from: [RoomApprovalStatus.PENDING],
    to: RoomApprovalStatus.CHANGES_REQUESTED,
  },
  [RoomApprovalAction.WITHDRAWN]: {
    // An approved request is deliberately NOT withdrawable: retracting a
    // decision the client already made would rewrite the record it exists to be.
    from: [RoomApprovalStatus.PENDING, RoomApprovalStatus.CHANGES_REQUESTED],
    to: RoomApprovalStatus.WITHDRAWN,
  },
};

function parseAction(value: unknown): RoomApprovalAction | null {
  if (typeof value !== "string") return null;
  return Object.values(RoomApprovalAction).includes(value as RoomApprovalAction)
    ? (value as RoomApprovalAction)
    : null;
}

/**
 * Who may take this action?
 *
 * APPROVE and CHANGES_REQUESTED belong to the client — that is the whole point
 * of asking. An ADMIN may also act, and the snapshotted `responderRole` on the
 * log row is what makes an agency override visibly different from a client's
 * own verdict later.
 *
 * WITHDRAWN is agency-side: it retracts PMP's own question.
 */
function canAct(actor: RoomActor, action: RoomApprovalAction): boolean {
  if (action === RoomApprovalAction.WITHDRAWN) {
    return actor.can("REQUEST_APPROVAL");
  }
  if (action === RoomApprovalAction.SUBMITTED) {
    return actor.can("REQUEST_APPROVAL");
  }
  return actor.can("APPROVE");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string; approvalId: string }> }
) {
  try {
    const { roomId, approvalId } = await params;

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

    const limit = rateLimit(`pg-respond:${access.actor.userId}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many review actions. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const action = parseAction(body.action);
    if (!action) {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    if (!canAct(access.actor, action)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await getApproval(roomId, approvalId);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const transition = TRANSITIONS[action];
    if (!transition.from.includes(existing.status)) {
      return NextResponse.json(
        { error: `Cannot ${action} an approval that is ${existing.status}` },
        { status: 409 }
      );
    }

    const updated = await respondToApproval({
      roomId,
      approvalId,
      fromStatus: existing.status,
      toStatus: transition.to,
      action,
      notes: body.notes ? clampString(body.notes, 4000) : null,
      responderId: access.actor.userId,
      responderName: access.actor.name,
      responderRole: access.actor.role,
    });

    if (!updated) {
      // The optimistic guard fired: someone responded first.
      return NextResponse.json(
        { error: "Someone else responded to this first. Please reload." },
        { status: 409 }
      );
    }

    void touchRoom(roomId);
    roomBus.broadcast(roomId, { type: "decision", decisionId: approvalId });

    return NextResponse.json({ approval: updated });
  } catch (error) {
    console.error("Playground approval respond error:", error);
    return NextResponse.json({ error: "Failed to record response" }, { status: 500 });
  }
}
