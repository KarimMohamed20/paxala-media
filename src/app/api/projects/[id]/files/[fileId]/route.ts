import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET single file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id, fileId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const file = await db.projectFile.findFirst({
      where: {
        id: fileId,
        projectId: id,
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

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json(file);
  } catch (error) {
    console.error("Fetch file error:", error);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}

// PUT update file
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id, fileId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingFile = await db.projectFile.findFirst({
      where: {
        id: fileId,
        projectId: id,
      },
    });

    if (!existingFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, url, type, description, taskId } = body;

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

    const file = await db.projectFile.update({
      where: { id: fileId },
      data: {
        name: name ?? existingFile.name,
        url: url ?? existingFile.url,
        type: type ?? existingFile.type,
        description: description !== undefined ? description : existingFile.description,
        taskId: taskId !== undefined ? (taskId || null) : existingFile.taskId,
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

    return NextResponse.json({ message: "File updated successfully", file });
  } catch (error) {
    console.error("Update file error:", error);
    return NextResponse.json(
      { error: "Failed to update file" },
      { status: 500 }
    );
  }
}

// DELETE file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id, fileId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingFile = await db.projectFile.findFirst({
      where: {
        id: fileId,
        projectId: id,
      },
    });

    if (!existingFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await db.projectFile.delete({
      where: { id: fileId },
    });

    return NextResponse.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete file error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
