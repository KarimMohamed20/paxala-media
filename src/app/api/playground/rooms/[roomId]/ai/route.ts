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
  readComposeContextNodes,
  recordAiRun,
} from "@/lib/playground/repo";
import { buildBrief, buildContext } from "@/lib/playground/ai/context";
import {
  COMPOSE_SCHEMA,
  COMPOSE_SYSTEM,
  MAX_COMPOSE_CONTEXT_NODES,
  buildBoardContext,
  buildComposePrompt,
  extractJson,
  parseComposePlan,
} from "@/lib/playground/ai/compose";
import {
  COMPOSE_MAX_OUTPUT_TOKENS,
  getAiProvider,
  isAiBillable,
  MAX_OUTPUT_TOKENS,
  type AiProvider,
} from "@/lib/playground/ai/provider";
import { AI_TASK_IDS, getTask } from "@/lib/playground/ai/tasks";
import { MAX_COMPOSE_INSTRUCTION } from "@/lib/playground/compose-plan";

/**
 * POST /api/playground/rooms/[roomId]/ai
 *
 * PAX AI. Studio-side only, and gated before the request body is even parsed —
 * a client asking for a generation never reaches the parsing code, let alone the
 * provider.
 *
 * THE BROWSER SENDS `{ intent, nodeIds }`. For every registry task it cannot
 * send a prompt: the system and instruction text live server-side, and the
 * canvas content is re-read from the database scoped to this room. Without
 * that, this endpoint would be an authenticated, free Gemini proxy attached to
 * PMP's billing.
 *
 * The single exception is `intent: "compose"` ("build on the board"), which
 * carries a person's own request (≤1000 chars). It passes every gate below
 * first, its answer is schema-locked board items rather than prose, and the
 * request is recorded verbatim — see handleCompose and ai/compose.ts.
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

    // "Build on the board" — the one free-form request. It runs AFTER every
    // gate above (studio-only, both rate limits, the monthly cap), so it is
    // bounded exactly like the registry tasks; see ai/compose.ts for why a
    // person's own words are acceptable here and nowhere else.
    if (body?.intent === "compose") {
      return await handleCompose({
        roomId,
        body,
        userId: access.actor.userId,
        provider,
      });
    }

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

/**
 * Handle a compose request: a free-form instruction, answered with a
 * validated PLAN of board items.
 *
 * Like every other PAX run this writes nothing to the canvas. The plan goes
 * back to the person who asked, they see a preview, and adding it is an
 * ordinary NODE_CREATE they trigger — the guarantee that no model output
 * lands beside human work unconfirmed is unchanged.
 */
async function handleCompose({
  roomId,
  body,
  userId,
  provider,
}: {
  roomId: string;
  body: Record<string, unknown>;
  userId: string;
  provider: AiProvider;
}) {
  const instruction =
    typeof body.instruction === "string" ? body.instruction.trim() : "";
  if (!instruction) {
    return NextResponse.json(
      { error: "Tell PAX what to build.", code: "EMPTY_REQUEST" },
      { status: 400 }
    );
  }
  // Refused, not truncated: silently cutting someone's brief would answer a
  // different question from the one they asked.
  if (instruction.length > MAX_COMPOSE_INSTRUCTION) {
    return NextResponse.json(
      { error: "That request is too long.", code: "REQUEST_TOO_LONG" },
      { status: 400 }
    );
  }

  const selectedIds: string[] = Array.isArray(body.nodeIds)
    ? (body.nodeIds as unknown[])
        .filter((id): id is string => typeof id === "string")
        .slice(0, MAX_COMPOSE_CONTEXT_NODES)
    : [];

  // Re-read from the database, scoped to this room: whatever the browser
  // believes the board says is irrelevant.
  const { selected, others, frames } = await readComposeContextNodes(
    roomId,
    selectedIds,
    MAX_COMPOSE_CONTEXT_NODES
  );
  const board = buildBoardContext(selected, others, frames);

  const detail = await getRoomDetail(roomId);
  const brief = detail ? buildBrief(detail) : "";
  const userPrompt = buildComposePrompt({ brief, board: board.text, instruction });

  const base = {
    roomId,
    intent: "compose",
    nodeIds: board.nodeIds,
    createdById: userId,
  };

  let result: Awaited<ReturnType<AiProvider["generate"]>>;
  try {
    result = await provider.generate({
      systemPrompt: COMPOSE_SYSTEM,
      userPrompt,
      maxOutputTokens: COMPOSE_MAX_OUTPUT_TOKENS,
      responseSchema: COMPOSE_SCHEMA,
    });
  } catch (error) {
    await recordAiRun({
      ...base,
      // The request is kept even on failure: a free-form prompt is exactly
      // the thing an audit of PAX usage needs to be able to read back.
      output: JSON.stringify({ request: instruction }),
      status: AiRunStatus.FAILED,
      error: error instanceof Error ? error.message.slice(0, 500) : "unknown",
      provider: provider.name,
      model: provider.model,
      tokensIn: null,
      tokensOut: null,
    });
    return NextResponse.json(
      { error: "PAX AI could not answer that. Try again in a moment." },
      { status: 502 }
    );
  }

  const plan = parseComposePlan(extractJson(result.text), board.refs);
  const usage = {
    provider: result.provider,
    model: result.model,
    tokensIn: result.tokensIn,
    tokensOut: result.tokensOut,
  };

  if (!plan) {
    // Recorded FAILED (so it is visible in reporting and does not consume
    // the monthly budget), with the raw reply for whoever debugs it.
    await recordAiRun({
      ...base,
      output: JSON.stringify({ request: instruction, raw: result.text.slice(0, 4000) }),
      status: AiRunStatus.FAILED,
      error: "Plan had no usable items",
      ...usage,
    });
    return NextResponse.json(
      {
        error: "PAX came back with nothing usable. Try rephrasing the request.",
        code: "UNUSABLE_PLAN",
      },
      { status: 502 }
    );
  }

  // The run log holds the request verbatim beside the plan it produced.
  // `intent` stays a registry id ("compose"); the person's words live in the
  // output document, so reporting that counts intents is unaffected.
  const run = await recordAiRun({
    ...base,
    output: JSON.stringify({ request: instruction, plan }),
    status: AiRunStatus.OK,
    error: null,
    ...usage,
  });

  return NextResponse.json({
    id: run.id,
    intent: "compose",
    plan,
    provider: usage.provider,
    model: usage.model,
    configured: isAiBillable(),
  });
}
