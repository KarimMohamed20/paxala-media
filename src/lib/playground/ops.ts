import {
  Prisma,
  PlaygroundEventType,
  type NodeVisibility,
  type PlaygroundNodeKind,
  type Role,
} from "@prisma/client";
import { db } from "@/lib/db";
import { allocSeq } from "./seq";
import {
  parseClientOpId,
  parseCoord,
  parseDimension,
  parseNodeId,
  parseNodeJson,
  parseNodeKind,
  parseNodeText,
  parseVersion,
  parseVisibility,
  parseZ,
} from "./node-schema";

/**
 * The canvas operation pipeline.
 *
 * Three rules decide everything in this file, and each exists because the
 * obvious alternative produces a specific, visible bug:
 *
 * 1. GEOMETRY OPS NEVER REJECT. Move, resize and reorder are plain updates with
 *    no version guard — last write wins. A guard is
 *    first-writer-wins-and-reject-the-rest, and applying that to a continuous
 *    drag makes two people rubber-band against each other for the whole gesture.
 *    Losing the last 40ms of someone's drag is invisible; fighting them is not.
 *
 * 2. DISCRETE OPS ARE GUARDED. Text, data, style and visibility changes carry a
 *    baseVersion and go through `updateMany({ where: { id, version } })` — the
 *    same optimistic guard the content-calendar approve route uses. Here
 *    "reject and reload" is semantically right: these are decisions, not motion.
 *
 * 3. TEXT ADDITIONALLY TAKES A SERVER-ENFORCED LOCK. The rich-text editor emits
 *    the WHOLE document on every keystroke, so last-write-wins on text means a
 *    colleague's paragraph vanishes with no diff and no recovery. An in-memory
 *    lock cannot survive a deploy and cannot see a client whose stream died, so
 *    the lock lives in columns on the row.
 *
 * IDEMPOTENCY: every op carries a client-generated `clientOpId`, unique per room.
 * A retried batch — the normal case after a dropped connection — collides on
 * that constraint and returns the ORIGINAL sequence number instead of applying
 * twice. This is what makes the offline outbox safe to replay blindly.
 */

export const EDIT_LOCK_TTL_MS = 30_000;

/** Cap on ops per request, so one client cannot monopolise the room's row lock. */
export const MAX_OPS_PER_BATCH = 200;

export type OpType =
  | "NODE_CREATE"
  | "NODE_MOVE"
  | "NODE_RESIZE"
  | "NODE_ORDER"
  | "NODE_TEXT"
  | "NODE_DATA"
  | "NODE_STYLE"
  | "NODE_VISIBILITY"
  | "NODE_DELETE"
  | "EDGE_CREATE"
  | "EDGE_DELETE";

/** Ops that describe motion. Never guarded, never rejected. */
const GEOMETRY_OPS: ReadonlySet<OpType> = new Set([
  "NODE_MOVE",
  "NODE_RESIZE",
  "NODE_ORDER",
]);

export type ParsedOp =
  | { type: "NODE_CREATE"; clientOpId: string; nodeId: string; kind: PlaygroundNodeKind; x: number; y: number; w: number; h: number; z: number; text: string | null; data: Record<string, unknown>; style: Record<string, unknown>; frameId: string | null }
  | {
      type: "NODE_MOVE";
      clientOpId: string;
      nodeId: string;
      x: number;
      y: number;
      /**
       * The frame this node now belongs to, or null for the open board.
       * Reparenting rides NODE_MOVE because it IS geometric — you reparent by
       * dragging something into a frame — so it inherits the same
       * never-rejects rule rather than needing a guarded op of its own.
       */
      frameId?: string | null;
    }
  | { type: "NODE_RESIZE"; clientOpId: string; nodeId: string; x: number; y: number; w: number; h: number }
  | { type: "NODE_ORDER"; clientOpId: string; nodeId: string; z: number }
  | { type: "NODE_TEXT"; clientOpId: string; nodeId: string; text: string | null; baseVersion: number }
  | { type: "NODE_DATA"; clientOpId: string; nodeId: string; data: Record<string, unknown>; baseVersion: number }
  | { type: "NODE_STYLE"; clientOpId: string; nodeId: string; style: Record<string, unknown>; baseVersion: number }
  | { type: "NODE_VISIBILITY"; clientOpId: string; nodeId: string; visibility: NodeVisibility; baseVersion: number }
  | { type: "NODE_DELETE"; clientOpId: string; nodeId: string }
  | {
      type: "EDGE_CREATE";
      clientOpId: string;
      nodeId: string;
      edgeId: string;
      toNodeId: string;
      kind: string;
      style: Record<string, unknown>;
    }
  | { type: "EDGE_DELETE"; clientOpId: string; nodeId: null; edgeId: string };

