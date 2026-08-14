/**
 * Screen-reader descriptions for canvas objects.
 *
 * A whiteboard is a spatial medium and there is no honest way to make dragging a
 * sticky note across a plane meaningful to a screen reader. The approach taken
 * instead: sighted users get a board, screen-reader users get a DOCUMENT — the
 * same objects, in reading order, as a real list with the same actions. That is
 * what `RoomOutline` renders, and this module supplies the labels for both it
 * and the canvas nodes themselves.
 *
 * Position is deliberately NOT announced. "Sticky note at 1,240 by 880" is noise:
 * world coordinates mean nothing to anyone, and reading them on every arrow key
 * makes navigation slower, not richer. Relationships that DO carry meaning — the
 * frame a node belongs to, whether it is published to the client — are announced.
 */

export type DescribableNode = {
  kind: string;
  text?: string | null;
  data?: Record<string, unknown> | null;
  visibility?: string;
  clientVisibleSince?: string | Date | null;
  createdByName?: string | null;
};

/** Fallback labels. Callers pass a translator to localise these. */
const KIND_LABEL: Record<string, string> = {
  STICKY: "Sticky note",
  TEXT: "Text",
  IMAGE: "Image",
  FILE: "File",
  DRAWING: "Drawing",
  SHAPE: "Shape",
  FRAME: "Frame",
  CAMPAIGN_ROUTE: "Campaign direction",
  SCRIPT: "Script",
  PALETTE: "Colour palette",
  POLL: "Poll",
  DECISION: "Decision",
  AI_CARD: "AI suggestion",
};

export function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? "Canvas item";
}

/** Trim a body to something that can be spoken without exhausting the listener. */
function summarise(text: string, max = 120): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trimEnd()}…`;
}

export type DescribeOptions = {
  /** Localised kind name, e.g. from t(`nodeKinds.${kind}`). */
  kindName?: string;
  /** 1-based position within the current list, for "3 of 40". */
  index?: number;
  total?: number;
  /** Title of the frame this node sits inside. */
  frameTitle?: string | null;
  /** Include the published-to-client state. Studio mode only. */
  includeVisibility?: boolean;
};

/**
 * The accessible name for one canvas object.
 *
 * Order is chosen for how it is heard, not how it reads: KIND first so a user
 * arrowing through a board hears what each thing is before its content, then the
 * content, then context they only need occasionally.
 */
export function describeNode(
  node: DescribableNode,
  options: DescribeOptions = {}
): string {
  const parts: string[] = [options.kindName ?? kindLabel(node.kind)];

  const body = nodeSpokenText(node);
  if (body) parts.push(summarise(body));

  if (options.frameTitle) parts.push(`in ${options.frameTitle}`);

  if (options.includeVisibility) {
    // Announced because it is the difference between an internal note and
    // something the client is looking at — the one property whose value a PMP
    // user genuinely needs confirmed before speaking.
    parts.push(
      node.clientVisibleSince ? "published to client" : "team only"
    );
  }

  if (node.createdByName) parts.push(`by ${node.createdByName}`);

  if (options.index !== undefined && options.total !== undefined) {
    parts.push(`${options.index} of ${options.total}`);
  }

  return parts.join(", ");
}

/**
 * The text a node "says".
 *
 * Falls back through the kind-specific payload so an image announces its alt
 * text or filename rather than nothing at all — an unlabelled image in a list of
 * forty is indistinguishable from every other unlabelled image.
 */
export function nodeSpokenText(node: DescribableNode): string {
  if (node.text && node.text.trim()) return node.text;

  const data = node.data ?? {};
  for (const key of ["title", "alt", "caption", "name", "question", "label"]) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  if (node.kind === "PALETTE" && Array.isArray(data.colors)) {
    return `${data.colors.length} colours`;
  }

  return "";
}
