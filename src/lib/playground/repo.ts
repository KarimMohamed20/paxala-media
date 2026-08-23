import {
  AiRunStatus,
  MessageChannel,
  NodeVisibility,
  PlaygroundLinkEntity,
  PlaygroundRoomStatus,
  Prisma,
  RoomApprovalAction,
  RoomApprovalStatus,
  RoomMemberRole,
  type Role,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import type { RoomActor } from "./actors";
import {
  clientCommentSelect,
  clientCommentWhere,
  clientEdgeSelect,
  clientEdgeWhere,
  clientMessageSelect,
  clientMessageWhere,
  clientNodeSelect,
  clientNodeWhere,
} from "./client-scope";

/**
 * The ONLY module permitted to touch `db.playground*`.
 *
 * Enforced by an eslint `no-restricted-syntax` rule (see eslint.config.mjs), not
 * by convention. The point is that there is exactly one door into Playground
 * data, so "did this read apply the Client Mode filter?" is answerable by
 * reading one file instead of auditing every route handler forever.
 *
 * Rule for anything added here: if a function can return node, edge, message or
 * comment rows, it MUST take a `RoomActor` and branch on `actor.mode`. A
 * function that takes a bare `roomId` and returns rows is how the boundary gets
 * lost.
 */

// ---------------------------------------------------------------------------
// Access
// ---------------------------------------------------------------------------

/** Minimal room fields needed for an access decision. */
export async function getRoomForAccess(roomId: string) {
  return db.playgroundRoom.findUnique({
    where: { id: roomId },
    select: { id: true, clientId: true, restricted: true },
  });
}

/** Same, addressed by slug — rooms are linked by slug in the UI. */
export async function getRoomBySlugForAccess(slug: string) {
  return db.playgroundRoom.findUnique({
    where: { slug },
    select: { id: true, slug: true, title: true, clientId: true, restricted: true },
  });
}

export async function getMembership(roomId: string, userId: string) {
  return db.playgroundMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { role: true },
  });
}

/**
 * Rooms visible to a caller, for the dashboard.
 *
 * Staff see every unrestricted room plus any restricted room they belong to.
 * A CLIENT sees only rooms that are theirs or that they were invited to — the
 * `OR` is the tenant boundary, and it is why a client can never enumerate
 * another client's rooms.
 */
export function roomListWhere(actor: {
  userId: string;
  isStaff: boolean;
}): Prisma.PlaygroundRoomWhereInput {
  if (actor.isStaff) {
    return {
      OR: [
        { restricted: false },
        { members: { some: { userId: actor.userId } } },
      ],
    };
  }
  return {
    OR: [
      { clientId: actor.userId },
      { members: { some: { userId: actor.userId } } },
    ],
  };
}

// ---------------------------------------------------------------------------
// Room list and detail
// ---------------------------------------------------------------------------

/**
 * What a room card needs. No canvas content: a card must never be a way to read
 * node data without going through the Client Mode filter.
 */
const roomCardSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  status: true,
  restricted: true,
  lastActiveAt: true,
  createdAt: true,
  updatedAt: true,
  createdByName: true,
  client: { select: { id: true, name: true, username: true } },
  project: { select: { id: true, title: true, slug: true } },
  members: {
    select: {
      role: true,
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 8,
  },
  _count: { select: { members: true, nodes: true } },
} satisfies Prisma.PlaygroundRoomSelect;

export type RoomCard = Prisma.PlaygroundRoomGetPayload<{
  select: typeof roomCardSelect;
}> & {
  /** Present when the room has an approval waiting on the client. */
  awaitingClient: boolean;
};

/**
 * Rooms for the dashboard, already scoped.
 *
 * The pending-approval flag is fetched as a separate grouped query rather than a
 * per-room `_count` with a filter, so the card query stays one round trip
 * regardless of how many rooms come back.
 */
