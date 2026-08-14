"use client";

import * as React from "react";
import { arrowHeadPath, routeConnector } from "@/lib/playground/geometry";
import type { CanvasEdgeData, CanvasNodeData } from "./types";
import { nodeRect } from "./types";

/**
 * Connectors between nodes.
 *
 * Rendered in WORLD space, inside the transformed layer and BENEATH the nodes,
 * so an arrow passes behind the cards it joins rather than over their text.
 *
 * THE HARD PART IS DRAGGING. A connector's geometry is derived from both
 * endpoints, so while a node is being dragged — a gesture that deliberately
 * never touches React — the arrow attached to it must be re-routed on the same
 * frames. Left to React it would only update when the drag COMMITTED, and the
 * arrow would visibly detach and hang in space for the whole gesture.
 *
 * So this component exposes an imperative `reroute` through a ref: the viewport
 * calls it from the same rAF that writes node transforms, passing the live
 * positions of whatever is moving. Nothing here re-renders during a drag.
 */

export type ConnectorLayerHandle = {
  /**
   * Re-route every connector touching a node in `overrides`.
   * Positions are the node's LIVE rect during a gesture.
   */
  reroute: (overrides: Map<string, { x: number; y: number; w: number; h: number }>) => void;
};

export const ConnectorLayer = React.forwardRef<
  ConnectorLayerHandle,
  {
    edges: CanvasEdgeData[];
    nodes: Map<string, CanvasNodeData>;
  }
>(function ConnectorLayer({ edges, nodes }, ref) {
  const pathRefs = React.useRef(new Map<string, SVGPathElement>());
  const headRefs = React.useRef(new Map<string, SVGPathElement>());

  const nodesRef = React.useRef(nodes);
  const edgesRef = React.useRef(edges);
  React.useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  });

  React.useImperativeHandle(
    ref,
    () => ({
      reroute: (overrides) => {
        for (const edge of edgesRef.current) {
          // Only touch connectors whose geometry actually changed.
          if (!overrides.has(edge.fromNodeId) && !overrides.has(edge.toNodeId)) {
            continue;
          }

          const from =
            overrides.get(edge.fromNodeId) ??
            rectOf(nodesRef.current, edge.fromNodeId);
          const to =
            overrides.get(edge.toNodeId) ?? rectOf(nodesRef.current, edge.toNodeId);
          if (!from || !to) continue;

          const route = routeConnector(from, to);
          pathRefs.current.get(edge.id)?.setAttribute("d", route.path);
          headRefs.current
            .get(edge.id)
            ?.setAttribute("d", arrowHeadPath(route.end, route.endAngle));
        }
      },
    }),
    []
  );

  const routes = React.useMemo(
    () =>
      edges
        .map((edge) => {
          const from = rectOf(nodes, edge.fromNodeId);
          const to = rectOf(nodes, edge.toNodeId);
          // An edge whose endpoint is culled or deleted is skipped rather than
          // drawn to the origin, which would look like an arrow to nowhere.
          if (!from || !to) return null;
          return { edge, route: routeConnector(from, to) };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [edges, nodes]
  );

  if (routes.length === 0) return null;

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute overflow-visible"
      style={{ left: 0, top: 0, width: 1, height: 1, zIndex: 0 }}
    >
      {routes.map(({ edge, route }) => {
        const colour =
          typeof edge.style?.stroke === "string" ? edge.style.stroke : "#E20C0C";
        return (
          <g key={edge.id}>
            <path
              ref={(element) => {
                if (element) pathRefs.current.set(edge.id, element);
                else pathRefs.current.delete(edge.id);
              }}
              d={route.path}
              fill="none"
              stroke={colour}
              strokeWidth={2}
              strokeLinecap="round"
              // Constant weight at every zoom, like a drawn line rather than a
              // scaled vector.
              vectorEffect="non-scaling-stroke"
            />
            <path
              ref={(element) => {
                if (element) headRefs.current.set(edge.id, element);
                else headRefs.current.delete(edge.id);
              }}
              d={arrowHeadPath(route.end, route.endAngle)}
              fill={colour}
            />
          </g>
        );
      })}
    </svg>
  );
});

function rectOf(nodes: Map<string, CanvasNodeData>, id: string) {
  const node = nodes.get(id);
  return node ? nodeRect(node) : null;
}
