import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clampString, rateLimit } from "@/lib/security";
import { resolveRoomActor } from "@/lib/playground/actors";
import { roomBus } from "@/lib/playground/bus";
import {
  createComment,
  getMembership,
  getRoomForAccess,
  readComments,
  readNodes,
  setCommentResolved,
  touchRoom,
} from "@/lib/playground/repo";

/**
 * Comments on canvas nodes.
 *
 * A client may comment — that is the point of inviting them — but only on nodes
 * they can already see. `clientCommentWhere()` enforces that on read; on write,
 * anchoring is validated against the same visibility rule, so a client cannot
 * attach feedback to an internal node by guessing its id and thereby confirm it
 * exists.
 */

const MAX_COMMENT_LENGTH = 4000;

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

    return NextResponse.json({ comments: await readComments(access.actor) });
  } catch (error) {
    console.error("Playground comments GET error:", error);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
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
    if (!access.actor.can("COMMENT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limit = rateLimit(`pg-comment:${access.actor.userId}`, {
      limit: 120,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many comments. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const text = clampString(body.body, MAX_COMMENT_LENGTH);
    if (!text) {
      return NextResponse.json({ error: "Comment is empty" }, { status: 400 });
    }

    const nodeId = typeof body.nodeId === "string" ? body.nodeId : null;

    // The anchor must be a node in THIS actor's own projection. Checked for
    // everyone, not just clients: a staff member previewing as a client resolves
    // to CLIENT mode, and the preview has to behave like the real thing.
    // 404 rather than 403 — confirming the node exists would leak its existence.
    if (nodeId) {
      const visible = await readNodes(access.actor);
      if (!visible.some((node) => node.id === nodeId)) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    const comment = await createComment({
      roomId,
      nodeId,
      body: text,
      authorId: access.actor.userId,
      authorName: access.actor.name,
      authorRole: access.actor.role,
    });

    void touchRoom(roomId);
    roomBus.broadcast(roomId, {
      type: "comment",
      nodeId,
      commentId: comment.id,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Playground comments POST error:", error);
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }
}

// PATCH — resolve or reopen a thread. Agency-side only: closing feedback is a
// statement that it has been dealt with.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const access = await resolve(roomId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    if (!access.actor.can("EDIT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const commentId = typeof body.commentId === "string" ? body.commentId : "";
    if (!commentId) {
      return NextResponse.json({ error: "commentId is required" }, { status: 400 });
    }

    const updated = await setCommentResolved(
      roomId,
      commentId,
      body.resolved !== false
    );
    if (updated.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    roomBus.broadcast(roomId, { type: "comment", nodeId: null, commentId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Playground comments PATCH error:", error);
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 });
  }
}
