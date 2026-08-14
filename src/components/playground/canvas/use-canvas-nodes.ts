"use client";

import * as React from "react";
import type { PlaygroundNodeKind } from "@prisma/client";
import { Outbox, newOpId, type OpResult, type OutboxStatus } from "./outbox";
import type { CanvasEdgeData, CanvasNodeData } from "./types";

/**
 * Canvas node state, backed by the op pipeline.
 *
 * Local state is applied OPTIMISTICALLY and the corresponding op is queued in
 * the outbox. The user never waits for the network: a dragged note lands where
 * it was dropped immediately, and the write happens behind it.
 *
 * Reconciliation is deliberately narrow. The server's per-op verdicts are used
 * to correct exactly two things — a rejected discrete write (STALE or
 * EDIT_LOCKED) and the authoritative `version` after an accepted one. Geometry
 * is never reconciled because geometry is never rejected; re-applying a server
 * position mid-drag would visibly fight the person dragging.
 *
 * Deliberately NOT a context: the canvas is one subtree and prop-drilling a few
 * callbacks is cheaper to read than a provider, and cheaper to render than a
 * context whose value changes on every frame of a drag.
 */

export type CanvasNodesApi = {
  nodes: CanvasNodeData[];
  byId: Map<string, CanvasNodeData>;
  edges: CanvasEdgeData[];
  createEdge: (fromNodeId: string, toNodeId: string) => CanvasEdgeData | null;
  deleteEdges: (ids: readonly string[]) => void;
  createNode: (input: {
    kind: PlaygroundNodeKind;
    x: number;
    y: number;
    w?: number;
    h?: number;
    text?: string | null;
    data?: Record<string, unknown>;
    style?: Record<string, unknown>;
  }) => CanvasNodeData;
  moveNodes: (
    deltas: Map<string, { x: number; y: number; frameId?: string | null }>
  ) => void;
  resizeNodes: (
    rects: Map<string, { x: number; y: number; w: number; h: number }>
  ) => void;
  updateNode: (id: string, patch: Partial<CanvasNodeData>) => void;
  deleteNodes: (ids: readonly string[]) => void;
  /** Reinstate deleted nodes — powers undo of a delete. */
  restoreNodes: (nodes: readonly CanvasNodeData[]) => void;
  replaceAll: (
    nodes: readonly CanvasNodeData[],
    edges?: readonly CanvasEdgeData[]
  ) => void;
};

const DEFAULT_SIZE: Partial<Record<PlaygroundNodeKind, { w: number; h: number }>> = {
  STICKY: { w: 180, h: 180 },
  TEXT: { w: 260, h: 80 },
  IMAGE: { w: 320, h: 220 },
  FRAME: { w: 640, h: 420 },
  SHAPE: { w: 160, h: 120 },
};

