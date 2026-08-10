import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(
  req: NextRequest,
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
    const lead = await db.lead.findUnique({ where: { id } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    if (lead.convertedProjectId) {
      return NextResponse.json(
        { error: "Lead is already converted to a project" },
        { status: 409 }
      );
    }

    // Build a unique slug from the lead's name/company
    const baseTitle = lead.company || lead.clientName;
    let slug = slugify(baseTitle) || `lead-${lead.id.slice(-6)}`;
    const clash = await db.project.findUnique({ where: { slug } });
    if (clash) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const project = await db.project.create({
      data: {
        title: baseTitle,
        slug,
        description:
          lead.interestedIn
            ? `Converted from lead. Interested in: ${lead.interestedIn}`
            : "Converted from lead pipeline.",
        content: lead.notes || null,
        category: "VIDEO_PRODUCTION",
        status: "DRAFT",
        clientName: lead.clientName,
        clientId: lead.clientId || null,
      },
    });

    const updatedLead = await db.lead.update({
      where: { id },
      data: {
        stage: "WON",
        convertedProjectId: project.id,
      },
      include: {
        convertedProject: { select: { id: true, title: true, slug: true } },
      },
    });

    return NextResponse.json({ lead: updatedLead, project }, { status: 201 });
  } catch (error) {
    console.error("Convert lead error:", error);
    return NextResponse.json(
      { error: "Failed to convert lead" },
      { status: 500 }
    );
  }
}
