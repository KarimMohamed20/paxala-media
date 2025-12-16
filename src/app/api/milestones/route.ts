import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET milestones for a project
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Check access to project
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { clientId: true },
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

    const milestones = await db.milestone.findMany({
      where: { projectId },
      orderBy: { order: "asc" },
      include: {
        tasks: {
          orderBy: { createdAt: "asc" },
          include: {
            assignee: {
              select: { id: true, name: true, email: true, image: true },
            },
            approvedBy: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json(milestones);
  } catch (error) {
    console.error("Fetch milestones error:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestones" },
      { status: 500 }
    );
  }
}

// POST create a new milestone
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
    const { title, description, price, isVisible, projectId } = body;

    if (!title || !projectId) {
      return NextResponse.json(
        { error: "Title and project ID are required" },
        { status: 400 }
      );
    }

    // Get the highest order number for this project
    const lastMilestone = await db.milestone.findFirst({
      where: { projectId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const newOrder = (lastMilestone?.order ?? -1) + 1;

    const milestone = await db.milestone.create({
      data: {
        title,
        description: description || null,
        price: price ? parseFloat(price) : null,
        isVisible: isVisible ?? true,
        projectId,
        order: newOrder,
      },
      include: {
        tasks: true,
      },
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    console.error("Create milestone error:", error);
    return NextResponse.json(
      { error: "Failed to create milestone" },
      { status: 500 }
    );
  }
}
