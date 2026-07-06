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

export async function GET(req: NextRequest) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage");
    const source = searchParams.get("source");
    const search = searchParams.get("search");

    const where: Prisma.LeadWhereInput = {};
    if (stage && stage in LeadStage) where.stage = stage as LeadStage;
    if (source && source in LeadSource) where.source = source as LeadSource;
    if (search) {
      where.OR = [
        { clientName: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const leads = await db.lead.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        client: { select: { id: true, name: true, username: true } },
        convertedProject: { select: { id: true, title: true, slug: true } },
      },
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error("Fetch leads error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const denied = await requireAdmin();
    if (denied) return denied;

    const body = await req.json();
    const { clientName, email } = body;

    if (!clientName || !email) {
      return NextResponse.json(
        { error: "Missing required fields: clientName, email" },
        { status: 400 }
      );
    }

    let expectedValue: Prisma.Decimal | null = null;
    if (
      body.expectedValue !== undefined &&
      body.expectedValue !== null &&
      body.expectedValue !== ""
    ) {
      const num = Number(body.expectedValue);
      if (!Number.isFinite(num) || num < 0) {
        return NextResponse.json(
          { error: "expectedValue must be a non-negative number" },
          { status: 400 }
        );
      }
      expectedValue = new Prisma.Decimal(num);
    }

    const lead = await db.lead.create({
      data: {
        clientName,
        company: body.company || null,
        email,
        phone: body.phone || null,
        source:
          body.source && body.source in LeadSource
            ? (body.source as LeadSource)
            : "OTHER",
        interestedIn: body.interestedIn || null,
        stage:
          body.stage && body.stage in LeadStage
            ? (body.stage as LeadStage)
            : "NEW",
        expectedValue,
        currency: body.currency || "ILS",
        nextFollowUpAt: body.nextFollowUpAt ? new Date(body.nextFollowUpAt) : null,
        notes: body.notes || null,
        lostReason: body.lostReason || null,
        clientId: body.clientId || null,
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Create lead error:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 }
    );
  }
}
