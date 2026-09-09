"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { type Camera, worldToScreen } from "@/lib/playground/camera";
import { routeConnector } from "@/lib/playground/geometry";
import { nodeRect, type CanvasEdgeData, type CanvasNodeData } from "./types";

/**
 * Disconnect buttons for connectors touching the current selection.
 *
 * Screen space, like SelectionOverlay, so the button is a constant 22px at any
 * zoom. Shown on SELECTION rather than hover because the connector paths are
 * deliberately pointer-events-none (they must never block a marquee or a drag
 * across the board) and hover does not exist on touch. Selecting either end of
 * a connector is how you address it.
 *
 * The badge sits at the curve's true midpoint (routeConnector's t=0.5), which
 * reads as "this button belongs to this line" even when several connectors
 * fan out of one node.
 */

/** A selection touching more edges than this gets the first N badges only —
 * hub nodes on dense boards would otherwise disappear under buttons. */
const MAX_BADGES = 50;

export function EdgeActions({
  camera,
  edges,
  nodes,
  selection,
  onDisconnect,
}: {
  camera: Camera;
  edges: readonly CanvasEdgeData[];
  nodes: ReadonlyMap<string, CanvasNodeData>;
  selection: ReadonlySet<string>;
  onDisconnect: (edgeId: string) => void;
}) {
  const t = useTranslations("playground");

  const actionable = React.useMemo(() => {
    if (selection.size === 0) return [];
    const out: Array<{ id: string; mid: { x: number; y: number } }> = [];
    for (const edge of edges) {
      if (!selection.has(edge.fromNodeId) && !selection.has(edge.toNodeId)) {
        continue;
      }
      const from = nodes.get(edge.fromNodeId);
      const to = nodes.get(edge.toNodeId);
      // An edge whose endpoint is mid-delete simply gets no badge.
      if (!from || !to) continue;
      out.push({
        id: edge.id,
        mid: routeConnector(nodeRect(from), nodeRect(to)).mid,
      });
      if (out.length >= MAX_BADGES) break;
    }
    return out;
  }, [edges, nodes, selection]);

  if (actionable.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      {actionable.map((edge) => {
        const screen = worldToScreen(camera, edge.mid);
        return (
          <button
            key={edge.id}
            type="button"
            // The canvas must never see this press — it would start a marquee
            // underneath the click.
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => onDisconnect(edge.id)}
            aria-label={t("canvas.disconnect")}
            title={t("canvas.disconnect")}
            // Physical -translate centering is intentional: these are screen
            // coordinates on an LTR-pinned canvas, and centering on a point is
            // direction-neutral anyway.
            className="pointer-events-auto absolute grid h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-red-600 text-white shadow-lg shadow-black/50 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            style={{ left: screen.x, top: screen.y }}
          >
            <X size={12} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
