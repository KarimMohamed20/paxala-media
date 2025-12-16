import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// PUT update payment status
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
    const { paymentStatus, paymentDate, paymentAmount } = body;

    if (!paymentStatus) {
      return NextResponse.json(
        { error: "Payment status is required" },
        { status: 400 }
      );
    }

    const validStatuses = ["UNPAID", "PARTIAL", "PAID"];
    if (!validStatuses.includes(paymentStatus)) {
      return NextResponse.json(
        { error: "Invalid payment status" },
        { status: 400 }
      );
    }

    const milestone = await db.milestone.findUnique({
      where: { id },
    });

    if (!milestone) {
      return NextResponse.json(
        { error: "Milestone not found" },
        { status: 404 }
      );
    }

    const updateData: {
      paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
      paymentDate?: Date | null;
      paymentAmount?: number | null;
    } = {
      paymentStatus,
    };

    // Set payment date
    if (paymentStatus === "PAID" || paymentStatus === "PARTIAL") {
      updateData.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
    } else {
      updateData.paymentDate = null;
    }

    // Set payment amount
    if (paymentStatus === "PARTIAL" && paymentAmount !== undefined) {
      updateData.paymentAmount = parseFloat(paymentAmount);
    } else if (paymentStatus === "PAID") {
      updateData.paymentAmount = milestone.price
        ? parseFloat(milestone.price.toString())
        : null;
    } else {
      updateData.paymentAmount = null;
    }

    const updatedMilestone = await db.milestone.update({
      where: { id },
      data: updateData,
      include: {
        tasks: true,
      },
    });

    return NextResponse.json(updatedMilestone);
  } catch (error) {
    console.error("Update payment error:", error);
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}
