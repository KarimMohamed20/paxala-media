"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Maximize2, Minus, Plus } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import {
  type Camera,
  IDENTITY,
  MAX_ZOOM,
  MIN_ZOOM,
  boundsOf,
  fitToBounds,
  zoomTo,
} from "@/lib/playground/camera";
import { describeNode } from "@/lib/playground/a11y";
import type { Participant } from "@/lib/playground/bus";
import { CanvasViewport, type CanvasViewportHandle } from "./canvas-viewport";
import { PresenceCursors } from "./presence-cursors";
import { Minimap } from "./minimap";
import { nodeRect, readingOrder } from "./types";
import { useUndoStack, type CanvasNodesApi, type UndoEntry } from "./use-canvas-nodes";
import { useLatest } from "./use-latest";

/**
 * The canvas, assembled: viewport, zoom controls, minimap, keyboard access and
 * the live announcer.
 *
 * Keyboard shortcuts here are all UNMODIFIED keys, chosen so nothing collides
 * with a browser default. `0` fits the board and `1` returns to 100% — Ctrl+0
 * and Ctrl+1 belong to the browser's own zoom and tab switching, and taking
 * them would break the page for anyone who relies on them.
 */
export function CanvasBoard({
  api,
  selection,
  onSelectionChange,
  readOnly = false,
  showVisibility,
  participants = [],
  selfConnectionId = null,
  onCursor,
  onViewport,
  tool = "select",
  onToolDone,
  onDropFiles,
  editingId = null,
  onRegisterCreateCapture,
  onEditStart,
  onEditCommit,
  onEditCancel,
}: {
  api: CanvasNodesApi;
  selection: ReadonlySet<string>;
  onSelectionChange: (next: Set<string>) => void;
  readOnly?: boolean;
  showVisibility: boolean;
  participants?: Participant[];
  selfConnectionId?: string | null;
  onCursor?: (world: { x: number; y: number }) => void;
  onViewport?: (viewport: { x: number; y: number; z: number }) => void;
  tool?: "select" | "draw" | "connect";
  onToolDone?: () => void;
  onDropFiles?: (files: File[], world: { x: number; y: number }) => void;
  editingId?: string | null;
  /** Hands the undo-capture callback up to whoever creates nodes. */
  onRegisterCreateCapture?: (capture: (ids: readonly string[]) => void) => void;
  onEditStart?: (nodeId: string) => void;
  onEditCommit?: (nodeId: string, text: string) => void;
  onEditCancel?: () => void;
}) {
  const t = useTranslations("playground");
  const viewportRef = React.useRef<CanvasViewportHandle>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [camera, setCamera] = React.useState<Camera>(IDENTITY);
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  const [announcement, setAnnouncement] = React.useState("");

  const undo = useUndoStack();

  const selectionRef = useLatest(selection);
  const nodesRef = useLatest(api.nodes);
  const editingIdRef = useLatest(editingId);

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /**
   * Announcements are coalesced through a single state value with a short
   * delay. Firing an aria-live update on every arrow press produces a queue the
   * screen reader reads long after the user has moved on; one message per
   * settled action is what is actually useful.
   */
  const announceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const announce = React.useCallback((message: string) => {
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnouncement(message), 120);
  }, []);
  React.useEffect(
    () => () => {
      if (announceTimer.current) clearTimeout(announceTimer.current);
    },
    []
  );

  // ---- zoom controls -------------------------------------------------------

  const centre = React.useCallback(
    () => ({ x: size.width / 2, y: size.height / 2 }),
    [size.height, size.width]
  );

  const zoomBy = React.useCallback(
    (factor: number) => {
      const handle = viewportRef.current;
      if (!handle) return;
      const current = handle.getCamera();
      handle.setCamera(zoomTo(current, centre(), current.z * factor));
    },
    [centre]
  );

  const fitAll = React.useCallback(() => {
    const handle = viewportRef.current;
    if (!handle || size.width === 0) return;
    const bounds = boundsOf(nodesRef.current.map(nodeRect));
    handle.setCamera(fitToBounds(bounds, size));
    announce(t("canvas.fitAnnounce", { count: nodesRef.current.length }));
  }, [announce, nodesRef, size, t]);

  const resetZoom = React.useCallback(() => {
    const handle = viewportRef.current;
    if (!handle) return;
    handle.setCamera(zoomTo(handle.getCamera(), centre(), 1));
  }, [centre]);

  // ---- undo / redo ---------------------------------------------------------

  const applyUndo = React.useCallback(
    (entry: UndoEntry, direction: "undo" | "redo") => {
      switch (entry.kind) {
        case "create":
          if (direction === "undo") api.deleteNodes(entry.nodeIds);
          break;
        case "delete":
          if (direction === "undo") api.restoreNodes(entry.nodes);
          else api.deleteNodes(entry.nodes.map((n) => n.id));
          break;
        case "move":
          api.moveNodes(entry.before);
          break;
        case "resize":
          api.resizeNodes(entry.before);
          break;
      }
    },
    [api]
  );

  // ---- keyboard ------------------------------------------------------------

  const moveFocus = React.useCallback(
    (delta: number) => {
      const ordered = [...nodesRef.current].sort(readingOrder);
      if (ordered.length === 0) return;

      const current = [...selectionRef.current][0];
      const index = ordered.findIndex((n) => n.id === current);
      const next = ordered[
        Math.max(0, Math.min(ordered.length - 1, (index < 0 ? 0 : index) + delta))
      ];
      if (!next) return;

      onSelectionChange(new Set([next.id]));
      viewportRef.current?.focusNode(next.id);
      announce(
        describeNode(next, {
          index: ordered.indexOf(next) + 1,
          total: ordered.length,
          includeVisibility: showVisibility,
        })
      );
    },
    [announce, nodesRef, onSelectionChange, selectionRef, showVisibility]
  );

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Typing into a node owns the keyboard entirely.
      if (editingIdRef.current) return;

      const target = event.target as HTMLElement | null;
      // Never steal a key from a field or a focused control.
      if (
        target &&
        (target.isContentEditable ||
          /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
      ) {
        return;
      }
      // Leave every browser and OS shortcut alone.
      if (event.ctrlKey || event.metaKey || event.altKey) {
        // ...except undo/redo, which users expect inside an editor.
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
          event.preventDefault();
          const entry = event.shiftKey ? undo.popRedo() : undo.popUndo();
          if (entry) applyUndo(entry, event.shiftKey ? "redo" : "undo");
        }
        return;
      }

      switch (event.key) {
        case "0":
          event.preventDefault();
          fitAll();
          break;
        case "1":
          event.preventDefault();
          resetZoom();
          break;
        case "Escape":
          if (selectionRef.current.size > 0) {
            event.preventDefault();
            onSelectionChange(new Set());
            announce(t("canvas.selectionCleared"));
          }
          break;
        case "Delete":
        case "Backspace": {
          if (readOnly || selectionRef.current.size === 0) return;
          event.preventDefault();
          const ids = [...selectionRef.current];
          const doomed = nodesRef.current.filter((n) => ids.includes(n.id));
          undo.push({ kind: "delete", nodes: doomed });
          api.deleteNodes(ids);
          onSelectionChange(new Set());
          announce(t("canvas.deleted", { count: ids.length }));
          break;
        }
        case "Tab":
          // Shift the roving focus rather than leaving the canvas entirely,
          // which is what Tab would otherwise do from a single tabbable node.
          if (nodesRef.current.length > 0) {
            event.preventDefault();
            moveFocus(event.shiftKey ? -1 : 1);
          }
          break;
        case "ArrowDown":
        case "ArrowRight":
          event.preventDefault();
          moveFocus(1);
          break;
        case "ArrowUp":
        case "ArrowLeft":
          event.preventDefault();
          moveFocus(-1);
          break;
      }
    };

    const element = containerRef.current;
    element?.addEventListener("keydown", onKeyDown);
    return () => element?.removeEventListener("keydown", onKeyDown);
  }, [
    announce,
    api,
    applyUndo,
    fitAll,
    moveFocus,
    nodesRef,
    onSelectionChange,
    editingIdRef,
    readOnly,
    resetZoom,
    selectionRef,
    t,
    undo,
  ]);

  // ---- undo capture from the viewport --------------------------------------

  /**
   * Record a creation so Ctrl+Z removes it.
   *
   * Without this the most common thing anyone wants to undo — "I did not mean
   * to add that" — did nothing at all, which reads as undo being broken rather
   * than as one gap in it.
   */
  const captureCreate = React.useCallback(
    (nodeIds: readonly string[]) => {
      if (nodeIds.length > 0) undo.push({ kind: "create", nodeIds: [...nodeIds] });
    },
    [undo]
  );

  const captureMove = React.useCallback(
    (ids: readonly string[]) => {
      const before = new Map<string, { x: number; y: number }>();
      for (const id of ids) {
        const node = api.byId.get(id);
        if (node) before.set(id, { x: node.x, y: node.y });
      }
      undo.push({ kind: "move", before });
    },
    [api.byId, undo]
  );

  const captureResize = React.useCallback(
    (ids: readonly string[]) => {
      const before = new Map<string, { x: number; y: number; w: number; h: number }>();
      for (const id of ids) {
        const node = api.byId.get(id);
        if (node) before.set(id, nodeRect(node));
      }
      undo.push({ kind: "resize", before });
    },
    [api.byId, undo]
  );

  // Exposed so the shell can record creations it triggers from the toolbar.
  React.useEffect(() => {
    onRegisterCreateCapture?.(captureCreate);
  }, [captureCreate, onRegisterCreateCapture]);

  const zoomPercent = Math.round(camera.z * 100);

  return (
    <div ref={containerRef} tabIndex={-1} className="relative h-full w-full outline-none">
      <CanvasViewport
        ref={viewportRef}
        api={api}
        edges={api.edges}
        tool={tool}
        onToolDone={onToolDone}
        onDropFiles={onDropFiles}
        editingId={editingId}
        onEditStart={onEditStart}
        onEditCommit={onEditCommit}
        onEditCancel={onEditCancel}
        selection={selection}
        onSelectionChange={onSelectionChange}
        readOnly={readOnly}
        onCameraChange={(next) => {
          setCamera(next);
          onViewport?.(next);
        }}
        onAnnounce={announce}
        onCursor={onCursor}
        cursorLayer={
          <PresenceCursors
            participants={participants}
            camera={camera}
            selfConnectionId={selfConnectionId}
          />
        }
        onBeforeMove={captureMove}
        onBeforeResize={captureResize}
      />

      {/* Zoom controls, inline-start bottom, matching the reference. */}
      <div className="pointer-events-none absolute bottom-4 start-4 flex flex-col items-start gap-3">
        <Minimap
          camera={camera}
          nodes={api.nodes}
          viewportSize={size}
          onJump={(world) => {
            const handle = viewportRef.current;
            if (!handle) return;
            const z = handle.getCamera().z;
            handle.setCamera({
              z,
              x: size.width / 2 - world.x * z,
              y: size.height / 2 - world.y * z,
            });
          }}
        />

        <div className="pointer-events-auto flex items-center gap-1 rounded-xl border border-white/10 bg-neutral-900/90 p-1 shadow-xl shadow-black/50 backdrop-blur-sm">
          <Tooltip label={t("canvas.zoomOut")} shortcut="−" side="top">
            <button
              type="button"
              aria-label={t("canvas.zoomOut")}
              disabled={camera.z <= MIN_ZOOM}
              onClick={() => zoomBy(1 / 1.25)}
              className="grid h-7 w-7 place-items-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              <Minus size={14} aria-hidden="true" />
            </button>
          </Tooltip>

          <button
            type="button"
            onClick={resetZoom}
            aria-label={t("canvas.resetZoom")}
            // dir="ltr": a percentage is not bidirectional text.
            dir="ltr"
            className="min-w-[3.25rem] rounded-lg px-1 py-1 font-mono text-[11px] tabular-nums text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            {zoomPercent}%
          </button>

          <Tooltip label={t("canvas.zoomIn")} shortcut="+" side="top">
            <button
              type="button"
              aria-label={t("canvas.zoomIn")}
              disabled={camera.z >= MAX_ZOOM}
              onClick={() => zoomBy(1.25)}
              className="grid h-7 w-7 place-items-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30"
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          </Tooltip>

          <Tooltip label={t("canvas.fit")} shortcut="0" side="top">
            <button
              type="button"
              aria-label={t("canvas.fit")}
              onClick={fitAll}
              className="grid h-7 w-7 place-items-center rounded-lg text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Maximize2 size={13} aria-hidden="true" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Polite, never assertive: canvas activity narrates, it does not interrupt. */}
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