export type OpResult = {
  clientOpId: string;
  ok: boolean;
  /** Room sequence assigned to this op, when it was applied. */
  seq?: number;
  /** Authoritative version after a discrete write, so the client can reconcile. */
  version?: number;
  code?: "INVALID" | "NOT_FOUND" | "STALE" | "EDIT_LOCKED" | "FORBIDDEN";
  /** Who holds the lock, so the UI can say "Sara is editing" rather than "409". */
  lockedByName?: string | null;
};

export function isGeometryOp(type: OpType): boolean {
  return GEOMETRY_OPS.has(type);
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/**
 * Parse one op from untrusted JSON. Returns null when anything is malformed —
 * callers record an INVALID result rather than throwing, so one bad op in a
 * batch does not discard the nineteen good ones next to it.
 */
export function parseOp(raw: unknown): ParsedOp | null {
  if (!raw || typeof raw !== "object") return null;
  const op = raw as Record<string, unknown>;

  const clientOpId = parseClientOpId(op.clientOpId);
  if (!clientOpId) return null;

  // EDGE_DELETE is the one op with no node of its own, so nodeId is validated
  // per case rather than up front.
  if (op.type === "EDGE_DELETE") {
    const edgeId = parseNodeId(op.edgeId);
    if (!edgeId) return null;
    return { type: "EDGE_DELETE", clientOpId, nodeId: null, edgeId };
  }

  const nodeId = parseNodeId(op.nodeId);
  if (!nodeId) return null;

  if (op.type === "EDGE_CREATE") {
    const edgeId = parseNodeId(op.edgeId);
    const toNodeId = parseNodeId(op.toNodeId);
    const style = parseNodeJson(op.style);
    if (!edgeId || !toNodeId || style === undefined) return null;
    // A connector from a node to itself has no meaningful route and would
    // render as a degenerate loop.
    if (toNodeId === nodeId) return null;
    return {
      type: "EDGE_CREATE",
      clientOpId,
      nodeId,
      edgeId,
      toNodeId,
      kind: typeof op.kind === "string" ? op.kind.slice(0, 32) : "arrow",
      style,
    };
  }

  switch (op.type) {
    case "NODE_CREATE": {
      const kind = parseNodeKind(op.kind);
      const x = parseCoord(op.x);
      const y = parseCoord(op.y);
      const w = parseDimension(op.w);
      const h = parseDimension(op.h);
      const z = parseZ(op.z ?? 0);
      const data = parseNodeJson(op.data);
      const style = parseNodeJson(op.style);
      if (kind === undefined || x === undefined || y === undefined) return null;
      if (w === undefined || h === undefined || z === undefined) return null;
      if (data === undefined || style === undefined) return null;
      return {
        type: "NODE_CREATE",
        clientOpId,
        nodeId,
        kind,
        x,
        y,
        w,
        h,
        z,
        text: parseNodeText(op.text),
        data,
        style,
        frameId: parseNodeId(op.frameId) ?? null,
      };
    }

    case "NODE_MOVE": {
      const x = parseCoord(op.x);
      const y = parseCoord(op.y);
      if (x === undefined || y === undefined) return null;
      return {
        type: "NODE_MOVE",
        clientOpId,
        nodeId,
        x,
        y,
        // `undefined` means "unchanged"; explicit null means "no frame".
        frameId:
          op.frameId === undefined
            ? undefined
            : (parseNodeId(op.frameId) ?? null),
      };
    }

    case "NODE_RESIZE": {
      const x = parseCoord(op.x);
      const y = parseCoord(op.y);
      const w = parseDimension(op.w);
      const h = parseDimension(op.h);
      if (x === undefined || y === undefined || w === undefined || h === undefined) {
        return null;
      }
      return { type: "NODE_RESIZE", clientOpId, nodeId, x, y, w, h };
    }

    case "NODE_ORDER": {
      const z = parseZ(op.z);
      if (z === undefined) return null;
      return { type: "NODE_ORDER", clientOpId, nodeId, z };
    }

    case "NODE_TEXT": {
      const baseVersion = parseVersion(op.baseVersion);
      if (baseVersion === undefined) return null;
      return {
        type: "NODE_TEXT",
        clientOpId,
        nodeId,
        text: parseNodeText(op.text),
        baseVersion,
      };
    }

    case "NODE_DATA": {
      const baseVersion = parseVersion(op.baseVersion);
      const data = parseNodeJson(op.data);
      if (baseVersion === undefined || data === undefined) return null;
      return { type: "NODE_DATA", clientOpId, nodeId, data, baseVersion };
    }

    case "NODE_STYLE": {
      const baseVersion = parseVersion(op.baseVersion);
      const style = parseNodeJson(op.style);
      if (baseVersion === undefined || style === undefined) return null;
      return { type: "NODE_STYLE", clientOpId, nodeId, style, baseVersion };
    }

    case "NODE_VISIBILITY": {
      const baseVersion = parseVersion(op.baseVersion);
      const visibility = parseVisibility(op.visibility);
      if (baseVersion === undefined || visibility === undefined) return null;
      return { type: "NODE_VISIBILITY", clientOpId, nodeId, visibility, baseVersion };
    }

    case "NODE_DELETE":
      return { type: "NODE_DELETE", clientOpId, nodeId };

    default:
      return null;
  }
}

const EVENT_TYPE: Record<OpType, PlaygroundEventType> = {
  NODE_CREATE: PlaygroundEventType.NODE_CREATE,
  NODE_MOVE: PlaygroundEventType.NODE_MOVE,
  NODE_RESIZE: PlaygroundEventType.NODE_RESIZE,
  NODE_ORDER: PlaygroundEventType.NODE_ORDER,
  NODE_TEXT: PlaygroundEventType.NODE_TEXT,
  NODE_DATA: PlaygroundEventType.NODE_DATA,
  NODE_STYLE: PlaygroundEventType.NODE_STYLE,
  NODE_VISIBILITY: PlaygroundEventType.NODE_VISIBILITY,
  NODE_DELETE: PlaygroundEventType.NODE_DELETE,
  EDGE_CREATE: PlaygroundEventType.EDGE_CREATE,
  EDGE_DELETE: PlaygroundEventType.EDGE_DELETE,
};

export type OpActor = {
  userId: string;
  name: string | null;
  role: Role;
};

/**
 * Is this text edit permitted right now?
 *
 * Pure so it can be tested without a database — the TTL arithmetic is exactly
 * the kind of thing that is off by a factor of a thousand in production.
 */
export function canEditText(
  node: { editLockById: string | null; editLockAt: Date | null },
  actorId: string,
  now: number
): boolean {
  if (!node.editLockById || node.editLockById === actorId) return true;
  if (!node.editLockAt) return true;
  return now - node.editLockAt.getTime() > EDIT_LOCK_TTL_MS;
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

/**
 * Apply a batch of ops to a room.
 *
 * Runs in ONE interactive transaction. `allocSeq` takes a row lock on the room
 * on its first call and holds it until commit, so every op in the batch — and
 * every concurrent batch for the same room — is serialised into a gapless,
 * commit-ordered log. That is the property reconnection replay depends on.
 *
 * A rejected op (stale version, held lock) is recorded as a failed RESULT and
 * does not abort the transaction: one person's stale edit must not discard the
 * nineteen good ops batched alongside it. Only an unexpected error rolls back.
 */
export async function applyOps(
  roomId: string,
  actor: OpActor,
  ops: ParsedOp[]
): Promise<{ results: OpResult[]; roomSeq: number }> {
  if (ops.length === 0) {
    const room = await db.playgroundRoom.findUnique({
      where: { id: roomId },
      select: { opSeq: true },
    });
    return { results: [], roomSeq: room?.opSeq ?? 0 };
  }

  return db.$transaction(async (tx) => {
    const results: OpResult[] = [];
    const now = Date.now();

    for (const op of ops) {
      try {
        results.push(await applyOne(tx, roomId, actor, op, now));
      } catch (error) {
        // A unique-constraint hit on (roomId, clientOpId) means this exact op
        // already landed — the normal outcome of replaying an outbox after a
        // dropped connection. Return the original sequence so the client can
        // retire the op instead of retrying it forever.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          const existing = await tx.playgroundEvent.findUnique({
            where: {
              roomId_clientOpId: { roomId, clientOpId: op.clientOpId },
            },
            select: { seq: true },
          });
          results.push({
            clientOpId: op.clientOpId,
            ok: true,
            seq: existing?.seq,
          });
          continue;
        }
        throw error;
      }
    }

    const room = await tx.playgroundRoom.update({
      where: { id: roomId },
      data: { lastActiveAt: new Date() },
      select: { opSeq: true },
    });

    return { results, roomSeq: room.opSeq };
  });
}

