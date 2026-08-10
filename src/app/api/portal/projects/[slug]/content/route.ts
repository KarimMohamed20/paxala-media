import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ContentStatus, Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessProject, getProjectBySlugForAccess } from "@/lib/authz";
import { contentItemInclude } from "@/lib/content-queries";
import { parseContentStatus } from "@/lib/content-authz";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * GET /api/portal/projects/[slug]/content
 *
 * All content scheduled against one project, ordered by publish date. Slug-addressed
 * to match the sibling milestones route and the pages that consume it.
 *
 * Deliberately NOT month-windowed like the calendar endpoint: a project tab wants
 * the whole arc of a project's content, not one month of it.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const project = await getProjectBySlugForAccess(slug);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (!canAccessProject(session, project)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = parseContentStatus(searchParams.get("status"));
    const cursor = searchParams.get("cursor");
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, 1),
      MAX_LIMIT
    );

    const where: Prisma.ContentItemWhereInput = { projectId: project.id };
    if (status) where.status = status;

    const [rows, statusGroups] = await Promise.all([
      db.contentItem.findMany({
        where,
        orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
        take: limit + 1, // one extra row tells us whether another page exists
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        include: contentItemInclude,
      }),
      db.contentItem.groupBy({
        by: ["status"],
        where: { projectId: project.id },
        _count: true,
        orderBy: { status: "asc" },
      }),
    ]);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    const counts = Object.fromEntries(
      Object.values(ContentStatus).map((s) => [
        s,
        statusGroups.find((g) => g.status === s)?._count ?? 0,
      ])
    ) as Record<ContentStatus, number>;

    return NextResponse.json({
      project: { id: project.id, title: project.title, slug: project.slug },
      items,
      counts,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
    });
  } catch (error) {
    console.error("Project content GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch project content" },
      { status: 500 }
    );
  }
}
