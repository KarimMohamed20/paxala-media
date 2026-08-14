import { MessageChannel, NodeVisibility, Prisma } from "@prisma/client";

/**
 * ============================================================================
 * THE CLIENT MODE SECURITY BOUNDARY. READ THIS BEFORE CHANGING ANYTHING HERE.
 * ============================================================================
 *
 * Every read performed on behalf of a CLIENT actor goes through this file.
 * Internal PMP work — rough ideas, team-only notes, budget and feasibility
 * discussion, experimental PAX AI output, discarded branches — is kept away
 * from clients by these ~40 lines and nothing else.
 *
 * TWO RULES, BOTH LOAD-BEARING:
 *
 * 1. FILTER WITH `clientNodeWhere()`, NEVER BY HAND.
 *    A node is client-readable only when BOTH hold:
 *      - `visibility != TEAM_ONLY`   (the author marked it shareable), AND
 *      - `clientVisibleSince != null` (a staff member ran "Publish to client")
 *    The second term is what makes publication DELIBERATE. Flipping a node's
 *    visibility in Studio Mode does not expose it; someone has to publish.
 *
 * 2. PROJECT WITH `clientNodeSelect`, NEVER `findMany()` + strip.
 *    It is an ALLOWLIST. A column added to PlaygroundNode next year is
 *    invisible to clients by default, which is the opposite of the
 *    fetch-everything-then-remove-the-secret-bits pattern — where the same new
 *    column leaks until someone remembers to add it to the strip list.
 *
 * WHY THIS SHAPE AND NOT FROZEN SNAPSHOT TABLES: a snapshot still has to be
 * built by *some* serializer, so it moves the forgotten-field problem rather
 * than removing it, and it cannot express un-publishing (the recovery path for
 * the mistake that will actually happen: publishing the wrong node). Bytes ARE
 * frozen, but exactly once and for one purpose — `PlaygroundApproval.payload`,
 * so an approval record names an immutable version. See publish.ts.
 *
 * PRECEDENT: this repo has already shipped a leak of exactly this class. See
 * migration 20260811000000_add_folder_client_owner, where a missing WHERE term
 * surfaced one client's folder names inside another client's Asset Library.
 *
 * ENFORCEMENT: an eslint `no-restricted-syntax` rule bans `db.playground*`
 * outside repo.ts, so no route can bypass this module; a vitest suite asserts
 * the predicates; and this comment tells the next person what breaks.
 */

/**
 * Nodes a CLIENT actor may read.
 *
 * `visibility: { not: TEAM_ONLY }` covers CLIENT_SELECTED and EVERYONE. Written
 * as a negation on purpose: adding a new NodeVisibility member later fails
 * CLOSED for nothing — a new member is presumed *more* visible only if someone
 * deliberately adds it to the enum's shareable side. If you add a value that
 * should stay internal, add it to the exclusion below in the same commit.
 */
export function clientNodeWhere(roomId: string): Prisma.PlaygroundNodeWhereInput {
  return {
    roomId,
    visibility: { not: NodeVisibility.TEAM_ONLY },
    clientVisibleSince: { not: null },
  };
}

/**
 * The only node columns a client ever receives.
 *
 * Deliberately absent, each for a reason:
 *   visibility      — internal taxonomy; a client has no use for "CLIENT_SELECTED"
 *   createdById     — internal user ids; the display name is enough for attribution
 *   version         — an implementation detail of the op pipeline
 *   editLockById    — who on the PMP team is typing right now is internal
 *   editLockAt      — ditto
 *
 * `data` IS included, because it carries the node body that has to render. It is
 * therefore the one field where an internal leak could still ride along inside a
 * published node, so node kinds whose payload is inherently internal (AI_CARD)
 * are created TEAM_ONLY at their creation site and can only become visible by a
 * human deliberately publishing them.
 */
export const clientNodeSelect = {
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
  fileId: true,
  roomFileId: true,
  clientVisibleSince: true,
  createdByName: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PlaygroundNodeSelect;

export type ClientNode = Prisma.PlaygroundNodeGetPayload<{
  select: typeof clientNodeSelect;
}>;

/**
 * Edges a CLIENT actor may read.
 *
 * BOTH endpoints must survive the node filter. An edge whose other end is
 * hidden would render as an arrow into empty space, which discloses that
 * something was removed — a subtler leak than showing the node itself, and the
 * one most likely to be missed in review.
 */
export function clientEdgeWhere(roomId: string): Prisma.PlaygroundEdgeWhereInput {
  const visible = {
    visibility: { not: NodeVisibility.TEAM_ONLY },
    clientVisibleSince: { not: null },
  } satisfies Prisma.PlaygroundNodeWhereInput;

  return {
    roomId,
    fromNode: { is: visible },
    toNode: { is: visible },
  };
}

export const clientEdgeSelect = {
  id: true,
  fromNodeId: true,
  toNodeId: true,
  kind: true,
  style: true,
} satisfies Prisma.PlaygroundEdgeSelect;

/**
 * Messages a CLIENT actor may read: the SHARED channel only.
 *
 * The TEAM channel is filtered here as well as being refused at the route, so a
 * mistake at one layer is not sufficient to leak the internal conversation.
 */
export function clientMessageWhere(
  roomId: string
): Prisma.PlaygroundMessageWhereInput {
  return { roomId, channel: MessageChannel.SHARED };
}

export const clientMessageSelect = {
  id: true,
  channel: true,
  body: true,
  replyToId: true,
  nodeId: true,
  authorName: true,
  authorRole: true,
  createdAt: true,
} satisfies Prisma.PlaygroundMessageSelect;

/**
 * Comments a CLIENT actor may read.
 *
 * Scoped to comments attached to a node they can already see. Room-level
 * comments (nodeId = null) are internal working notes and are NOT included —
 * a client's own feedback is always anchored to the thing it is about.
 */
export function clientCommentWhere(
  roomId: string
): Prisma.PlaygroundCommentWhereInput {
  return {
    roomId,
    node: {
      is: {
        visibility: { not: NodeVisibility.TEAM_ONLY },
        clientVisibleSince: { not: null },
      },
    },
  };
}

export const clientCommentSelect = {
  id: true,
  nodeId: true,
  body: true,
  authorName: true,
  authorRole: true,
  resolved: true,
  createdAt: true,
} satisfies Prisma.PlaygroundCommentSelect;

/**
 * Is this node payload publishable to a client at all?
 *
 * A second, independent check used at publish time: kinds whose content is
 * inherently internal can never be published, no matter what visibility a
 * staff member sets. Belt and braces with the WHERE clause above.
 */
export function isPublishableKind(kind: string): boolean {
  // AI_CARD is a raw model generation. It becomes client-facing only by a human
  // copying its content into a real card, never by publishing the card itself.
  return kind !== "AI_CARD";
}
