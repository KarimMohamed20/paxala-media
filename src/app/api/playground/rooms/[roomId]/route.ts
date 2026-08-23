import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/security";
import { resolveRoomActor } from "@/lib/playground/actors";
import {
  archiveRoom,
  getMembership,
  getRoomDetail,
  getRoomForAccess,
  updateRoom,
} from "@/lib/playground/repo";
import { parseRoomText, validateRoomLinks } from "@/lib/playground/rooms";

/**
 * The room access preamble, used by every room-scoped route.
 *
 * Order matters: session -> room -> membership -> actor. `resolveRoomActor`
 * answers 404 rather than 403 for a caller with no claim on the room, so an
 * outsider cannot use this endpoint to discover which room ids exist.
 */
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

// GET /api/playground/rooms/[roomId]?mode=client
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

    const room = await getRoomDetail(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const { actor } = access;

    // In CLIENT mode the room's own metadata is trimmed too — a client has no
    // business knowing whether the room is restricted or how many internal nodes
    // exist on a canvas they can only see a published slice of.
    const payload =
      actor.mode === "CLIENT"
        ? {
            id: room.id,
            title: room.title,
            slug: room.slug,
            description: room.description,
            status: room.status,
            client: room.client,
            project: room.project,
            members: room.members,
            lastActiveAt: room.lastActiveAt,
          }
        : room;

    return NextResponse.json({
      room: payload,
      viewer: {
        userId: actor.userId,
        role: actor.role,
        effectiveRole: actor.effectiveRole,
        mode: actor.mode,
        isStaff: actor.isStaff,
        can: {
          edit: actor.can("EDIT"),
          comment: actor.can("COMMENT"),
          vote: actor.can("VOTE"),
          publish: actor.can("PUBLISH"),
          requestApproval: actor.can("REQUEST_APPROVAL"),
          approve: actor.can("APPROVE"),
          manage: actor.can("MANAGE"),
          useAi: actor.can("USE_AI"),
        },
      },
    });
  } catch (error) {
    console.error("Playground room GET error:", error);
    return NextResponse.json({ error: "Failed to load room" }, { status: 500 });
  }
}

// PATCH /api/playground/rooms/[roomId] — title, description, links, restriction.
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
    if (!access.actor.can("MANAGE")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limit = rateLimit(`pg-room-write:${access.actor.userId}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many changes. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.title !== undefined || body.description !== undefined) {
      const { title, description } = parseRoomText(body);
      if (body.title !== undefined) {
        if (!title) {
          return NextResponse.json(
            { error: "A room title is required" },
            { status: 400 }
          );
        }
        data.title = title;
      }
      if (body.description !== undefined) data.description = description;
    }

    if (body.clientId !== undefined || body.projectId !== undefined) {
      const links = await validateRoomLinks({
        clientId: body.clientId,
        projectId: body.projectId,
      });
      if (!links.ok) {
        return NextResponse.json({ error: links.error }, { status: links.status });
      }
      data.client = links.clientId
        ? { connect: { id: links.clientId } }
        : { disconnect: true };
      data.project = links.projectId
        ? { connect: { id: links.projectId } }
        : { disconnect: true };
    }

    if (typeof body.restricted === "boolean") data.restricted = body.restricted;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const room = await updateRoom(roomId, data);
    return NextResponse.json({ room });
  } catch (error) {
    console.error("Playground room PATCH error:", error);
    return NextResponse.json({ error: "Failed to update room" }, { status: 500 });
  }
}

/**
 * DELETE /api/playground/rooms/[roomId] — archives, never destroys.
 *
 * A room holds the canvas, the decision record and the approval that names what
 * a client signed off. Hard-deleting cascades all of it away, so the destructive
 * path is not offered at all: this endpoint sets status ARCHIVED and the room
 * drops out of every default listing.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const access = await resolve(roomId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    if (!access.actor.can("MANAGE")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limit = rateLimit(`pg-room-write:${access.actor.userId}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many changes. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const room = await archiveRoom(roomId);
    return NextResponse.json({ room, archived: true });
  } catch (error) {
    console.error("Playground room DELETE error:", error);
    return NextResponse.json({ error: "Failed to archive room" }, { status: 500 });
  }
}
