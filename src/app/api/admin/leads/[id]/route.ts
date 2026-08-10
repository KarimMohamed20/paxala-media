import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { LeadSource, LeadStage, Prisma } from "@prisma/client";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id } = await params;
    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, username: true } },
        convertedProject: { select: { id: true, title: true, slug: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error("Fetch lead error:", error);
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id } = await params;
    const body = await req.json();

    const existing = await db.lead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const data: Prisma.LeadUpdateInput = {};
    if (body.clientName !== undefined) data.clientName = body.clientName;
    if (body.company !== undefined) data.company = body.company || null;
    if (body.email !== undefined) data.email = body.email;
    if (body.phone !== undefined) data.phone = body.phone || null;
    if (body.source !== undefined && body.source in LeadSource)
      data.source = body.source as LeadSource;
    if (body.interestedIn !== undefined) data.interestedIn = body.interestedIn || null;
    if (body.stage !== undefined && body.stage in LeadStage)
      data.stage = body.stage as LeadStage;
    if (body.expectedValue !== undefined) {
      if (body.expectedValue === null || body.expectedValue === "") {
        data.expectedValue = null;
      } else {
        const num = Number(body.expectedValue);
        if (!Number.isFinite(num) || num < 0) {
          return NextResponse.json(
            { error: "expectedValue must be a non-negative number" },
            { status: 400 }
          );
        }
        data.expectedValue = new Prisma.Decimal(num);
      }
    }
    if (body.currency !== undefined) data.currency = body.currency || "ILS";
    if (body.nextFollowUpAt !== undefined)
      data.nextFollowUpAt = body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.lostReason !== undefined) data.lostReason = body.lostReason || null;

    const lead = await db.lead.update({ where: { id }, data });
    return NextResponse.json(lead);
  } catch (error) {
    console.error("Update lead error:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { id } = await params;
    const existing = await db.lead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    await db.lead.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete lead error:", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
