import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ContentStatus, Prisma, Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { clampString } from "@/lib/security";
import { contentItemInclude } from "@/lib/content-queries";
import {
  getActor,
  parseContentFormat,
  parseContentPlatform,
  parseContentStatus,
  parseDate,
  resolveTargetClientId,
  validateContentLinks,
} from "@/lib/content-authz";

// GET /api/portal/content-calendar
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = parseInt(
      searchParams.get("month") || String(now.getUTCMonth() + 1),
      10
    );
    const year = parseInt(
      searchParams.get("year") || String(now.getUTCFullYear()),
      10
    );
    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(year)
    ) {
      return NextResponse.json({ error: "Invalid month or year" }, { status: 400 });
    }

    const requestedClientId = searchParams.get("clientId");

    // Agency users have no content plans of their own, so scoping the calendar to
    // their own id would show an empty month with no hint why. Offer the client
    // list and fall back to the first client that actually has a plan.
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
      const ownsPlans = clients.some((c) => c.id === clientId);
      if (!ownsPlans) clientId = clients[0].id;
    }

    // scheduledAt is stored in UTC, so the month window must be computed in UTC.
    // Using local-time boundaries put a 00:30Z item into the previous month on any
    // server east of Greenwich (e.g. Riyadh, UTC+3).
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const monthWhere: Prisma.ContentItemWhereInput = {
      plan: { clientId },
      scheduledAt: { gte: startDate, lt: endDate },
    };

    const itemsWhere: Prisma.ContentItemWhereInput = { ...monthWhere };
    const platform = parseContentPlatform(searchParams.get("platform"));
    const status = parseContentStatus(searchParams.get("status"));
    const format = parseContentFormat(searchParams.get("format"));
    const projectId = searchParams.get("projectId");
    if (platform) itemsWhere.platform = platform;
    if (status) itemsWhere.status = status;
    if (format) itemsWhere.format = format;
    if (projectId) itemsWhere.projectId = projectId;

    const awaitingWhere: Prisma.ContentItemWhereInput = {
      plan: { clientId },
      status: ContentStatus.AWAITING_APPROVAL,
    };

    const [items, statusGroups, platformGroups, needsApproval, needsApprovalTotal] =
      await Promise.all([
        db.contentItem.findMany({
          where: itemsWhere,
          orderBy: { scheduledAt: "asc" },
          include: contentItemInclude,
        }),
        // Aggregate in the database rather than refetching the whole month and
        // filtering in memory (the previous version fetched every item twice).
        db.contentItem.groupBy({
          by: ["status"],
          where: monthWhere,
          _count: true,
          orderBy: { status: "asc" },
        }),
        db.contentItem.groupBy({
          by: ["platform"],
          where: monthWhere,
          _count: true,
          orderBy: { platform: "asc" },
        }),
        // The approval queue is deliberately NOT month-scoped: it is a global
        // action list. `metrics.awaitingApproval` counts only the visible month,
        // which is why both numbers are returned separately.
        db.contentItem.findMany({
          where: awaitingWhere,
          orderBy: { scheduledAt: "asc" },
          take: 5,
          include: contentItemInclude,
        }),
        db.contentItem.count({ where: awaitingWhere }),
      ]);

    const countOf = (...statuses: ContentStatus[]) =>
      statusGroups
        .filter((g) => statuses.includes(g.status))
        .reduce((sum, g) => sum + g._count, 0);

    const metrics = {
      scheduled: countOf(ContentStatus.SCHEDULED),
      awaitingApproval: countOf(ContentStatus.AWAITING_APPROVAL),
      drafts: countOf(ContentStatus.DRAFT, ContentStatus.IN_PROGRESS),
      // Kept distinct: an approved item has passed review but is not live yet.
      approved: countOf(ContentStatus.APPROVED),
      published: countOf(ContentStatus.PUBLISHED),
      rejected: countOf(ContentStatus.REJECTED),
    };

    const totalCount =
      platformGroups.reduce((sum, g) => sum + g._count, 0) || 1;
    const platformMix = platformGroups
      .map((g) => ({
        name: g.platform,
        count: g._count,
        percentage: Math.round((g._count / totalCount) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      items,
      metrics,
      platformMix,
      needsApproval,
      needsApprovalTotal,
      month,
      year,
      // Empty for clients; drives the agency-side client switcher.
      clients,
      clientId,
    });
  } catch (error) {
    console.error("Content calendar GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch content calendar" },
      { status: 500 }
    );
  }
}

// POST /api/portal/content-calendar
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const title = clampString(body.title, 200);
    const scheduleDate = parseDate(body.scheduledAt);
    if (!title || !scheduleDate) {
      return NextResponse.json(
        { error: "Title and Scheduled Date are required" },
        { status: 400 }
      );
    }

    const clientId = await resolveTargetClientId(actor, body.clientId);
    if (!clientId) {
      return NextResponse.json({ error: "Unknown client" }, { status: 400 });
    }

    const links = await validateContentLinks({
      clientId,
      projectId: body.projectId,
      fileIds: body.fileIds,
    });
    if (!links.ok) {
      return NextResponse.json({ error: links.error }, { status: links.status });
    }

    // Clients may only file drafts; moving an item along the pipeline is an
    // agency action, and APPROVED/REJECTED are reachable only via /approve.
    const requestedStatus = parseContentStatus(body.status);
    const status =
      actor.isStaff &&
      requestedStatus &&
      requestedStatus !== ContentStatus.APPROVED &&
      requestedStatus !== ContentStatus.REJECTED
        ? requestedStatus
        : ContentStatus.DRAFT;

    const month = scheduleDate.getUTCMonth() + 1;
    const year = scheduleDate.getUTCFullYear();

    // One plan per client per month (@@unique([clientId, month, year])). The
    // per-project link lives on the item, not the plan — a client can run several
    // projects inside the same month.
    const plan = await db.contentPlan.upsert({
      where: { clientId_month_year: { clientId, month, year } },
      update: {},
      create: {
        title: `Content Plan - ${scheduleDate.toLocaleString("en-US", {
          month: "long",
          timeZone: "UTC",
        })} ${year}`,
        month,
        year,
        clientId,
      },
    });

    const item = await db.contentItem.create({
      data: {
        title,
        caption: body.caption ? clampString(body.caption, 5000) : null,
        platform: parseContentPlatform(body.platform) ?? "INSTAGRAM",
        format: parseContentFormat(body.format) ?? "REEL",
        status,
        scheduledAt: scheduleDate,
        planId: plan.id,
        projectId: links.projectId,
        ...(links.fileIds.length > 0 && {
          assets: {
            create: links.fileIds.map((fileId, idx) => ({ fileId, order: idx })),
          },
        }),
      },
      include: contentItemInclude,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Content calendar POST error:", error);
    return NextResponse.json(
      { error: "Failed to create content item" },
      { status: 500 }
    );
  }
}
