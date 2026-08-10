import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PlanItemStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActor } from "@/lib/content-authz";
import {
  DELIVERED_STATUSES,
  calculatePlanProgress,
  monthWindow,
  resolveDeliverables,
} from "@/lib/monthly-plan";
import { planActionSelect } from "@/lib/monthly-plan-queries";

/**
 * POST /api/portal/monthly-plan/actions/[id] — { done: boolean }
 *
 * A client ticks one of their own action items off. Returns the recomputed
 * progress alongside the action so the ring animates without a refetch.
 */
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

    const { id } = await params;
    const body = await request.json();
    if (typeof body.done !== "boolean") {
      return NextResponse.json({ error: "`done` must be a boolean" }, { status: 400 });
    }

    const action = await db.planAction.findUnique({
      where: { id },
      select: {
        id: true,
        planId: true,
        plan: {
          select: {
            clientId: true,
            isPublished: true,
            month: true,
            year: true,
          },
        },
      },
    });
    if (!action) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    const isOwner = action.plan.clientId === actor.userId;
    if (!actor.isStaff && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // A client cannot act on a plan they are not supposed to see yet.
    if (!actor.isStaff && !action.plan.isPublished) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const updated = await db.$transaction(async (tx) => {
      const row = await tx.planAction.update({
        where: { id },
        data: {
          status: body.done
            ? PlanItemStatus.COMPLETED
            : PlanItemStatus.AWAITING_CLIENT,
          completedAt: body.done ? now : null,
          completedById: body.done ? actor.userId : null,
        },
        select: planActionSelect,
      });
      await tx.contentPlan.update({
        where: { id: action.planId },
        data: { contentUpdatedAt: now },
      });
      return row;
    });

    // Recompute the ring from fresh state.
    const { month, year, clientId } = action.plan;
    const { startDate, endDate } = monthWindow(year, month);
    const [plan, formatCounts] = await Promise.all([
      db.contentPlan.findUnique({
        where: { id: action.planId },
        select: {
          deliverables: { orderBy: { order: "asc" } },
          weeks: { select: { items: { select: { status: true } } } },
        },
      }),
      db.contentItem.groupBy({
        by: ["format"],
        where: {
          plan: { clientId },
          scheduledAt: { gte: startDate, lt: endDate },
          status: { in: DELIVERED_STATUSES },
        },
        _count: true,
        orderBy: { format: "asc" },
      }),
    ]);

    const deliverables = resolveDeliverables(
      (plan?.deliverables ?? []).map((d) => ({
        id: d.id,
        label: d.label,
        icon: d.icon,
        target: d.target,
        formats: d.formats,
        manualDone: d.manualDone,
        order: d.order,
      })),
      formatCounts
    );
    const progress = calculatePlanProgress({
      weeks: plan?.weeks ?? [],
      deliverables,
    });

    return NextResponse.json({ action: updated, progress });
  } catch (error) {
    console.error("Plan action POST error:", error);
    return NextResponse.json({ error: "Failed to update action" }, { status: 500 });
  }
}
