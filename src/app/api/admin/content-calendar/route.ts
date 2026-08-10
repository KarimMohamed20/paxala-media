import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ContentStatus, Prisma, Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { contentItemAdminInclude } from "@/lib/content-queries";
import {
  getActor,
  parseContentFormat,
  parseContentPlatform,
  parseContentStatus,
  parseDate,
} from "@/lib/content-authz";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

/**
 * GET /api/admin/content-calendar
 *
 * Cross-client content listing for the agency console. Separate from the portal
 * endpoint rather than an `?admin=true` branch on it: the portal route is hard
 * scoped to exactly one client and this one needs pagination plus the owning
 * client on every row. Forking on role inside one handler is what produced the
 * sprawling `?admin=true` branch in /api/projects.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!actor.isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    const where: Prisma.ContentItemWhereInput = {};

    const clientId = searchParams.get("clientId");
    if (clientId && clientId !== "ALL") where.plan = { clientId };

    const projectId = searchParams.get("projectId");
    if (projectId && projectId !== "ALL") where.projectId = projectId;

    const status = parseContentStatus(searchParams.get("status"));
    if (status) where.status = status;

    const platform = parseContentPlatform(searchParams.get("platform"));
    if (platform) where.platform = platform;

    const format = parseContentFormat(searchParams.get("format"));
    if (format) where.format = format;

    const from = parseDate(searchParams.get("from"));
    const to = parseDate(searchParams.get("to"));
    if (from || to) {
      where.scheduledAt = { ...(from && { gte: from }), ...(to && { lt: to }) };
    }

    const q = searchParams.get("q")?.trim();
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { caption: { contains: q, mode: "insensitive" } },
        { project: { title: { contains: q, mode: "insensitive" } } },
        { plan: { client: { name: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const page = Math.max(parseInt(searchParams.get("page") || "1", 10) || 1, 1);
    const pageSize = Math.min(
      Math.max(
        parseInt(searchParams.get("pageSize") || String(DEFAULT_PAGE_SIZE), 10) ||
          DEFAULT_PAGE_SIZE,
        1
      ),
      MAX_PAGE_SIZE
    );

    const [items, total, statusGroups, clients] = await Promise.all([
      db.contentItem.findMany({
        where,
        orderBy: { scheduledAt: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: contentItemAdminInclude,
      }),
      db.contentItem.count({ where }),
      // Counts follow the same filters EXCEPT status, so the status pills always
      // show how many items each pill would reveal.
      db.contentItem.groupBy({
        by: ["status"],
        where: { ...where, status: undefined },
        _count: true,
        orderBy: { status: "asc" },
      }),
      db.user.findMany({
        where: { role: Role.CLIENT },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          _count: { select: { contentPlans: true } },
        },
      }),
    ]);

    const counts = Object.fromEntries(
      Object.values(ContentStatus).map((s) => [
        s,
        statusGroups.find((g) => g.status === s)?._count ?? 0,
      ])
    ) as Record<ContentStatus, number>;

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
      counts,
      clients,
    });
  } catch (error) {
    console.error("Admin content calendar GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch content" },
      { status: 500 }
    );
  }
}
