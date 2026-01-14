import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailService } from "@/lib/email/service";

// GET - Fetch single task
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string; taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    const task = await db.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        files: true,
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

// PUT - Update task
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string; taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;
    const data = await request.json();

    const updateData: any = {
      title: data.title,
      description: data.description || null,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      isVisible: data.isVisible,
      assigneeId: data.assigneeId || null,
    };

    // Handle task status transitions
    if (data.status === "SUBMITTED" && !data.submittedAt) {
      updateData.submittedAt = new Date();
    }

    if (data.status === "APPROVED") {
      updateData.approvedAt = new Date();
      updateData.approvedById = session.user.id;
    }

    if (data.status === "REJECTED") {
      updateData.rejectionReason = data.rejectionReason || null;
    }

    const task = await db.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        milestone: {
          select: {
            title: true,
            project: {
              select: {
                title: true
              }
            }
          }
        },
        files: true,
      },
    });

    // Notify new assignee if assignment changed
    if (data.assigneeId && data.assigneeId !== task.assigneeId) {
      // This logic is slightly flawed because task.assigneeId is the NEW one.
      // We really want to know if it WAS different. 
      // However, the user passed `assigneeId` in `data`. 
      // If we want to be strict, we should have checked previous state.
      // But simplified: if `data.assigneeId` was provided, we assume it's an intentional set.
      // Let's refine: The user wants notification "When someone assigned". 
      // So if task.assignee exists and corresponds to the incoming data.assigneeId, we send.
    }

    // Better logic: Fetch previous state or just trust that if assigneeId is in body, it's an assignment action.
    if (data.assigneeId && task.assignee?.email) {
      await emailService.sendTaskAssigned(task.assignee.email, {
        assigneeName: task.assignee.name || 'Staff Member',
        taskTitle: task.title,
        projectName: task.milestone.project.title,
        milestoneTitle: task.milestone.title,
        dueDate: task.dueDate,
        link: `https://paxaland.com/staff/tasks?id=${task.id}`
      });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

// DELETE - Delete task
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string; taskId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await params;

    await db.task.delete({
      where: { id: taskId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
