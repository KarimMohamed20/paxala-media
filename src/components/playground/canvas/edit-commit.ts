import type { CanvasNodeData } from "./types";

/**
 * What committing an inline edit should DO, decided in one pure place.
 *
 * Extracted from room-shell's commitEdit so the rules are testable and so
 * kind-specific routing has a home: most kinds edit `text`, but FRAME and
 * PALETTE display `data.title` (their `text` is shadowed the moment a template
 * or the inspector sets a title), so their commits must write `data`.
 *
 * Deletion policy: only a TEXT block that never had words evaporates on an
 * empty commit — with no fill or border it would be an invisible node someone
 * has to marquee-hunt for. An empty STICKY is a visible coloured card and
 * SURVIVES; deleting those threw away freshly placed notes whenever a blur
 * landed before typing did.
 */

export type EditCommitPlan =
  | { action: "none" }
  | { action: "delete" }
  | { action: "text"; text: string | null }
  | { action: "data"; data: Record<string, unknown> };

/**
 * Kinds whose edit writes `data.title` rather than `text`.
 *
 * Neither is in EDITABLE_KINDS today — frames rename through the inspector
 * (double-click inside a frame is far too common a gesture to open a
 * frame-sized editor). The branch exists so that IF inline editing is ever
 * enabled for them, the commit cannot silently write the shadowed `text`.
 */
const TITLE_KINDS = new Set(["FRAME", "PALETTE"]);

export function planEditCommit(
  node: Pick<CanvasNodeData, "kind" | "text" | "data">,
  raw: string
): EditCommitPlan {
  const trimmed = raw.trim();

  if (node.kind === "TEXT" && !trimmed && !node.text) {
    return { action: "delete" };
  }

  if (TITLE_KINDS.has(node.kind)) {
    const current =
      typeof node.data.title === "string" ? node.data.title : (node.text ?? "");
    if (trimmed === current) return { action: "none" };
    // Merge, never replace: a palette's colours live beside its title.
    return { action: "data", data: { ...node.data, title: trimmed || null } };
  }

  if (trimmed === (node.text ?? "")) return { action: "none" };
  return { action: "text", text: trimmed || null };
}
