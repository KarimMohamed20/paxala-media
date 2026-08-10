import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActor, resolveTargetClientId } from "@/lib/content-authz";
import { isValidMonthYear } from "@/lib/monthly-plan";
import { parseRange, rollingMonths } from "@/lib/reports";
import { buildReport, fetchReportData } from "@/lib/reports-queries";

/**
 * GET /api/portal/reports?month=&year=&range=3|6|12[&clientId=]
 *
 * Delivery and collaboration metrics for one client. Always 200 with a `state`
 * discriminator — mirroring the monthly-plan contract — so the page can render
 * an honest empty state rather than a wall of zeros.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = parseInt(
      searchParams.get("month") || String(now.getUTCMonth() + 1),
      10
    );
    const year = parseInt(
      searchParams.get("year") || String(now.getUTCFullYear()),
      10
    );
    if (!isValidMonthYear(month, year)) {
      return NextResponse.json({ error: "Invalid month or year" }, { status: 400 });
    }
    // `range` is a filter, so an unrecognised value is clamped rather than 400 —
    // consistent with every other filter in this codebase.
    const range = parseRange(searchParams.get("range"));

    const requestedClientId = searchParams.get("clientId");

    // Agency users own no content, so hand them the client list and default to
    // the first client that has a plan. Copied from the monthly-plan route.
    const clients = actor.isStaff
      ? await db.user.findMany({
          where: { role: Role.CLIENT, contentPlans: { some: {} } },
          orderBy: { name: "asc" },
          select: { id: true, name: true, username: true, image: true },
        })
      : [];

    let clientId = await resolveTargetClientId(actor, requestedClientId);
    if (!clientId) {
      return NextResponse.json({ error: "Unknown client" }, { status: 400 });
    }
    if (actor.isStaff && !requestedClientId && clients.length > 0) {
      if (!clients.some((c) => c.id === clientId)) clientId = clients[0].id;
    }

    const base = {
      clientId,
      clients,
      canSwitchClient: actor.isStaff,
      generatedAt: new Date().toISOString(),
    };

    if (actor.isStaff && clients.length === 0) {
      return NextResponse.json({ ...base, state: "NO_CLIENT", report: null });
    }

    const client = await db.user.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, username: true, image: true },
    });

    // range + 1 so the month-over-month delta always has a prior month.
    const months = rollingMonths(year, month, range + 1);
    const raw = await fetchReportData(clientId, months);

    if (raw.items.length === 0 && raw.plans.length === 0) {
      return NextResponse.json({
        ...base,
        client,
        state: "EMPTY",
        report: null,
      });
    }

    return NextResponse.json({
      ...base,
      client,
      state: "READY",
      report: buildReport(raw, year, month, range),
    });
  } catch (error) {
    console.error("Reports GET error:", error);
    return NextResponse.json(
      { error: "Failed to build report" },
      { status: 500 }
    );
  }
}
