import type { PlaygroundNodeKind } from "@prisma/client";
import { boundsOf, inflate, rectsIntersect, type Rect } from "@/lib/playground/camera";
import {
  STICKY_COLOR_HEX,
  type ComposeItem,
  type ComposePlan,
  type StickyColor,
} from "@/lib/playground/compose-plan";

/**
 * Turn a PAX plan into positioned canvas nodes — deterministically.
 *
 * The model decides WHAT goes on the board; this decides WHERE. Asked for
 * coordinates, a language model overlaps existing work and drifts off-screen;
 * a layout engine never does. The result is one frame holding everything, one
 * column per group, placed in the nearest empty space to where the person is
 * looking so it never lands on top of anyone's work.
 *
 * Pure: plan + obstacles + anchor in, node specs out. Creating the nodes is
 * the caller's job, through the ordinary op pipeline.
 */

type Point = { x: number; y: number };

export type NodeSpec = {
  /** Local, unique within one layout. */
  key: string;
  kind: PlaygroundNodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string | null;
  data: Record<string, unknown>;
  style: Record<string, unknown>;
};

/** A connector end: a node in this layout, or one already on the board. */
export type EdgeEnd = { key: string } | { nodeId: string };

export type ComposeLayout = {
  frame: NodeSpec;
  /** Everything inside the frame, in reading order. */
  children: NodeSpec[];
  edges: Array<{ from: EdgeEnd; to: EdgeEnd }>;
};

const FRAME_PAD = 40;
const COLUMN_GAP = 48;
const ROW_GAP = 20;
const HEADING_H = 48;
const MIN_COLUMN_W = 220;
/** Clearance kept around existing nodes when choosing a spot. */
const CLEARANCE = 60;
/** Search grid step, in world units. */
const SEARCH_STEP = 120;
const SEARCH_RINGS = 30;

/**
 * Colours cycled per column when the model did not pick one, so each group
 * is still visibly a group. Yellow first: it is what a sticky is by default.
 */
const COLUMN_COLORS: StickyColor[] = ["yellow", "blue", "green", "orange", "purple", "pink"];

/** Natural width of an item, before a column stretches text to fit. */
function naturalWidth(item: ComposeItem): number {
  switch (item.kind) {
    case "sticky":
      return 180;
    case "shape":
      return 200;
    case "text":
      return 260;
    case "campaign_route":
    case "palette":
      return 280;
    case "script":
      return 300;
  }
}

/**
 * Height a block of 15px text needs at a given width.
 *
 * An estimate — the real wrap depends on the font and the script — so it
 * errs tall: a TEXT node clips overflow, and a little empty space below the
 * words is far better than the end of a sentence cut off.
 */
export function estimateTextHeight(text: string, width: number): number {
  const fontSize = 15;
  const lineHeight = fontSize * 1.375;
  // ~0.55em per character is a fair average for Latin and Arabic at 15px.
  const charsPerLine = Math.max(8, Math.floor(width / (fontSize * 0.55)));
  const lines = text
    .split("\n")
    .reduce((sum, paragraph) => sum + Math.max(1, Math.ceil(paragraph.length / charsPerLine)), 0);
  return Math.min(480, Math.max(48, Math.ceil(lines * lineHeight) + 12));
}

function itemHeight(item: ComposeItem, width: number): number {
  switch (item.kind) {
    case "sticky":
      return 180;
    case "shape":
      return 110;
    case "text":
      return estimateTextHeight(item.text, width);
    case "campaign_route":
      return 220;
    case "palette":
      return 140;
    case "script":
      return 320;
  }
}

const KIND: Record<ComposeItem["kind"], PlaygroundNodeKind> = {
  sticky: "STICKY",
  text: "TEXT",
  shape: "SHAPE",
  campaign_route: "CAMPAIGN_ROUTE",
  script: "SCRIPT",
  palette: "PALETTE",
};

/** The data/style a node of each kind actually renders from. */
function payloadFor(
  item: ComposeItem,
  columnColor: StickyColor,
  provenance: Record<string, unknown>
): Pick<NodeSpec, "text" | "data" | "style"> {
  switch (item.kind) {
    case "sticky":
      return {
        text: item.text,
        data: { ...provenance },
        style: { background: STICKY_COLOR_HEX[item.color ?? columnColor] },
      };
    case "shape":
      return { text: item.text, data: { ...provenance }, style: { shape: "rect" } };
    case "text":
      return { text: item.text, data: { ...provenance }, style: {} };
    case "campaign_route":
    case "script":
      return {
        text: item.text,
        data: { ...provenance, ...(item.title ? { title: item.title } : {}) },
        style: {},
      };
    case "palette":
      // PaletteBody shows data.title (falling back to text) over the swatches.
      return {
        text: item.text || null,
        data: {
          ...provenance,
          colors: item.colors,
          title: item.title ?? (item.text || null),
        },
        style: {},
      };
  }
}

/**
 * The nearest free spot for a rectangle of `size`, as a top-left corner.
 *
 * Tries centred on the anchor first, then rings outward on a grid, nearest
 * first, keeping clear of every existing node. Falls back to the right of
 * everything on the board — always somewhere empty, never on top of work.
 */
