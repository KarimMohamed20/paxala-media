"use client";

import * as React from "react";
import { type Camera, boundsOf, worldToScreen } from "@/lib/playground/camera";
import type { CanvasNodeData, ResizeHandle } from "./types";
import { nodeRect } from "./types";

/**
 * Resize handles for the current selection.
 *
 * Rendered in SCREEN space, outside the transformed world layer, so the handles
 * stay a constant 10px however far the board is zoomed. Handles that scale with
 * the canvas become unclickable when zoomed out and absurd when zoomed in —
 * every serious canvas tool draws its chrome in screen space for this reason.
 *
 * Only shown for a single-node selection. Group resize needs a decision about
 * whether children scale proportionally or reflow, and guessing wrong silently
 * distorts a moodboard someone spent an hour arranging.
 */

const HANDLES: ReadonlyArray<{ id: ResizeHandle; cursor: string }> = [
  { id: "nw", cursor: "nwse-resize" },
  { id: "n", cursor: "ns-resize" },
  { id: "ne", cursor: "nesw-resize" },
  { id: "e", cursor: "ew-resize" },
  { id: "se", cursor: "nwse-resize" },
  { id: "s", cursor: "ns-resize" },
  { id: "sw", cursor: "nesw-resize" },
  { id: "w", cursor: "ew-resize" },
];

const SIZE = 10;

export function SelectionOverlay({
  camera,
  nodes,
  selection,
}: {
  camera: Camera;
  nodes: CanvasNodeData[];
  selection: ReadonlySet<string>;
}) {
  const selected = React.useMemo(
    () => nodes.filter((node) => selection.has(node.id)),
    [nodes, selection]
  );

  if (selected.length === 0) return null;

  const bounds = boundsOf(selected.map(nodeRect));
  if (!bounds) return null;

  const topLeft = worldToScreen(camera, { x: bounds.x, y: bounds.y });
  const width = bounds.w * camera.z;
  const height = bounds.h * camera.z;

  const single = selected.length === 1;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ left: topLeft.x, top: topLeft.y, width, height }}
    >
      {/* A multi-selection still gets a bounding box, so it is obvious what a
          drag is about to move — it just gets no resize handles. */}
      {!single && (
        <div className="absolute inset-0 border border-dashed border-red-500/60" />
      )}

      {single &&
        HANDLES.map((handle) => {
          const isWest = handle.id.includes("w");
          const isEast = handle.id.includes("e");
          const isNorth = handle.id.includes("n");
          const isSouth = handle.id.includes("s");

          const left = isWest ? 0 : isEast ? width : width / 2;
          const top = isNorth ? 0 : isSouth ? height : height / 2;

          return (
            <div
              key={handle.id}
              data-resize-handle={handle.id}
              className="pointer-events-auto absolute rounded-[2px] border border-black/60 bg-red-500"
              style={{
                width: SIZE,
                height: SIZE,
                left: left - SIZE / 2,
                top: top - SIZE / 2,
                cursor: handle.cursor,
              }}
            />
          );
        })}
    </div>
  );
}
