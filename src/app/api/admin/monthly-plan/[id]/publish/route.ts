import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActor } from "@/lib/content-authz";

/**
 * PATCH /api/admin/monthly-plan/[id]/publish — { isPublished: boolean }
 *
 * A static segment, so it takes precedence over the sibling [section] route.
 * Publishing is what makes the plan visible to the client, so it is its own
 * endpoint rather than a field on the scalar PUT.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!actor.isStaff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const body = await request.json();
    if (typeof body.isPublished !== "boolean") {
      return NextResponse.json(
        { error: "`isPublished` must be a boolean" },
        { status: 400 }
      );
    }

    const existing = await db.contentPlan.findUnique({
      where: { id },
      select: { id: true, publishedAt: true },
    });
    if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const plan = await db.contentPlan.update({
      where: { id },
      data: {
        isPublished: body.isPublished,
        // publishedAt records a historical fact: stamped on first publish and
        // never cleared, matching ContentItem.publishedAt.
        ...(body.isPublished && !existing.publishedAt && { publishedAt: new Date() }),
        contentUpdatedAt: new Date(),
      },
      select: { id: true, isPublished: true, publishedAt: true, contentUpdatedAt: true },
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Admin monthly plan publish error:", error);
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}
