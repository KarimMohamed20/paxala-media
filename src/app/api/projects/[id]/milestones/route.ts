import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Fetch all milestones for a project
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const milestones = await db.milestone.findMany({
      where: { projectId: id },
      orderBy: { order: "asc" },
      include: {
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json(milestones);
  } catch (error) {
    console.error("Error fetching milestones:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestones" },
      { status: 500 }
    );
  }
}

// POST - Create new milestone
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
    const data = await request.json();

    // Get the highest order number for this project
    const lastMilestone = await db.milestone.findFirst({
      where: { projectId: id },
      orderBy: { order: "desc" },
    });

    const milestone = await db.milestone.create({
      data: {
        title: data.title,
        description: data.description || null,
        order: data.order !== undefined ? data.order : (lastMilestone?.order || 0) + 1,
        price: data.price ? parseFloat(data.price) : null,
        paymentStatus: data.paymentStatus || "UNPAID",
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
        paymentAmount: data.paymentAmount ? parseFloat(data.paymentAmount) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        isVisible: data.isVisible !== undefined ? data.isVisible : true,
        projectId: id,
      },
      include: {
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(milestone);
  } catch (error) {
    console.error("Error creating milestone:", error);
    return NextResponse.json(
      { error: "Failed to create milestone" },
      { status: 500 }
    );
  }
}
