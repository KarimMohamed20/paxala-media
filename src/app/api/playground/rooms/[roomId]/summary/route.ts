import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { AiRunStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { clampString, rateLimit } from "@/lib/security";
import { requireStudioActor, resolveRoomActor } from "@/lib/playground/actors";
import {
  createSummary,
  getMembership,
  getRoomDetail,
  getRoomForAccess,
  listSummaries,
  markSummaryReviewed,
  readSummarySource,
  recordAiRun,
} from "@/lib/playground/repo";
import { buildBrief } from "@/lib/playground/ai/context";
import { getAiProvider, MAX_OUTPUT_TOKENS } from "@/lib/playground/ai/provider";
import { getTask } from "@/lib/playground/ai/tasks";

/**
 * Session summaries.
 *
 * STUDIO ONLY, and a summary is a DRAFT until a person marks it reviewed. The
 * brief is explicit that a PMP user must check it before the client sees it, and
 * it is right to be: this text is machine-written, attributes decisions to named
 * people, and would otherwise be a plausible-sounding account of a meeting that
 * nobody verified.
 *
 * It is written from DECISIONS AND APPROVALS, not from the whole board. Those
 * are the things the room actually concluded; feeding it every sticky would
 * produce a summary of the brainstorming noise rather than of the outcome.
 */

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
    if (!requireStudioActor(access.actor)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      summaries: await listSummaries(roomId),
      canGenerate: !!getAiProvider(),
    });
  } catch (error) {
    console.error("Playground summary GET error:", error);
    return NextResponse.json({ error: "Failed to load summaries" }, { status: 500 });
  }
}

// POST — generate a new draft.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const access = await resolve(roomId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    if (!requireStudioActor(access.actor) || !access.actor.can("USE_AI")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const provider = getAiProvider();
    if (!provider) {
      return NextResponse.json(
        { error: "PAX AI is not enabled for this workspace." },
        { status: 501 }
      );
    }

    const limit = rateLimit(`pg-summary:${access.actor.userId}`, {
      limit: 10,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many summaries. Give it a moment." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const { decisions, approvals, seq } = await readSummarySource(roomId);
    if (decisions.length === 0 && approvals.length === 0) {
      // Refusing beats generating a confident summary of an empty room.
      return NextResponse.json(
        {
          error:
            "There are no decisions or approvals in this room yet — nothing to summarise.",
        },
        { status: 400 }
      );
    }

    const detail = await getRoomDetail(roomId);
    const task = getTask("session_summary")!;

    const material = [
      detail ? buildBrief(detail) : "",
      "--- DECISIONS ---",
      ...decisions.map(
        (d) =>
          `- ${d.title}${d.outcome ? ` — ${d.outcome}` : ""}${d.createdByName ? ` (recorded by ${d.createdByName})` : ""}`
      ),
      "--- CLIENT APPROVALS ---",
      ...approvals.map((a) => `- ${a.title} — ${a.status}${a.note ? `: ${a.note}` : ""}`),
    ]
      .filter(Boolean)
      .join("\n");

    let output: string;
    try {
      const result = await provider.generate({
        systemPrompt: task.system,
        userPrompt: `${material}\n\n${task.instruction}`,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      });
      output = result.text;

      await recordAiRun({
        roomId,
        intent: task.id,
        nodeIds: [],
        output,
        status: AiRunStatus.OK,
        error: null,
        provider: result.provider,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        createdById: access.actor.userId,
      });
    } catch {
      return NextResponse.json(
        { error: "Could not generate a summary. Try again in a moment." },
        { status: 502 }
      );
    }

    const summary = await createSummary({
      roomId,
      fromSeq: 0,
      toSeq: seq,
      draft: {
        text: output,
        decisionCount: decisions.length,
        approvalCount: approvals.length,
        generatedBy: access.actor.name,
      },
    });

    return NextResponse.json({ summary }, { status: 201 });
  } catch (error) {
    console.error("Playground summary POST error:", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}

// PATCH — mark a draft reviewed. The gate before anything reaches a client.
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
    if (!requireStudioActor(access.actor)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const summaryId = clampString(body.summaryId, 40);
    if (!summaryId) {
      return NextResponse.json({ error: "summaryId is required" }, { status: 400 });
    }

    const updated = await markSummaryReviewed(roomId, summaryId, access.actor.userId);
    if (updated.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ reviewed: true });
  } catch (error) {
    console.error("Playground summary PATCH error:", error);
    return NextResponse.json({ error: "Failed to update summary" }, { status: 500 });
  }
}
