import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ContentStatus } from "@prisma/client";
import { getDeliveryTrend } from "@/lib/reports-queries";
import {
  DELIVERED_STATUSES,
  calculatePlanProgress,
  monthWindow,
  resolveDeliverables,
  resolvePackage,
} from "@/lib/monthly-plan";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // The projects query that used to sit here fetched 6 projects with every
    // milestone and task, solely to compute `projects.length * 3` as a fake
    // deliverables count. Nothing consumed the rows, so it is gone.
    const upcomingBookings = await db.booking.findMany({
      where:
        userRole === "ADMIN"
          ? { date: { gte: new Date() } }
          : { userId, date: { gte: new Date() } },
      orderBy: { date: "asc" },
      take: 3,
    });

    // ---- Content approvals: the client's most recently reviewed items ----
    const approvalRows = await db.contentItem.findMany({
      where: {
        plan: { clientId: userId },
        status: {
          in: [
            ContentStatus.AWAITING_APPROVAL,
            ContentStatus.APPROVED,
            ContentStatus.REJECTED,
          ],
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        format: true,
        status: true,
        updatedAt: true,
        project: { select: { title: true } },
        assets: {
          orderBy: { order: "asc" },
          take: 1,
          select: { file: { select: { thumbnail: true, url: true, type: true } } },
        },
      },
    });

    const APPROVAL_STATUS: Record<string, string> = {
      [ContentStatus.AWAITING_APPROVAL]: "REVIEW",
      [ContentStatus.APPROVED]: "APPROVED",
      [ContentStatus.REJECTED]: "CHANGES_REQUESTED",
    };

    const contentApprovals = approvalRows.map((item) => {
      const file = item.assets[0]?.file;
      return {
        id: item.id,
        title: item.title,
        // The content format, not an invented "Video"/"Image" label.
        category: item.format,
        projectTitle: item.project?.title ?? null,
        // ISO, so the client can format it in the active locale.
        updatedAt: item.updatedAt.toISOString(),
        // Null rather than a stock photo — the UI renders a placeholder.
        thumbnail:
          file?.thumbnail ??
          (file?.type?.toLowerCase().includes("image") ? file.url : null),
        status: APPROVAL_STATUS[item.status] ?? "REVIEW",
      };
    });

    // ---- Next production booking, or null. There is no fallback shoot. ----
    const nextBooking = upcomingBookings[0];
    const upcomingProduction = nextBooking
      ? {
          id: nextBooking.id,
          date: nextBooking.date.toISOString(),
          serviceType: nextBooking.serviceType,
          // Booking has no location column — the old "Paxala Studio A" was invented.
          timeSlot: nextBooking.timeSlot || null,
          durationMinutes: nextBooking.duration,
          status: nextBooking.status,
        }
      : null;

    // ---- Monthly Plan: the current month's published plan, if any ----
    const now = new Date();
    const planMonth = now.getUTCMonth() + 1;
    const planYear = now.getUTCFullYear();

    const planRow = await db.contentPlan.findFirst({
      where: {
        clientId: session.user.id,
        month: planMonth,
        year: planYear,
        // A client must never see a draft.
        ...(userRole !== "ADMIN" && userRole !== "STAFF" && { isPublished: true }),
      },
      include: {
        deliverables: true,
        weeks: { select: { items: { select: { status: true } } } },
      },
    });

    let monthlyPlan: {
      id: string;
      title: string;
      subtitle: string | null;
      progress: number;
      month: number;
      year: number;
    } | null = null;
    let planPackage: { id: string; name: string; tier: string } | null = null;

    if (planRow) {
      const { startDate, endDate } = monthWindow(planYear, planMonth);
      const formatCounts = await db.contentItem.groupBy({
        by: ["format"],
        where: {
          plan: { clientId: session.user.id },
          scheduledAt: { gte: startDate, lt: endDate },
          status: { in: DELIVERED_STATUSES },
        },
        _count: true,
        orderBy: { format: "asc" },
      });
      const deliverables = resolveDeliverables(
        planRow.deliverables.map((d) => ({
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
        weeks: planRow.weeks,
        deliverables,
      });
      planPackage = resolvePackage(planRow.packageId);
      monthlyPlan = {
        id: planRow.id,
        title: planRow.title,
        subtitle: planRow.subtitle,
        progress: progress.percent,
        month: planRow.month,
        year: planRow.year,
      };
    }

    // Delivered content per month — replaces six hardcoded literals that every
    // client saw identically, permanently frozen in July.
    const deliveryTrend = await getDeliveryTrend(session.user.id, 6);

    // Real deliverables: content actually delivered this month. The old value
    // was `projects.length * 3`, which had no relationship to any record.
    const monthBounds = monthWindow(planYear, planMonth);
    const deliveredThisMonth = await db.contentItem.count({
      where: {
        plan: { clientId: userId },
        scheduledAt: { gte: monthBounds.startDate, lt: monthBounds.endDate },
        status: { in: DELIVERED_STATUSES },
      },
    });

    const awaitingApprovalCount = await db.contentItem.count({
      where: {
        plan: { clientId: session.user.id },
        status: ContentStatus.AWAITING_APPROVAL,
      },
    });

    return NextResponse.json({
      // Resolved from the plan's package rather than a hardcoded string.
      userPlan: planPackage ? { name: planPackage.name, active: true } : null,
      monthlyPlan,
      stats: {
        deliverables: deliveredThisMonth,
        awaitingApproval: awaitingApprovalCount,
        upcomingShoots: upcomingBookings.length,
      },
      contentApprovals,
      upcomingProduction,
      deliveryTrend,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
