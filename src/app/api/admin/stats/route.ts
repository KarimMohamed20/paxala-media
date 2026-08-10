import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const OPEN_STAGES = ["NEW", "CONTACTED", "PROPOSAL_SENT", "NEGOTIATING"] as const;

    // Get various stats
    const [
      totalUsers,
      totalClients,
      totalProjects,
      activeProjects,
      completedProjects,
      totalBookings,
      pendingBookings,
      totalInquiries,
      newInquiries,
      totalFiles,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: "CLIENT" } }),
      db.project.count(),
      db.project.count({ where: { status: { in: ["IN_PROGRESS", "REVIEW"] } } }),
      db.project.count({ where: { status: "COMPLETED" } }),
      db.booking.count(),
      db.booking.count({ where: { status: "PENDING" } }),
      db.contactInquiry.count(),
      db.contactInquiry.count({ where: { status: "NEW" } }),
      db.projectFile.count(),
    ]);

    // KPI block (leads / invoices / overdue)
    const [
      leadsThisMonth,
      proposalsSentThisMonth,
      wonLeads,
      lostLeads,
      openPipeline,
      revenueThisMonth,
      outstandingReceivables,
      overdueProjects,
      overdueFollowUps,
    ] = await Promise.all([
      db.lead.count({ where: { createdAt: { gte: monthStart } } }),
      // Approximation: stage history is not tracked, so we count leads that
      // are currently at PROPOSAL_SENT or further and were updated this month.
      db.lead.count({
        where: {
          stage: { in: ["PROPOSAL_SENT", "NEGOTIATING", "WON"] },
          updatedAt: { gte: monthStart },
        },
      }),
      db.lead.count({ where: { stage: "WON" } }),
      db.lead.count({ where: { stage: "LOST" } }),
      db.lead.groupBy({
        by: ["currency"],
        where: { stage: { in: [...OPEN_STAGES] } },
        _sum: { expectedValue: true },
      }),
      db.invoice.groupBy({
        by: ["currency"],
        where: { status: "PAID", updatedAt: { gte: monthStart } },
        _sum: { total: true },
      }),
      db.invoice.groupBy({
        by: ["currency"],
        where: { status: "ISSUED" },
        _sum: { total: true },
      }),
      db.project.count({
        where: {
          deadline: { lt: now },
          status: { notIn: ["COMPLETED", "ARCHIVED"] },
        },
      }),
      db.lead.count({
        where: {
          nextFollowUpAt: { lt: now },
          stage: { in: [...OPEN_STAGES] },
        },
      }),
    ]);

    // Get recent activity
    const [recentProjects, recentBookings, recentInquiries] = await Promise.all([
      db.project.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          client: {
            select: { name: true },
          },
        },
      }),
      db.booking.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          serviceType: true,
          date: true,
          status: true,
          createdAt: true,
        },
      }),
      db.contactInquiry.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          subject: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    // Get monthly stats (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const projectsByMonth = await db.project.groupBy({
      by: ["createdAt"],
      where: {
        createdAt: { gte: sixMonthsAgo },
      },
      _count: true,
    });

    const bookingsByMonth = await db.booking.groupBy({
      by: ["createdAt"],
      where: {
        createdAt: { gte: sixMonthsAgo },
      },
      _count: true,
    });

    return NextResponse.json({
      stats: {
        users: {
          total: totalUsers,
          clients: totalClients,
        },
        projects: {
          total: totalProjects,
          active: activeProjects,
          completed: completedProjects,
        },
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
        },
        inquiries: {
          total: totalInquiries,
          new: newInquiries,
        },
        files: {
          total: totalFiles,
        },
        kpi: {
          leadsThisMonth,
          proposalsSentThisMonth,
          conversionRate:
            wonLeads + lostLeads > 0
              ? Math.round((wonLeads / (wonLeads + lostLeads)) * 100)
              : null,
          openPipeline: openPipeline.map((g) => ({
            currency: g.currency,
            amount: g._sum.expectedValue ?? 0,
          })),
          revenueThisMonth: revenueThisMonth.map((g) => ({
            currency: g.currency,
            amount: g._sum.total ?? 0,
          })),
          outstandingReceivables: outstandingReceivables.map((g) => ({
            currency: g.currency,
            amount: g._sum.total ?? 0,
          })),
          overdueProjects,
          overdueFollowUps,
        },
      },
      recent: {
        projects: recentProjects,
        bookings: recentBookings,
        inquiries: recentInquiries,
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}
