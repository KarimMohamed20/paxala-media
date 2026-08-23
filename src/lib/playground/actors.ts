import type { Session } from "next-auth";
import { Role, RoomMemberRole } from "@prisma/client";
import { getActor } from "@/lib/content-authz";

/**
 * Who is acting inside a Playground room, and what they may do.
 *
 * The brief describes four actor types (PMP Admin, PMP Creative Team, Client
 * Approver, Client Viewer/Guest) but the platform's global `Role` enum has only
 * three values and is deliberately left alone. The fourth dimension is a
 * ROOM-SCOPED grant (`PlaygroundMember.role`), and the effective permission is:
 *
 *     effective = min(global-role ceiling, room grant)
 *
 * The ceiling is the security-relevant half. A `PlaygroundMember` row that
 * grants a CLIENT user OWNER — through a bug, a bad import, or a malicious
 * write — does NOT escalate them: they are clamped to APPROVER and can still
 * never edit the canvas or read Studio content. Permission is therefore never
 * one row away from being wrong.
 *
 * Companion to `@/lib/content-authz` (content calendar) and `@/lib/authz`
 * (projects); the same actor/target split, applied to rooms.
 */

export type RoomMode = "STUDIO" | "CLIENT";

export type RoomCapability =
  /** Read the room at all. */
  | "VIEW"
  /** Post comments and chat messages on the channel their mode allows. */
  | "COMMENT"
  /** React and cast votes. */
  | "VOTE"
  /** Create, move and edit canvas nodes. */
  | "EDIT"
  /** Publish selected nodes into Client Mode, or un-publish them. */
  | "PUBLISH"
  /** Submit a frozen approval request to the client. */
  | "REQUEST_APPROVAL"
  /** Respond to an approval request (approve / request changes). */
  | "APPROVE"
  /** Invite and remove members, change room settings, archive the room. */
  | "MANAGE"
  /** Use PAX AI. Studio-side only — clients never see experimental generations. */
  | "USE_AI";

/**
 * Ordered so a grant can be clamped to a ceiling.
 *
 * The order is a permission ladder, not a job title ladder: APPROVER sits below
 * EDITOR because approving is a narrower power than authoring, even though on
 * the org chart the approving client outranks everyone.
 */
const RANK: Record<RoomMemberRole, number> = {
  [RoomMemberRole.VIEWER]: 0,
  [RoomMemberRole.APPROVER]: 1,
  [RoomMemberRole.EDITOR]: 2,
  [RoomMemberRole.OWNER]: 3,
};

/**
 * The highest room grant each global role may ever hold.
 *
 * The load-bearing line is CLIENT -> APPROVER. Everything about Client Mode
 * rests on a CLIENT account being structurally incapable of holding EDITOR.
 */
const CEILING: Record<Role, RoomMemberRole> = {
  [Role.ADMIN]: RoomMemberRole.OWNER,
  [Role.STAFF]: RoomMemberRole.OWNER,
  [Role.CLIENT]: RoomMemberRole.APPROVER,
};

/** Clamp a room grant to what the global role permits. Pure; unit-tested. */
export function clampGrant(
  globalRole: Role,
  grant: RoomMemberRole
): RoomMemberRole {
  const ceiling = CEILING[globalRole];
  return RANK[grant] > RANK[ceiling] ? ceiling : grant;
}

const CAPABILITIES: Record<RoomMemberRole, readonly RoomCapability[]> = {
  [RoomMemberRole.VIEWER]: ["VIEW"],
  [RoomMemberRole.APPROVER]: ["VIEW", "COMMENT", "VOTE", "APPROVE"],
  [RoomMemberRole.EDITOR]: [
    "VIEW",
    "COMMENT",
    "VOTE",
    "EDIT",
    "PUBLISH",
    "USE_AI",
  ],
  [RoomMemberRole.OWNER]: [
    "VIEW",
    "COMMENT",
    "VOTE",
    "EDIT",
    "PUBLISH",
    "REQUEST_APPROVAL",
    "APPROVE",
    "MANAGE",
    "USE_AI",
  ],
};

