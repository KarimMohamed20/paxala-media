import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { clampString } from "@/lib/security";
import { getActor, validateContentLinks } from "@/lib/content-authz";
import {
  DELIVERED_STATUSES,
  PLAN_LIMITS,
  monthWindow,
  parsePackageId,
  parseTags,
} from "@/lib/monthly-plan";
import {
  monthlyPlanAdminInclude,
  monthlyPlanInclude,
  serializeMonthlyPlan,
} from "@/lib/monthly-plan-queries";

async function loadPlan(id: string) {
  return db.contentPlan.findUnique({
    where: { id },
    select: { id: true, clientId: true, month: true, year: true, isPublished: true },
  });
}

// GET /api/admin/monthly-plan/[id] — the editor's initial load.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!actor.isStaff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const row = await db.contentPlan.findUnique({
      where: { id },
      include: monthlyPlanAdminInclude,
    });
    if (!row) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const { startDate, endDate } = monthWindow(row.year, row.month);
    const formatCounts = await db.contentItem.groupBy({
      by: ["format"],
      where: {
        plan: { clientId: row.clientId },
        scheduledAt: { gte: startDate, lt: endDate },
        status: { in: DELIVERED_STATUSES },
      },
      _count: true,
      orderBy: { format: "asc" },
    });

    return NextResponse.json({
      plan: serializeMonthlyPlan(row, formatCounts),
      changeRequests: row.changeRequests,
    });
  } catch (error) {
    console.error("Admin monthly plan GET[id] error:", error);
    return NextResponse.json({ error: "Failed to fetch plan" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/monthly-plan/[id] — the plan's own scalar fields only.
 * Collections are saved through /[id]/[section].
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!actor.isStaff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const existing = await loadPlan(id);
    if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const body = await request.json();
    const data: Prisma.ContentPlanUpdateInput = {};

    if (body.title !== undefined) {
      const title = clampString(body.title, PLAN_LIMITS.TITLE);
      if (!title) {
        return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
      }
      data.title = title;
    }
    if (body.subtitle !== undefined) {
      data.subtitle = body.subtitle
        ? clampString(body.subtitle, PLAN_LIMITS.SUBTITLE)
        : null;
    }
    if (body.objective !== undefined) {
      data.objective = body.objective
        ? clampString(body.objective, PLAN_LIMITS.OBJECTIVE)
        : null;
    }
    if (body.tags !== undefined) data.tags = parseTags(body.tags);
    if (body.packageId !== undefined) data.packageId = parsePackageId(body.packageId);

    if (body.projectId !== undefined) {
      // The project must belong to this plan's client.
      const links = await validateContentLinks({
        clientId: existing.clientId,
        projectId: body.projectId,
      });
      if (!links.ok) {
        return NextResponse.json({ error: links.error }, { status: links.status });
      }
      data.project = links.projectId
        ? { connect: { id: links.projectId } }
        : { disconnect: true };
    }

    data.contentUpdatedAt = new Date();

    const row = await db.contentPlan.update({
      where: { id },
      data,
      include: monthlyPlanInclude,
    });

    return NextResponse.json(serializeMonthlyPlan(row, []));
  } catch (error) {
    console.error("Admin monthly plan PUT error:", error);
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/monthly-plan/[id] — clears the Monthly-Plan layer only.
 *
 * It deliberately does NOT delete the ContentPlan row: that cascades into every
 * ContentItem, ContentApproval and ContentComment for the month. Never expose a
 * `contentPlan.delete` from any route.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!actor.isStaff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const existing = await loadPlan(id);
    if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    await db.$transaction([
      db.planWeek.deleteMany({ where: { planId: id } }), // cascades PlanWeekItem
      db.planDeliverable.deleteMany({ where: { planId: id } }),
      db.planKeyDate.deleteMany({ where: { planId: id } }),
      db.planAction.deleteMany({ where: { planId: id } }),
      db.planTeamMember.deleteMany({ where: { planId: id } }),
      db.contentPlan.update({
        where: { id },
        data: {
          subtitle: null,
          objective: null,
          tags: [],
          packageId: null,
          isPublished: false,
          contentUpdatedAt: new Date(),
        },
      }),
    ]);
    // PlanChangeRequest rows survive on purpose — they are an audit trail.

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin monthly plan DELETE error:", error);
    return NextResponse.json({ error: "Failed to clear plan" }, { status: 500 });
  }
}
