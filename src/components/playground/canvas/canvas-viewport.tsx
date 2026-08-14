"use client";

import * as React from "react";
import {
  type Camera,
  IDENTITY,
  cameraTransform,
  inflate,
  rectContains,
  normalizeWheelDelta,
  rectsIntersect,
  screenToWorld,
  visibleWorldRect,
  wheelZoomFactor,
  zoomAt,
  LOD_THRESHOLD,
} from "@/lib/playground/camera";
import { simplifyStroke, strokeBounds, strokeToPath } from "@/lib/playground/geometry";
import { cn } from "@/lib/utils";
import { CanvasNode } from "./canvas-node";
import { NodeEditor, isEditable } from "./node-editor";
import { ConnectorLayer, type ConnectorLayerHandle } from "./connector-layer";
import { SelectionOverlay } from "./selection-overlay";
import {
  MIN_NODE_SIZE,
  type CanvasEdgeData,
  type CanvasNodeData,
  type DragState,
  type ResizeHandle,
  nodeRect,
  readingOrder,
} from "./types";
import type { CanvasNodesApi } from "./use-canvas-nodes";
import { useLatest } from "./use-latest";

/**
 * The infinite canvas.
 *
 * PERFORMANCE CONTRACT — the reason this file is shaped the way it is:
 *
 *   During a gesture (pan, zoom, drag, resize) NOTHING goes through React state.
 *   Every frame writes one `style.transform` on the world layer, or one per
 *   dragged node, straight to the DOM. React state is updated once per
 *   animation frame purely so culling and the minimap stay honest, and once at
 *   the end of the gesture to commit the result. A `setState` per `pointermove`
 *   is the difference between 60fps and 15fps at 500 nodes.
 *
 * TWO BROWSER TRAPS, both fixed here and both invisible in a naive
 * implementation:
 *
 *   1. React registers `wheel`, `touchstart` and `touchmove` as PASSIVE on its
 *      root container, so `e.preventDefault()` inside an `onWheel` JSX prop is a
 *      silent no-op (with a console warning) and ctrl+wheel zooms the browser
 *      page instead of the canvas. The wheel listener is therefore attached
 *      imperatively with `{ passive: false }`.
 *   2. Lenis (mounted app-wide) installs its own non-passive wheel listener on
 *      window and preventDefaults native scrolling. ScrollProvider does not
 *      instantiate it on /playground at all — see src/lib/constants.ts.
 *
 * RTL: the viewport root is pinned `dir="ltr"`. A spatial coordinate system must
 * not mirror, or two people in the same meeting see the same note in different
 * places. Node bodies carry `dir="auto"` so Arabic and Hebrew text still lays
 * out correctly inside its own box.
 *
 * rtl-exempt — this file is skipped by scripts/check-rtl.mjs. The world layer's
 * `left-0 top-0` origin and the screen-space overlays are PHYSICAL on purpose:
 * they anchor a coordinate space, not a reading order. Everything that is text
 * or chrome still uses logical properties.
 */

/** Nodes within this many screen pixels of the viewport stay mounted. */
const CULL_MARGIN_PX = 400;

export type CanvasViewportHandle = {
  /** Screen -> world for the current camera, for drops and paste. */
  toWorld: (screen: { x: number; y: number }) => { x: number; y: number };
  setCamera: (camera: Camera) => void;
  getCamera: () => Camera;
  focusNode: (id: string) => void;
};

