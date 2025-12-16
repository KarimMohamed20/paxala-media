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
