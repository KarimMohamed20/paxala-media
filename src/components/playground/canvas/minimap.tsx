"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { type Camera, boundsOf, inflate, visibleWorldRect } from "@/lib/playground/camera";
import type { CanvasNodeData } from "./types";
import { nodeRect } from "./types";

const WIDTH = 160;
const HEIGHT = 110;

/**
 * Board overview with click-to-jump.
 *
 * `aria-hidden`, and deliberately so: it is a redundant spatial view of content
 * that is already reachable through the room outline and the canvas itself, and
 * announcing 500 unlabelled rectangles would be actively hostile. Keyboard users
 * navigate with the outline; this exists for the mouse.
 */
export function Minimap({
  camera,
  nodes,
  viewportSize,
  onJump,
}: {
  camera: Camera;
  nodes: CanvasNodeData[];
  viewportSize: { width: number; height: number };
  /** Centre the camera on this world point. */
  onJump: (world: { x: number; y: number }) => void;
}) {
  const t = useTranslations("playground");

  const world = React.useMemo(() => {
    const content = boundsOf(nodes.map(nodeRect));
    const view = visibleWorldRect(camera, viewportSize);
    // Always include the viewport, so the indicator stays on the map even when
    // the user has panned far away from every node.
    const merged = boundsOf(content ? [content, view] : [view]);
    return merged ? inflate(merged, 200) : null;
  }, [camera, nodes, viewportSize]);

  if (!world || world.w <= 0 || world.h <= 0) return null;

  const scale = Math.min(WIDTH / world.w, HEIGHT / world.h);
  const toMap = (x: number, y: number) => ({
    x: (x - world.x) * scale,
    y: (y - world.y) * scale,
  });

  const view = visibleWorldRect(camera, viewportSize);
  const viewTopLeft = toMap(view.x, view.y);

  const jump = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    onJump({
      x: world.x + (event.clientX - rect.left) / scale,
      y: world.y + (event.clientY - rect.top) / scale,
    });
  };

  return (
    <div
      aria-hidden="true"
      onClick={jump}
      title={t("canvas.minimap")}
      className="pointer-events-auto relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-neutral-900/90 shadow-xl shadow-black/50 backdrop-blur-sm"
      style={{ width: WIDTH, height: HEIGHT }}
    >
      {nodes.map((node) => {
        const point = toMap(node.x, node.y);
        return (
          <span
            key={node.id}
            className="absolute rounded-[1px] bg-white/35"
            style={{
              left: point.x,
              top: point.y,
              // Sub-pixel rectangles vanish entirely; a 2px floor keeps every
              // node visible on the map however far out the board extends.
              width: Math.max(2, node.w * scale),
              height: Math.max(2, node.h * scale),
            }}
          />
        );
      })}

      <span
        className="absolute border border-red-500 bg-red-500/10"
        style={{
          left: viewTopLeft.x,
          top: viewTopLeft.y,
          width: view.w * scale,
          height: view.h * scale,
        }}
      />
    </div>
  );
}