async function applyOne(
  tx: Prisma.TransactionClient,
  roomId: string,
  actor: OpActor,
  op: ParsedOp,
  now: number
): Promise<OpResult> {
  // ---- edges --------------------------------------------------------------
  if (op.type === "EDGE_CREATE") {
    // Both endpoints must exist IN THIS ROOM. Without the roomId term a client
    // could join a node from another client's room into their own board.
    const endpoints = await tx.playgroundNode.findMany({
      where: { id: { in: [op.nodeId, op.toNodeId] }, roomId },
      select: { id: true },
    });
    if (endpoints.length !== 2) {
      return { clientOpId: op.clientOpId, ok: false, code: "NOT_FOUND" };
    }

    const seq = await allocSeq(tx, roomId, 1);
    await tx.playgroundEdge.createMany({
      data: [
        {
          id: op.edgeId,
          roomId,
          fromNodeId: op.nodeId,
          toNodeId: op.toNodeId,
          kind: op.kind,
          style: op.style as Prisma.InputJsonValue,
          createdById: actor.userId,
        },
      ],
      skipDuplicates: true,
    });

    await writeEvent(tx, roomId, actor, op, seq, {
      edgeId: op.edgeId,
      fromNodeId: op.nodeId,
      toNodeId: op.toNodeId,
    });
    return { clientOpId: op.clientOpId, ok: true, seq };
  }

  if (op.type === "EDGE_DELETE") {
    const edge = await tx.playgroundEdge.findFirst({
      where: { id: op.edgeId, roomId },
    });
    // Idempotent: two people deleting the same connector both succeed.
    if (!edge) return { clientOpId: op.clientOpId, ok: true };

    const seq = await allocSeq(tx, roomId, 1);
    // The whole row goes into the payload so an undo can recreate it.
    await writeEvent(tx, roomId, actor, op, seq, { edge });
    await tx.playgroundEdge.delete({ where: { id: op.edgeId } });
    return { clientOpId: op.clientOpId, ok: true, seq };
  }

  // ---- create -------------------------------------------------------------
  if (op.type === "NODE_CREATE") {
    const seq = await allocSeq(tx, roomId, 1);

    // createMany + skipDuplicates rather than create: a replayed create whose
    // event row was written but whose node insert raced must not throw here, it
    // must be a no-op. The event row's unique constraint is the real guard.
    await tx.playgroundNode.createMany({
      data: [
        {
          id: op.nodeId,
          roomId,
          kind: op.kind,
          x: op.x,
          y: op.y,
          w: op.w,
          h: op.h,
          z: op.z,
          text: op.text,
          data: op.data as Prisma.InputJsonValue,
          style: op.style as Prisma.InputJsonValue,
          frameId: op.frameId,
          createdById: actor.userId,
          createdByName: actor.name,
          // visibility defaults to TEAM_ONLY in the schema — fail closed.
        },
      ],
      skipDuplicates: true,
    });

    await writeEvent(tx, roomId, actor, op, seq, {
      kind: op.kind,
      x: op.x,
      y: op.y,
      w: op.w,
      h: op.h,
    });

    return { clientOpId: op.clientOpId, ok: true, seq, version: 0 };
  }

  // ---- delete -------------------------------------------------------------
  if (op.type === "NODE_DELETE") {
    const node = await tx.playgroundNode.findFirst({
      where: { id: op.nodeId, roomId },
    });
    if (!node) {
      // Already gone. Idempotent by design: two clients deleting the same node
      // both succeed rather than one seeing a spurious error.
      return { clientOpId: op.clientOpId, ok: true };
    }

    // Comments and reactions CASCADE with the node, so an "undo delete" that
    // only restored the node would silently destroy the vote tally that is the
    // room's actual output. Snapshot both into the event payload first.
    const [comments, reactions] = await Promise.all([
      tx.playgroundComment.findMany({ where: { nodeId: op.nodeId } }),
      tx.playgroundReaction.findMany({ where: { nodeId: op.nodeId } }),
    ]);

    const seq = await allocSeq(tx, roomId, 1);
    await writeEvent(tx, roomId, actor, op, seq, {
      node,
      comments,
      reactions,
    });

    await tx.playgroundNode.delete({ where: { id: op.nodeId } });
    return { clientOpId: op.clientOpId, ok: true, seq };
  }

  // ---- geometry: no guard, never rejects ----------------------------------
  // Written as an explicit union check rather than `isGeometryOp(op.type)` so
  // TypeScript narrows `op` here, and — more importantly — so that everything
  // below is statically known to be a discrete op that carries a baseVersion.
  if (
    op.type === "NODE_MOVE" ||
    op.type === "NODE_RESIZE" ||
    op.type === "NODE_ORDER"
  ) {
    const data =
      op.type === "NODE_MOVE"
        ? {
            x: op.x,
            y: op.y,
            ...(op.frameId !== undefined ? { frameId: op.frameId } : {}),
          }
        : op.type === "NODE_RESIZE"
          ? { x: op.x, y: op.y, w: op.w, h: op.h }
          : { z: op.z };

    const updated = await tx.playgroundNode.updateMany({
      where: { id: op.nodeId, roomId },
      data,
    });
    if (updated.count === 0) {
      return { clientOpId: op.clientOpId, ok: false, code: "NOT_FOUND" };
    }

    const seq = await allocSeq(tx, roomId, 1);
    await writeEvent(tx, roomId, actor, op, seq, data);
    return { clientOpId: op.clientOpId, ok: true, seq };
  }

  // ---- discrete: version-guarded ------------------------------------------
  const node = await tx.playgroundNode.findFirst({
    where: { id: op.nodeId, roomId },
    select: {
      id: true,
      version: true,
      text: true,
      data: true,
      style: true,
      visibility: true,
      editLockById: true,
      editLockAt: true,
    },
  });
  if (!node) {
    return { clientOpId: op.clientOpId, ok: false, code: "NOT_FOUND" };
  }

  if (op.type === "NODE_TEXT" && !canEditText(node, actor.userId, now)) {
    const holder = await tx.user.findUnique({
      where: { id: node.editLockById! },
      select: { name: true },
    });
    return {
      clientOpId: op.clientOpId,
      ok: false,
      code: "EDIT_LOCKED",
      lockedByName: holder?.name ?? null,
      version: node.version,
    };
  }

  const nextVersion = node.version + 1;
  const data: Prisma.PlaygroundNodeUpdateManyMutationInput = { version: nextVersion };
  let before: unknown = null;

  if (op.type === "NODE_TEXT") {
    before = node.text;
    data.text = op.text;
    // Refresh the lock on every accepted keystroke batch, so a continuous
    // typist keeps it and an idle one loses it after the TTL.
    data.editLockById = actor.userId;
    data.editLockAt = new Date(now);
  } else if (op.type === "NODE_DATA") {
    before = node.data;
    data.data = op.data as Prisma.InputJsonValue;
  } else if (op.type === "NODE_STYLE") {
    before = node.style;
    data.style = op.style as Prisma.InputJsonValue;
  } else if (op.type === "NODE_VISIBILITY") {
    before = node.visibility;
    data.visibility = op.visibility;
  }

  // The optimistic guard, lifted from the content-calendar approve route: if a
  // second writer moved this node between our read and this write, count is 0
  // and we report STALE rather than clobbering them.
  const guarded = await tx.playgroundNode.updateMany({
    where: { id: op.nodeId, roomId, version: op.baseVersion },
    data,
  });

  if (guarded.count === 0) {
    return {
      clientOpId: op.clientOpId,
      ok: false,
      code: "STALE",
      version: node.version,
    };
  }

  const seq = await allocSeq(tx, roomId, 1);
  // `before` is persisted so an overwrite is always recoverable by hand — the
  // one failure class that has no other recovery path, since undo is local.
  await writeEvent(tx, roomId, actor, op, seq, { before, after: afterOf(op) });

  return { clientOpId: op.clientOpId, ok: true, seq, version: nextVersion };
}

function afterOf(op: ParsedOp): unknown {
  switch (op.type) {
    case "NODE_TEXT":
      return op.text;
    case "NODE_DATA":
      return op.data;
    case "NODE_STYLE":
      return op.style;
    case "NODE_VISIBILITY":
      return op.visibility;
    default:
      return null;
  }
}

function writeEvent(
  tx: Prisma.TransactionClient,
  roomId: string,
  actor: OpActor,
  op: ParsedOp,
  seq: number,
  payload: unknown
) {
  return tx.playgroundEvent.create({
    data: {
      roomId,
      seq,
      type: EVENT_TYPE[op.type],
      actorId: actor.userId,
      actorName: actor.name,
      actorRole: actor.role,
      nodeId: op.nodeId ?? null,
      clientOpId: op.clientOpId,
      payload: (payload ?? {}) as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
}
