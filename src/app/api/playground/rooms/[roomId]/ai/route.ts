import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AiRunStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/security";
import { requireStudioActor, resolveRoomActor } from "@/lib/playground/actors";
import {
  countAiRunsThisMonth,
  getMembership,
  getRoomDetail,
  getRoomForAccess,
  readAiContextNodes,
  recordAiRun,
} from "@/lib/playground/repo";
import { buildBrief, buildContext } from "@/lib/playground/ai/context";
import { getAiProvider, isAiBillable, MAX_OUTPUT_TOKENS } from "@/lib/playground/ai/provider";
import { AI_TASK_IDS, getTask } from "@/lib/playground/ai/tasks";

/**
 * POST /api/playground/rooms/[roomId]/ai
 *
 * PAX AI. Studio-side only, and gated before the request body is even parsed —
 * a client asking for a generation never reaches the parsing code, let alone the
 * provider.
 *
 * THE BROWSER SENDS `{ intent, nodeIds }`. It cannot send a prompt. The system
 * and instruction text live in the server-side registry, and the canvas content
 * is re-read from the database scoped to this room. Without that, this endpoint
 * would be an authenticated, free Gemini proxy attached to PMP's billing.
 *
 * SPEND IS BOUNDED THREE WAYS, deliberately layered:
 *   per user   in-memory, stops one person hammering it
 *   per room   in-memory, stops one meeting running away
 *   per month  POSTGRES COUNT, the actual budget ceiling — the in-memory
 *              buckets reset on every deploy and are per-process, which makes
 *              them useless for money.
 */

const MONTHLY_CAP = Number.parseInt(process.env.AI_MONTHLY_CALL_CAP ?? "5000", 10);

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
    // Before the body is read.
    if (!requireStudioActor(access.actor) || !access.actor.can("USE_AI")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const provider = getAiProvider();
    if (!provider) {
      return NextResponse.json(
        { error: "PAX AI is not enabled for this workspace.", configured: false },
        { status: 501 }
      );
    }

    const perUser = rateLimit(`pg-ai:${access.actor.userId}`, {
      limit: 20,
      windowMs: 60_000,
    });
    if (!perUser.ok) {
      return NextResponse.json(
        { error: "Too many requests to PAX AI. Give it a moment." },
        { status: 429, headers: { "Retry-After": String(perUser.retryAfterSec) } }
      );
    }

    const perRoom = rateLimit(`pg-ai-room:${roomId}`, { limit: 60, windowMs: 60_000 });
    if (!perRoom.ok) {
      return NextResponse.json(
        { error: "This room is using PAX AI heavily. Give it a moment." },
        { status: 429, headers: { "Retry-After": String(perRoom.retryAfterSec) } }
      );
    }

    // The durable ceiling. Only enforced for a billable provider — the mock
    // costs nothing and should never be rationed.
    if (isAiBillable() && Number.isFinite(MONTHLY_CAP)) {
      const used = await countAiRunsThisMonth();
      if (used >= MONTHLY_CAP) {
        return NextResponse.json(
          {
            error:
              "PAX AI has reached this month's usage limit. Ask an administrator to raise it.",
          },
          { status: 429 }
        );
      }
    }

    const body = await request.json();
    const task = getTask(body.intent);
    if (!task) {
      return NextResponse.json(
        { error: "Unknown request", accepted: AI_TASK_IDS },
        { status: 400 }
      );
    }

    const nodeIds: string[] = Array.isArray(body.nodeIds)
      ? (body.nodeIds as unknown[])
          .filter((id): id is string => typeof id === "string")
          .slice(0, 40)
      : [];

    // Re-read from the database. Whatever the browser thinks these nodes say is
    // irrelevant, and the roomId term is what stops an id reaching another room.
    const nodes = nodeIds.length > 0 ? await readAiContextNodes(roomId, nodeIds) : [];
    const context = buildContext(nodes);

    if (task.needsSelection && !context) {
      return NextResponse.json(
        { error: "Select something on the board for PAX AI to work from." },
        { status: 400 }
      );
    }

    const detail = await getRoomDetail(roomId);
    const brief = detail ? buildBrief(detail) : "";

    const userPrompt = [brief, context, task.instruction]
      .filter(Boolean)
      .join("\n\n");

    // OUTSIDE any transaction: this is a network call that can take tens of
    // seconds, and holding a Prisma connection across it would starve a pool
    // that defaults to five.
    let output: string;
    let usage = { provider: provider.name, model: provider.model, tokensIn: null as number | null, tokensOut: null as number | null };

    try {
      const result = await provider.generate({
        systemPrompt: task.system,
        userPrompt,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      });
      output = result.text;
      usage = {
        provider: result.provider,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
      };
    } catch (error) {
      // Logged as a FAILED run so the failure is visible in usage reporting,
      // but not counted against the monthly cap.
      await recordAiRun({
        roomId,
        intent: task.id,
        nodeIds,
        output: "",
        status: AiRunStatus.FAILED,
        error: error instanceof Error ? error.message.slice(0, 500) : "unknown",
        ...usage,
        createdById: access.actor.userId,
      });
      return NextResponse.json(
        { error: "PAX AI could not answer that. Try again in a moment." },
        { status: 502 }
      );
    }

    const run = await recordAiRun({
      roomId,
      intent: task.id,
      nodeIds,
      output,
      status: AiRunStatus.OK,
      error: null,
      ...usage,
      createdById: access.actor.userId,
    });

    // Returned as TEXT. Nothing is written to the canvas here: putting it on the
    // board is a separate, ordinary NODE_CREATE that a human triggers, which is
    // what guarantees the model can never overwrite work nobody confirmed.
    return NextResponse.json({
      id: run.id,
      intent: task.id,
      output,
      provider: usage.provider,
      model: usage.model,
      configured: isAiBillable(),
    });
  } catch (error) {
    console.error("Playground AI error:", error);
    return NextResponse.json({ error: "PAX AI request failed" }, { status: 500 });
  }
}
