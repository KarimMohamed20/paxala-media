import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Role, RoomMemberRole } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActor } from "@/lib/content-authz";
import { rateLimit } from "@/lib/security";
import { createRoom, listRooms, uniqueRoomSlug } from "@/lib/playground/repo";
import {
  canCreateRoom,
  parseRoomText,
  roomSlugBase,
  validateRoomLinks,
} from "@/lib/playground/rooms";
import { parseTemplateId, templateNodes } from "@/lib/playground/templates";
import { getTranslations } from "next-intl/server";

/**
 * GET /api/playground/rooms — the dashboard list, already scoped.
 *
 * Scoping lives in roomListWhere() (repo.ts): staff see unrestricted rooms plus
 * any restricted room they belong to; a CLIENT sees only rooms that are theirs
 * or that they were invited to. There is no `clientId` query parameter, and
 * deliberately so — a client cannot ask for another client's list.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rooms = await listRooms(actor);

    // Agency users need the pickers for the create dialog; clients never do.
    //
    // `people` is served from here rather than from /api/users because that
    // endpoint is ADMIN-only — a STAFF user, who may create rooms, would get a
    // 403 and an empty participant list. Gated on the same predicate that gates
    // creation, so a client never receives a directory of PMP staff and other
    // clients.
    const [clients, projects, people] = canCreateRoom(actor)
      ? await Promise.all([
          db.user.findMany({
            where: { role: Role.CLIENT },
            orderBy: { name: "asc" },
            select: { id: true, name: true, username: true },
          }),
          db.project.findMany({
            orderBy: { title: "asc" },
            select: { id: true, title: true, slug: true, clientId: true },
          }),
          db.user.findMany({
            orderBy: [{ role: "asc" }, { name: "asc" }],
            select: {
              id: true,
              name: true,
              image: true,
              role: true,
              jobTitle: true,
            },
          }),
        ])
      : [[], [], []];

    return NextResponse.json({
      rooms,
      clients,
      projects,
      people,
      canCreate: canCreateRoom(actor),
    });
  } catch (error) {
    console.error("Playground rooms GET error:", error);
    return NextResponse.json({ error: "Failed to load rooms" }, { status: 500 });
  }
}

/**
 * POST /api/playground/rooms — create a room.
 *
 * Agency-only. The creator always gets an OWNER membership row so that
 * `restricted` rooms remain reachable by the person who made them.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canCreateRoom(actor)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Room creation writes a row and fans invitations out; bound it per user.
    const limit = rateLimit(`pg-room-create:${actor.userId}`, {
      limit: 20,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many rooms created. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const { title, description } = parseRoomText(body);
    if (!title) {
      return NextResponse.json({ error: "A room title is required" }, { status: 400 });
    }

    const links = await validateRoomLinks(body);
    if (!links.ok) {
      return NextResponse.json({ error: links.error }, { status: links.status });
    }

    // The creator is always a member, and always OWNER — a supplied role for
    // themselves is ignored so nobody can create a room they cannot administer.
    const members = links.members.filter((m) => m.userId !== actor.userId);
    members.push({ userId: actor.userId, role: RoomMemberRole.OWNER });

    const slug = await uniqueRoomSlug(roomSlugBase(title));

    // Frame titles are localised at creation, in the creator's language, and
    // then persist as ordinary text. A room opened by an Arabic-speaking team
    // should not be seeded with English scaffolding.
    const templateId = parseTemplateId(body.template);
    const t = await getTranslations("playground.templateFrames");
    const frames = templateNodes(templateId, (key) => t(key));

    const room = await createRoom({
      title,
      slug,
      description,
      clientId: links.clientId,
      projectId: links.projectId,
      restricted: body.restricted === true,
      createdById: actor.userId,
      createdByName: actor.name,
      members,
      frames,
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    console.error("Playground rooms POST error:", error);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
