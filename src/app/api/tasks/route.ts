import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET tasks
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role;
    if (userRole !== "ADMIN" && userRole !== "STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const milestoneId = searchParams.get("milestoneId");
    const assigneeId = searchParams.get("assigneeId");
    const status = searchParams.get("status");
    const pendingApproval = searchParams.get("pendingApproval");

    const where: Record<string, unknown> = {};

    if (milestoneId) {
      where.milestoneId = milestoneId;
    }

    if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    if (status) {
      where.status = status;
    }

    // Get tasks pending approval
    // For admins: show all SUBMITTED tasks (or only those where they are the manager)
    if (pendingApproval === "true") {
      where.status = "SUBMITTED";
      // If user is ADMIN, show all submitted tasks
      // If user is STAFF, only show tasks where they are the manager (unlikely but possible)
      if (userRole !== "ADMIN") {
        where.assignee = {
          managerId: session.user.id,
        };
      }
    }

    const tasks = await db.task.findMany({
      where,
      orderBy: { createdAt: "asc" },
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
            project: {
              select: { id: true, title: true, slug: true },
            },
          },
        },
      },
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Fetch tasks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST create a new task
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      priority,
      dueDate,
      isVisible,
      milestoneId,
      assigneeId,
    } = body;

    if (!title || !milestoneId) {
      return NextResponse.json(
        { error: "Title and milestone ID are required" },
        { status: 400 }
      );
    }

    // Verify milestone exists
    const milestone = await db.milestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
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

    const task = await db.task.create({
      data: {
        title,
        description: description || null,
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        isVisible: isVisible ?? true,
        milestoneId,
        assigneeId: assigneeId || null,
      },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Create task error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
