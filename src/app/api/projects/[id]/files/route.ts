import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET all files for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");

    const where: Record<string, unknown> = { projectId: id };
    if (taskId) {
      where.taskId = taskId;
    }

    const files = await db.projectFile.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(files);
  } catch (error) {
    console.error("Fetch files error:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}

// POST add a new file to project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has access (admin or staff)
    if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Verify project exists
    const project = await db.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, url, type, description, taskId, size } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: "Name and URL are required" },
        { status: 400 }
      );
    }

    // If taskId provided, verify it belongs to this project
    if (taskId) {
      const task = await db.task.findFirst({
        where: {
          id: taskId,
          milestone: {
            projectId: id,
          },
        },
      });

      if (!task) {
        return NextResponse.json(
          { error: "Task not found in this project" },
          { status: 400 }
        );
      }
    }

    const file = await db.projectFile.create({
      data: {
        name,
        url,
        type: type || "link",
        description,
        size: size || null,
        projectId: id,
        taskId: taskId || null,
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json(
      { message: "File added successfully", file },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add file error:", error);
    return NextResponse.json(
      { error: "Failed to add file" },
      { status: 500 }
    );
  }
}