export const CanvasViewport = React.forwardRef<
  CanvasViewportHandle,
  {
    api: CanvasNodesApi;
    edges?: CanvasEdgeData[];
    /** Active creative tool. Changes what a pointer-down on the board does. */
    tool?: "select" | "draw" | "connect";
    /** Called when a tool completes, so the toolbar can return to select. */
    onToolDone?: () => void;
    /** Files dropped onto the board, with the world position of the drop. */
    onDropFiles?: (files: File[], world: { x: number; y: number }) => void;
    /** Node currently being typed into, if any. */
    editingId?: string | null;
    onEditStart?: (nodeId: string) => void;
    onEditCommit?: (nodeId: string, text: string) => void;
    onEditCancel?: () => void;
    selection: ReadonlySet<string>;
    onSelectionChange: (next: Set<string>) => void;
    /** Client Mode and viewers get a read-only board. */
    readOnly?: boolean;
    onCameraChange?: (camera: Camera) => void;
    onAnnounce?: (message: string) => void;
    /** World-space pointer position, for broadcasting presence. */
    onCursor?: (world: { x: number; y: number }) => void;
    /** Other participants' live cursors, drawn over the board. */
    cursorLayer?: React.ReactNode;
    /** Called when a gesture commits, so the caller can push an undo entry. */
    onBeforeMove?: (ids: readonly string[]) => void;
    onBeforeResize?: (ids: readonly string[]) => void;
    className?: string;
  }
