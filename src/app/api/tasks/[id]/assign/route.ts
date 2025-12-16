import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT assign task to user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { assigneeId } = body;

    const task = await db.task.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // If assigneeId provided, verify user exists and is ADMIN or STAFF
    if (assigneeId) {
      const assignee = await db.user.findUnique({
        where: { id: assigneeId },
        select: { role: true },
      });

      if (!assignee) {
        return NextResponse.json(
          { error: "Assignee not found" },
          { status: 404 }
        );
      }

      if (assignee.role !== "ADMIN" && assignee.role !== "STAFF") {
        return NextResponse.json(
          { error: "Tasks can only be assigned to ADMIN or STAFF users" },
          { status: 400 }
        );
      }
    }

    const updatedTask = await db.task.update({
      where: { id },
      data: {
        assigneeId: assigneeId || null,
      },
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
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Assign task error:", error);
    return NextResponse.json(
      { error: "Failed to assign task" },
      { status: 500 }
    );
  }
}
