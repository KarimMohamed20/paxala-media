import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { InvoiceStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");
    const month = searchParams.get("month"); // format: YYYY-MM

    const where: Prisma.InvoiceWhereInput = {};
    if (status && status in InvoiceStatus) where.status = status as InvoiceStatus;
    if (clientId) where.project = { clientId };
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      where.issueDate = {
        gte: new Date(y, m - 1, 1),
        lt: new Date(y, m, 1),
      };
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [invoices, outstanding, paidThisMonth] = await Promise.all([
      db.invoice.findMany({
        where,
        orderBy: { issueDate: "desc" },
        include: {
          project: {
            select: {
              id: true,
              title: true,
              slug: true,
              clientName: true,
              client: { select: { id: true, name: true, username: true } },
            },
          },
          milestone: { select: { id: true, title: true } },
        },
      }),
      // Outstanding = all ISSUED invoices (unfiltered totals)
      db.invoice.groupBy({
        by: ["currency"],
        where: { status: "ISSUED" },
        _sum: { total: true },
      }),
      // Paid this month (by last update, i.e. when marked paid)
      db.invoice.groupBy({
        by: ["currency"],
        where: { status: "PAID", updatedAt: { gte: monthStart } },
        _sum: { total: true },
      }),
    ]);

    const overdueCount = await db.invoice.count({
      where: { status: "ISSUED", dueDate: { lt: now } },
    });

    // Attach a computed overdue flag — no schema change needed
    const withFlags = invoices.map((inv) => ({
      ...inv,
      isOverdue:
        inv.status === "ISSUED" && !!inv.dueDate && inv.dueDate < now,
    }));

    return NextResponse.json({
      invoices: withFlags,
      totals: {
        outstanding: outstanding.map((g) => ({
          currency: g.currency,
          amount: g._sum.total ?? 0,
        })),
        paidThisMonth: paidThisMonth.map((g) => ({
          currency: g.currency,
          amount: g._sum.total ?? 0,
        })),
        overdueCount,
      },
    });
  } catch (error) {
    console.error("Fetch invoices error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
