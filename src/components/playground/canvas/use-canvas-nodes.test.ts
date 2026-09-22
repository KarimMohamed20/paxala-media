// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useCanvasNodes, type CanvasNodesApi } from "./use-canvas-nodes";

/**
 * createEdge in the same tick as createNode — the exact sequence a PAX plan
 * performs (frame, items, then arrows).
 *
 * The old implementation decided whether to persist an edge from a flag set
 * INSIDE the setEdges updater. React only runs updaters eagerly when the
 * component has no other update pending; after createNode has queued one, the
 * updater is deferred, the flag is still false, and createEdge returned null
 * without sending the edge — an arrow that showed on screen and vanished on
 * reload. This runs the real hook in React to pin that down.
 */

let root: Root | null = null;
let api: CanvasNodesApi | null = null;

/** Hands the live hook out after each render — never assigned during render. */
function Harness({ onApi }: { onApi: (hook: CanvasNodesApi) => void }) {
  const hook = useCanvasNodes({});
  React.useEffect(() => {
    onApi(hook);
  });
  return null;
}

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
  if (root) {
    const r = root;
    root = null;
    await act(async () => r.unmount());
  }
  api = null;
});

async function mount() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  await act(async () => {
    root = createRoot(host);
    root.render(
      React.createElement(Harness, {
        onApi: (hook) => {
          api = hook;
        },
      })
    );
  });
  if (!api) throw new Error("hook did not mount");
  return api;
}

describe("createEdge in the same tick as createNode", () => {
  it("still creates the edge", async () => {
    const hook = await mount();
    let edge: ReturnType<CanvasNodesApi["createEdge"]> = null;

    await act(async () => {
      const a = hook.createNode({ kind: "STICKY", x: 0, y: 0 });
      const b = hook.createNode({ kind: "STICKY", x: 300, y: 0 });
      // Same tick: React has not rendered the new nodes yet.
      edge = hook.createEdge(a.id, b.id);
    });

    expect(edge).not.toBeNull();
    expect(api?.edges).toHaveLength(1);
  });

  it("still refuses a duplicate of that edge within the same tick", async () => {
    const hook = await mount();
    let first: ReturnType<CanvasNodesApi["createEdge"]> = null;
    let second: ReturnType<CanvasNodesApi["createEdge"]> = null;

    await act(async () => {
      const a = hook.createNode({ kind: "STICKY", x: 0, y: 0 });
      const b = hook.createNode({ kind: "STICKY", x: 300, y: 0 });
      first = hook.createEdge(a.id, b.id);
      second = hook.createEdge(a.id, b.id);
    });

    expect(first).not.toBeNull();
    expect(second).toBeNull();
    expect(api?.edges).toHaveLength(1);
  });

  it("allows the reverse direction as a separate connector", async () => {
    const hook = await mount();
    await act(async () => {
      const a = hook.createNode({ kind: "STICKY", x: 0, y: 0 });
      const b = hook.createNode({ kind: "STICKY", x: 300, y: 0 });
      hook.createEdge(a.id, b.id);
      hook.createEdge(b.id, a.id);
    });
    expect(api?.edges).toHaveLength(2);
  });

  it("carries a frameId through createNode", async () => {
    const hook = await mount();
    let childFrame: string | null = null;
    await act(async () => {
      const frame = hook.createNode({ kind: "FRAME", x: 0, y: 0 });
      childFrame = hook.createNode({ kind: "STICKY", x: 40, y: 40, frameId: frame.id }).frameId;
    });
    expect(childFrame).not.toBeNull();
  });
});