export function useCanvasNodes(
  options: {
    /** Room to persist to. Omit for a purely local board. */
    roomId?: string;
    readOnly?: boolean;
    onStatus?: (status: OutboxStatus, queued: number) => void;
    /** Surfaced so the UI can say "Sara is editing" instead of swallowing a 409. */
    onRejected?: (result: OpResult) => void;
  } = {}
): CanvasNodesApi {
  const [nodes, setNodes] = React.useState<CanvasNodeData[]>([]);
  const [edges, setEdges] = React.useState<CanvasEdgeData[]>([]);

  // Highest z seen, so a new node always lands on top without scanning the
  // whole array on every create.
  const topZ = React.useRef(0);
  /** Per-node version, tracked so discrete ops can carry a baseVersion. */
  const versions = React.useRef(new Map<string, number>());

  const { roomId, readOnly, onStatus, onRejected } = options;
  const onStatusRef = React.useRef(onStatus);
  const onRejectedRef = React.useRef(onRejected);
  React.useEffect(() => {
    onStatusRef.current = onStatus;
    onRejectedRef.current = onRejected;
  });

  const outboxRef = React.useRef<Outbox | null>(null);

  React.useEffect(() => {
    if (!roomId || readOnly) return;

    const outbox = new Outbox(roomId, {
      onStatus: (status, queued) => onStatusRef.current?.(status, queued),
      onResults: (results) => {
        for (const result of results) {
          if (result.ok) {
            if (result.version !== undefined) {
              // Adopt the server's version so the NEXT discrete op on this node
              // carries a baseVersion the guard will accept.
              const id = pendingNodeByOp.current.get(result.clientOpId);
              if (id) versions.current.set(id, result.version);
            }
          } else if (result.code === "STALE" || result.code === "EDIT_LOCKED") {
            if (result.version !== undefined) {
              const id = pendingNodeByOp.current.get(result.clientOpId);
              if (id) versions.current.set(id, result.version);
            }
            onRejectedRef.current?.(result);
          }
          pendingNodeByOp.current.delete(result.clientOpId);
        }
      },
    });

    outboxRef.current = outbox;
    return () => {
      // Best-effort final flush, then tear down. Anything unsent is already in
      // localStorage and replays on the next mount.
      void outbox.flushNow().finally(() => outbox.dispose());
      outboxRef.current = null;
    };
  }, [roomId, readOnly]);

  /** clientOpId -> nodeId, so a result can be attributed back to a node. */
  const pendingNodeByOp = React.useRef(new Map<string, string>());

  const emit = React.useCallback(
    (type: string, nodeId: string, payload: Record<string, unknown>) => {
      const outbox = outboxRef.current;
      if (!outbox) return;
      const clientOpId = newOpId();
      pendingNodeByOp.current.set(clientOpId, nodeId);
      outbox.push({ clientOpId, type, nodeId, ...payload });
    },
    []
  );

  const byId = React.useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes]
  );

  const createNode = React.useCallback<CanvasNodesApi["createNode"]>((input) => {
    const size = DEFAULT_SIZE[input.kind] ?? { w: 240, h: 160 };
    topZ.current += 1;

    const node: CanvasNodeData = {
      // Client-minted, matching PlaygroundNode.id: an edge drawn before the
      // first round trip can already reference this node, and a retried create
      // collides on the primary key rather than duplicating the node.
      id: crypto.randomUUID(),
      kind: input.kind,
      x: input.x,
      y: input.y,
      w: input.w ?? size.w,
      h: input.h ?? size.h,
      z: topZ.current,
      rotation: 0,
      frameId: null,
      text: input.text ?? null,
      data: input.data ?? {},
      style: input.style ?? {},
      visibility: "TEAM_ONLY",
      clientVisibleSince: null,
      createdByName: null,
    };

    setNodes((prev) => [...prev, node]);
    emit("NODE_CREATE", node.id, {
      kind: node.kind,
      x: node.x,
      y: node.y,
      w: node.w,
      h: node.h,
      z: node.z,
      text: node.text,
      data: node.data,
      style: node.style,
    });
    versions.current.set(node.id, 0);
    return node;
  }, [emit]);

  const moveNodes = React.useCallback<CanvasNodesApi["moveNodes"]>(
    (deltas) => {
      if (deltas.size === 0) return;
      setNodes((prev) =>
        prev.map((node) => {
          const next = deltas.get(node.id);
          if (!next) return node;
          return {
            ...node,
            x: next.x,
            y: next.y,
            ...(next.frameId !== undefined ? { frameId: next.frameId } : {}),
          };
        })
      );
      // No baseVersion: geometry is unguarded and can never be rejected.
      deltas.forEach((position, id) => emit("NODE_MOVE", id, position));
    },
    [emit]
  );

  const resizeNodes = React.useCallback<CanvasNodesApi["resizeNodes"]>(
    (rects) => {
      if (rects.size === 0) return;
      setNodes((prev) =>
        prev.map((node) => {
          const next = rects.get(node.id);
          return next ? { ...node, ...next } : node;
        })
      );
      rects.forEach((rect, id) => emit("NODE_RESIZE", id, rect));
    },
    [emit]
  );

  const updateNode = React.useCallback<CanvasNodesApi["updateNode"]>(
    (id, patch) => {
      setNodes((prev) =>
        prev.map((node) => (node.id === id ? { ...node, ...patch } : node))
      );

      // Discrete writes carry the version we believe the row is at. If someone
      // else changed it first the server returns STALE and we reconcile rather
      // than silently overwriting their edit.
      const baseVersion = versions.current.get(id) ?? 0;
      if (patch.text !== undefined) {
        emit("NODE_TEXT", id, { text: patch.text, baseVersion });
      }
      if (patch.data !== undefined) {
        emit("NODE_DATA", id, { data: patch.data, baseVersion });
      }
      if (patch.style !== undefined) {
        emit("NODE_STYLE", id, { style: patch.style, baseVersion });
      }
      if (patch.visibility !== undefined) {
        emit("NODE_VISIBILITY", id, {
          visibility: patch.visibility,
          baseVersion,
        });
      }
    },
    [emit]
  );

  const createEdge = React.useCallback<CanvasNodesApi["createEdge"]>(
    (fromNodeId, toNodeId) => {
      if (fromNodeId === toNodeId) return null;

      const edge: CanvasEdgeData = {
        id: crypto.randomUUID(),
        fromNodeId,
        toNodeId,
        kind: "arrow",
        style: {},
      };

      let created = false;
      setEdges((prev) => {
        // One connector per ordered pair. Drawing the same link twice is a
        // misclick, and two identical arrows are indistinguishable on the board
        // but both persist.
        if (
          prev.some(
            (e) => e.fromNodeId === fromNodeId && e.toNodeId === toNodeId
          )
        ) {
          return prev;
        }
        created = true;
        return [...prev, edge];
      });

      if (!created) return null;
      emit("EDGE_CREATE", fromNodeId, {
        edgeId: edge.id,
        toNodeId,
        kind: edge.kind,
        style: {},
      });
      return edge;
    },
    [emit]
  );

  const deleteEdges = React.useCallback<CanvasNodesApi["deleteEdges"]>(
    (ids) => {
      if (ids.length === 0) return;
      const doomed = new Set(ids);
      setEdges((prev) => prev.filter((edge) => !doomed.has(edge.id)));
      for (const id of ids) {
        const outbox = outboxRef.current;
        if (!outbox) continue;
        outbox.push({
          clientOpId: newOpId(),
          type: "EDGE_DELETE",
          // EDGE_DELETE carries no node; the server validates the edge id.
          nodeId: id,
          edgeId: id,
        });
      }
    },
    []
  );

  const deleteNodes = React.useCallback<CanvasNodesApi["deleteNodes"]>(
    (ids) => {
      if (ids.length === 0) return;
      const doomed = new Set(ids);
      setNodes((prev) => prev.filter((node) => !doomed.has(node.id)));
      // PlaygroundEdge cascades on either endpoint, so the server removes these
      // for us; dropping them locally keeps the board from rendering an arrow to
      // a node that is already gone.
      setEdges((prev) =>
        prev.filter(
          (edge) => !doomed.has(edge.fromNodeId) && !doomed.has(edge.toNodeId)
        )
      );
      for (const id of ids) emit("NODE_DELETE", id, {});
    },
    [emit]
  );

  const restoreNodes = React.useCallback<CanvasNodesApi["restoreNodes"]>(
    (restored) => {
      if (restored.length === 0) return;
      setNodes((prev) => {
        const present = new Set(prev.map((n) => n.id));
        return [...prev, ...restored.filter((n) => !present.has(n.id))];
      });
      // Undoing a delete re-creates the row under its ORIGINAL id, so comments
      // and votes that referenced it line up again.
      for (const node of restored) {
        emit("NODE_CREATE", node.id, {
          kind: node.kind,
          x: node.x,
          y: node.y,
          w: node.w,
          h: node.h,
          z: node.z,
          text: node.text,
          data: node.data,
          style: node.style,
        });
        versions.current.set(node.id, 0);
      }
    },
    [emit]
  );

  // Seeding from the server snapshot. Emits nothing: this IS the server state.
  const replaceAll = React.useCallback<CanvasNodesApi["replaceAll"]>(
    (next, nextEdges = []) => {
      topZ.current = next.reduce((max, n) => Math.max(max, n.z), 0);
      versions.current = new Map(next.map((n) => [n.id, n.version ?? 0]));
      setNodes([...next]);
      setEdges([...nextEdges]);
    },
    []
  );

  return {
    nodes,
    byId,
    edges,
    createEdge,
    deleteEdges,
    createNode,
    moveNodes,
    resizeNodes,
    updateNode,
    deleteNodes,
    restoreNodes,
    replaceAll,
  };
}

