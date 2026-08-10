import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ContentStatus, Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { clampString } from "@/lib/security";
import { contentItemInclude } from "@/lib/content-queries";
import {
  CLIENT_EDITABLE_FIELDS,
  canAccessContentItem,
  canTransitionStatus,
  getActor,
  getContentItemForAccess,
  parseContentFormat,
  parseContentPlatform,
  parseContentStatus,
  parseDate,
  validateContentLinks,
} from "@/lib/content-authz";

// PUT /api/portal/content-calendar/[id]
export async function PUT(
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
    const body = await request.json();

    const existing = await getContentItemForAccess(id);
    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (!canAccessContentItem(actor, existing)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // A client may leave notes on their own item, nothing more. Producing and
    // scheduling content is an agency action.
    if (!actor.isStaff) {
      const disallowed = Object.keys(body).filter(
        (k) => !(CLIENT_EDITABLE_FIELDS as readonly string[]).includes(k)
      );
      if (disallowed.length > 0) {
        return NextResponse.json(
          {
            error: `Clients may only update: ${CLIENT_EDITABLE_FIELDS.join(", ")}`,
          },
          { status: 403 }
        );
      }
    }

    const updateData: Prisma.ContentItemUpdateInput = {};

    if (body.title !== undefined) {
      const title = clampString(body.title, 200);
      if (!title) {
        return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
      }
      updateData.title = title;
    }
    if (body.caption !== undefined) {
      updateData.caption = body.caption ? clampString(body.caption, 5000) : null;
    }
    if (body.clientNotes !== undefined) {
      updateData.clientNotes = body.clientNotes
        ? clampString(body.clientNotes, 2000)
        : null;
    }
    if (body.platform !== undefined) {
      const platform = parseContentPlatform(body.platform);
      if (!platform) {
        return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
      }
      updateData.platform = platform;
    }
    if (body.format !== undefined) {
      const format = parseContentFormat(body.format);
      if (!format) {
        return NextResponse.json({ error: "Invalid format" }, { status: 400 });
      }
      updateData.format = format;
    }
    if (body.scheduledAt !== undefined) {
      const scheduledAt = parseDate(body.scheduledAt);
      if (!scheduledAt) {
        return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
      }
      updateData.scheduledAt = scheduledAt;
    }

    if (body.status !== undefined) {
      const status = parseContentStatus(body.status);
      if (!status) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      if (!canTransitionStatus(actor, existing.status, status)) {
        return NextResponse.json(
          {
            error: `Cannot move ${existing.status} -> ${status}. Approvals and rejections must go through the review endpoint.`,
          },
          { status: 409 }
        );
      }
      updateData.status = status;
      // publishedAt records a historical fact: set it the first time an item goes
      // live, and never clear it if the item is later moved back.
      if (status === ContentStatus.PUBLISHED && !existing.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    // Links are validated against the item's OWNER, not the caller — a staff user
    // acting on a client's item must still only attach that client's assets.
    let fileIds: string[] | null = null;
    if (body.projectId !== undefined || body.fileIds !== undefined) {
      const links = await validateContentLinks({
        clientId: existing.clientId,
        projectId: body.projectId,
        fileIds: body.fileIds,
      });
      if (!links.ok) {
        return NextResponse.json({ error: links.error }, { status: links.status });
      }
      if (body.projectId !== undefined) {
        updateData.project = links.projectId
          ? { connect: { id: links.projectId } }
          : { disconnect: true };
      }
      if (body.fileIds !== undefined) fileIds = links.fileIds;
    }

    // Replacing assets is two writes; without a transaction a failure between them
    // leaves the item with no assets at all.
    const updated = await db.$transaction(async (tx) => {
      if (fileIds !== null) {
        await tx.contentItemAsset.deleteMany({ where: { contentItemId: id } });
        if (fileIds.length > 0) {
          await tx.contentItemAsset.createMany({
            data: fileIds.map((fileId, idx) => ({
              contentItemId: id,
              fileId,
              order: idx,
            })),
          });
        }
      }
      return tx.contentItem.update({
        where: { id },
        data: updateData,
        include: contentItemInclude,
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Content item PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update content item" },
      { status: 500 }
    );
  }
}

// DELETE /api/portal/content-calendar/[id]
export async function DELETE(
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
    const existing = await getContentItemForAccess(id);
    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
    if (!canAccessContentItem(actor, existing)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.contentItem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Content item DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete content item" },
      { status: 500 }
    );
  }
}
