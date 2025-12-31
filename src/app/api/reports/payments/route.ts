import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") || new Date().getFullYear().toString();
    const month = searchParams.get("month"); // optional, if not provided, get all months

    // Fetch all milestones with payment information
    const milestones = await db.milestone.findMany({
      where: {
        paymentStatus: {
          in: ["PAID", "PARTIAL"],
        },
        paymentDate: {
          not: null,
        },
      },
      include: {
        project: {
          include: {
            client: true,
          },
        },
      },
      orderBy: {
        paymentDate: "desc",
      },
    });

    // Filter by year and optionally by month
    const filteredMilestones = milestones.filter((milestone) => {
      if (!milestone.paymentDate) return false;
      const paymentDate = new Date(milestone.paymentDate);
      const paymentYear = paymentDate.getFullYear().toString();
      const paymentMonth = (paymentDate.getMonth() + 1).toString();

      if (paymentYear !== year) return false;
      if (month && paymentMonth !== month) return false;

      return true;
    });

    // Group milestones by month
    const milestonesByMonth: Record<
      string,
      {
        month: number;
        year: number;
        milestones: any[];
        totalPaid: number;
        clients: Set<string>;
      }
    > = {};

    filteredMilestones.forEach((milestone) => {
      if (!milestone.paymentDate) return;

      const paymentDate = new Date(milestone.paymentDate);
      const monthKey = `${paymentDate.getFullYear()}-${String(
        paymentDate.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!milestonesByMonth[monthKey]) {
        milestonesByMonth[monthKey] = {
          month: paymentDate.getMonth() + 1,
          year: paymentDate.getFullYear(),
          milestones: [],
          totalPaid: 0,
          clients: new Set(),
        };
      }

      const paidAmount =
        milestone.paymentStatus === "PAID"
          ? milestone.price
            ? parseFloat(milestone.price.toString())
            : 0
          : milestone.paymentAmount
          ? parseFloat(milestone.paymentAmount.toString())
          : 0;

      milestonesByMonth[monthKey].milestones.push({
        id: milestone.id,
        title: milestone.title,
        price: milestone.price ? parseFloat(milestone.price.toString()) : null,
        paymentStatus: milestone.paymentStatus,
        paymentAmount: milestone.paymentAmount
          ? parseFloat(milestone.paymentAmount.toString())
          : null,
        paymentDate: milestone.paymentDate,
        paidAmount,
        project: {
          id: milestone.project.id,
          title: milestone.project.title,
          slug: milestone.project.slug,
          client: milestone.project.client
            ? {
                id: milestone.project.client.id,
                name: milestone.project.client.name,
                email: milestone.project.client.email,
              }
            : null,
        },
      });

      milestonesByMonth[monthKey].totalPaid += paidAmount;

      if (milestone.project.client) {
        milestonesByMonth[monthKey].clients.add(milestone.project.client.id);
      }
    });

    // Convert to array and sort
    const monthlyData = Object.entries(milestonesByMonth)
      .map(([key, data]) => ({
        monthKey: key,
        month: data.month,
        year: data.year,
        totalPaid: data.totalPaid,
        milestonesCount: data.milestones.length,
        clientsCount: data.clients.size,
        milestones: data.milestones,
      }))
      .sort((a, b) => {
        // Sort by year and month descending
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });

    // Get all clients who have active projects
    const allProjects = await db.project.findMany({
      where: {
        clientId: {
          not: null,
        },
        status: {
          in: ["IN_PROGRESS", "REVIEW"],
        },
      },
      include: {
        client: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Find clients we didn't work with in the specified period
    const startDate = month
      ? new Date(parseInt(year), parseInt(month) - 1, 1)
      : new Date(parseInt(year), 0, 1);
    const endDate = month
      ? new Date(parseInt(year), parseInt(month), 0)
      : new Date(parseInt(year), 11, 31);

    const clientsWorkedWith = new Set(
      filteredMilestones
        .filter((m) => m.project.client)
        .map((m) => m.project.client!.id)
    );

    const inactiveClients = allProjects
      .filter((project) => {
        if (!project.client) return false;
        return !clientsWorkedWith.has(project.client.id);
      })
      .map((project) => ({
        id: project.client!.id,
        name: project.client!.name,
        email: project.client!.email,
        lastProject: {
          id: project.id,
          title: project.title,
          slug: project.slug,
          status: project.status,
          updatedAt: project.updatedAt,
        },
      }));

    // Remove duplicates (same client might have multiple projects)
    const uniqueInactiveClients = Array.from(
      new Map(inactiveClients.map((c) => [c.id, c])).values()
    );

    // Calculate summary
    const summary = {
      totalPaid: filteredMilestones.reduce((sum, m) => {
        const paidAmount =
          m.paymentStatus === "PAID"
            ? m.price
              ? parseFloat(m.price.toString())
              : 0
            : m.paymentAmount
            ? parseFloat(m.paymentAmount.toString())
            : 0;
        return sum + paidAmount;
      }, 0),
      totalMilestones: filteredMilestones.length,
      uniqueClients: new Set(
        filteredMilestones
          .filter((m) => m.project.client)
          .map((m) => m.project.client!.id)
      ).size,
      inactiveClientsCount: uniqueInactiveClients.length,
    };

    return NextResponse.json({
      year: parseInt(year),
      month: month ? parseInt(month) : null,
      summary,
      monthlyData,
      inactiveClients: uniqueInactiveClients,
    });
  } catch (error) {
    console.error("Payment report error:", error);
    return NextResponse.json(
      { error: "Failed to generate payment report" },
      { status: 500 }
    );
  }
}