export async function listRooms(actor: { userId: string; isStaff: boolean }): Promise<RoomCard[]> {
  const rooms = await db.playgroundRoom.findMany({
    where: roomListWhere(actor),
    select: roomCardSelect,
    orderBy: [{ lastActiveAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 200,
  });

  if (rooms.length === 0) return [];

  const pending = await db.playgroundApproval.groupBy({
    by: ["roomId"],
    where: {
      roomId: { in: rooms.map((r) => r.id) },
      status: RoomApprovalStatus.PENDING,
    },
    _count: { _all: true },
  });
  const awaiting = new Set(pending.map((p) => p.roomId));

  return rooms.map((room) => ({ ...room, awaitingClient: awaiting.has(room.id) }));
}

/** Room header data. Canvas content is fetched separately, through readNodes(). */
export async function getRoomDetail(roomId: string) {
  return db.playgroundRoom.findUnique({
    where: { id: roomId },
    select: {
      ...roomCardSelect,
      opSeq: true,
      camera: true,
      members: {
        select: {
          role: true,
          lastSeenAt: true,
          user: { select: { id: true, name: true, image: true, jobTitle: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export type RoomDetail = NonNullable<Awaited<ReturnType<typeof getRoomDetail>>>;

/**
 * Reserve a unique slug.
 *
 * `Project` and `Folder` both take a bare slugify() and rely on the caller not
 * colliding; rooms are created far more often than projects ("Summer Campaign —
 * Brainstorm 01" twice in a week is normal), so the suffix loop is worth it.
 */
export async function uniqueRoomSlug(base: string): Promise<string> {
  const root = base || "room";
  const taken = await db.playgroundRoom.findMany({
    where: { slug: { startsWith: root } },
    select: { slug: true },
  });
  if (!taken.some((r) => r.slug === root)) return root;

  const used = new Set(taken.map((r) => r.slug));
  for (let n = 2; n < 1000; n++) {
    const candidate = `${root}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  // Pathological case only; the unique constraint is still the real guard.
  return `${root}-${Math.floor(performance.now())}`;
}

export async function createRoom(input: {
  title: string;
  slug: string;
  description: string | null;
  clientId: string | null;
  projectId: string | null;
  restricted: boolean;
  createdById: string;
  createdByName: string | null;
  /** Everyone who should have a membership row, including the creator. */
  members: Array<{ userId: string; role: RoomMemberRole }>;
  /** Template frames to seed. Empty for a blank room. */
  frames?: Array<{
    kind: string;
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
    data: Record<string, unknown>;
  }>;
}) {
  const { members, frames = [], ...room } = input;

  return db.playgroundRoom.create({
    data: {
      ...room,
      status: PlaygroundRoomStatus.ACTIVE,
      lastActiveAt: new Date(),
      members: {
        create: members.map((m) => ({
          userId: m.userId,
          role: m.role,
          invitedById: input.createdById,
        })),
      },
      nodes: {
        // Ids are minted here rather than client-side: these are server-authored
        // scaffolding, not something a browser drew. They still take the schema's
        // TEAM_ONLY default, so a templated room is internal until published.
        create: frames.map((frame) => ({
          id: randomUUID(),
          kind: frame.kind as never,
          x: frame.x,
          y: frame.y,
          w: frame.w,
          h: frame.h,
          z: frame.z,
          data: frame.data as Prisma.InputJsonValue,
          createdById: input.createdById,
          createdByName: input.createdByName,
        })),
      },
    },
    select: roomCardSelect,
  });
}

export async function updateRoom(
  roomId: string,
  data: Prisma.PlaygroundRoomUpdateInput
) {
  return db.playgroundRoom.update({
    where: { id: roomId },
    data,
    select: roomCardSelect,
  });
}

/**
 * Archive rather than delete.
 *
 * A room is the creative memory of a campaign — the canvas, the decisions and
 * the approval record that names what the client signed off. Hard-deleting it
 * would cascade all of that away, so the destructive path is deliberately not
 * offered; ARCHIVED rooms drop out of every default listing.
 */
export async function archiveRoom(roomId: string) {
  return db.playgroundRoom.update({
    where: { id: roomId },
    data: { status: PlaygroundRoomStatus.ARCHIVED },
    select: { id: true, status: true },
  });
}

/** Bump the room's activity clock. Fire-and-forget from write paths. */
export async function touchRoom(roomId: string) {
  return db.playgroundRoom.updateMany({
    where: { id: roomId },
    data: { lastActiveAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Collaboration writes
// ---------------------------------------------------------------------------

export async function createMessage(input: {
  roomId: string;
  channel: MessageChannel;
  body: string;
  nodeId: string | null;
  replyToId: string | null;
  authorId: string;
  authorName: string | null;
  authorRole: Role;
}) {
  return db.playgroundMessage.create({
    data: input,
    select: { ...clientMessageSelect, authorId: true, updatedAt: true },
  });
}

/**
 * A comment on a canvas node.
 *
 * Field shape mirrors ContentComment: author id nulled on delete, with name and
 * role snapshotted alongside, so feedback history survives an account being
 * removed. The same reasoning, applied to the same problem.
 */
export async function createComment(input: {
  roomId: string;
  nodeId: string | null;
  body: string;
  authorId: string;
  authorName: string | null;
  authorRole: Role;
}) {
  return db.playgroundComment.create({
    data: input,
    select: { ...clientCommentSelect, authorId: true, updatedAt: true },
  });
}

export async function setCommentResolved(
  roomId: string,
  commentId: string,
  resolved: boolean
) {
  // Scoped by roomId as well as id: without it, a member of one room could
  // resolve a comment in another simply by knowing its id.
  return db.playgroundComment.updateMany({
    where: { id: commentId, roomId },
    data: { resolved },
  });
}

/**
 * Toggle a reaction or vote.
 *
 * The unique index on (nodeId, userId, kind) is what makes this idempotent and
 * one-vote-per-person: a double-click cannot produce two votes, and a retried
 * request cannot inflate a tally. Delete-then-create rather than an upsert
 * because the intent is a TOGGLE — the caller does not know which way it will go.
 */
export async function toggleReaction(input: {
  nodeId: string;
  userId: string;
  kind: string;
}): Promise<{ added: boolean }> {
  const existing = await db.playgroundReaction.findUnique({
    where: {
      nodeId_userId_kind: {
        nodeId: input.nodeId,
        userId: input.userId,
        kind: input.kind,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await db.playgroundReaction.delete({ where: { id: existing.id } });
    return { added: false };
  }

  await db.playgroundReaction.create({ data: input });
  return { added: true };
}

/** Reaction tallies for a room, grouped for the canvas and the panel. */
export async function listReactions(roomId: string) {
  return db.playgroundReaction.findMany({
    where: { node: { roomId } },
    select: {
      id: true,
      nodeId: true,
      kind: true,
      userId: true,
      user: { select: { name: true } },
    },
    take: 2000,
  });
}

export async function createDecision(input: {
  roomId: string;
  title: string;
  description: string | null;
  options: Prisma.InputJsonValue;
  outcome: string | null;
  nodeIds: string[];
  createdById: string;
  createdByName: string | null;
}) {
  return db.playgroundDecision.create({
    data: input,
    select: decisionSelect,
  });
}

const decisionSelect = {
  id: true,
  title: true,
  description: true,
  options: true,
  outcome: true,
  nodeIds: true,
  createdByName: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PlaygroundDecisionSelect;

/**
 * Decisions are readable in both modes.
 *
 * A decision record is the room's OUTPUT — what was chosen, by whom, when — and
 * showing it to the client is the point of the feature. Its `nodeIds` are just
 * identifiers; the nodes themselves still go through clientNodeWhere().
 */
export async function listDecisions(roomId: string) {
  return db.playgroundDecision.findMany({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: decisionSelect,
  });
}

/**
 * The activity timeline.
 *
 * STUDIO ONLY, and not by omission. Event payloads carry raw op data — the
 * `before` text of every edit and the full body of every deleted node — so the
 * log is internal by construction. A client's view of what happened is the
 * decision list and the approval record, both of which are curated.
 */
export async function listActivity(
  roomId: string,
  opts: { before?: number; take?: number } = {}
) {
  const take = Math.min(opts.take ?? 50, 200);
  return db.playgroundEvent.findMany({
    where: {
      roomId,
      ...(opts.before !== undefined ? { seq: { lt: opts.before } } : {}),
    },
    orderBy: { seq: "desc" },
    take,
    select: {
      id: true,
      seq: true,
      type: true,
      actorName: true,
      actorRole: true,
      nodeId: true,
      createdAt: true,
      // `payload` is deliberately NOT selected: it holds raw before/after
      // bodies, and a timeline needs to say what happened, not replay it.
    },
  });
}

// ---------------------------------------------------------------------------
// Publication and approvals
// ---------------------------------------------------------------------------

/**
 * Publish or retract nodes for the client.
 *
 * `clientVisibleSince` is the DELIBERATE half of Client Mode: a node's
 * visibility enum says what its author intended, this column says a staff member
 * actually pushed it across. Setting it to null retracts — the recovery path for
 * the mistake that will actually happen, which is publishing the wrong card.
 */
export async function setClientVisibility(
  roomId: string,
  nodeIds: string[],
  publish: boolean
) {
  return db.playgroundNode.updateMany({
    where: {
      id: { in: nodeIds },
      roomId,
      // Publishing cannot override an author's TEAM_ONLY marking. Both halves
      // must agree, so a bulk publish can never sweep up an internal note.
      ...(publish ? { visibility: { not: NodeVisibility.TEAM_ONLY } } : {}),
    },
    data: { clientVisibleSince: publish ? new Date() : null },
  });
}

/** Everything needed to build a frozen approval payload. */
export async function readPublishSource(roomId: string) {
  const [nodes, edges] = await Promise.all([
    db.playgroundNode.findMany({
      where: { roomId },
      select: {
        id: true,
        kind: true,
        x: true,
        y: true,
        w: true,
        h: true,
        z: true,
        rotation: true,
        frameId: true,
        text: true,
        data: true,
        style: true,
        clientVisibleSince: true,
        createdByName: true,
      },
    }),
    db.playgroundEdge.findMany({
      where: { roomId },
      select: {
        id: true,
        fromNodeId: true,
        toNodeId: true,
        kind: true,
        style: true,
      },
    }),
  ]);
  return { nodes, edges };
}

const approvalSelect = {
  id: true,
  status: true,
  title: true,
  note: true,
  contentHash: true,
  atSeq: true,
  payload: true,
  requestedByName: true,
  dueAt: true,
  decidedAt: true,
  createdAt: true,
  updatedAt: true,
  actions: {
    select: {
      id: true,
      action: true,
      notes: true,
      responderName: true,
      responderRole: true,
      fromStatus: true,
      toStatus: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.PlaygroundApprovalSelect;

export async function createApproval(input: {
  roomId: string;
  title: string;
  note: string | null;
  payload: Prisma.InputJsonValue;
  contentHash: string;
  atSeq: number;
  requestedById: string;
  requestedByName: string | null;
  dueAt: Date | null;
}) {
  return db.playgroundApproval.create({
    data: input,
    select: approvalSelect,
  });
}

export async function listApprovals(roomId: string) {
  return db.playgroundApproval.findMany({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: approvalSelect,
  });
}

/** Room title only — for outbound notifications that name the room. */
export async function getRoomTitle(roomId: string): Promise<string | null> {
  const room = await db.playgroundRoom.findUnique({
    where: { id: roomId },
    select: { title: true },
  });
  return room?.title ?? null;
}

/**
 * Who should be told an approval awaits: the room's CLIENT-role members who
 * can actually respond (VIEWER grants resolve to canRespond: false on the
 * approve deck, so they get no CTA email), plus the room's client scope,
 * deduped by email. Metadata only — no node content — so Client Mode
 * filtering does not apply here.
 */
export async function listApprovalRecipients(
  roomId: string
): Promise<Array<{ email: string; name: string }>> {
  const [room, clientMembers] = await Promise.all([
    db.playgroundRoom.findUnique({
      where: { id: roomId },
      select: { client: { select: { email: true, name: true } } },
    }),
    db.playgroundMember.findMany({
      // String literals, not Role.CLIENT / RoomMemberRole.VIEWER: this module
      // imports the Prisma enums as types only.
      where: {
        roomId,
        role: { not: "VIEWER" },
        user: { role: "CLIENT", email: { not: null } },
      },
      select: { user: { select: { email: true, name: true } } },
    }),
  ]);

  const byEmail = new Map<string, string>();
  for (const m of clientMembers) {
    if (m.user.email) byEmail.set(m.user.email, m.user.name || m.user.email);
  }
  const scoped = room?.client;
  if (scoped?.email && !byEmail.has(scoped.email)) {
    byEmail.set(scoped.email, scoped.name || scoped.email);
  }
  return [...byEmail].map(([email, name]) => ({ email, name }));
}

/**
 * PENDING approvals across every room a client can respond in — their room
 * memberships plus rooms scoped to them. Feeds the portal's unified approvals
 * inbox. Approval metadata only; the payload stays behind the room routes.
 *
 * `viewer` is the CALLER: the target-client scope is ANDed with the caller's
 * own room visibility so a staff viewer cannot use this to read approval
 * metadata out of restricted rooms they are not a member of. For a client
 * viewing their own queue the second term is a no-op.
 */
export async function listPendingApprovalsForClient(
  targetClientId: string,
  viewer: { userId: string; isStaff: boolean }
) {
  return db.playgroundApproval.findMany({
    where: {
      status: RoomApprovalStatus.PENDING,
      room: {
        AND: [
          {
            OR: [
              { clientId: targetClientId },
              { members: { some: { userId: targetClientId } } },
            ],
          },
          roomListWhere(viewer),
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      roomId: true,
      title: true,
      note: true,
      createdAt: true,
      dueAt: true,
      requestedByName: true,
      room: { select: { title: true } },
    },
  });
}

/**
 * CLIENT users with at least one PENDING approval in their scope — feeds the
 * admin client picker so a client with Playground work but no content plan is
 * still selectable.
 */
export async function listClientIdsWithPendingApprovals(): Promise<string[]> {
  const rooms = await db.playgroundRoom.findMany({
    where: { approvals: { some: { status: RoomApprovalStatus.PENDING } } },
    select: {
      clientId: true,
      members: {
        where: { user: { role: "CLIENT" } },
        select: { userId: true },
      },
    },
  });
  const ids = new Set<string>();
  for (const room of rooms) {
    if (room.clientId) ids.add(room.clientId);
    for (const m of room.members) ids.add(m.userId);
  }
  return [...ids];
}

export async function getApproval(roomId: string, approvalId: string) {
  return db.playgroundApproval.findFirst({
    // Scoped by roomId as well as id: an approval id alone must not be a key to
    // another room's approval record.
    where: { id: approvalId, roomId },
    select: approvalSelect,
  });
}

export type ApprovalRecord = NonNullable<Awaited<ReturnType<typeof getApproval>>>;

/**
 * Record a verdict.
 *
 * Mirrors the content-calendar approve route exactly: an optimistic guard so a
 * second reviewer cannot clobber the first, and an append-only action row
 * written in the SAME transaction as the status change. The invariant is that
 * an approval's status can never move without a log row explaining who moved it.
 */
export async function respondToApproval(input: {
  roomId: string;
  approvalId: string;
  fromStatus: RoomApprovalStatus;
  toStatus: RoomApprovalStatus;
  action: RoomApprovalAction;
  notes: string | null;
  responderId: string;
  responderName: string | null;
  responderRole: Role;
}) {
  return db.$transaction(async (tx) => {
    const guard = await tx.playgroundApproval.updateMany({
      where: {
        id: input.approvalId,
        roomId: input.roomId,
        status: input.fromStatus,
      },
      data: {
        status: input.toStatus,
        decidedAt:
          input.toStatus === RoomApprovalStatus.PENDING ? null : new Date(),
      },
    });
    // Someone else responded between our read and this write.
    if (guard.count === 0) return null;

    await tx.playgroundApprovalAction.create({
      data: {
        approvalId: input.approvalId,
        action: input.action,
        notes: input.notes,
        responderId: input.responderId,
        responderName: input.responderName,
        responderRole: input.responderRole,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
      },
    });

    return tx.playgroundApproval.findUnique({
      where: { id: input.approvalId },
      select: approvalSelect,
    });
  });
}

/** Provenance link from a project item back to the room that produced it. */
export async function createProjectLinks(
  roomId: string,
  links: Array<{
    nodeId: string | null;
    entityType: PlaygroundLinkEntity;
    entityId: string;
    createdById: string;
  }>
) {
  if (links.length === 0) return { count: 0 };
  return db.playgroundLink.createMany({
    data: links.map((link) => ({ roomId, ...link })),
    skipDuplicates: true,
  });
}

// ---------------------------------------------------------------------------
// PAX AI
// ---------------------------------------------------------------------------

/** Nodes to feed a prompt. Scoped by roomId, so ids alone cannot reach across. */
export async function readAiContextNodes(roomId: string, nodeIds: string[]) {
  return db.playgroundNode.findMany({
    where: { id: { in: nodeIds }, roomId },
    select: { kind: true, text: true, data: true },
    take: 40,
  });
}

export async function recordAiRun(input: {
  roomId: string;
  intent: string;
  nodeIds: string[];
  output: string;
  status: AiRunStatus;
  error: string | null;
  provider: string;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  createdById: string;
}) {
  return db.playgroundAiRun.create({
    data: input,
    select: { id: true, createdAt: true },
  });
}

/**
 * Generations charged this calendar month.
 *
 * Counted in POSTGRES, not in the in-memory rateLimit() buckets. Those reset on
 * every deploy and are per-process, which is fine for slowing someone down and
 * useless for a spend ceiling — a metered API needs a limit that survives a
 * restart. FAILED and BLOCKED runs are excluded: an upstream error should not
 * consume the studio's monthly budget.
 */
export async function countAiRunsThisMonth(): Promise<number> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return db.playgroundAiRun.count({
    where: { createdAt: { gte: monthStart }, status: AiRunStatus.OK },
  });
}

// ---------------------------------------------------------------------------
// Session summaries
// ---------------------------------------------------------------------------

const summarySelect = {
  id: true,
  fromSeq: true,
  toSeq: true,
  draft: true,
  reviewedAt: true,
  sharedWithClientAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PlaygroundSummarySelect;

export async function createSummary(input: {
  roomId: string;
  fromSeq: number;
  toSeq: number;
  draft: Prisma.InputJsonValue;
}) {
  return db.playgroundSummary.create({ data: input, select: summarySelect });
}

/**
 * Summaries for a room, newest first.
 *
 * STUDIO ONLY at the route. A summary is a DRAFT until a PMP user reviews it —
 * the brief is explicit that a person must check it before the client sees it,
 * because it is machine-written and attributes decisions to named people.
 */
export async function listSummaries(roomId: string) {
  return db.playgroundSummary.findMany({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: summarySelect,
  });
}

export async function markSummaryReviewed(
  roomId: string,
  summaryId: string,
  reviewedById: string
) {
  // Scoped by roomId as well as id, like every other summary-adjacent write.
  return db.playgroundSummary.updateMany({
    where: { id: summaryId, roomId },
    data: { reviewedById, reviewedAt: new Date() },
  });
}

/** Decisions and approvals, the raw material a summary is written from. */
export async function readSummarySource(roomId: string) {
  const [decisions, approvals, room] = await Promise.all([
    db.playgroundDecision.findMany({
      where: { roomId },
      orderBy: { createdAt: "asc" },
      select: { title: true, outcome: true, description: true, createdByName: true },
      take: 100,
    }),
    db.playgroundApproval.findMany({
      where: { roomId },
      orderBy: { createdAt: "asc" },
      select: { title: true, status: true, note: true },
      take: 50,
    }),
    db.playgroundRoom.findUnique({
      where: { id: roomId },
      select: { opSeq: true },
    }),
  ]);
  return { decisions, approvals, seq: room?.opSeq ?? 0 };
}

// ---------------------------------------------------------------------------
// Room files
// ---------------------------------------------------------------------------

export async function createRoomFile(input: {
  roomId: string;
  name: string;
  url: string;
  mime: string;
  size: number;
  thumbUrl: string | null;
  storagePublicId: string | null;
  storageResourceType: string | null;
  uploadedById: string;
  uploadedByName: string | null;
}) {
  return db.playgroundFile.create({
    data: input,
    select: {
      id: true,
      name: true,
      url: true,
      mime: true,
      size: true,
      thumbUrl: true,
      createdAt: true,
      uploadedByName: true,
    },
  });
}

/**
 * Files uploaded into a room.
 *
 * Not projection-split by mode: a room file becomes visible to a client only by
 * being referenced from a node that has been published, and node visibility is
 * decided by clientNodeWhere(). Listing files is a Studio affordance — the
 * "add existing" picker — and the routes that call this already require EDIT.
 */
export async function listRoomFiles(roomId: string) {
  return db.playgroundFile.findMany({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      url: true,
      mime: true,
      size: true,
      thumbUrl: true,
      createdAt: true,
      uploadedByName: true,
    },
  });
}

export async function listMembers(roomId: string) {
  return db.playgroundMember.findMany({
    where: { roomId },
    select: {
      id: true,
      role: true,
      lastSeenAt: true,
      user: { select: { id: true, name: true, username: true, image: true, jobTitle: true, role: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Canvas reads — every one branches on actor.mode
// ---------------------------------------------------------------------------

/**
 * Studio projection. Everything, including internal columns.
 * Never reachable by a CLIENT actor: `mode` is pinned to CLIENT for them in
 * resolveRoomActor(), and every read below dispatches on it.
 */
const studioNodeSelect = {
  id: true,
  kind: true,
  visibility: true,
  clientVisibleSince: true,
  x: true,
  y: true,
  w: true,
  h: true,
  z: true,
  rotation: true,
  frameId: true,
  text: true,
  data: true,
  style: true,
  fileId: true,
  roomFileId: true,
  version: true,
  editLockById: true,
  editLockAt: true,
  createdById: true,
  createdByName: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PlaygroundNodeSelect;

export async function readNodes(actor: RoomActor) {
  if (actor.mode === "CLIENT") {
    return db.playgroundNode.findMany({
      where: clientNodeWhere(actor.roomId),
      select: clientNodeSelect,
      orderBy: { z: "asc" },
    });
  }
  return db.playgroundNode.findMany({
    where: { roomId: actor.roomId },
    select: studioNodeSelect,
    orderBy: { z: "asc" },
  });
}

/**
 * A cold-load snapshot: nodes, edges and the sequence they are consistent at.
 *
 * Read inside a RepeatableRead transaction so all three come from one point in
 * time. Without it, a write landing between the node query and the seq query
 * hands the client a board plus a sequence number that already includes a change
 * the board does not show — and the client then never asks for that change
 * again, because it believes it has already seen it. The node stays missing
 * until a full reload.
 */
export async function readSnapshot(actor: RoomActor) {
  return db.$transaction(
    async (tx) => {
      const room = await tx.playgroundRoom.findUnique({
        where: { id: actor.roomId },
        select: { opSeq: true },
      });

      const nodes =
        actor.mode === "CLIENT"
          ? await tx.playgroundNode.findMany({
              where: clientNodeWhere(actor.roomId),
              select: clientNodeSelect,
              orderBy: { z: "asc" },
            })
          : await tx.playgroundNode.findMany({
              where: { roomId: actor.roomId },
              select: studioNodeSelect,
              orderBy: { z: "asc" },
            });

      const edges =
        actor.mode === "CLIENT"
          ? await tx.playgroundEdge.findMany({
              where: clientEdgeWhere(actor.roomId),
              select: clientEdgeSelect,
            })
          : await tx.playgroundEdge.findMany({
              where: { roomId: actor.roomId },
              select: { ...clientEdgeSelect, createdById: true, createdAt: true },
            });

      return { nodes, edges, seq: room?.opSeq ?? 0 };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead }
  );
}

export async function readEdges(actor: RoomActor) {
  if (actor.mode === "CLIENT") {
    return db.playgroundEdge.findMany({
      where: clientEdgeWhere(actor.roomId),
      select: clientEdgeSelect,
    });
  }
  return db.playgroundEdge.findMany({
    where: { roomId: actor.roomId },
    select: { ...clientEdgeSelect, createdById: true, createdAt: true },
  });
}

/**
 * Chat. A CLIENT actor is restricted to the SHARED channel twice over: the
 * route refuses a TEAM read before reaching here, and this WHERE clause would
 * refuse it anyway.
 */
export async function readMessages(
  actor: RoomActor,
  opts: { take?: number; before?: Date } = {}
) {
  const take = Math.min(opts.take ?? 50, 200);
  const cursor = opts.before ? { createdAt: { lt: opts.before } } : {};

  if (actor.mode === "CLIENT") {
    return db.playgroundMessage.findMany({
      where: { ...clientMessageWhere(actor.roomId), ...cursor },
      select: clientMessageSelect,
      orderBy: { createdAt: "desc" },
      take,
    });
  }
  return db.playgroundMessage.findMany({
    where: { roomId: actor.roomId, ...cursor },
    select: { ...clientMessageSelect, authorId: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function readComments(actor: RoomActor) {
  if (actor.mode === "CLIENT") {
    return db.playgroundComment.findMany({
      where: clientCommentWhere(actor.roomId),
      select: clientCommentSelect,
      orderBy: { createdAt: "asc" },
    });
  }
  return db.playgroundComment.findMany({
    where: { roomId: actor.roomId },
    select: { ...clientCommentSelect, authorId: true, updatedAt: true },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Replay log for reconnection. Studio only.
 *
 * Events carry raw op payloads — including the `before` text of edits and the
 * full body of deleted nodes — so they are internal by construction and are
 * never served to a CLIENT actor. A reconnecting client re-reads its projection
 * instead; that is cheap because a client's node set is small by definition.
 */
export async function readEventsSince(roomId: string, sinceSeq: number, take = 500) {
  return db.playgroundEvent.findMany({
    where: { roomId, seq: { gt: sinceSeq } },
    orderBy: { seq: "asc" },
    take,
  });
}

// ---------------------------------------------------------------------------
// Membership writes
// ---------------------------------------------------------------------------

export async function upsertMember(input: {
  roomId: string;
  userId: string;
  role: RoomMemberRole;
  invitedById: string;
}) {
  const { roomId, userId, role, invitedById } = input;
  return db.playgroundMember.upsert({
    where: { roomId_userId: { roomId, userId } },
    create: { roomId, userId, role, invitedById },
    update: { role },
    select: { id: true, roomId: true, userId: true, role: true },
  });
}

export async function removeMember(roomId: string, userId: string) {
  return db.playgroundMember.deleteMany({ where: { roomId, userId } });
}

/**
 * How many owners a room has.
 *
 * Used to refuse the last owner's removal — a restricted room with no owner is
 * one nobody can administer, and nobody can enter.
 */
export async function countOwners(roomId: string): Promise<number> {
  return db.playgroundMember.count({
    where: { roomId, role: RoomMemberRole.OWNER },
  });
}

/**
 * Persist where a member was looking, so the room "reopens exactly as you left
 * it". Written on a debounce from the client; never read back as authority for
 * anything but the initial camera.
 */
export async function saveMemberViewport(
  roomId: string,
  userId: string,
  viewport: Prisma.InputJsonValue,
  lastSeenSeq: number
) {
  return db.playgroundMember.updateMany({
    where: { roomId, userId },
    data: { lastViewport: viewport, lastSeenSeq, lastSeenAt: new Date() },
  });
}
