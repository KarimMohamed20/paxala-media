import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActor, resolveTargetClientId } from "@/lib/content-authz";
import {
  DELIVERED_STATUSES,
  isValidMonthYear,
  monthWindow,
} from "@/lib/monthly-plan";
import {
  monthlyPlanInclude,
  serializeMonthlyPlan,
} from "@/lib/monthly-plan-queries";

/**
 * GET /api/portal/monthly-plan?month=&year=[&clientId=]
 *
 * Always 200 — a plan row may exist with no Monthly-Plan content (the content
 * calendar auto-creates bare rows), or not exist at all. The `state` field tells
 * the page which of the three empty-ish cases it is looking at.
 */
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
    if (!isValidMonthYear(month, year)) {
      return NextResponse.json({ error: "Invalid month or year" }, { status: 400 });
    }

    const requestedClientId = searchParams.get("clientId");

    // Agency users own no plans of their own, so hand them the client list and
    // default to the first client that has one — same affordance as the calendar.
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

    const { startDate, endDate } = monthWindow(year, month);

    const [row, formatCounts] = await Promise.all([
      db.contentPlan.findUnique({
        where: { clientId_month_year: { clientId, month, year } },
        include: monthlyPlanInclude,
      }),
      // Scoped by the month window rather than planId: the calendar's PUT can
      // change an item's scheduledAt without re-homing its planId, and the
      // calendar grid itself scopes by window. Keeping both on the window is
      // what stops the two pages disagreeing.
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

    const base = {
      month,
      year,
      clientId,
      clients,
      canEdit: actor.isStaff,
    };

    if (!row) {
      return NextResponse.json({ ...base, plan: null, state: "EMPTY" });
    }

    // Clients never see a draft.
    if (!row.isPublished && !actor.isStaff) {
      return NextResponse.json({ ...base, plan: null, state: "UNPUBLISHED" });
    }

    const plan = serializeMonthlyPlan(row, formatCounts);

    const hasContent =
      plan.weeks.length > 0 ||
      plan.deliverables.length > 0 ||
      plan.actions.length > 0 ||
      !!plan.objective;

    return NextResponse.json({
      ...base,
      plan,
      state: hasContent ? "READY" : "EMPTY",
    });
  } catch (error) {
    console.error("Monthly plan GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch monthly plan" },
      { status: 500 }
    );
  }
}