>(function CanvasViewport(
  {
    api,
    edges = [],
    tool = "select",
    onToolDone,
    onDropFiles,
    editingId = null,
    onEditStart,
    onEditCommit,
    onEditCancel,
    selection,
    onSelectionChange,
    readOnly = false,
    onCameraChange,
    onAnnounce,
    onCursor,
    cursorLayer,
    onBeforeMove,
    onBeforeResize,
    className,
  },
  ref
) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const worldRef = React.useRef<HTMLDivElement>(null);
  const marqueeRef = React.useRef<HTMLDivElement>(null);

  const cameraRef = React.useRef<Camera>(IDENTITY);
  const [camera, setCameraState] = React.useState<Camera>(IDENTITY);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  const dragRef = React.useRef<DragState>({ kind: "none" });
  const spaceRef = React.useRef(false);
  const [spacePanning, setSpacePanning] = React.useState(false);
  const flushRef = React.useRef<number | null>(null);
  /** Live pointers, keyed by pointerId — two of them means a pinch. */
  const pointersRef = React.useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = React.useRef<{ distance: number; midpoint: { x: number; y: number } } | null>(null);
  /** Node elements captured at gesture start, so a drag does no DOM queries. */
  const dragElementsRef = React.useRef<Map<string, HTMLElement>>(new Map());
  const connectorRef = React.useRef<ConnectorLayerHandle>(null);
  /** Live freehand stroke, in world coordinates. Never React state. */
  const strokeRef = React.useRef<Array<{ x: number; y: number }>>([]);
  const strokePathRef = React.useRef<SVGPathElement>(null);
  /** First node picked with the connect tool, awaiting a second. */
  const connectFromRef = React.useRef<string | null>(null);
  const toolRef = useLatest(tool);

  const nodesRef = useLatest(api.nodes);
  const selectionRef = useLatest(selection);

  // ---- camera plumbing -----------------------------------------------------

  const scheduleFlush = React.useCallback(() => {
    if (flushRef.current !== null) return;
    flushRef.current = requestAnimationFrame(() => {
      flushRef.current = null;
      setCameraState(cameraRef.current);
      onCameraChange?.(cameraRef.current);
    });
  }, [onCameraChange]);

  const applyCamera = React.useCallback(
    (next: Camera) => {
      cameraRef.current = next;
      if (worldRef.current) {
        worldRef.current.style.transform = cameraTransform(next);
      }
      scheduleFlush();
    },
    [scheduleFlush]
  );

  React.useEffect(
    () => () => {
      if (flushRef.current !== null) cancelAnimationFrame(flushRef.current);
    },
    []
  );

  // ---- viewport size -------------------------------------------------------

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // ---- wheel: imperative, non-passive --------------------------------------

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      // Safe to preventDefault because this listener is explicitly non-passive.
      event.preventDefault();

      const rect = element.getBoundingClientRect();
      const pointer = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      const dy = normalizeWheelDelta(event.deltaY, event.deltaMode);

      // ctrl/cmd+wheel is the universal zoom gesture, and is also what a
      // trackpad pinch reports on every browser.
      if (event.ctrlKey || event.metaKey) {
        applyCamera(zoomAt(cameraRef.current, pointer, wheelZoomFactor(dy)));
        return;
      }

      const dx = normalizeWheelDelta(event.deltaX, event.deltaMode);
      const current = cameraRef.current;
      applyCamera({ ...current, x: current.x - dx, y: current.y - dy });
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [applyCamera]);

  // ---- space to pan --------------------------------------------------------

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || spaceRef.current) return;
      const target = event.target as HTMLElement | null;
      // Space is "activate" on a focused control and a character in a field;
      // hijacking it there would break both.
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|BUTTON|SELECT)$/.test(target.tagName))) {
        return;
      }
      spaceRef.current = true;
      setSpacePanning(true);
      event.preventDefault();
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      spaceRef.current = false;
      setSpacePanning(false);
    };

    // Releasing space outside the window would otherwise leave pan mode stuck on.
    const onBlur = () => {
      spaceRef.current = false;
      setSpacePanning(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // ---- pointer helpers -----------------------------------------------------

  /**
   * Client coordinates -> viewport-local coordinates.
   *
   * Typed on the two fields it actually reads rather than on a specific React
   * event: pointer, mouse and drag events all carry them, and narrowing to
   * PointerEvent would force a cast at the drop handler for no benefit.
   */
  const localPoint = React.useCallback(
    (event: { clientX: number; clientY: number }) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    },
    []
  );

  const captureDragElements = React.useCallback((ids: Iterable<string>) => {
    const map = new Map<string, HTMLElement>();
    const world = worldRef.current;
    if (world) {
      for (const id of ids) {
        const element = world.querySelector<HTMLElement>(
          `[data-node-id="${CSS.escape(id)}"]`
        );
        if (element) map.set(id, element);
      }
    }
    dragElementsRef.current = map;
  }, []);

  // ---- pointer down --------------------------------------------------------

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;

      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      // Two fingers down: start a pinch and abandon whatever single-pointer
      // gesture had begun, so a pinch never drags a node with it.
      if (pointersRef.current.size === 2) {
        const [a, b] = [...pointersRef.current.values()];
        pinchRef.current = {
          distance: Math.hypot(a.x - b.x, a.y - b.y),
          midpoint: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        };
        dragRef.current = { kind: "none" };
        return;
      }
      if (pointersRef.current.size > 2) return;

      const point = localPoint(event);
      const world = screenToWorld(cameraRef.current, point);
      const additive = event.shiftKey || event.metaKey;

      // Middle button or space: pan, whatever is under the cursor.
      if (event.button === 1 || spaceRef.current) {
        container.setPointerCapture(event.pointerId);
        dragRef.current = {
          kind: "pan",
          startX: point.x,
          startY: point.y,
          camX: cameraRef.current.x,
          camY: cameraRef.current.y,
        };
        return;
      }

      if (event.button !== 0) return;

      const target = event.target as HTMLElement | null;
      const handle = target?.closest<HTMLElement>("[data-resize-handle]");
      const nodeElement = target?.closest<HTMLElement>("[data-node-id]");

      // Freehand: begin a stroke anywhere on the board, including over a node —
      // annotating on top of a reference is the point of the tool.
      if (toolRef.current === "draw" && !readOnly) {
        container.setPointerCapture(event.pointerId);
        strokeRef.current = [world];
        strokePathRef.current?.setAttribute("d", strokeToPath([world]));
        dragRef.current = {
          kind: "draw",
          pointerId: event.pointerId,
          startWorld: world,
        };
        return;
      }

      // Connect: first click picks the source, second completes the link.
      if (toolRef.current === "connect" && !readOnly) {
        if (!nodeElement) {
          // Clicking empty board abandons a half-made connector rather than
          // leaving it armed and surprising the next click.
          connectFromRef.current = null;
          onSelectionChange(new Set());
          return;
        }
        const id = nodeElement.dataset.nodeId!;
        if (!connectFromRef.current) {
          connectFromRef.current = id;
          onSelectionChange(new Set([id]));
          return;
        }
        if (connectFromRef.current !== id) {
          api.createEdge(connectFromRef.current, id);
        }
        connectFromRef.current = null;
        onSelectionChange(new Set());
        onToolDone?.();
        return;
      }

      if (handle && !readOnly) {
        const ids = [...selectionRef.current];
        if (ids.length === 0) return;
        container.setPointerCapture(event.pointerId);
        onBeforeResize?.(ids);
        captureDragElements(ids);
        dragRef.current = {
          kind: "resize",
          pointerId: event.pointerId,
          handle: handle.dataset.resizeHandle as ResizeHandle,
          startWorld: world,
          origin: new Map(
            ids
              .map((id) => [id, api.byId.get(id)] as const)
              .filter((entry): entry is [string, CanvasNodeData] => !!entry[1])
              .map(([id, node]) => [id, nodeRect(node)])
          ),
        };
        return;
      }

      if (nodeElement) {
        const id = nodeElement.dataset.nodeId!;
        // The editor owns its own pointer events; a drag started here would
        // fight text selection inside the textarea.
        if (id === editingId) return;
        let next: Set<string>;
        if (additive) {
          next = new Set(selectionRef.current);
          if (next.has(id)) next.delete(id);
          else next.add(id);
        } else if (selectionRef.current.has(id)) {
          // Keep a multi-selection intact so it can be dragged as a group.
          next = new Set(selectionRef.current);
        } else {
          next = new Set([id]);
        }
        onSelectionChange(next);

        if (readOnly) return;

        // A frame owns its contents: dragging one has to carry its children, or
        // the frame slides out from under the work it was grouping.
        const withChildren = new Set(next);
        for (const id of next) {
          const node = api.byId.get(id);
          if (node?.kind !== "FRAME") continue;
          for (const candidate of nodesRef.current) {
            if (candidate.frameId === id) withChildren.add(candidate.id);
          }
        }

        container.setPointerCapture(event.pointerId);
        onBeforeMove?.([...withChildren]);
        captureDragElements(withChildren);
        dragRef.current = {
          kind: "move",
          pointerId: event.pointerId,
          startWorld: world,
          origin: new Map(
            [...withChildren]
              .map((nodeId) => [nodeId, api.byId.get(nodeId)] as const)
              .filter((entry): entry is [string, CanvasNodeData] => !!entry[1])
              .map(([nodeId, node]) => [nodeId, { x: node.x, y: node.y }])
          ),
        };
        return;
      }

      // Empty canvas: marquee.
      if (!additive) onSelectionChange(new Set());
      container.setPointerCapture(event.pointerId);
      dragRef.current = {
        kind: "marquee",
        pointerId: event.pointerId,
        startWorld: world,
        additive,
      };
    },
    [
      api,
      captureDragElements,
      localPoint,
      onBeforeMove,
      onBeforeResize,
      nodesRef,
      onSelectionChange,
      onToolDone,
      readOnly,
      selectionRef,
      toolRef,
      editingId,
    ]
  );

  // ---- pointer move --------------------------------------------------------

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent) => {
      if (pointersRef.current.has(event.pointerId)) {
        pointersRef.current.set(event.pointerId, {
          x: event.clientX,
          y: event.clientY,
        });
      }

      // Pinch takes precedence over everything.
      const pinch = pinchRef.current;
      if (pinch && pointersRef.current.size === 2) {
        const [a, b] = [...pointersRef.current.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const midpoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (pinch.distance > 0) {
          const rect = containerRef.current?.getBoundingClientRect();
          const anchor = {
            x: midpoint.x - (rect?.left ?? 0),
            y: midpoint.y - (rect?.top ?? 0),
          };
          // Zoom about the midpoint, then translate by how far the midpoint
          // itself moved — that is what makes a two-finger gesture pan and zoom
          // together the way a physical sheet of paper does.
          const zoomed = zoomAt(cameraRef.current, anchor, distance / pinch.distance);
          applyCamera({
            ...zoomed,
            x: zoomed.x + (midpoint.x - pinch.midpoint.x),
            y: zoomed.y + (midpoint.y - pinch.midpoint.y),
          });
        }
        pinchRef.current = { distance, midpoint };
        return;
      }

      // Report the pointer even when no gesture is running — a participant who
      // is only watching still has a cursor worth showing.
      if (onCursor) {
        onCursor(screenToWorld(cameraRef.current, localPoint(event)));
      }

      const drag = dragRef.current;
      if (drag.kind === "none") return;

      const point = localPoint(event);

      if (drag.kind === "pan") {
        applyCamera({
          ...cameraRef.current,
          x: drag.camX + (point.x - drag.startX),
          y: drag.camY + (point.y - drag.startY),
        });
        return;
      }

      const world = screenToWorld(cameraRef.current, point);
      const dx = world.x - drag.startWorld.x;
      const dy = world.y - drag.startWorld.y;

      if (drag.kind === "move") {
        writeMoveTransforms(dragElementsRef.current, drag.origin, dx, dy);
        // Same frame, same gesture: a connector whose endpoint is moving has to
        // follow it here, or it detaches and hangs in space until the drag
        // commits.
        if (connectorRef.current) {
          const live = new Map<string, { x: number; y: number; w: number; h: number }>();
          for (const [id, from] of drag.origin) {
            const node = api.byId.get(id);
            if (!node) continue;
            live.set(id, { x: from.x + dx, y: from.y + dy, w: node.w, h: node.h });
          }
          connectorRef.current.reroute(live);
        }
        return;
      }

      if (drag.kind === "resize") {
        writeResizeRects(dragElementsRef.current, drag.origin, drag.handle, dx, dy);
        if (connectorRef.current) {
          const live = new Map<string, { x: number; y: number; w: number; h: number }>();
          for (const [id, from] of drag.origin) {
            live.set(id, applyResize(from, drag.handle, dx, dy));
          }
          connectorRef.current.reroute(live);
        }
        return;
      }

      if (drag.kind === "draw") {
        const points = strokeRef.current;
        const last = points[points.length - 1];
        // Drop sub-pixel samples: a slow pointer emits dozens per pixel and they
        // contribute nothing but payload.
        if (!last || Math.hypot(world.x - last.x, world.y - last.y) > 0.75) {
          points.push(world);
          strokePathRef.current?.setAttribute("d", strokeToPath(points));
        }
        return;
      }

      if (drag.kind === "marquee" && marqueeRef.current) {
        const rect = {
          x: Math.min(drag.startWorld.x, world.x),
          y: Math.min(drag.startWorld.y, world.y),
          w: Math.abs(dx),
          h: Math.abs(dy),
        };
        const style = marqueeRef.current.style;
        style.display = "block";
        style.left = `${rect.x}px`;
        style.top = `${rect.y}px`;
        style.width = `${rect.w}px`;
        style.height = `${rect.h}px`;
      }
    },
    [api.byId, applyCamera, localPoint, onCursor]
  );

  // ---- pointer up ----------------------------------------------------------

  const endGesture = React.useCallback(
    (event: React.PointerEvent) => {
      pointersRef.current.delete(event.pointerId);
      if (pointersRef.current.size < 2) pinchRef.current = null;

      const drag = dragRef.current;
      dragRef.current = { kind: "none" };

      if (containerRef.current?.hasPointerCapture(event.pointerId)) {
        containerRef.current.releasePointerCapture(event.pointerId);
      }

      if (drag.kind === "none" || drag.kind === "pan") return;

      const point = localPoint(event);
      const world = screenToWorld(cameraRef.current, point);
      const dx = world.x - drag.startWorld.x;
      const dy = world.y - drag.startWorld.y;

      if (drag.kind === "move") {
        // Clear the imperative transforms before committing, or the node jumps
        // by the drag distance twice for one frame.
        clearTransforms(dragElementsRef.current);
        dragElementsRef.current.clear();

        if (dx !== 0 || dy !== 0) {
          const moving = new Set(drag.origin.keys());
          const next = new Map<
            string,
            { x: number; y: number; frameId?: string | null }
          >();

          for (const [id, origin] of drag.origin) {
            const node = api.byId.get(id);
            const position = { x: origin.x + dx, y: origin.y + dy };

            // Reparent by where the node's CENTRE landed. Using a corner would
            // let a card be adopted by a frame it merely overlaps by a pixel.
            // Frames themselves are never reparented — nested frames are a
            // structure someone builds deliberately, not a drag side effect.
            if (node && node.kind !== "FRAME") {
              const centre = {
                x: position.x + node.w / 2,
                y: position.y + node.h / 2,
              };
              const frameId = frameAt(centre, nodesRef.current, moving);
              if (frameId !== (node.frameId ?? null)) {
                next.set(id, { ...position, frameId });
                continue;
              }
            }
            next.set(id, position);
          }
          api.moveNodes(next);
        }
        return;
      }

      if (drag.kind === "resize") {
        dragElementsRef.current.clear();
        const next = new Map<string, { x: number; y: number; w: number; h: number }>();
        for (const [id, origin] of drag.origin) {
          next.set(id, applyResize(origin, drag.handle, dx, dy));
        }
        api.resizeNodes(next);
        return;
      }

      if (drag.kind === "draw") {
        const raw = strokeRef.current;
        strokeRef.current = [];
        strokePathRef.current?.setAttribute("d", "");

        // A tap with no movement is not a stroke.
        if (raw.length < 2) {
          onToolDone?.();
          return;
        }

        const simplified = simplifyStroke(raw, 1.2);
        const bounds = strokeBounds(simplified, 3);

        // Points are stored RELATIVE to the node's own box, so moving the
        // drawing later is an ordinary node move and the path never changes.
        const node = api.createNode({
          kind: "DRAWING",
          x: bounds.x,
          y: bounds.y,
          w: Math.max(1, bounds.w),
          h: Math.max(1, bounds.h),
          data: {
            points: simplified.map((point) => ({
              x: Math.round((point.x - bounds.x) * 100) / 100,
              y: Math.round((point.y - bounds.y) * 100) / 100,
            })),
          },
          style: { stroke: "#E20C0C", strokeWidth: 3 },
        });
        onSelectionChange(new Set([node.id]));
        onToolDone?.();
        return;
      }

      if (drag.kind === "marquee") {
        if (marqueeRef.current) marqueeRef.current.style.display = "none";

        const rect = {
          x: Math.min(drag.startWorld.x, world.x),
          y: Math.min(drag.startWorld.y, world.y),
          w: Math.abs(dx),
          h: Math.abs(dy),
        };
        // A stray click produces a 0x0 marquee; treat it as a deselect, not as
        // a selection of everything that happens to touch a point.
        if (rect.w < 2 && rect.h < 2) return;

        const hit = nodesRef.current
          .filter((node) => rectsIntersect(rect, nodeRect(node)))
          .map((node) => node.id);

        const next = drag.additive ? new Set(selectionRef.current) : new Set<string>();
        for (const id of hit) next.add(id);
        onSelectionChange(next);
        onAnnounce?.(`${next.size} selected`);
      }
    },
    [api, localPoint, nodesRef, onAnnounce, onSelectionChange, onToolDone, selectionRef]
  );

  // ---- imperative handle ---------------------------------------------------

  React.useImperativeHandle(
    ref,
    () => ({
      toWorld: (screen) => screenToWorld(cameraRef.current, screen),
      setCamera: applyCamera,
      getCamera: () => cameraRef.current,
      focusNode: (id) => {
        const node = nodesRef.current.find((n) => n.id === id);
        if (!node || size.width === 0) return;
        const z = cameraRef.current.z;
        applyCamera({
          z,
          x: size.width / 2 - (node.x + node.w / 2) * z,
          y: size.height / 2 - (node.y + node.h / 2) * z,
        });
      },
    }),
    [applyCamera, nodesRef, size.height, size.width]
  );

  // ---- culling -------------------------------------------------------------

  const visible = React.useMemo(() => {
    if (size.width === 0) return api.nodes;
    const worldRect = visibleWorldRect(camera, size);
    // Margin is in SCREEN pixels, so it must be converted to world units —
    // otherwise the buffer shrinks to nothing exactly when zoomed out, which is
    // when the most nodes are near the edge.
    const padded = inflate(worldRect, CULL_MARGIN_PX / camera.z);
    return api.nodes.filter((node) => rectsIntersect(padded, nodeRect(node)));
  }, [api.nodes, camera, size]);

  const lod = camera.z < LOD_THRESHOLD;

  // Roving tabindex: exactly one node is tabbable, and arrow keys move between
  // them. Forty nodes each in the tab order would make the board untraversable.
  const ordered = React.useMemo(
    () => [...api.nodes].sort(readingOrder),
    [api.nodes]
  );
  const [focusedId, setFocusedId] = React.useState<string | null>(null);
  const activeId = focusedId ?? ordered[0]?.id ?? null;

  const onNodePointerDown = React.useCallback(
    (_event: React.PointerEvent, node: CanvasNodeData) => setFocusedId(node.id),
    []
  );

  return (
    <div
      ref={containerRef}
      // A spatial coordinate system must never mirror.
      dir="ltr"
      role="application"
      aria-roledescription="Infinite canvas"
      aria-label="Playground canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
      onDoubleClick={(event) => {
        if (readOnly || !onEditStart) return;
        const target = event.target as HTMLElement | null;
        const element = target?.closest<HTMLElement>("[data-node-id]");
        if (!element) return;
        const node = api.byId.get(element.dataset.nodeId!);
        // Only kinds whose body is plain text. Double-clicking an image should
        // do nothing rather than open an editor over a photograph.
        if (node && isEditable(node)) onEditStart(node.id);
      }}
      onDragOver={(event) => {
        if (!onDropFiles || readOnly) return;
        // Without preventDefault the browser navigates to the dropped file,
        // discarding the board.
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        if (!onDropFiles || readOnly) return;
        event.preventDefault();
        const files = [...event.dataTransfer.files];
        if (files.length === 0) return;
        // Placed where the pointer released, not at the origin: dropping a
        // reference onto a specific frame should leave it there.
        onDropFiles(files, screenToWorld(cameraRef.current, localPoint(event)));
      }}
      className={cn(
        "relative h-full w-full overflow-hidden bg-black",
        spacePanning
          ? "cursor-grab"
          : tool === "draw"
            ? "cursor-crosshair"
            : tool === "connect"
              ? "cursor-cell"
              : "cursor-default",
        className
      )}
      style={{
        // The browser must not claim the gesture before we see it.
        touchAction: "none",
        overscrollBehavior: "contain",
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
        backgroundSize: `${24 * camera.z}px ${24 * camera.z}px`,
        backgroundPosition: `${camera.x}px ${camera.y}px`,
      }}
    >
      <div
        ref={worldRef}
        className="absolute left-0 top-0 h-0 w-0"
        style={{
          transform: cameraTransform(camera),
          transformOrigin: "0 0",
          // Promote to its own layer so panning is a compositor operation.
          willChange: "transform",
        }}
      >
        <ConnectorLayer ref={connectorRef} edges={edges} nodes={api.byId} />

        {visible.map((node) => (
          <CanvasNode
            key={node.id}
            node={node}
            selected={selection.has(node.id)}
            lod={lod}
            tabIndex={node.id === activeId ? 0 : -1}
            onPointerDown={onNodePointerDown}
            onFocus={setFocusedId}
          />
        ))}

        {editingId &&
          (() => {
            const node = api.byId.get(editingId);
            if (!node || !onEditCommit || !onEditCancel) return null;
            return (
              <NodeEditor
                node={node}
                onCommit={(text) => onEditCommit(node.id, text)}
                onCancel={onEditCancel}
              />
            );
          })()}

        <div
          ref={marqueeRef}
          aria-hidden="true"
          className="pointer-events-none absolute hidden border border-red-500/70 bg-red-500/10"
        />

        {/* The in-progress stroke. Drawn in world space so it sits exactly where
            the committed DRAWING node will land, with no jump on release. */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute overflow-visible"
          style={{ left: 0, top: 0, width: 1, height: 1, zIndex: 999 }}
        >
          <path
            ref={strokePathRef}
            fill="none"
            stroke="#E20C0C"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {!readOnly && (
        <SelectionOverlay
          camera={camera}
          nodes={api.nodes}
          selection={selection}
        />
      )}

      {cursorLayer}
    </div>
  );
});

