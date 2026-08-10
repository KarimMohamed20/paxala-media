import type { Session } from "next-auth";
import {
  ContentFormat,
  ContentPlatform,
  ContentStatus,
  Role,
} from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Authorization and validation for the content calendar.
 *
 * Companion to `@/lib/authz` (which covers project-scoped resources). This module
 * exists because content items are owned indirectly — through `ContentPlan.clientId`
 * — and because they carry two cross-entity links (`projectId`, `fileIds`) that were
 * previously written straight from the request body without any ownership check.
 */

export type ContentActor = {
  userId: string;
  role: Role;
  name: string | null;
  /** ADMIN or STAFF — the agency side. */
  isStaff: boolean;
};

/** Fields a CLIENT may change via PUT. Everything else is agency-only. */
export const CLIENT_EDITABLE_FIELDS = ["clientNotes"] as const;

/** Upper bound on assets attached to a single content item. */
export const MAX_ASSETS_PER_ITEM = 10;

/** Narrow a NextAuth session into an actor, or null when unauthenticated. */
export function getActor(session: Session | null): ContentActor | null {
  const id = session?.user?.id;
  if (!id) return null;
  // session.user.role is typed as string (see src/types/next-auth.d.ts); fall back
  // to CLIENT — the least privileged role — for anything unrecognised.
  const raw = session?.user?.role;
  const role: Role =
    raw === "ADMIN" || raw === "STAFF" || raw === "CLIENT" ? raw : Role.CLIENT;
  return {
    userId: id,
    role,
    name: session?.user?.name ?? null,
    isStaff: role === Role.ADMIN || role === Role.STAFF,
  };
}

/**
 * Resolve which client the request operates on.
 *
 * CLIENT      -> always their own id. A supplied clientId is ignored, never trusted.
 * ADMIN/STAFF -> `requestedClientId` when it names a real CLIENT user, else their own id.
 *
 * Returns null when a staff member named a client that does not exist or is not a CLIENT.
 */
export async function resolveTargetClientId(
  actor: ContentActor,
  requestedClientId?: string | null
): Promise<string | null> {
  if (!actor.isStaff) return actor.userId;
  if (!requestedClientId) return actor.userId;

  const client = await db.user.findFirst({
    where: { id: requestedClientId, role: Role.CLIENT },
    select: { id: true },
  });
  return client?.id ?? null;
}

export type ContentLinkResult =
  | { ok: true; projectId: string | null; fileIds: string[] }
  | { ok: false; status: 400 | 403 | 404; error: string };

/**
 * Validate that `projectId` (when given) and every `fileId` belong to `clientId`.
 *
 * Closes the IDOR where any authenticated client could attach another client's
 * project or media files to their own content item simply by guessing ids.
 *
 * `fileIds` is returned in the caller's original order (deduped) so that the
 * resulting `ContentItemAsset.order` stays meaningful for carousels.
 */
export async function validateContentLinks(input: {
  clientId: string;
  projectId?: unknown;
  fileIds?: unknown;
}): Promise<ContentLinkResult> {
  const { clientId } = input;

  // ---- projectId ----
  let projectId: string | null = null;
  if (input.projectId !== undefined && input.projectId !== null && input.projectId !== "") {
    if (typeof input.projectId !== "string") {
      return { ok: false, status: 400, error: "projectId must be a string" };
    }
    const project = await db.project.findFirst({
      where: { id: input.projectId, clientId },
      select: { id: true },
    });
    if (!project) {
      return { ok: false, status: 403, error: "Project does not belong to this client" };
    }
    projectId = project.id;
  }

  // ---- fileIds ----
  const fileIds: string[] = [];
  if (input.fileIds !== undefined && input.fileIds !== null) {
    if (!Array.isArray(input.fileIds)) {
      return { ok: false, status: 400, error: "fileIds must be an array" };
    }
    // Preserve caller order, drop duplicates and non-strings.
    const seen = new Set<string>();
    for (const raw of input.fileIds) {
      if (typeof raw !== "string" || !raw) continue;
      if (seen.has(raw)) continue;
      seen.add(raw);
      fileIds.push(raw);
    }
    if (fileIds.length > MAX_ASSETS_PER_ITEM) {
      return {
        ok: false,
        status: 400,
        error: `A content item may have at most ${MAX_ASSETS_PER_ITEM} assets`,
      };
    }
    if (fileIds.length > 0) {
      const owned = await db.projectFile.findMany({
        where: { id: { in: fileIds }, project: { clientId } },
        select: { id: true },
      });
      if (owned.length !== fileIds.length) {
        return {
          ok: false,
          status: 403,
          error: "One or more files do not belong to this client",
        };
      }
    }
  }

  return { ok: true, projectId, fileIds };
}

