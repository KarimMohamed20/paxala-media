import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE - Remove staff from project
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, userId } = await params;

    // Remove staff from project
    await db.project.update({
      where: { id },
      data: {
        staff: {
          disconnect: { id: userId },
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing staff:", error);
    return NextResponse.json(
      { error: "Failed to remove staff" },
      { status: 500 }
    );
  }
}
