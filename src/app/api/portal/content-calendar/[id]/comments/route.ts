import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { clampString, rateLimit } from "@/lib/security";
import { commentSelect, commentThreadArgs } from "@/lib/content-queries";
import {
  canAccessContentItem,
  getActor,
  getContentItemForAccess,
} from "@/lib/content-authz";

// GET /api/portal/content-calendar/[id]/comments — the feedback thread.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const item = await getContentItemForAccess(id);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (!canAccessContentItem(actor, item)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const comments = await db.contentComment.findMany({
      where: { contentItemId: id },
      ...commentThreadArgs,
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("Content comments GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

// POST /api/portal/content-calendar/[id]/comments
// Body: { body: string, timecodeSec?: number, assetId?: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = rateLimit(`content-comment:${actor.userId}`, {
      limit: 60,
      windowMs: 60_000,
    });
    if (!limit.ok) {
      return NextResponse.json(
        { error: "Too many comments. Please slow down." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
      );
    }

    const { id } = await params;
    const payload = await request.json();

    const body = clampString(payload.body, 4000);
    if (!body) {
      return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
    }

    const item = await getContentItemForAccess(id);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (!canAccessContentItem(actor, item)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // A timecode is only meaningful against a specific attached file, and that
    // file must actually be attached to this item.
    let assetId: string | null = null;
    if (payload.assetId) {
      if (typeof payload.assetId !== "string") {
        return NextResponse.json({ error: "Invalid assetId" }, { status: 400 });
      }
      const attached = await db.contentItemAsset.findFirst({
        where: { contentItemId: id, fileId: payload.assetId },
        select: { id: true },
      });
      if (!attached) {
        return NextResponse.json(
          { error: "That file is not attached to this content item" },
          { status: 400 }
        );
      }
      assetId = payload.assetId;
    }

    let timecodeSec: number | null = null;
    if (payload.timecodeSec !== undefined && payload.timecodeSec !== null) {
      const n = Number(payload.timecodeSec);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: "Invalid timecodeSec" }, { status: 400 });
      }
      if (!assetId) {
        return NextResponse.json(
          { error: "timecodeSec requires an assetId" },
          { status: 400 }
        );
      }
      timecodeSec = Math.round(n * 100) / 100;
    }

    const comment = await db.contentComment.create({
      data: {
        contentItemId: id,
        authorId: actor.userId,
        authorName: actor.name,
        authorRole: actor.role,
        body,
        timecodeSec,
        assetId,
      },
      select: commentSelect,
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error("Content comments POST error:", error);
    return NextResponse.json(
      { error: "Failed to post comment" },
      { status: 500 }
    );
  }
}
