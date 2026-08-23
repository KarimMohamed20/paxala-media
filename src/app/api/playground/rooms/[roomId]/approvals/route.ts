import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { RoomApprovalAction, RoomApprovalStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { getAppBaseUrl } from "@/lib/constants";
import { sendPlaygroundApprovalRequest } from "@/lib/email/service";
import { EmailLocale } from "@/lib/email/styles";
import { clampString, rateLimit } from "@/lib/security";
import { requireStudioActor, resolveRoomActor } from "@/lib/playground/actors";
import { roomBus } from "@/lib/playground/bus";
import { buildApprovalPayload, contentHashOf } from "@/lib/playground/publish";
import {
  createApproval,
  getMembership,
  getRoomDetail,
  getRoomForAccess,
  listApprovalRecipients,
  listApprovals,
  readPublishSource,
  respondToApproval,
  touchRoom,
} from "@/lib/playground/repo";

/**
 * Approval requests.
 *
 * Submitting freezes the selected content into `payload` and stamps it with a
 * SHA-256 `contentHash`. From that moment the approval refers to those exact
 * bytes: PMP can carry on editing the live board, and the record of what the
 * client signed off does not move underneath them.
 *
 * `atSeq` records the room sequence at the freeze, so the timeline can be
 * wound back to "what did the board look like when we asked".
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

// GET — the approval history. Readable in both modes: this IS the client's record.
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

    return NextResponse.json({
      approvals: await listApprovals(roomId),
      canRequest: access.actor.can("REQUEST_APPROVAL"),
      canRespond: access.actor.can("APPROVE"),
    });
  } catch (error) {
    console.error("Playground approvals GET error:", error);
    return NextResponse.json({ error: "Failed to load approvals" }, { status: 500 });
  }
}

// POST — submit a selection for approval, freezing it.
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
    if (!requireStudioActor(access.actor) || !access.actor.can("REQUEST_APPROVAL")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limit = rateLimit(`pg-approval:${access.actor.userId}`, {
      limit: 20,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many approval requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const title = clampString(body.title, 200);
    if (!title) {
      return NextResponse.json(
        { error: "Give the client something to approve" },
        { status: 400 }
      );
    }

    const requested: string[] = Array.isArray(body.nodeIds)
      ? (body.nodeIds as unknown[]).filter((id): id is string => typeof id === "string")
      : [];

    const { nodes, edges } = await readPublishSource(roomId);
    const payload = buildApprovalPayload(requested, nodes, edges);

    // Nothing survived the filters — almost always "you selected internal work".
    // Refusing here is better than sending an empty deck to a client.
    if (payload.nodes.length === 0) {
      return NextResponse.json(
        {
          error:
            "Nothing in this selection is published to the client yet. Publish it first.",
          excluded: payload.excluded,
        },
        { status: 400 }
      );
    }

    const room = await getRoomDetail(roomId);
    const approval = await createApproval({
      roomId,
      title,
      note: body.note ? clampString(body.note, 4000) : null,
      payload: payload as unknown as Parameters<typeof createApproval>[0]["payload"],
      contentHash: contentHashOf(payload),
      atSeq: room?.opSeq ?? 0,
      requestedById: access.actor.userId,
      requestedByName: access.actor.name,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
    });

    // The submission itself is logged, so the audit trail starts at "asked".
    await respondToApproval({
      roomId,
      approvalId: approval.id,
      fromStatus: RoomApprovalStatus.PENDING,
      toStatus: RoomApprovalStatus.PENDING,
      action: RoomApprovalAction.SUBMITTED,
      notes: null,
      responderId: access.actor.userId,
      responderName: access.actor.name,
      responderRole: access.actor.role,
    });

    void touchRoom(roomId);
    roomBus.broadcast(roomId, { type: "decision", decisionId: approval.id });

    // Tell the people who can actually sign off: client members of the room,
    // plus the room's client scope. The approve page was built to be opened
    // from exactly this email. Fully detached so the 201 does not wait on the
    // recipient lookup or SMTP.
    const locale = (request.cookies.get("NEXT_LOCALE")?.value ||
      "en") as EmailLocale;
    const roomTitle = room?.title ?? "Playground";
    const link = `${getAppBaseUrl()}/playground/${roomId}/approve/${approval.id}`;
    void (async () => {
      const recipients = await listApprovalRecipients(roomId);
      await Promise.all(
        recipients.map(({ email, name }) =>
          sendPlaygroundApprovalRequest(
            email,
            { name, roomTitle, approvalTitle: title, link },
            locale
          )
        )
      );
    })().catch((error) =>
      console.error("Approval request email send failed:", error)
    );

    return NextResponse.json(
      { approval, excluded: payload.excluded },
      { status: 201 }
    );
  } catch (error) {
    console.error("Playground approvals POST error:", error);
    return NextResponse.json(
      { error: "Failed to request approval" },
      { status: 500 }
    );
  }
}
