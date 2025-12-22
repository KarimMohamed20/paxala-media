import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userRole = session.user.role;

    // Fetch projects for this user (or all for admin)
    const projectsWhere = userRole === "ADMIN" ? {} : { clientId: userId };

    const projects = await db.project.findMany({
      where: projectsWhere,
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        files: {
          select: { id: true },
        },
      },
    });

    // Fetch bookings for this user (or all for admin)
    const bookingsWhere = userRole === "ADMIN"
      ? { date: { gte: new Date() } }
      : { userId, date: { gte: new Date() } };

    const bookings = await db.booking.findMany({
      where: bookingsWhere,
      orderBy: { date: "asc" },
      take: 5,
    });

    // Calculate stats
    const activeProjectsCount = await db.project.count({
      where: {
        ...projectsWhere,
        status: { in: ["IN_PROGRESS", "REVIEW"] },
      },
    });

    const upcomingBookingsCount = await db.booking.count({
      where: bookingsWhere,
    });

    const filesCountWhere = userRole === "ADMIN" 
      ? {} 
      : { project: { clientId: userId } };
    
    const filesCount = await db.projectFile.count({
      where: filesCountWhere,
    });

    // Format projects for response
    const recentProjects = projects.map((project) => {
      // Calculate progress based on status
      const progressMap: Record<string, number> = {
        DRAFT: 10,
        IN_PROGRESS: 50,
        REVIEW: 85,
        COMPLETED: 100,
        ARCHIVED: 100,
      };

      return {
        id: project.id,
        title: project.title,
        slug: project.slug,
        status: project.status,
        progress: progressMap[project.status] || 0,
        lastUpdate: formatDistanceToNow(project.updatedAt, { addSuffix: true }),
        filesCount: project.files.length,
      };
    });

    // Format bookings for response
    const upcomingBookings = bookings.map((booking) => ({
      id: booking.id,
      service: booking.serviceType,
      date: booking.date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: booking.timeSlot,
      status: booking.status,
    }));

    // Generate notifications based on recent activity
    const notifications: { id: string; message: string; time: string; type: string }[] = [];

    // Check for recent file uploads
    const recentFilesWhere = userRole === "ADMIN"
      ? { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
      : {
          project: { clientId: userId },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        };
    
    const recentFiles = await db.projectFile.findMany({
      where: recentFilesWhere,
      orderBy: { createdAt: "desc" },
      take: 3,
      include: {
        project: { select: { title: true } },
      },
    });

    recentFiles.forEach((file) => {
      notifications.push({
        id: `file-${file.id}`,
        message: `New file uploaded to ${file.project.title}`,
        time: formatDistanceToNow(file.createdAt, { addSuffix: true }),
        type: "info",
      });
    });

    // Check for projects in review
    const reviewProjects = await db.project.findMany({
      where: {
        ...projectsWhere,
        status: "REVIEW",
      },
      take: 2,
    });

    reviewProjects.forEach((project) => {
      notifications.push({
        id: `review-${project.id}`,
        message: `${project.title} ready for review`,
        time: formatDistanceToNow(project.updatedAt, { addSuffix: true }),
        type: "success",
      });
    });

    // Check for upcoming bookings (within 3 days)
    const soonBookings = await db.booking.findMany({
      where: {
        ...bookingsWhere,
        date: {
          gte: new Date(),
          lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      },
      take: 2,
    });

    soonBookings.forEach((booking) => {
      notifications.push({
        id: `booking-${booking.id}`,
        message: `Upcoming booking reminder: ${booking.serviceType}`,
        time: formatDistanceToNow(booking.date, { addSuffix: true }),
        type: "warning",
      });
    });

    return NextResponse.json({
      stats: {
        activeProjects: activeProjectsCount,
        upcomingBookings: upcomingBookingsCount,
        filesAvailable: filesCount,
        notifications: notifications.length,
      },
      recentProjects,
      upcomingBookings,
      notifications: notifications.slice(0, 5),
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
