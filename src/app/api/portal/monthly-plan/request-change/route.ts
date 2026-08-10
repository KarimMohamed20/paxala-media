import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { clampString, rateLimit } from "@/lib/security";
import { getActor, resolveTargetClientId } from "@/lib/content-authz";
import { PLAN_LIMITS, isValidMonthYear } from "@/lib/monthly-plan";

/**
 * POST /api/portal/monthly-plan/request-change
 * Body: { month, year, message, clientId? }
 *
 * The only write a CLIENT makes against the plan document. Persisted rather than
 * emailed so the request survives an SMTP failure and the agency has an inbox.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = rateLimit(`plan-change:${actor.userId}`, {
      limit: 5,
      windowMs: 60 * 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many change requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const month = parseInt(String(body.month), 10);
    const year = parseInt(String(body.year), 10);
    if (!isValidMonthYear(month, year)) {
      return NextResponse.json({ error: "Invalid month or year" }, { status: 400 });
    }

    const message = clampString(body.message, PLAN_LIMITS.CHANGE_MESSAGE);
    if (!message) {
      return NextResponse.json(
        { error: "Please describe the change you need." },
        { status: 400 }
      );
    }

    const clientId = await resolveTargetClientId(actor, body.clientId);
    if (!clientId) {
      return NextResponse.json({ error: "Unknown client" }, { status: 400 });
    }

    const plan = await db.contentPlan.findUnique({
      where: { clientId_month_year: { clientId, month, year } },
      select: { id: true },
    });
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const created = await db.planChangeRequest.create({
      data: {
        planId: plan.id,
        requesterId: actor.userId,
        requesterName: actor.name,
        requesterRole: actor.role,
        message,
      },
      select: { id: true, message: true, status: true, createdAt: true },
    });

    // Notification is best-effort and deliberately outside the write above —
    // a mail failure must not lose the request.

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Plan change request POST error:", error);
    return NextResponse.json(
      { error: "Failed to submit change request" },
      { status: 500 }
    );
  }
}
