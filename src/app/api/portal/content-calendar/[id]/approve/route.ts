import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ContentApprovalAction } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { clampString, rateLimit } from "@/lib/security";
import {
  approvalThreadArgs,
  contentItemDetailInclude,
} from "@/lib/content-queries";
import {
  ReviewAction,
  canAccessContentItem,
  canReview,
  getActor,
  getContentItemForAccess,
  statusForReview,
} from "@/lib/content-authz";

const REVIEW_ACTIONS: ReviewAction[] = ["SUBMIT", "APPROVE", "REJECT"];

const LOG_ACTION: Record<ReviewAction, ContentApprovalAction> = {
  SUBMIT: ContentApprovalAction.SUBMITTED,
  APPROVE: ContentApprovalAction.APPROVED,
  REJECT: ContentApprovalAction.REJECTED,
};

// POST /api/portal/content-calendar/[id]/approve
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = rateLimit(`content-approve:${actor.userId}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many review actions. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const action = body.action as ReviewAction;
    if (!REVIEW_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be SUBMIT, APPROVE or REJECT" },
        { status: 400 }
      );
    }

    // `clientNotes` accepted as an alias so older clients keep working.
    const rawNotes = body.notes ?? body.clientNotes;
    const notes = rawNotes ? clampString(rawNotes, 2000) : null;

    const existing = await getContentItemForAccess(id);
    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (!canAccessContentItem(actor, existing)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!canReview(actor, existing.status, action)) {
      return NextResponse.json(
        { error: `Cannot ${action} an item in status ${existing.status}` },
        { status: 409 }
      );
    }

    const toStatus = statusForReview(action);

    const result = await db.$transaction(async (tx) => {
      // Optimistic guard: if a second reviewer moved this item between our read
      // and this write, `count` is 0 and we bail out rather than clobbering them.
      const guard = await tx.contentItem.updateMany({
        where: { id, status: existing.status },
        data: {
          status: toStatus,
          // clientNotes mirrors the latest *verdict* note. A SUBMIT note is an
          // agency message, so it stays in the log only.
          ...(action !== "SUBMIT" && notes !== null && { clientNotes: notes }),
          ...(action === "APPROVE" && { approvedAt: new Date(), rejectedAt: null }),
          ...(action === "REJECT" && { rejectedAt: new Date(), approvedAt: null }),
          // Back into review: the previous round's verdict timestamps no longer
          // describe the current state. The log keeps the history.
          ...(action === "SUBMIT" && { approvedAt: null, rejectedAt: null }),
        },
      });
      if (guard.count === 0) return null;

      const approval = await tx.contentApproval.create({
        data: {
          contentItemId: id,
          action: LOG_ACTION[action],
          notes,
          reviewerId: actor.userId,
          reviewerRole: actor.role,
          reviewerName: actor.name,
          fromStatus: existing.status,
          toStatus,
        },
      });

      const item = await tx.contentItem.findUnique({
        where: { id },
        include: contentItemDetailInclude,
      });

      return { item, approval };
    });

    if (!result || !result.item) {
      return NextResponse.json(
        { error: "This item was updated by someone else. Please reload." },
        { status: 409 }
      );
    }

    // Spread the item so existing callers keep the same top-level shape.
    return NextResponse.json({ ...result.item, approval: result.approval });
  } catch (error) {
    console.error("Content approval POST error:", error);
    return NextResponse.json(
      { error: "Failed to process approval" },
      { status: 500 }
    );
  }
}

// GET /api/portal/content-calendar/[id]/approve — the full review thread.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getContentItemForAccess(id);
    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (!canAccessContentItem(actor, existing)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const approvals = await db.contentApproval.findMany({
      where: { contentItemId: id },
      ...approvalThreadArgs,
    });

    return NextResponse.json({ approvals });
  } catch (error) {
    console.error("Content approval GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch approval history" },
      { status: 500 }
    );
  }
}
