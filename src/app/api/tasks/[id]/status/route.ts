import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT update task status (with workflow validation)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role;
    if (userRole !== "ADMIN" && userRole !== "STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, rejectionReason } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const validStatuses = [
      "TODO",
      "IN_PROGRESS",
      "SUBMITTED",
      "APPROVED",
      "REJECTED",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const task = await db.task.findUnique({
      where: { id },
      include: {
        assignee: {
          select: { id: true, managerId: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Validate workflow transitions
    const currentStatus = task.status;

    // Check if user is the assignee's manager
    const isManager = task.assignee?.managerId === session.user.id;
    const isAssignee = task.assigneeId === session.user.id;
    const isAdmin = userRole === "ADMIN";

    // Workflow validation
    const validTransitions: Record<string, string[]> = {
      TODO: ["IN_PROGRESS"],
      IN_PROGRESS: ["SUBMITTED"],
      SUBMITTED: ["APPROVED", "REJECTED"],
      REJECTED: ["IN_PROGRESS"],
      APPROVED: [], // Terminal state
    };

    const allowedNextStatuses = validTransitions[currentStatus] || [];

    if (!allowedNextStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from ${currentStatus} to ${status}`,
        },
        { status: 400 }
      );
    }

    // Permission checks for specific transitions
    if (status === "IN_PROGRESS" && currentStatus === "TODO") {
      // Only assignee or admin can start a task
      if (!isAssignee && !isAdmin) {
        return NextResponse.json(
          { error: "Only the assignee can start this task" },
          { status: 403 }
        );
      }
    }

    if (status === "SUBMITTED") {
      // Only assignee or admin can submit for review
      if (!isAssignee && !isAdmin) {
        return NextResponse.json(
          { error: "Only the assignee can submit this task for review" },
          { status: 403 }
        );
      }
    }

    if (status === "APPROVED" || status === "REJECTED") {
      // Only manager can approve/reject
      if (!isManager && !isAdmin) {
        return NextResponse.json(
          { error: "Only the assignee's manager can approve or reject tasks" },
          { status: 403 }
        );
      }

      // Rejection requires a reason
      if (status === "REJECTED" && !rejectionReason) {
        return NextResponse.json(
          { error: "Rejection reason is required" },
          { status: 400 }
        );
      }
    }

    if (status === "IN_PROGRESS" && currentStatus === "REJECTED") {
      // Only assignee or admin can rework a rejected task
      if (!isAssignee && !isAdmin) {
        return NextResponse.json(
          { error: "Only the assignee can rework this task" },
          { status: 403 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status,
    };

    if (status === "SUBMITTED") {
      updateData.submittedAt = new Date();
      updateData.rejectionReason = null; // Clear previous rejection reason
    }

    if (status === "APPROVED") {
      updateData.approvedAt = new Date();
      updateData.approvedById = session.user.id;
      updateData.rejectionReason = null;
    }

    if (status === "REJECTED") {
      updateData.rejectionReason = rejectionReason;
      updateData.approvedAt = null;
      updateData.approvedById = null;
    }

    if (status === "IN_PROGRESS" && currentStatus === "REJECTED") {
      updateData.submittedAt = null;
    }

    const updatedTask = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            managerId: true,
          },
        },
        approvedBy: {
          select: { id: true, name: true },
        },
        milestone: {
          select: {
            id: true,
            title: true,
            projectId: true,
            project: {
              select: { id: true, title: true },
            },
          },
        },
      },
    });

    // If task was approved, check if all tasks in the project are now approved
    if (status === "APPROVED" && updatedTask.milestone?.projectId) {
      const projectId = updatedTask.milestone.projectId;

      // Get all milestones for this project with their tasks
      const milestones = await db.milestone.findMany({
        where: { projectId },
        include: {
          tasks: {
            select: { status: true },
          },
        },
      });

      // Check if all milestones have all tasks approved
      const allMilestonesComplete = milestones.every((milestone) => {
        // A milestone with no tasks is considered complete
        if (milestone.tasks.length === 0) return true;
        // All tasks must be approved
        return milestone.tasks.every((t) => t.status === "APPROVED");
      });

      // If all milestones are complete and there's at least one milestone with tasks
      const hasAnyTasks = milestones.some((m) => m.tasks.length > 0);

      if (allMilestonesComplete && hasAnyTasks) {
        await db.project.update({
          where: { id: projectId },
          data: {
            status: "COMPLETED",
            publishedAt: new Date(), // Also publish the project
          },
        });
      }
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Update task status error:", error);
    return NextResponse.json(
      { error: "Failed to update task status" },
      { status: 500 }
    );
  }
}
