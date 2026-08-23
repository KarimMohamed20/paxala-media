import { PlaygroundRoomStatus, Role, RoomMemberRole } from "@prisma/client";
import { db } from "@/lib/db";
import { clampString } from "@/lib/security";
import { slugify } from "@/lib/utils";
import type { ContentActor } from "@/lib/content-authz";

/**
 * Validation and cross-entity checks for room create/update.
 *
 * Same posture as `validateContentLinks` in @/lib/content-authz: request bodies
 * are untyped JSON, so no id from the client is trusted until it has been proven
 * to exist AND to belong where the caller claims. Notably a `clientId` in the
 * body is never taken at face value — it is resolved through the same
 * actor/target split the content calendar uses.
 */

export const ROOM_TITLE_MAX = 120;
export const ROOM_DESCRIPTION_MAX = 2000;
/** Bound on members supplied at creation; prevents a single request fanning out. */
export const MAX_MEMBERS_PER_REQUEST = 40;

export type RoomLinkResult =
  | {
      ok: true;
      clientId: string | null;
      projectId: string | null;
      members: Array<{ userId: string; role: RoomMemberRole }>;
    }
  | { ok: false; status: 400 | 403 | 404; error: string };

function parseMemberRole(value: unknown): RoomMemberRole | undefined {
  if (typeof value !== "string") return undefined;
  return Object.values(RoomMemberRole).includes(value as RoomMemberRole)
    ? (value as RoomMemberRole)
    : undefined;
}

export function parseRoomStatus(value: unknown): PlaygroundRoomStatus | undefined {
  if (typeof value !== "string") return undefined;
  return Object.values(PlaygroundRoomStatus).includes(value as PlaygroundRoomStatus)
    ? (value as PlaygroundRoomStatus)
    : undefined;
}

/**
 * Validate the client, project and member list a room is being created against.
 *
 * Rules:
 *  - Only agency users create rooms, so `clientId` is always agency-supplied and
 *    must name a real CLIENT user.
 *  - `projectId` must belong to that client. Without this check a staff member
 *    could attach one client's project to another client's room, and the room
 *    would then surface that project's name on the other client's dashboard.
 *  - Every member must be a real user. A member's ROOM role is stored as
 *    requested but is clamped at read time by resolveRoomActor(), so a bad role
 *    here cannot escalate anyone — it is validated for hygiene, not for safety.
 */
export async function validateRoomLinks(input: {
  clientId?: unknown;
  projectId?: unknown;
  memberIds?: unknown;
  memberRoles?: unknown;
}): Promise<RoomLinkResult> {
  // ---- clientId ----
  let clientId: string | null = null;
  if (input.clientId !== undefined && input.clientId !== null && input.clientId !== "") {
    if (typeof input.clientId !== "string") {
      return { ok: false, status: 400, error: "clientId must be a string" };
    }
    const client = await db.user.findFirst({
      where: { id: input.clientId, role: Role.CLIENT },
      select: { id: true },
    });
    if (!client) {
      return { ok: false, status: 400, error: "Unknown client" };
    }
    clientId = client.id;
  }

  // ---- projectId ----
  let projectId: string | null = null;
  if (input.projectId !== undefined && input.projectId !== null && input.projectId !== "") {
    if (typeof input.projectId !== "string") {
      return { ok: false, status: 400, error: "projectId must be a string" };
    }
    const project = await db.project.findUnique({
      where: { id: input.projectId },
      select: { id: true, clientId: true },
    });
    if (!project) {
      return { ok: false, status: 404, error: "Project not found" };
    }
    if (clientId && project.clientId !== clientId) {
      return {
        ok: false,
        status: 403,
        error: "Project does not belong to this client",
      };
    }
    // A room created from a project inherits that project's client.
    if (!clientId && project.clientId) {
      clientId = project.clientId;
    }
    projectId = project.id;
  }

  // ---- members ----
  const members: Array<{ userId: string; role: RoomMemberRole }> = [];
  if (input.memberIds !== undefined && input.memberIds !== null) {
    if (!Array.isArray(input.memberIds)) {
      return { ok: false, status: 400, error: "memberIds must be an array" };
    }
    const roles =
      input.memberRoles && typeof input.memberRoles === "object"
        ? (input.memberRoles as Record<string, unknown>)
        : {};

    const seen = new Set<string>();
    for (const raw of input.memberIds) {
      if (typeof raw !== "string" || !raw || seen.has(raw)) continue;
      seen.add(raw);
      members.push({
        userId: raw,
        role: parseMemberRole(roles[raw]) ?? RoomMemberRole.VIEWER,
      });
    }

    if (members.length > MAX_MEMBERS_PER_REQUEST) {
      return {
        ok: false,
        status: 400,
        error: `A room may be created with at most ${MAX_MEMBERS_PER_REQUEST} members`,
      };
    }

    if (members.length > 0) {
      const found = await db.user.findMany({
        where: { id: { in: members.map((m) => m.userId) } },
        select: { id: true, role: true },
      });
      if (found.length !== members.length) {
        return { ok: false, status: 400, error: "One or more members do not exist" };
      }

      // Default a client-side participant to APPROVER rather than VIEWER: being
      // invited to your own campaign room and being unable to respond is a
      // support ticket, not a security posture. Staff default to EDITOR.
      const roleById = new Map(found.map((u) => [u.id, u.role]));
      for (const member of members) {
        if (roles[member.userId] !== undefined) continue;
        member.role =
          roleById.get(member.userId) === Role.CLIENT
            ? RoomMemberRole.APPROVER
            : RoomMemberRole.EDITOR;
      }
    }
  }

  return { ok: true, clientId, projectId, members };
}

/** Trim and bound the free-text fields of a create/update request. */
export function parseRoomText(body: {
  title?: unknown;
  description?: unknown;
}): { title: string; description: string | null } {
  return {
    title: clampString(body.title, ROOM_TITLE_MAX),
    description: body.description
      ? clampString(body.description, ROOM_DESCRIPTION_MAX)
      : null,
  };
}

/**
 * Slug base for a room title.
 *
 * `slugify()` strips non-word characters, which erases Arabic and Hebrew titles
 * entirely — "حملة الصيف" would become "". Rooms are named by an Arabic- and
 * Hebrew-speaking team, so fall back to a stable ascii prefix rather than
 * producing an empty slug that then collides with every other empty slug.
 */
export function roomSlugBase(title: string): string {
  const slug = slugify(title).replace(/^-+|-+$/g, "");
  return slug || "room";
}

/** Who may create a room. Clients participate; they do not open rooms. */
export function canCreateRoom(actor: ContentActor | null): boolean {
  return !!actor?.isStaff;
}
