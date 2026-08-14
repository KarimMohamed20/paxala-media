import type { NodeVisibility, PlaygroundNodeKind } from "@prisma/client";
import type { Rect } from "@/lib/playground/camera";

/**
 * Canvas node as the client holds it.
 *
 * Dates are ISO strings, not Date objects — these cross an HTTP boundary.
 */
export type CanvasNodeData = {
  id: string;
  kind: PlaygroundNodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  rotation: number;
  frameId: string | null;
  text: string | null;
  data: Record<string, unknown>;
  style: Record<string, unknown>;
  /** Absent in Client Mode — the projection does not include it. */
  visibility?: NodeVisibility;
  clientVisibleSince: string | null;
  createdByName: string | null;
  /**
   * Optimistic-concurrency counter for discrete writes. Absent in Client Mode
   * (a client never writes) and on a node created locally before its first
   * server acknowledgement.
   */
  version?: number;
  /** Set while another participant holds the text lock on this node. */
  editLockById?: string | null;
  editLockAt?: string | null;
};

/** The parts of a node that describe where it is. */
export function nodeRect(node: CanvasNodeData): Rect {
  return { x: node.x, y: node.y, w: node.w, h: node.h };
}

/**
 * Reading order for keyboard navigation and the screen-reader outline.
 *
 * Top-to-bottom then start-to-end, with a 40px row tolerance so notes that were
 * dropped roughly in a line are traversed as a line rather than zig-zagging by a
 * few pixels of vertical jitter.
 */
export function readingOrder(a: CanvasNodeData, b: CanvasNodeData): number {
  const ROW_TOLERANCE = 40;
  if (Math.abs(a.y - b.y) > ROW_TOLERANCE) return a.y - b.y;
  if (a.x !== b.x) return a.x - b.x;
  return a.id.localeCompare(b.id);
}

/** A connector between two nodes. */
export type CanvasEdgeData = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  kind: string;
  style?: Record<string, unknown>;
};

export type DragState =
  | { kind: "none" }
  | { kind: "pan"; startX: number; startY: number; camX: number; camY: number }
  | {
      kind: "move";
      pointerId: number;
      startWorld: { x: number; y: number };
      /** Node id -> its position when the drag began. */
      origin: Map<string, { x: number; y: number }>;
    }
  | {
      kind: "resize";
      pointerId: number;
      handle: ResizeHandle;
      startWorld: { x: number; y: number };
      origin: Map<string, Rect>;
    }
  | {
      kind: "draw";
      pointerId: number;
      startWorld: { x: number; y: number };
    }
  | {
      kind: "marquee";
      pointerId: number;
      startWorld: { x: number; y: number };
      additive: boolean;
    };

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

/** Minimum node size in world units, so a node can never be resized to nothing. */
export const MIN_NODE_SIZE = 40;