export type RoomActor = {
  userId: string;
  /** Global platform role. */
  role: Role;
  name: string | null;
  /** ADMIN or STAFF — the agency side. */
  isStaff: boolean;
  roomId: string;
  /** The stored grant, before clamping. Useful for diagnostics only. */
  grant: RoomMemberRole;
  /** What actually applies: min(ceiling, grant). */
  effectiveRole: RoomMemberRole;
  /**
   * Which view of the room this request gets. A CLIENT is always in CLIENT
   * mode; no request input can change that.
   */
  mode: RoomMode;
  can: (capability: RoomCapability) => boolean;
};

export type RoomAccessInput = {
  /** Minimal room fields — read via repo.getRoomForAccess(). */
  room: { id: string; clientId: string | null; restricted: boolean };
  /** The caller's membership row, or null when they have none. */
  membership: { role: RoomMemberRole } | null;
  /** `?preview=client`. Honoured for staff only; ignored for everyone else. */
  requestedMode?: string | null;
};

export type RoomActorResult =
  | { ok: true; actor: RoomActor }
  | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Resolve the caller into a room actor, or refuse.
 *
 * Access rules, in order:
 *   - No session                                  -> 401
 *   - A membership row                            -> that grant, clamped
 *   - CLIENT who owns the room but has no row     -> APPROVER (they are the client)
 *   - ADMIN/STAFF on an unrestricted room         -> EDITOR (agency-wide default)
 *   - anyone else                                 -> 404, NOT 403
 *
 * The 404 is deliberate. Answering 403 would confirm that a room with this id
 * exists, letting an outsider enumerate PMP's client list one request at a time.
 * The brief calls this out: "Prevent guests from discovering unrelated rooms."
 */
export function resolveRoomActor(
  session: Session | null,
  input: RoomAccessInput
): RoomActorResult {
  const base = getActor(session);
  if (!base) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const { room, membership } = input;

  let grant: RoomMemberRole | null = membership?.role ?? null;

  if (!grant) {
    if (!base.isStaff && room.clientId === base.userId) {
      // The room is about this client; they get in even without an explicit row.
      grant = RoomMemberRole.APPROVER;
    } else if (base.isStaff && !room.restricted) {
      // Agency-wide default: the team can see the team's work.
      grant = RoomMemberRole.EDITOR;
    }
  }

  if (!grant) {
    return { ok: false, status: 404, error: "Room not found" };
  }

  const effectiveRole = clampGrant(base.role, grant);

  // A CLIENT is pinned to CLIENT mode regardless of what the request asks for.
  // Staff may deliberately step into the client's shoes to preview a publication;
  // that path must hit the identical query as a real client, or the preview is a
  // reimplementation and will drift from the thing it claims to preview.
  const mode: RoomMode = !base.isStaff
    ? "CLIENT"
    : input.requestedMode === "client"
      ? "CLIENT"
      : "STUDIO";

  const capabilities = CAPABILITIES[effectiveRole];

  return {
    ok: true,
    actor: {
      userId: base.userId,
      role: base.role,
      name: base.name,
      isStaff: base.isStaff,
      roomId: room.id,
      grant,
      effectiveRole,
      mode,
      can: (capability) => {
        // Studio-only powers stay unavailable while previewing as a client, so a
        // staff member cannot accidentally edit through the preview and cannot
        // be shown affordances a client would not have.
        if (
          mode === "CLIENT" &&
          (capability === "EDIT" ||
            capability === "PUBLISH" ||
            capability === "MANAGE" ||
            capability === "USE_AI")
        ) {
          return false;
        }
        return capabilities.includes(capability);
      },
    },
  };
}

/**
 * Narrow a resolved actor to the Studio side.
 *
 * Call this at the TOP of any route that touches internal content — before the
 * request body is parsed — so a client request cannot even reach the parsing
 * code, let alone the query.
 */
export function requireStudioActor(actor: RoomActor): boolean {
  return actor.isStaff && actor.mode === "STUDIO";
}