/**
 * The frame a point falls inside, if any.
 *
 * Topmost wins, and frames being dragged are excluded — otherwise dragging a
 * frame would parent it to itself the moment its own centre passed over its own
 * body, which detaches it from the board permanently.
 */
function frameAt(
  point: { x: number; y: number },
  nodes: readonly CanvasNodeData[],
  exclude: ReadonlySet<string>
): string | null {
  let best: CanvasNodeData | null = null;
  for (const node of nodes) {
    if (node.kind !== "FRAME" || exclude.has(node.id)) continue;
    if (!rectContains(nodeRect(node), point)) continue;
    if (!best || node.z > best.z) best = node;
  }
  return best?.id ?? null;
}

/**
 * The imperative half of a gesture.
 *
 * These live at module scope, outside the component, for two reasons. They are
 * pure DOM side-effects with no React involvement — which is the entire point of
 * the performance contract at the top of this file — and keeping them out of the
 * component body stops the React Compiler from trying to reason about mutating
 * elements it has inferred as frozen.
 */
function writeMoveTransforms(
  elements: ReadonlyMap<string, HTMLElement>,
  origin: ReadonlyMap<string, unknown>,
  dx: number,
  dy: number
): void {
  const transform = `translate(${dx}px, ${dy}px)`;
  elements.forEach((element, id) => {
    if (origin.has(id)) element.style.transform = transform;
  });
}

