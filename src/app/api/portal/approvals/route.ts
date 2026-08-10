import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ContentStatus, Prisma, Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  approvalThreadArgs,
  commentThreadArgs,
  contentItemInclude,
} from "@/lib/content-queries";
import {
  getActor,
  parseContentFormat,
  parseContentStatus,
  resolveTargetClientId,
} from "@/lib/content-authz";

/** Statuses that belong in a review queue at all. */
const REVIEW_STATUSES: ContentStatus[] = [
  ContentStatus.AWAITING_APPROVAL,
  ContentStatus.REJECTED,
  ContentStatus.APPROVED,
];

/**
 * GET /api/portal/approvals
 *
 * The client's review queue. Deliberately NOT month-windowed like the calendar —
 * an approval is an action item regardless of when the post is scheduled.
 *
 * ?status=  AWAITING_APPROVAL | REJECTED | APPROVED   (default: all three)
 * ?format=  content format filter ("All Content" in the UI)
 * ?q=       search over title/caption/project
 * ?itemId=  ensure a specific item is included and returned as `selected`
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedClientId = searchParams.get("clientId");

    // Same agency-user affordance as the calendar: staff own no plans, so give
    // them the client list rather than an empty queue.
    const clients = actor.isStaff
      ? await db.user.findMany({
          where: { role: Role.CLIENT, contentPlans: { some: {} } },
          orderBy: { name: "asc" },
          select: { id: true, name: true, username: true },
        })
      : [];

    let clientId = await resolveTargetClientId(actor, requestedClientId);
    if (!clientId) {
      return NextResponse.json({ error: "Unknown client" }, { status: 400 });
    }
    if (actor.isStaff && !requestedClientId && clients.length > 0) {
      if (!clients.some((c) => c.id === clientId)) clientId = clients[0].id;
    }

    const scope: Prisma.ContentItemWhereInput = { plan: { clientId } };

    const where: Prisma.ContentItemWhereInput = {
      ...scope,
      status: { in: REVIEW_STATUSES },
    };

    const status = parseContentStatus(searchParams.get("status"));
    if (status && REVIEW_STATUSES.includes(status)) where.status = status;

    const format = parseContentFormat(searchParams.get("format"));
    if (format) where.format = format;

    const q = searchParams.get("q")?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { caption: { contains: q, mode: "insensitive" } },
        { project: { title: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [items, counts] = await Promise.all([
      db.contentItem.findMany({
        where,
        // Soonest review deadline first; items with no explicit due date fall
        // back to their publish date via the sort below.
        orderBy: [{ status: "asc" }, { scheduledAt: "asc" }],
        take: 100,
        include: contentItemInclude,
      }),
      db.contentItem.groupBy({
        by: ["status"],
        where: { ...scope, status: { in: REVIEW_STATUSES } },
        _count: true,
        orderBy: { status: "asc" },
      }),
    ]);

    const countOf = (s: ContentStatus) =>
      counts.find((c) => c.status === s)?._count ?? 0;

    // Sort by effective due date (reviewDueAt ?? scheduledAt), pending first.
    const due = (i: (typeof items)[number]) =>
      +new Date(i.reviewDueAt ?? i.scheduledAt);
    const rank = (s: ContentStatus) =>
      s === ContentStatus.AWAITING_APPROVAL ? 0 : s === ContentStatus.REJECTED ? 1 : 2;
    items.sort((a, b) => rank(a.status) - rank(b.status) || due(a) - due(b));

    // The item opened in the workspace comes back with its full thread so the
    // page needs one request, not three.
    // `|| null`, not `??`: an empty ?itemId= must fall through to the first
    // queue entry rather than being treated as a real id.
    const requestedItemId = searchParams.get("itemId") || null;
    const selectedId = requestedItemId ?? items[0]?.id ?? null;
    const selected = selectedId
      ? await db.contentItem.findFirst({
          where: { id: selectedId, ...scope },
          include: {
            ...contentItemInclude,
            approvals: approvalThreadArgs,
            comments: commentThreadArgs,
          },
        })
      : null;

    return NextResponse.json({
      items,
      selected,
      counts: {
        awaitingApproval: countOf(ContentStatus.AWAITING_APPROVAL),
        changesRequested: countOf(ContentStatus.REJECTED),
        approved: countOf(ContentStatus.APPROVED),
      },
      clients,
      clientId,
    });
  } catch (error) {
    console.error("Approvals GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch approvals" },
      { status: 500 }
    );
  }
}