/**
 * Local undo stack.
 *
 * Inverse-op based and deliberately per-user: undo reverses YOUR last action,
 * never a colleague's. Once the op pipeline lands, an undo that would revert
 * someone else's concurrent change is rejected by the version guard rather than
 * silently stealing their edit.
 */
export type UndoEntry =
  | { kind: "create"; nodeIds: string[] }
  | { kind: "delete"; nodes: CanvasNodeData[] }
  | { kind: "move"; before: Map<string, { x: number; y: number }> }
  | {
      kind: "resize";
      before: Map<string, { x: number; y: number; w: number; h: number }>;
    };

export function useUndoStack(limit = 100) {
  const undoRef = React.useRef<UndoEntry[]>([]);
  const redoRef = React.useRef<UndoEntry[]>([]);
  // Mirrors depth into render so the toolbar can disable its buttons; the
  // stacks themselves stay in refs to avoid a re-render per gesture.
  const [depth, setDepth] = React.useState({ undo: 0, redo: 0 });

  const sync = React.useCallback(() => {
    setDepth({ undo: undoRef.current.length, redo: redoRef.current.length });
  }, []);

  const push = React.useCallback(
    (entry: UndoEntry) => {
      undoRef.current.push(entry);
      if (undoRef.current.length > limit) undoRef.current.shift();
      // Any new action invalidates the redo branch.
      redoRef.current = [];
      sync();
    },
    [limit, sync]
  );

  const popUndo = React.useCallback((): UndoEntry | undefined => {
    const entry = undoRef.current.pop();
    if (entry) {
      redoRef.current.push(entry);
      sync();
    }
    return entry;
  }, [sync]);

  const popRedo = React.useCallback((): UndoEntry | undefined => {
    const entry = redoRef.current.pop();
    if (entry) {
      undoRef.current.push(entry);
      sync();
    }
    return entry;
  }, [sync]);

  return { push, popUndo, popRedo, canUndo: depth.undo > 0, canRedo: depth.redo > 0 };
}
