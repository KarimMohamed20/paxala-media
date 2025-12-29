import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST - Assign staff to project
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { userId } = await request.json();

    // Get current project with staff
    const project = await db.project.findUnique({
      where: { id },
      include: { staff: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if user is already assigned
    if (project.staff.some((s) => s.id === userId)) {
      return NextResponse.json(
        { error: "User already assigned to project" },
        { status: 400 }
      );
    }

    // Assign staff to project
    const updatedProject = await db.project.update({
      where: { id },
      data: {
        staff: {
          connect: { id: userId },
        },
      },
      include: {
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Error assigning staff:", error);
    return NextResponse.json(
      { error: "Failed to assign staff" },
      { status: 500 }
    );
  }
}
