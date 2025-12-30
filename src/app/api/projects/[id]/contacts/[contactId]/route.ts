import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// DELETE remove contact from project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id, contactId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and staff can remove contacts from projects
    if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if project exists
    const project = await db.project.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Check if contact exists
    const contact = await db.clientContact.findUnique({
      where: { id: contactId },
      select: { id: true },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Remove the contact from the project
    await db.project.update({
      where: { id },
      data: {
        contacts: {
          disconnect: { id: contactId },
        },
      },
    });

    return NextResponse.json({ message: "Contact removed successfully" });
  } catch (error) {
    console.error("Remove contact error:", error);
    return NextResponse.json(
      { error: "Failed to remove contact" },
      { status: 500 }
    );
  }
}
