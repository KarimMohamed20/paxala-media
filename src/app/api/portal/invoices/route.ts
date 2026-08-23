import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { InvoiceStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Invoices for the signed-in client, scoped through project ownership the same
// way the download route authorizes access. Drafts are internal and never shown.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invoices = await db.invoice.findMany({
      where: {
        project: { clientId: session.user.id },
        status: { not: InvoiceStatus.DRAFT },
      },
      orderBy: { issueDate: "desc" },
      select: {
        id: true,
        number: true,
        status: true,
        issueDate: true,
        dueDate: true,
        currency: true,
        total: true,
        pdfUrl: true,
        project: { select: { title: true, slug: true } },
        milestone: { select: { title: true } },
      },
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("Fetch portal invoices error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
