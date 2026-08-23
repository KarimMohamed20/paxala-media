import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailService } from "@/lib/email/service";
import { isTaskStatus, taskStatusStamps } from "@/lib/milestones";

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

    if (!isTaskStatus(status)) {
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

    const currentStatus = task.status;

    // ADMIN and STAFF drive this endpoint from the admin/staff panels and may set
    // any status directly — including TODO -> APPROVED and moving a task back out
    // of APPROVED. The TODO -> IN_PROGRESS -> SUBMITTED -> APPROVED chain still
    // shapes the buttons those panels offer; it is no longer enforced here.
    const updateData: Record<string, unknown> = {
      status,
      ...taskStatusStamps({
        status,
        previousSubmittedAt: task.submittedAt,
        actorId: session.user.id,
        rejectionReason,
      }),
    };

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
              select: {
                id: true,
                title: true,
                client: { select: { email: true, name: true } }
              },
            },
          },
        },
      },
    });

    // Notify Assignee of status changes (if they didn't do it themselves)
    if (updatedTask.assignee?.email && updatedTask.assignee.id !== session.user.id) {
      await emailService.sendTaskStatusUpdate(updatedTask.assignee.email, {
        taskTitle: updatedTask.title,
        projectName: updatedTask.milestone.project.title,
        oldStatus: currentStatus,
        newStatus: status,
        updatedBy: session.user.name || 'Admin',
        link: `https://paxaland.com/staff/tasks?id=${updatedTask.id}`
      });
    }

    // If task was approved, check if all tasks in the project/milestone are now approved
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

      // Check if CURRENT milestone is complete
      const currentMilestoneId = updatedTask.milestone.id;
      const currentMilestone = milestones.find(m => m.id === currentMilestoneId);
      const isMilestoneComplete = currentMilestone?.tasks.every(t => t.status === "APPROVED");

      if (isMilestoneComplete && updatedTask.milestone.project.client?.email) {
        await emailService.sendMilestoneCompleted(
          updatedTask.milestone.project.client.email,
          {
            milestoneTitle: updatedTask.milestone.title,
            projectName: updatedTask.milestone.project.title,
            link: `https://paxaland.com/portal/projects/${updatedTask.milestone.project.id}`
          }
        );
      }

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

        // Could also send Project Completed email here
      }
    }

    // The mirror case, now that APPROVED is no longer terminal: pulling a task
    // back out of APPROVED means the project is no longer finished, so a project
    // marked COMPLETED by the cascade above must not stay that way.
    if (
      currentStatus === "APPROVED" &&
      status !== "APPROVED" &&
      updatedTask.milestone?.projectId
    ) {
      await db.project.updateMany({
        where: { id: updatedTask.milestone.projectId, status: "COMPLETED" },
        data: { status: "IN_PROGRESS" },
      });
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
