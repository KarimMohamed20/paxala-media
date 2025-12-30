import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET single contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id, contactId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can view contacts, or the client themselves
    if (session.user.id !== id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch the contact
    const contact = await db.clientContact.findUnique({
      where: { id: contactId },
      select: {
        id: true,
        name: true,
        phone: true,
        jobTitle: true,
        clientId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Verify contact belongs to the specified client
    if (contact.clientId !== id) {
      return NextResponse.json(
        { error: "Contact does not belong to this client" },
        { status: 400 }
      );
    }

    return NextResponse.json(contact);
  } catch (error) {
    console.error("Fetch contact error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500 }
    );
  }
}

// PUT update contact
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  try {
    const { id, contactId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can update contacts
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone, jobTitle } = body;

    // Check if contact exists
    const existingContact = await db.clientContact.findUnique({
      where: { id: contactId },
      select: { clientId: true },
    });

    if (!existingContact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Verify contact belongs to the specified client
    if (existingContact.clientId !== id) {
      return NextResponse.json(
        { error: "Contact does not belong to this client" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: { name?: string; phone?: string; jobTitle?: string | null } = {};

    if (name !== undefined) {
      if (name.trim().length < 2 || name.trim().length > 100) {
        return NextResponse.json(
          { error: "Name must be between 2 and 100 characters" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (phone !== undefined) {
      if (phone.trim().length === 0) {
        return NextResponse.json(
          { error: "Phone number cannot be empty" },
          { status: 400 }
        );
      }
      updateData.phone = phone.trim();
    }

    if (jobTitle !== undefined) {
      updateData.jobTitle = jobTitle?.trim() || null;
    }

    // Update the contact
    const contact = await db.clientContact.update({
      where: { id: contactId },
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        jobTitle: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      message: "Contact updated successfully",
      contact,
    });
  } catch (error) {
    console.error("Update contact error:", error);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

// DELETE contact
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

    // Only admins can delete contacts
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if contact exists
    const existingContact = await db.clientContact.findUnique({
      where: { id: contactId },
      select: { clientId: true },
    });

    if (!existingContact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Verify contact belongs to the specified client
    if (existingContact.clientId !== id) {
      return NextResponse.json(
        { error: "Contact does not belong to this client" },
        { status: 400 }
      );
    }

    // Delete the contact
    await db.clientContact.delete({
      where: { id: contactId },
    });

    return NextResponse.json({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Delete contact error:", error);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
