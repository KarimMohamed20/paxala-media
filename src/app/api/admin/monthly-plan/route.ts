import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { clampString } from "@/lib/security";
import { getActor } from "@/lib/content-authz";
import {
  DELIVERED_STATUSES,
  PLAN_LIMITS,
  calculatePlanProgress,
  isValidMonthYear,
  monthWindow,
  resolveDeliverables,
  resolvePackage,
} from "@/lib/monthly-plan";
import {
  monthlyPlanAdminInclude,
  monthlyPlanSummaryInclude,
} from "@/lib/monthly-plan-queries";

const MONTH_LABEL = (month: number, year: number) =>
  `${new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  })} ${year}`;

/**
 * GET /api/admin/monthly-plan?month=&year=[&clientId=&status=]
 *
 * Agency console list for one month across clients, plus the clients who have
 * no plan yet — the block that actually drives the monthly workflow.
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

    const where: Prisma.ContentPlanWhereInput = { month, year };
    const clientId = searchParams.get("clientId");
    if (clientId && clientId !== "ALL") where.clientId = clientId;

    const status = searchParams.get("status");
    if (status === "PUBLISHED") where.isPublished = true;
    if (status === "DRAFT") where.isPublished = false;

    const { startDate, endDate } = monthWindow(year, month);

    const [rows, clients, formatCountsByClient] = await Promise.all([
      db.contentPlan.findMany({
        where,
        orderBy: [{ client: { name: "asc" } }],
        include: monthlyPlanSummaryInclude,
      }),
      db.user.findMany({
        where: { role: Role.CLIENT },
        orderBy: { name: "asc" },
        select: { id: true, name: true, username: true, image: true },
      }),
      db.contentItem.groupBy({
        by: ["format"],
        where: {
          scheduledAt: { gte: startDate, lt: endDate },
          status: { in: DELIVERED_STATUSES },
        },
        _count: true,
        orderBy: { format: "asc" },
      }),
    ]);

    const plans = rows.map((row) => {
      // The list only needs a percentage, so a month-wide format tally is close
      // enough; the detail view recomputes per client.
      const deliverables = resolveDeliverables(
        row.deliverables.map((d, i) => ({
          id: String(i),
          label: "",
          icon: null,
          target: d.target,
          formats: d.formats,
          manualDone: d.manualDone,
          order: i,
        })),
        formatCountsByClient
      );
      const progress = calculatePlanProgress({ weeks: row.weeks, deliverables });
      return {
        id: row.id,
        title: row.title,
        subtitle: row.subtitle,
        month: row.month,
        year: row.year,
        isPublished: row.isPublished,
        package: resolvePackage(row.packageId),
        client: row.client,
        updatedAt: row.contentUpdatedAt ?? row.updatedAt,
        progressPercent: progress.percent,
        contentItemCount: row._count.items,
        openChangeRequests: row._count.changeRequests,
      };
    });

    const withPlan = new Set(rows.map((r) => r.clientId));
    const missingClients = clients.filter((c) => !withPlan.has(c.id));

    return NextResponse.json({
      month,
      year,
      plans,
      clients,
      missingClients,
      counts: {
        published: plans.filter((p) => p.isPublished).length,
        draft: plans.filter((p) => !p.isPublished).length,
      },
    });
  } catch (error) {
    console.error("Admin monthly plan GET error:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}

/**
 * POST /api/admin/monthly-plan — create or adopt a month's plan.
 *
 * Must upsert on the compound unique: the content calendar auto-creates bare
 * ContentPlan rows, so a plain `create` would collide for any client who has
 * ever scheduled a post that month.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!actor.isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const month = parseInt(String(body.month), 10);
    const year = parseInt(String(body.year), 10);
    if (!isValidMonthYear(month, year)) {
      return NextResponse.json({ error: "Invalid month or year" }, { status: 400 });
    }

    const clientId = typeof body.clientId === "string" ? body.clientId : "";
    const client = await db.user.findFirst({
      where: { id: clientId, role: Role.CLIENT },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json({ error: "Unknown client" }, { status: 400 });
    }

    const title =
      clampString(body.title, PLAN_LIMITS.TITLE) || MONTH_LABEL(month, year);
    const subtitle = body.subtitle
      ? clampString(body.subtitle, PLAN_LIMITS.SUBTITLE)
      : null;

    const plan = await db.contentPlan.upsert({
      where: { clientId_month_year: { clientId, month, year } },
      update: { title, subtitle, contentUpdatedAt: new Date() },
      create: {
        clientId,
        month,
        year,
        title,
        subtitle,
        contentUpdatedAt: new Date(),
      },
      include: monthlyPlanAdminInclude,
    });

    // Convenience: seed the lineup from the linked project's staff so the admin
    // starts from something rather than an empty strip.
    if (plan.teamMembers.length === 0 && plan.projectId) {
      const project = await db.project.findUnique({
        where: { id: plan.projectId },
        select: { staff: { select: { id: true }, orderBy: { name: "asc" } } },
      });
      if (project && project.staff.length > 0) {
        await db.planTeamMember.createMany({
          data: project.staff.slice(0, PLAN_LIMITS.TEAM).map((s, i) => ({
            planId: plan.id,
            userId: s.id,
            order: i,
          })),
          skipDuplicates: true,
        });
      }
    }

    const fresh = await db.contentPlan.findUnique({
      where: { id: plan.id },
      include: monthlyPlanAdminInclude,
    });

    return NextResponse.json(fresh, { status: 201 });
  } catch (error) {
    console.error("Admin monthly plan POST error:", error);
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  }
}
