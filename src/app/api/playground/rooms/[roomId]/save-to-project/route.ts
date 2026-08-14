import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PlaygroundLinkEntity, RoomApprovalStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { clampString, rateLimit } from "@/lib/security";
import { requireStudioActor, resolveRoomActor } from "@/lib/playground/actors";
import {
  createProjectLinks,
  getApproval,
  getMembership,
  getRoomDetail,
  getRoomForAccess,
  touchRoom,
} from "@/lib/playground/repo";
import type { ApprovalPayload } from "@/lib/playground/publish";

/**
 * POST /api/playground/rooms/[roomId]/save-to-project
 *
 * Turn an APPROVED direction into real project work.
 *
 * Reads from the approval's FROZEN payload, not from the live board. What gets
 * built has to be what the client signed off — if PMP kept iterating after the
 * approval (which is normal), the live nodes have moved on and would produce
 * tasks for work nobody agreed to.
 *
 * Provenance is recorded in PlaygroundLink rather than by adding columns to Task
 * or ProjectFile. Those models are shared with the rest of the platform, and a
 * `playgroundNodeId` on Task would be a Playground concern leaking into every
 * milestone screen.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const room = await getRoomForAccess(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const membership = await getMembership(roomId, session.user.id);
    const access = resolveRoomActor(session, { room, membership });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    if (!requireStudioActor(access.actor) || !access.actor.can("REQUEST_APPROVAL")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limit = rateLimit(`pg-produce:${access.actor.userId}`, {
      limit: 20,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const approvalId = typeof body.approvalId === "string" ? body.approvalId : "";
    if (!approvalId) {
      return NextResponse.json({ error: "approvalId is required" }, { status: 400 });
    }

    const detail = await getRoomDetail(roomId);
    if (!detail?.project) {
      return NextResponse.json(
        { error: "Link this room to a project first." },
        { status: 400 }
      );
    }

    const approval = await getApproval(roomId, approvalId);
    if (!approval) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Only approved work becomes project work. Producing from a pending request
    // would put the team to work on something the client has not agreed to.
    if (approval.status !== RoomApprovalStatus.APPROVED) {
      return NextResponse.json(
        { error: "This direction has not been approved yet." },
        { status: 409 }
      );
    }

    // The milestone the tasks hang from. Reusing an existing one keeps a second
    // "Production" milestone from appearing every time this runs.
    const milestoneTitle = clampString(body.milestoneTitle, 200) || approval.title;
    const existingMilestone = await db.milestone.findFirst({
      where: { projectId: detail.project.id, title: milestoneTitle },
      select: { id: true },
    });

    const milestone =
      existingMilestone ??
      (await db.milestone.create({
        data: {
          title: milestoneTitle,
          description: `Approved in PMP Playground — ${detail.title}`,
          projectId: detail.project.id,
          // Client-visible: this is work they signed off, so it belongs in the
          // portal view rather than hidden behind an internal flag.
          isVisible: true,
        },
        select: { id: true },
      }));

    // One task per frozen card that carries a title. Geometry-only nodes
    // (drawings, shapes, frames) describe layout, not deliverables.
    const payload = approval.payload as unknown as ApprovalPayload;
    const producible = (payload?.nodes ?? []).filter((node) =>
      ["CAMPAIGN_ROUTE", "SCRIPT", "STICKY", "TEXT", "DECISION"].includes(node.kind)
    );

    const created: Array<{ id: string; title: string; nodeId: string }> = [];
    for (const node of producible.slice(0, 50)) {
      const data = (node.data ?? {}) as Record<string, unknown>;
      const title = clampString(
        typeof data.title === "string" ? data.title : (node.text ?? ""),
        200
      );
      if (!title) continue;

      const task = await db.task.create({
        data: {
          title,
          description:
            node.text && node.text !== title ? node.text.slice(0, 4000) : null,
          milestoneId: milestone.id,
          isVisible: true,
        },
        select: { id: true, title: true },
      });
      created.push({ ...task, nodeId: node.id });
    }

    await createProjectLinks(roomId, [
      {
        nodeId: null,
        entityType: PlaygroundLinkEntity.MILESTONE,
        entityId: milestone.id,
        createdById: access.actor.userId,
      },
      ...created.map((task) => ({
        nodeId: task.nodeId,
        entityType: PlaygroundLinkEntity.TASK,
        entityId: task.id,
        createdById: access.actor.userId,
      })),
    ]);

    void touchRoom(roomId);

    return NextResponse.json({
      project: detail.project,
      milestoneId: milestone.id,
      tasks: created,
      // Stated explicitly: a payload of pure layout produces nothing, and
      // silence there reads as a failure.
      note:
        created.length === 0
          ? "Nothing in this approval had a title to turn into a task."
          : null,
    });
  } catch (error) {
    console.error("Playground save-to-project error:", error);
    return NextResponse.json(
      { error: "Failed to save to project" },
      { status: 500 }
    );
  }
}
