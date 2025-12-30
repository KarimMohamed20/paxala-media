import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST assign contact to project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and staff can assign contacts to projects
    if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { contactId } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: "Contact ID is required" },
        { status: 400 }
      );
    }

    // Fetch the project to get its clientId
    const project = await db.project.findUnique({
      where: { id },
      select: {
        clientId: true,
        contacts: {
          select: { id: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (!project.clientId) {
      return NextResponse.json(
        { error: "Project must have a client assigned before adding contacts" },
        { status: 400 }
      );
    }

    // Fetch the contact to verify it belongs to the project's client
    const contact = await db.clientContact.findUnique({
      where: { id: contactId },
      select: { clientId: true },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Verify contact belongs to the project's client
    if (contact.clientId !== project.clientId) {
      return NextResponse.json(
        { error: "Contact must belong to the project's client" },
        { status: 400 }
      );
    }

    // Check if contact is already assigned
    const isAlreadyAssigned = project.contacts.some((c) => c.id === contactId);
    if (isAlreadyAssigned) {
      return NextResponse.json(
        { error: "Contact is already assigned to this project" },
        { status: 400 }
      );
    }

    // Assign the contact to the project
    const updatedProject = await db.project.update({
      where: { id },
      data: {
        contacts: {
          connect: { id: contactId },
        },
      },
      select: {
        id: true,
        contacts: {
          select: {
            id: true,
            name: true,
            phone: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      message: "Contact assigned successfully",
      project: updatedProject,
    });
  } catch (error) {
    console.error("Assign contact error:", error);
    return NextResponse.json(
      { error: "Failed to assign contact" },
      { status: 500 }
    );
  }
}
