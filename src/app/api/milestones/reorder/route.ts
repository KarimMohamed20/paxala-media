import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT reorder milestones
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { milestoneIds, projectId } = body;

    if (!milestoneIds || !Array.isArray(milestoneIds) || !projectId) {
      return NextResponse.json(
        { error: "Milestone IDs array and project ID are required" },
        { status: 400 }
      );
    }

    // Verify all milestones belong to the project
    const milestones = await db.milestone.findMany({
      where: {
        id: { in: milestoneIds },
        projectId,
      },
    });

    if (milestones.length !== milestoneIds.length) {
      return NextResponse.json(
        { error: "Some milestones were not found or don't belong to this project" },
        { status: 400 }
      );
    }

    // Update order for each milestone
    const updatePromises = milestoneIds.map((id: string, index: number) =>
      db.milestone.update({
        where: { id },
        data: { order: index },
      })
    );

    await Promise.all(updatePromises);

    // Fetch updated milestones
    const updatedMilestones = await db.milestone.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
      include: {
        tasks: {
          orderBy: { createdAt: "asc" },
          include: {
            assignee: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedMilestones);
  } catch (error) {
    console.error("Reorder milestones error:", error);
    return NextResponse.json(
      { error: "Failed to reorder milestones" },
      { status: 500 }
    );
  }
}
