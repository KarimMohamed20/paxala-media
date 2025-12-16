import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET milestones for client portal (with visibility filtering)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;

    // Find the project
    const project = await db.project.findUnique({
      where: { slug },
      select: {
        id: true,
        clientId: true,
        title: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const userRole = session.user.role;
    const isAdminOrStaff = userRole === "ADMIN" || userRole === "STAFF";
    const isClient = project.clientId === session.user.id;

    if (!isAdminOrStaff && !isClient) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch milestones with visibility filtering for clients
    const milestones = await db.milestone.findMany({
      where: {
        projectId: project.id,
        // Only show visible milestones to clients
        ...(isClient && { isVisible: true }),
      },
      orderBy: { order: "asc" },
      include: {
        tasks: {
          where: {
            // Only show visible tasks to clients
            ...(isClient && { isVisible: true }),
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            title: true,
            description: isClient ? false : true, // Hide description from clients
            status: true,
            priority: isClient ? false : true, // Hide priority from clients
            dueDate: isClient ? false : true, // Hide due date from clients
            isVisible: true,
            // Hide assignee info from clients
            ...(isAdminOrStaff && {
              assignee: {
                select: { id: true, name: true, image: true },
              },
            }),
            createdAt: true,
            approvedAt: true,
          },
        },
      },
    });

    // Calculate progress for each milestone
    const milestonesWithProgress = milestones.map((milestone) => {
      const totalTasks = milestone.tasks.length;
      const completedTasks = milestone.tasks.filter(
        (task) => task.status === "APPROVED"
      ).length;
      const progressPercent =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...milestone,
        totalTasks,
        completedTasks,
        progressPercent,
        // Convert price to number for JSON
        price: milestone.price ? parseFloat(milestone.price.toString()) : null,
        paymentAmount: milestone.paymentAmount
          ? parseFloat(milestone.paymentAmount.toString())
          : null,
      };
    });

    // Calculate payment summary
    const paymentSummary = {
      totalPrice: milestonesWithProgress.reduce(
        (sum, m) => sum + (m.price || 0),
        0
      ),
      paidAmount: milestonesWithProgress.reduce((sum, m) => {
        if (m.paymentStatus === "PAID") {
          return sum + (m.price || 0);
        }
        if (m.paymentStatus === "PARTIAL") {
          return sum + (m.paymentAmount || 0);
        }
        return sum;
      }, 0),
      paidMilestones: milestonesWithProgress.filter(
        (m) => m.paymentStatus === "PAID"
      ).length,
      totalMilestones: milestonesWithProgress.length,
    };

    // Calculate overall progress
    const totalTasks = milestonesWithProgress.reduce(
      (sum, m) => sum + m.totalTasks,
      0
    );
    const completedTasks = milestonesWithProgress.reduce(
      (sum, m) => sum + m.completedTasks,
      0
    );
    const overallProgress =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return NextResponse.json({
      project: {
        id: project.id,
        title: project.title,
      },
      milestones: milestonesWithProgress,
      summary: {
        ...paymentSummary,
        unpaidAmount: paymentSummary.totalPrice - paymentSummary.paidAmount,
        totalTasks,
        completedTasks,
        overallProgress,
      },
    });
  } catch (error) {
    console.error("Fetch portal milestones error:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestones" },
      { status: 500 }
    );
  }
}