export function findFreeSpot(
  size: { w: number; h: number },
  anchor: Point,
  obstacles: readonly Rect[]
): Point {
  const blocked = obstacles.map((rect) => inflate(rect, CLEARANCE));
  const fits = (x: number, y: number) => {
    const rect = { x, y, w: size.w, h: size.h };
    return !blocked.some((obstacle) => rectsIntersect(obstacle, rect));
  };

  const originX = anchor.x - size.w / 2;
  const originY = anchor.y - size.h / 2;
  if (fits(originX, originY)) return { x: originX, y: originY };

  for (let ring = 1; ring <= SEARCH_RINGS; ring++) {
    const cells: Array<[number, number]> = [];
    for (let i = -ring; i <= ring; i++) {
      cells.push([i, -ring], [i, ring]);
      if (i > -ring && i < ring) cells.push([-ring, i], [ring, i]);
    }
    // Nearest first within the ring, so the result stays close to the view.
    cells.sort(([ax, ay], [bx, by]) => ax * ax + ay * ay - (bx * bx + by * by));
    for (const [dx, dy] of cells) {
      const x = originX + dx * SEARCH_STEP;
      const y = originY + dy * SEARCH_STEP;
      if (fits(x, y)) return { x, y };
    }
  }

  const all = boundsOf(obstacles);
  return all
    ? { x: all.x + all.w + CLEARANCE * 2, y: originY }
    : { x: originX, y: originY };
}

/**
 * Lay a plan out: columns inside one frame, placed in free space near
 * `anchor`, avoiding `obstacles` (every node already on the board).
 *
 * `existingIds` is what the board holds right now — a connection to an
 * existing node that has since been deleted is dropped rather than drawn to
 * nothing.
 */
export function layoutPlan(
  plan: ComposePlan,
  options: {
    anchor: Point;
    obstacles: readonly Rect[];
    existingIds: ReadonlySet<string>;
    runId: string;
  }
): ComposeLayout {
  const provenance = { pax: { runId: options.runId } };

  // Pass 1: size every column, relative to the frame's top-left.
  type Placed = { spec: Omit<NodeSpec, "x" | "y">; dx: number; dy: number };
  const placed: Placed[] = [];
  let cursorX = FRAME_PAD;
  let tallest = 0;

  plan.groups.forEach((group, column) => {
    const width = Math.max(
      MIN_COLUMN_W,
      ...group.items.map((item) => (item.kind === "text" ? 0 : naturalWidth(item)))
    );
    const columnColor = COLUMN_COLORS[column % COLUMN_COLORS.length];
    let cursorY = FRAME_PAD;

    if (group.heading) {
      placed.push({
        spec: {
          key: `heading:${column}`,
          kind: "TEXT",
          w: width,
          h: HEADING_H,
          text: group.heading,
          data: { ...provenance },
          style: { fontSize: 20, bold: true },
        },
        dx: cursorX,
        dy: cursorY,
      });
      cursorY += HEADING_H + ROW_GAP;
    }

    for (const item of group.items) {
      const w = item.kind === "text" ? width : naturalWidth(item);
      const h = itemHeight(item, w);
      placed.push({
        spec: {
          key: `item:${item.ref}`,
          kind: KIND[item.kind],
          w,
          h,
          ...payloadFor(item, columnColor, provenance),
        },
        dx: cursorX,
        dy: cursorY,
      });
      cursorY += h + ROW_GAP;
    }

    tallest = Math.max(tallest, cursorY - ROW_GAP + FRAME_PAD);
    cursorX += width + COLUMN_GAP;
  });

  const frameW = cursorX - COLUMN_GAP + FRAME_PAD;
  const frameH = Math.max(tallest, FRAME_PAD * 2 + HEADING_H);

  // Pass 2: find a spot for the whole frame, then place everything in it.
  const origin = findFreeSpot({ w: frameW, h: frameH }, options.anchor, options.obstacles);

  const frame: NodeSpec = {
    key: "frame",
    kind: "FRAME",
    x: origin.x,
    y: origin.y,
    w: frameW,
    h: frameH,
    text: null,
    data: { ...provenance, title: plan.title },
    style: {},
  };

  const children: NodeSpec[] = placed.map(({ spec, dx, dy }) => ({
    ...spec,
    x: origin.x + dx,
    y: origin.y + dy,
  }));

  const keys = new Set(children.map((child) => child.key));
  const endFor = (end: ComposePlan["connections"][number]["from"]): EdgeEnd | null => {
    if ("item" in end) {
      const key = `item:${end.item}`;
      return keys.has(key) ? { key } : null;
    }
    return options.existingIds.has(end.existing) ? { nodeId: end.existing } : null;
  };

  const edges = plan.connections
    .map((connection) => ({ from: endFor(connection.from), to: endFor(connection.to) }))
    .filter(
      (edge): edge is { from: EdgeEnd; to: EdgeEnd } => edge.from !== null && edge.to !== null
    );

  return { frame, children, edges };
}
