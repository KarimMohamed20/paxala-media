import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clampString, rateLimit } from "@/lib/security";
import { resolveRoomActor } from "@/lib/playground/actors";
import { roomBus } from "@/lib/playground/bus";
import {
  createDecision,
  getMembership,
  getRoomForAccess,
  listDecisions,
  readNodes,
  touchRoom,
} from "@/lib/playground/repo";

/**
 * Decision records.
 *
 * The room's actual output: what was chosen, out of what, by whom, when. The
 * brief's complaint is that decisions "disappear inside chat", so these are
 * first-class rows rather than a pinned message.
 *
 * `options` is a SNAPSHOT of the alternatives as they read at the moment of
 * deciding. The cards they came from stay editable, and a record that silently
 * changed alongside them would be worthless — the same reasoning that freezes
 * Invoice.items while the milestone rows carry on.
 *
 * Readable in both modes: showing a client what was decided is the point.
 */

const MAX_OPTIONS = 12;

async function resolve(roomId: string, requestedMode?: string | null) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }
  const room = await getRoomForAccess(roomId);
  if (!room) {
    return { ok: false as const, status: 404 as const, error: "Room not found" };
  }
  const membership = await getMembership(roomId, session.user.id);
  return resolveRoomActor(session, { room, membership, requestedMode });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { searchParams } = new URL(request.url);

    const access = await resolve(roomId, searchParams.get("mode"));
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const decisions = await listDecisions(roomId);

    // `nodeIds` is trimmed to what this actor can actually open, so a client is
    // not handed identifiers for internal cards referenced by a decision.
    const visible = new Set((await readNodes(access.actor)).map((n) => n.id));

    return NextResponse.json({
      decisions: decisions.map((decision) => ({
        ...decision,
        nodeIds: decision.nodeIds.filter((id) => visible.has(id)),
      })),
      canRecord: access.actor.can("EDIT"),
    });
  } catch (error) {
    console.error("Playground decisions GET error:", error);
    return NextResponse.json({ error: "Failed to load decisions" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const access = await resolve(roomId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    // Recording a decision is an agency act. A client's verdict is expressed
    // through the approval workflow, which carries its own audit trail.
    if (!access.actor.can("EDIT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limit = rateLimit(`pg-decision:${access.actor.userId}`, {
      limit: 30,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many decisions recorded. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const title = clampString(body.title, 200);
    if (!title) {
      return NextResponse.json({ error: "A decision needs a title" }, { status: 400 });
    }

    const options = Array.isArray(body.options)
      ? body.options.slice(0, MAX_OPTIONS).map((option: unknown) => {
          const source = (option ?? {}) as Record<string, unknown>;
          return {
            label: clampString(source.label, 200),
            nodeId: typeof source.nodeId === "string" ? source.nodeId : null,
            votes: typeof source.votes === "number" ? source.votes : 0,
            chosen: source.chosen === true,
          };
        })
      : [];

    // Only nodes that exist in this room may be cited.
    const roomNodes = new Set((await readNodes(access.actor)).map((n) => n.id));
    const citedIds: string[] = Array.isArray(body.nodeIds)
      ? (body.nodeIds as unknown[]).filter(
          (id): id is string => typeof id === "string"
        )
      : [];
    const nodeIds = [...new Set(citedIds)]
      .filter((id) => roomNodes.has(id))
      .slice(0, 50);

    const decision = await createDecision({
      roomId,
      title,
      description: body.description ? clampString(body.description, 4000) : null,
      options,
      outcome: body.outcome ? clampString(body.outcome, 500) : null,
      nodeIds,
      createdById: access.actor.userId,
      createdByName: access.actor.name,
    });

    void touchRoom(roomId);
    roomBus.broadcast(roomId, { type: "decision", decisionId: decision.id });

    return NextResponse.json({ decision }, { status: 201 });
  } catch (error) {
    console.error("Playground decisions POST error:", error);
    return NextResponse.json({ error: "Failed to record decision" }, { status: 500 });
  }
}
