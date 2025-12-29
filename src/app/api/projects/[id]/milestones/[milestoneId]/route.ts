import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET - Fetch single milestone
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { milestoneId } = await params;

    const milestone = await db.milestone.findUnique({
      where: { id: milestoneId },
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

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(milestone);
  } catch (error) {
    console.error("Error fetching milestone:", error);
    return NextResponse.json(
      { error: "Failed to fetch milestone" },
      { status: 500 }
    );
  }
}

// PUT - Update milestone
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { milestoneId } = await params;
    const data = await request.json();

    const milestone = await db.milestone.update({
      where: { id: milestoneId },
      data: {
        title: data.title,
        description: data.description || null,
        order: data.order,
        price: data.price ? parseFloat(data.price) : null,
        paymentStatus: data.paymentStatus,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
        paymentAmount: data.paymentAmount ? parseFloat(data.paymentAmount) : null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        isVisible: data.isVisible,
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
    console.error("Error updating milestone:", error);
    return NextResponse.json(
      { error: "Failed to update milestone" },
      { status: 500 }
    );
  }
}

// DELETE - Delete milestone
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { milestoneId } = await params;

    await db.milestone.delete({
      where: { id: milestoneId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting milestone:", error);
    return NextResponse.json(
      { error: "Failed to delete milestone" },
      { status: 500 }
    );
  }
}
