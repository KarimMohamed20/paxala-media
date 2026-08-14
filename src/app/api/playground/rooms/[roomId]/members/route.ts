import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { RoomMemberRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/security";
import { resolveRoomActor } from "@/lib/playground/actors";
import {
  countOwners,
  getMembership,
  getRoomForAccess,
  listMembers,
  removeMember,
  upsertMember,
} from "@/lib/playground/repo";

async function resolve(roomId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }
  const room = await getRoomForAccess(roomId);
  if (!room) {
    return { ok: false as const, status: 404 as const, error: "Room not found" };
  }
  const membership = await getMembership(roomId, session.user.id);
  return resolveRoomActor(session, { room, membership });
}

function parseRole(value: unknown): RoomMemberRole | null {
  if (typeof value !== "string") return null;
  return Object.values(RoomMemberRole).includes(value as RoomMemberRole)
    ? (value as RoomMemberRole)
    : null;
}

// GET /api/playground/rooms/[roomId]/members
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const access = await resolve(roomId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const members = await listMembers(roomId);

    // Everyone in the room can see who else is in it — that is the People tab.
    // Only a manager gets the invitable-user list, so a client cannot enumerate
    // the agency's staff and other clients.
    const invitable = access.actor.can("MANAGE")
      ? await db.user.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true, username: true, image: true, role: true, jobTitle: true },
        })
      : [];

    return NextResponse.json({ members, invitable });
  } catch (error) {
    console.error("Playground members GET error:", error);
    return NextResponse.json({ error: "Failed to load members" }, { status: 500 });
  }
}

/**
 * POST /api/playground/rooms/[roomId]/members — invite or change a role.
 *
 * The stored role is what the manager asked for; what it MEANS is decided at
 * read time by resolveRoomActor(), which clamps it to the invitee's global-role
 * ceiling. So inviting a CLIENT user as OWNER is a harmless mistake rather than
 * a privilege escalation — they resolve to APPROVER on every request.
 */
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
    if (!access.actor.can("MANAGE")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Invitations are an outbound-notification surface; rate-limit them.
    const limit = rateLimit(`pg-invite:${access.actor.userId}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many invitations. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const userId = typeof body.userId === "string" ? body.userId : "";
    const role = parseRole(body.role) ?? RoomMemberRole.VIEWER;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Unknown user" }, { status: 400 });
    }

    const member = await upsertMember({
      roomId,
      userId,
      role,
      invitedById: access.actor.userId,
    });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    console.error("Playground members POST error:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

// DELETE /api/playground/rooms/[roomId]/members?userId=...
export async function DELETE(
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

    const userId = new URL(request.url).searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Removing the last manager would strand the room with no one able to
    // administer it, and on a restricted room, no one able to enter it at all.
    if (userId === access.actor.userId) {
      const owners = await countOwners(roomId);
      if (owners <= 1) {
        return NextResponse.json(
          { error: "Add another owner before removing yourself." },
          { status: 409 }
        );
      }
    }

    await removeMember(roomId, userId);
    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error("Playground members DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
