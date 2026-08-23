import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/security";
import { resolveRoomActor } from "@/lib/playground/actors";
import { roomBus } from "@/lib/playground/bus";
import { getMembership, getRoomForAccess } from "@/lib/playground/repo";
import {
  MAX_OPS_PER_BATCH,
  applyOps,
  parseOp,
  type OpResult,
  type ParsedOp,
} from "@/lib/playground/ops";

/**
 * POST /api/playground/rooms/[roomId]/ops
 *
 * The canvas write path. Accepts a BATCH because the client coalesces roughly
 * 120ms of activity into one request — a drag that emitted one request per
 * pointermove would be sixty requests a second per participant, and nginx's
 * per-IP rate limit would start refusing an office full of people.
 *
 * Returns a result PER OP rather than a single status. A stale text edit inside
 * a batch must not discard the nineteen good ops next to it, and the client
 * needs to know exactly which of its queued ops to retire.
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

    // EDIT is denied to clients, viewers, and to staff previewing as a client —
    // so Client Mode is read-only at the write path, not merely in the UI.
    if (!access.actor.can("EDIT")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Generous: a batch is one request per ~120ms per user, so a hard-working
    // participant sits near 8/s. This exists to stop a runaway loop, not to
    // pace normal editing.
    const limit = rateLimit(`pg-ops:${access.actor.userId}`, {
      limit: 300,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many canvas updates. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const body = await request.json();
    const raw = Array.isArray(body?.ops) ? body.ops : null;
    if (!raw) {
      return NextResponse.json({ error: "ops must be an array" }, { status: 400 });
    }
    if (raw.length > MAX_OPS_PER_BATCH) {
      return NextResponse.json(
        { error: `A batch may contain at most ${MAX_OPS_PER_BATCH} operations` },
        { status: 400 }
      );
    }

    // Malformed ops are reported individually rather than failing the request:
    // one bad op from a stale client tab should not block that tab from ever
    // syncing again.
    const parsed: ParsedOp[] = [];
    const invalid: OpResult[] = [];
    for (const item of raw) {
      const op = parseOp(item);
      if (op) {
        parsed.push(op);
      } else {
        const clientOpId =
          item && typeof item === "object" && typeof item.clientOpId === "string"
            ? item.clientOpId
            : "unknown";
        invalid.push({ clientOpId, ok: false, code: "INVALID" });
      }
    }

    // Presence rides this endpoint rather than having its own. One route means
    // one rate-limit bucket and one nginx location, and requests are budgeted
    // per user instead of per feature — which is what keeps an office full of
    // people behind one NAT under nginx's IP-keyed limit.
    const connectionId =
      typeof body?.connectionId === "string" ? body.connectionId : null;
    if (connectionId && body?.presence && typeof body.presence === "object") {
      const presence = body.presence as Record<string, unknown>;
      roomBus.updatePresence(roomId, connectionId, {
        cursor: parsePoint(presence.cursor),
        viewport: parseViewport(presence.viewport),
        selection: Array.isArray(presence.selection)
          ? presence.selection.filter((id: unknown): id is string => typeof id === "string").slice(0, 200)
          : [],
      });
    }

    const { results, roomSeq } = await applyOps(roomId, {
      userId: access.actor.userId,
      name: access.actor.name,
      role: access.actor.role,
    }, parsed);

    // Fan out AFTER commit, and never back to the originator: it applied these
    // optimistically before the request was sent, and echoing them would make a
    // node visibly jump back to a position the user has already moved past.
    const applied = results.filter((r) => r.ok && r.seq !== undefined);
    if (applied.length > 0) {
      roomBus.broadcast(
        roomId,
        {
          type: "ops",
          seq: roomSeq,
          ops: parsed.filter((op) =>
            applied.some((r) => r.clientOpId === op.clientOpId)
          ),
          actorId: access.actor.userId,
        },
        connectionId ?? undefined
      );
    }

    return NextResponse.json({ results: [...results, ...invalid], roomSeq });
  } catch (error) {
    console.error("Playground ops POST error:", error);
    return NextResponse.json(
      { error: "Failed to apply canvas changes" },
      { status: 500 }
    );
  }
}

/** Finite-only: a NaN cursor renders off-screen and never comes back. */
function parsePoint(value: unknown): { x: number; y: number } | null {
  if (!value || typeof value !== "object") return null;
  const point = value as Record<string, unknown>;
  if (typeof point.x !== "number" || typeof point.y !== "number") return null;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  return { x: point.x, y: point.y };
}

function parseViewport(
  value: unknown
): { x: number; y: number; z: number } | null {
  const point = parsePoint(value);
  if (!point) return null;
  const z = (value as Record<string, unknown>).z;
  if (typeof z !== "number" || !Number.isFinite(z) || z <= 0) return null;
  return { ...point, z };
}