function writeResizeRects(
  elements: ReadonlyMap<string, HTMLElement>,
  origin: ReadonlyMap<string, { x: number; y: number; w: number; h: number }>,
  handle: ResizeHandle,
  dx: number,
  dy: number
): void {
  elements.forEach((element, id) => {
    const from = origin.get(id);
    if (!from) return;
    const next = applyResize(from, handle, dx, dy);
    element.style.left = `${next.x}px`;
    element.style.top = `${next.y}px`;
    element.style.width = `${next.w}px`;
    element.style.height = `${next.h}px`;
  });
}

function clearTransforms(elements: ReadonlyMap<string, HTMLElement>): void {
  elements.forEach((element) => {
    element.style.transform = "";
  });
}

/**
 * Resize one rect by a handle and a world-space delta.
 *
 * Clamped to MIN_NODE_SIZE so dragging past the opposite edge parks the node at
 * its minimum instead of inverting it — an inverted rect renders as nothing and
 * becomes impossible to grab again.
 */
function applyResize(
  origin: { x: number; y: number; w: number; h: number },
  handle: ResizeHandle,
  dx: number,
  dy: number
): { x: number; y: number; w: number; h: number } {
  let { x, y, w, h } = origin;

  if (handle.includes("w")) {
    const width = Math.max(MIN_NODE_SIZE, origin.w - dx);
    x = origin.x + (origin.w - width);
    w = width;
  }
  if (handle.includes("e")) {
    w = Math.max(MIN_NODE_SIZE, origin.w + dx);
  }
  if (handle.includes("n")) {
    const height = Math.max(MIN_NODE_SIZE, origin.h - dy);
    y = origin.y + (origin.h - height);
    h = height;
  }
  if (handle.includes("s")) {
    h = Math.max(MIN_NODE_SIZE, origin.h + dy);
  }

  return { x, y, w, h };
}
