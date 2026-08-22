import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ContentApprovalAction, ContentStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { getAppBaseUrl } from "@/lib/constants";
import { db } from "@/lib/db";
import { sendContentAwaitingApproval } from "@/lib/email/service";
import { EmailLocale } from "@/lib/email/styles";
import { clampString } from "@/lib/security";
import {
  canReview,
  canTransitionStatus,
  getActor,
  parseDate,
} from "@/lib/content-authz";

const MAX_IDS = 100;

type BulkAction =
  | "SUBMIT"
  | "APPROVE"
  | "REJECT"
  | "SCHEDULE"
  | "PUBLISH"
  | "DELETE";

const BULK_ACTIONS: BulkAction[] = [
  "SUBMIT",
  "APPROVE",
  "REJECT",
  "SCHEDULE",
  "PUBLISH",
  "DELETE",
];

/** Actions that are review outcomes and therefore write a ContentApproval row. */
const REVIEW_LOG: Partial<Record<BulkAction, ContentApprovalAction>> = {
  SUBMIT: ContentApprovalAction.SUBMITTED,
  APPROVE: ContentApprovalAction.APPROVED,
  REJECT: ContentApprovalAction.REJECTED,
};

const TARGET_STATUS: Partial<Record<BulkAction, ContentStatus>> = {
  SUBMIT: ContentStatus.AWAITING_APPROVAL,
  APPROVE: ContentStatus.APPROVED,
  REJECT: ContentStatus.REJECTED,
  SCHEDULE: ContentStatus.SCHEDULED,
  PUBLISH: ContentStatus.PUBLISHED,
};

/**
 * POST /api/admin/content-calendar/bulk
 *
 * Apply one action to many items. Items whose current status makes the action
 * illegal are skipped with a reason rather than failing the whole batch, so a
 * partially-applicable selection stays useful.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const actor = getActor(session);
    if (!actor) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!actor.isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action as BulkAction;
    if (!BULK_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${BULK_ACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    const ids: string[] = Array.isArray(body.ids)
      ? Array.from(new Set(body.ids.filter((i: unknown) => typeof i === "string" && i)))
      : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: "No items selected" }, { status: 400 });
    }
    if (ids.length > MAX_IDS) {
      return NextResponse.json(
        { error: `At most ${MAX_IDS} items per request` },
        { status: 400 }
      );
    }

    const notes = body.notes ? clampString(body.notes, 2000) : null;
    const scheduledAt = parseDate(body.scheduledAt);
    if (body.scheduledAt !== undefined && !scheduledAt) {
      return NextResponse.json({ error: "Invalid scheduledAt" }, { status: 400 });
    }

    const existing = await db.contentItem.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true, publishedAt: true },
    });
    const byId = new Map(existing.map((i) => [i.id, i]));

    const skipped: Array<{ id: string; reason: string }> = [];
    const applicable: typeof existing = [];

    for (const id of ids) {
      const item = byId.get(id);
      if (!item) {
        skipped.push({ id, reason: "Not found" });
        continue;
      }
      if (action === "DELETE") {
        applicable.push(item);
        continue;
      }
      const to = TARGET_STATUS[action]!;
      const allowed = REVIEW_LOG[action]
        ? canReview(actor, item.status, action as "SUBMIT" | "APPROVE" | "REJECT")
        : canTransitionStatus(actor, item.status, to);
      if (!allowed) {
        skipped.push({ id, reason: `Cannot ${action} from ${item.status}` });
        continue;
      }
      applicable.push(item);
    }

    if (applicable.length === 0) {
      return NextResponse.json({ updated: 0, skipped });
    }

    const updated = await db.$transaction(async (tx) => {
      if (action === "DELETE") {
        const res = await tx.contentItem.deleteMany({
          where: { id: { in: applicable.map((i) => i.id) } },
        });
        return res.count;
      }

      const to = TARGET_STATUS[action]!;
      const now = new Date();
      let count = 0;

      for (const item of applicable) {
        await tx.contentItem.update({
          where: { id: item.id },
          data: {
            status: to,
            ...(scheduledAt && { scheduledAt }),
            ...(action !== "SUBMIT" && notes !== null && { clientNotes: notes }),
            ...(action === "APPROVE" && { approvedAt: now, rejectedAt: null }),
            ...(action === "REJECT" && { rejectedAt: now, approvedAt: null }),
            ...(action === "SUBMIT" && { approvedAt: null, rejectedAt: null }),
            // publishedAt is a historical fact — set once, never recomputed.
            ...(action === "PUBLISH" &&
              !item.publishedAt && { publishedAt: now }),
          },
        });

        const logAction = REVIEW_LOG[action];
        if (logAction) {
          await tx.contentApproval.create({
            data: {
              contentItemId: item.id,
              action: logAction,
              notes,
              reviewerId: actor.userId,
              reviewerRole: actor.role,
              reviewerName: actor.name,
              fromStatus: item.status,
              toStatus: to,
            },
          });
        }
        count += 1;
      }
      return count;
    });

    // A bulk SUBMIT is a request to the client(s): one digest email per client
    // with their item count, not one email per item.
    if (action === "SUBMIT" && updated > 0) {
      const submitted = await db.contentItem.findMany({
        where: { id: { in: applicable.map((i) => i.id) } },
        select: {
          title: true,
          plan: {
            select: {
              clientId: true,
              client: { select: { email: true, name: true } },
            },
          },
        },
      });
      const perClient = new Map<
        string,
        { email: string; name: string; count: number; itemTitle: string }
      >();
      for (const item of submitted) {
        const client = item.plan.client;
        if (!client.email) continue;
        const entry = perClient.get(item.plan.clientId);
        if (entry) entry.count += 1;
        else
          perClient.set(item.plan.clientId, {
            email: client.email,
            name: client.name || client.email,
            count: 1,
            itemTitle: item.title,
          });
      }
      const locale = (request.cookies.get("NEXT_LOCALE")?.value ||
        "en") as EmailLocale;
      for (const { email, name, count, itemTitle } of perClient.values()) {
        void sendContentAwaitingApproval(
          email,
          {
            name,
            count,
            // A batch of one for this client reads like a single submission,
            // not "1 content items".
            ...(count === 1 && { itemTitle }),
            link: `${getAppBaseUrl()}/portal/approvals`,
          },
          locale
        ).catch((error) =>
          console.error("Content awaiting email send failed:", error)
        );
      }
    }

    return NextResponse.json({ updated, skipped });
  } catch (error) {
    console.error("Admin content bulk POST error:", error);
    return NextResponse.json(
      { error: "Failed to apply bulk action" },
      { status: 500 }
    );
  }
}
