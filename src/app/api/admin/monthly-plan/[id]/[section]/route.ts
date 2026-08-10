import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActor } from "@/lib/content-authz";
import { DELIVERED_STATUSES, monthWindow } from "@/lib/monthly-plan";
import {
  monthlyPlanInclude,
  serializeMonthlyPlan,
} from "@/lib/monthly-plan-queries";
import {
  PLAN_SECTIONS,
  saveSection,
  type PlanSection,
} from "@/lib/monthly-plan-sections";

/**
 * PUT /api/admin/monthly-plan/[id]/[section]
 *
 * Full ordered-array replace for one collection. The array index becomes
 * `order`, so reorder is a client-side swap plus one save — the same contract
 * `api/milestones/reorder` uses.
 *
 * section ∈ deliverables | key-dates | weeks | actions | team
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; section: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!actor.isStaff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id, section } = await params;
    if (!PLAN_SECTIONS.includes(section as PlanSection)) {
      return NextResponse.json(
        { error: `Unknown section. Expected one of: ${PLAN_SECTIONS.join(", ")}` },
        { status: 404 }
      );
    }

    const plan = await db.contentPlan.findUnique({
      where: { id },
      select: { id: true, clientId: true, month: true, year: true },
    });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const body = await request.json();

    const outcome = await db.$transaction(async (tx) => {
      const result = await saveSection(
        tx,
        plan.id,
        plan.clientId,
        section as PlanSection,
        body.items
      );
      if (!result.ok) return result;

      await tx.contentPlan.update({
        where: { id: plan.id },
        data: { contentUpdatedAt: new Date() },
      });

      return { ok: true as const };
    });

    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }

    const { startDate, endDate } = monthWindow(plan.year, plan.month);
    const [row, formatCounts] = await Promise.all([
      db.contentPlan.findUnique({ where: { id }, include: monthlyPlanInclude }),
      db.contentItem.groupBy({
        by: ["format"],
        where: {
          plan: { clientId: plan.clientId },
          scheduledAt: { gte: startDate, lt: endDate },
          status: { in: DELIVERED_STATUSES },
        },
        _count: true,
        orderBy: { format: "asc" },
      }),
    ]);

    return NextResponse.json(serializeMonthlyPlan(row!, formatCounts));
  } catch (error) {
    console.error("Admin monthly plan section PUT error:", error);
    return NextResponse.json({ error: "Failed to save section" }, { status: 500 });
  }
}
