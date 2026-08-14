import { createHash } from "crypto";

/**
 * Freezing what a client approved.
 *
 * Client Mode reads LIVE nodes through `clientNodeWhere()`, so PMP can correct a
 * typo without republishing. But an approval has to name an EXACT version — "the
 * client approved this" is worthless if the thing they approved has since been
 * edited. So bytes are frozen exactly once, at submit-for-approval, and that
 * frozen copy is what the approval record refers to forever after.
 *
 * This is the same shape the platform already uses: `Invoice.items`, `subtotal`
 * and `total` are frozen at the moment of commitment while the client carries on
 * browsing live `Milestone` rows.
 *
 * TWO RULES THAT ARE EASY TO GET WRONG, and are the reason this is its own file:
 *
 *  1. THE SERIALIZER ENUMERATES ITS COLUMNS. It never takes a node object and
 *     strips fields off it. A column added to PlaygroundNode next year is
 *     therefore absent from the payload by default, rather than silently
 *     included until somebody remembers to add it to a deny-list.
 *
 *  2. STRUCTURE IS PRUNED, NOT PATCHED. An edge whose other endpoint was not
 *     published becomes an arrow into empty space; a frame missing two of its
 *     five cards shows visible gaps. Both DISCLOSE that something was removed,
 *     which is a subtler leak than showing the content itself. So an edge needs
 *     both endpoints, and a frame needs every one of its children.
 */

export type PublishableNode = {
  id: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  rotation: number;
  frameId: string | null;
  text: string | null;
  data: unknown;
  style: unknown;
  clientVisibleSince: Date | string | null;
  createdByName: string | null;
};

export type PublishableEdge = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  kind: string;
  style: unknown;
};

/** One frozen node inside an approval payload. */
export type FrozenNode = {
  id: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  rotation: number;
  frameId: string | null;
  text: string | null;
  data: unknown;
  style: unknown;
  createdByName: string | null;
};

export type ApprovalPayload = {
  /** Payload format version, so a future reader knows how to interpret it. */
  version: 1;
  nodes: FrozenNode[];
  edges: PublishableEdge[];
  /** Ids the caller asked for that were pruned, and why. Staff-facing only. */
  excluded: Array<{ id: string; reason: "not-published" | "incomplete-frame" | "dangling-edge" }>;
};

/**
 * Serialize ONE node. Every field is named explicitly.
 *
 * Deliberately absent, and each for a reason:
 *   visibility          internal taxonomy
 *   clientVisibleSince  a publication timestamp is not part of the content
 *   version             op-pipeline internal
 *   editLockById/At     who was typing is internal
 *   createdById         internal user id; the display name is the attribution
 *   roomId              implied by the approval
 */
function freezeNode(node: PublishableNode): FrozenNode {
  return {
    id: node.id,
    kind: node.kind,
    x: node.x,
    y: node.y,
    w: node.w,
    h: node.h,
    z: node.z,
    rotation: node.rotation,
    frameId: node.frameId,
    text: node.text,
    data: node.data ?? {},
    style: node.style ?? {},
    createdByName: node.createdByName,
  };
}

/** Is this node published to the client right now? */
function isPublished(node: PublishableNode): boolean {
  return node.clientVisibleSince !== null && node.clientVisibleSince !== undefined;
}

/**
 * Build the frozen payload for an approval request.
 *
 * @param requestedIds ids the staff member selected. Anything not published, or
 *   pruned by the structural rules below, is reported in `excluded` so the UI
 *   can say what will not be sent BEFORE the request goes out.
 * @param allNodes every node in the room — needed to detect a frame whose
 *   children were not published, which cannot be seen from the selection alone.
 */
export function buildApprovalPayload(
  requestedIds: readonly string[],
  allNodes: readonly PublishableNode[],
  allEdges: readonly PublishableEdge[]
): ApprovalPayload {
  const byId = new Map(allNodes.map((node) => [node.id, node]));
  const excluded: ApprovalPayload["excluded"] = [];

  // ---- 1. only published nodes -------------------------------------------
  const included = new Set<string>();
  for (const id of new Set(requestedIds)) {
    const node = byId.get(id);
    if (!node) continue;
    if (!isPublished(node)) {
      excluded.push({ id, reason: "not-published" });
      continue;
    }
    included.add(id);
  }

  // ---- 2. frames need every child ----------------------------------------
  //
  // Children are gathered from ALL nodes, not from the selection: a frame with
  // an unpublished child would otherwise pass, and the client would see a gap
  // where that card sits. Iterated to a fixed point because dropping a frame can
  // orphan a nested frame that was only complete because of it.
  let pruned = true;
  while (pruned) {
    pruned = false;
    for (const id of [...included]) {
      const node = byId.get(id);
      if (!node || node.kind !== "FRAME") continue;

      const children = allNodes.filter((candidate) => candidate.frameId === id);
      const missing = children.some((child) => !included.has(child.id));
      if (missing) {
        included.delete(id);
        excluded.push({ id, reason: "incomplete-frame" });
        pruned = true;
      }
    }

    // A child whose frame was dropped goes with it: showing a card that was
    // laid out inside a container, without the container, is not the
    // composition anyone approved.
    for (const id of [...included]) {
      const node = byId.get(id);
      if (!node?.frameId) continue;
      if (!included.has(node.frameId) && byId.has(node.frameId)) {
        included.delete(id);
        excluded.push({ id, reason: "incomplete-frame" });
        pruned = true;
      }
    }
  }

  // ---- 3. edges need both endpoints --------------------------------------
  const edges: PublishableEdge[] = [];
  for (const edge of allEdges) {
    const both = included.has(edge.fromNodeId) && included.has(edge.toNodeId);
    if (both) {
      edges.push({
        id: edge.id,
        fromNodeId: edge.fromNodeId,
        toNodeId: edge.toNodeId,
        kind: edge.kind,
        style: edge.style ?? {},
      });
    } else if (included.has(edge.fromNodeId) || included.has(edge.toNodeId)) {
      // Half-included: reported so a reviewer knows a relationship was dropped.
      excluded.push({ id: edge.id, reason: "dangling-edge" });
    }
  }

  const nodes = allNodes
    .filter((node) => included.has(node.id))
    // Sorted by z then id: the payload must be byte-identical for identical
    // content, or the hash changes when the database returns a different row
    // order and two identical approvals stop looking identical.
    .sort((a, b) => a.z - b.z || a.id.localeCompare(b.id))
    .map(freezeNode);

  edges.sort((a, b) => a.id.localeCompare(b.id));

  return { version: 1, nodes, edges, excluded };
}

/**
 * Canonical JSON: object keys sorted at every depth.
 *
 * `JSON.stringify` preserves insertion order, so two payloads with identical
 * content but differently-ordered keys hash differently — which would make the
 * hash useless as an identity for "the same thing was approved".
 */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([key, v]) => `${JSON.stringify(key)}:${canonicalize(v)}`)
    .join(",")}}`;
}

/**
 * SHA-256 over the canonical payload.
 *
 * This is what lets an approval record prove which version was approved: the
 * same content always produces the same hash, and any edit produces a different
 * one. `excluded` is omitted from the hash — it is diagnostic metadata about the
 * build, not part of the approved content.
 */
export function contentHashOf(payload: ApprovalPayload): string {
  const { nodes, edges, version } = payload;
  return createHash("sha256")
    .update(canonicalize({ version, nodes, edges }))
    .digest("hex");
}
