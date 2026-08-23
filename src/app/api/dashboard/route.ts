import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { BookingStatus, ContentStatus, Prisma } from "@prisma/client";
import { getActor } from "@/lib/content-authz";
import { listRooms } from "@/lib/playground/repo";
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
    //
    // A CANCELLED booking is not upcoming work. /portal/bookings — the page this
    // card links to — defines upcoming as `date >= now && status !== CANCELLED`,
    // and the overview has to agree with it: a client who cancelled a shoot was
    // still being told it was their next production.
    const upcomingBookingWhere: Prisma.BookingWhereInput = {
      date: { gte: new Date() },
      status: { not: BookingStatus.CANCELLED },
      ...(userRole !== "ADMIN" && { userId }),
    };

    const [upcomingBookings, upcomingBookingCount] = await Promise.all([
      db.booking.findMany({
        where: upcomingBookingWhere,
        orderBy: { date: "asc" },
        take: 3,
      }),
      // Counted separately: the tile used to report `upcomingBookings.length`,
      // which the `take: 3` above silently capped at 3 however many were booked.
      db.booking.count({ where: upcomingBookingWhere }),
    ]);

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
    // Delivered-against-target for the month, straight from the plan's own maths.
    let planDeliverables: { done: number; target: number } | null = null;

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
      planDeliverables = progress.deliverables;
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

    // Deliverables must mean the same thing here as on the Monthly Plan page and
    // the progress ring beside this tile: work delivered AGAINST the month's
    // deliverable targets — capped per row, manual rows included. Counting every
    // delivered item in the month instead made the two disagree (10 delivered
    // reels against a target of 4 read as "10" here and "4 of 4" there), and it
    // dropped manual deliverables, which have no format to count.
    //
    // With no published plan there are no targets, so fall back to the raw count
    // of what was delivered this month and render it without a denominator.
    const monthBounds = monthWindow(planYear, planMonth);
    const deliveredThisMonth =
      planDeliverables?.done ??
      (await db.contentItem.count({
        where: {
          plan: { clientId: userId },
          scheduledAt: { gte: monthBounds.startDate, lt: monthBounds.endDate },
          status: { in: DELIVERED_STATUSES },
        },
      }));

    const awaitingApprovalCount = await db.contentItem.count({
      where: {
        plan: { clientId: session.user.id },
        status: ContentStatus.AWAITING_APPROVAL,
      },
    });

    // ---- Playground: the rooms this actor may see, newest activity first ----
    //
    // listRooms() owns the scoping rule (roomListWhere): a CLIENT gets rooms
    // assigned to them or ones they were invited to. Reused rather than
    // re-expressed here so the dashboard card can never show a room the
    // Playground page itself would hide.
    const actor = getActor(session);
    const allRooms = actor ? await listRooms(actor) : [];
    const liveRooms = allRooms.filter((room) => room.status !== "ARCHIVED");

    const playground = {
      rooms: liveRooms.slice(0, 3).map((room) => ({
        id: room.id,
        title: room.title,
        status: room.status,
        awaitingClient: room.awaitingClient,
        projectTitle: room.project?.title ?? null,
        lastActiveAt: (room.lastActiveAt ?? room.updatedAt).toISOString(),
      })),
      total: liveRooms.length,
      awaitingCount: liveRooms.filter((room) => room.awaitingClient).length,
    };

    return NextResponse.json({
      // Resolved from the plan's package rather than a hardcoded string.
      userPlan: planPackage ? { name: planPackage.name, active: true } : null,
      monthlyPlan,
      stats: {
        deliverables: deliveredThisMonth,
        // Null when the month has no plan targets — the tile then shows a bare
        // count rather than an invented denominator.
        deliverablesTarget: planDeliverables?.target ?? null,
        awaitingApproval: awaitingApprovalCount,
        upcomingShoots: upcomingBookingCount,
      },
      contentApprovals,
      upcomingProduction,
      deliveryTrend,
      playground,
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