/**
 * Minimal fields for an ACL decision on a content item, with the owning client
 * flattened up from the plan so callers do not have to reach through `item.plan`.
 */
export async function getContentItemForAccess(id: string): Promise<{
  id: string;
  status: ContentStatus;
  planId: string;
  projectId: string | null;
  publishedAt: Date | null;
  clientId: string;
} | null> {
  const item = await db.contentItem.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      planId: true,
      projectId: true,
      publishedAt: true,
      plan: { select: { clientId: true } },
    },
  });
  if (!item) return null;
  const { plan, ...rest } = item;
  return { ...rest, clientId: plan.clientId };
}

/** ADMIN and STAFF may touch any content item; a CLIENT only their own. */
export function canAccessContentItem(
  actor: ContentActor | null,
  item: { clientId: string }
): boolean {
  if (!actor) return false;
  if (actor.isStaff) return true;
  return item.clientId === actor.userId;
}

/**
 * Status transitions permitted through `PUT /api/portal/content-calendar/[id]`.
 *
 * Deliberately unreachable here: APPROVED and REJECTED. Those are review outcomes
 * and may only be produced by the /approve route, which writes a ContentApproval
 * row in the same transaction. That is what guarantees the audit log is complete.
 */
const STAFF_PUT_TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  DRAFT: [ContentStatus.IN_PROGRESS, ContentStatus.AWAITING_APPROVAL],
  IN_PROGRESS: [ContentStatus.DRAFT, ContentStatus.AWAITING_APPROVAL],
  AWAITING_APPROVAL: [ContentStatus.DRAFT, ContentStatus.IN_PROGRESS],
  REJECTED: [
    ContentStatus.DRAFT,
    ContentStatus.IN_PROGRESS,
    ContentStatus.AWAITING_APPROVAL,
  ],
  APPROVED: [ContentStatus.SCHEDULED, ContentStatus.PUBLISHED],
  SCHEDULED: [ContentStatus.PUBLISHED],
  PUBLISHED: [],
};

/** Is `from -> to` a legal PUT transition for this actor? */
export function canTransitionStatus(
  actor: ContentActor,
  from: ContentStatus,
  to: ContentStatus
): boolean {
  if (from === to) return true;
  // Clients never move an item themselves — they review it via /approve.
  if (!actor.isStaff) return false;
  return STAFF_PUT_TRANSITIONS[from].includes(to);
}

export type ReviewAction = "SUBMIT" | "APPROVE" | "REJECT";

/**
 * Is this review action legal for this actor from the item's current status?
 *
 * SUBMIT           agency only, from anything not yet published.
 * APPROVE/REJECT   a client may only act on an item awaiting their review; agency
 *                  users may additionally correct an earlier decision.
 */
export function canReview(
  actor: ContentActor,
  from: ContentStatus,
  action: ReviewAction
): boolean {
  if (action === "SUBMIT") {
    return actor.isStaff && from !== ContentStatus.PUBLISHED;
  }
  if (from === ContentStatus.AWAITING_APPROVAL) return true;
  // Correcting an earlier verdict is an agency-side action.
  return (
    actor.isStaff &&
    (from === ContentStatus.APPROVED || from === ContentStatus.REJECTED)
  );
}

/** Target status produced by a review action. */
export function statusForReview(action: ReviewAction): ContentStatus {
  if (action === "SUBMIT") return ContentStatus.AWAITING_APPROVAL;
  if (action === "APPROVE") return ContentStatus.APPROVED;
  return ContentStatus.REJECTED;
}

// ---------------------------------------------------------------------------
// Enum parsing — request bodies are untyped JSON, so never pass raw strings to
// Prisma. Each helper returns undefined for anything not in the enum.
// ---------------------------------------------------------------------------

function parseEnum<T extends Record<string, string>>(
  enumObj: T,
  value: unknown
): T[keyof T] | undefined {
  if (typeof value !== "string") return undefined;
  return Object.values(enumObj).includes(value)
    ? (value as T[keyof T])
    : undefined;
}

export const parseContentPlatform = (v: unknown) => parseEnum(ContentPlatform, v);
export const parseContentFormat = (v: unknown) => parseEnum(ContentFormat, v);
export const parseContentStatus = (v: unknown) => parseEnum(ContentStatus, v);

/** Parse a date from a request body, rejecting anything unparseable. */
export function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string" && !(value instanceof Date)) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
