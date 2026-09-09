// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NextIntlClientProvider } from "next-intl";
import en from "@/messages/en.json";
import { CanvasViewport } from "./canvas-viewport";
import type { CanvasNodesApi } from "./use-canvas-nodes";
import type { CanvasNodeData } from "./types";

/**
 * DOM-level regression test for the inline-editing flow — the one path unit
 * tests cannot see. Mounts the REAL CanvasViewport and drives it with real
 * pointer events: double-press on a sticky must open the editor, keep it
 * focused, accept typing, and commit on an outside press. This flow broke in
 * production twice (pointer-capture retargeting the dblclick; the outside-
 * press committer racing the editor), which is why it gets a browser-ish test
 * despite the repo's pure-function convention.
 */

const STICKY_ID = "aaaaaaaa-0000-4000-8000-00000000000a";

function stickyNode(): CanvasNodeData {
  return {
    id: STICKY_ID,
    kind: "STICKY",
    x: 10,
    y: 10,
    w: 180,
    h: 180,
    z: 1,
    rotation: 0,
    frameId: null,
    text: "hello",
    data: {},
    style: {},
    visibility: "TEAM_ONLY",
    clientVisibleSince: null,
    createdByName: null,
  };
}

function makeApi(nodes: CanvasNodeData[]): CanvasNodesApi {
  return {
    nodes,
    byId: new Map(nodes.map((n) => [n.id, n])),
    edges: [],
    createEdge: () => null,
    deleteEdges: () => {},
    createNode: (input) => ({ ...stickyNode(), ...input, id: "created" }),
    moveNodes: () => {},
    resizeNodes: () => {},
    updateNode: () => {},
    deleteNodes: () => {},
    restoreNodes: () => {},
    replaceAll: () => {},
  };
}

/** jsdom has no PointerEvent; a MouseEvent with pointerId is what React sees. */
function pointerEvent(type: string, init: MouseEventInit & { pointerId?: number }) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
  Object.defineProperty(event, "pointerId", {
    value: init.pointerId ?? 1,
  });
  return event;
}

function press(target: Element, x: number, y: number) {
  target.dispatchEvent(pointerEvent("pointerdown", { clientX: x, clientY: y, button: 0 }));
}

function release(target: Element, x: number, y: number) {
  target.dispatchEvent(pointerEvent("pointerup", { clientX: x, clientY: y, button: 0 }));
}

/** Harness owning editingId/selection exactly like room-shell does. */
function Harness({
  api,
  onCommit,
}: {
  api: CanvasNodesApi;
  onCommit: (id: string, text: string) => void;
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [selection, setSelection] = React.useState<ReadonlySet<string>>(
    new Set()
  );
  // Children passed as a prop purely for the TS overload — the provider's
  // prop type requires `children` inside the props object, and this file is
  // .ts (no JSX) to match the vitest include pattern.
  // eslint-disable-next-line react/no-children-prop
  return React.createElement(NextIntlClientProvider, {
    locale: "en",
    timeZone: "UTC",
    messages: en as never,
    children: React.createElement(CanvasViewport, {
      api,
      edges: [],
      selection,
      onSelectionChange: (next: Set<string>) => setSelection(next),
      editingId,
      onEditStart: setEditingId,
      onEditCommit: (id: string, text: string) => {
        onCommit(id, text);
        setEditingId(null);
      },
      onEditCancel: () => setEditingId(null),
    }),
  });
}

let host: HTMLDivElement;
let root: Root | null = null;

beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
    true;
  // jsdom implements none of the pointer-capture API the drag path calls.
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.hasPointerCapture = () => false;
  // jsdom 19 has no CSS.escape (captureDragElements uses it on drag arm).
  if (typeof CSS === "undefined") {
    (globalThis as { CSS?: unknown }).CSS = {};
  }
  if (typeof CSS.escape !== "function") {
    (CSS as { escape?: (v: string) => string }).escape = (value: string) =>
      value.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
  }
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(async () => {
  if (root) {
    const r = root;
    root = null;
    await act(async () => r.unmount());
  }
  host?.remove();
});

async function mount(onCommit: (id: string, text: string) => void) {
  host = document.createElement("div");
  document.body.appendChild(host);
  const api = makeApi([stickyNode()]);
  await act(async () => {
    root = createRoot(host);
    root.render(React.createElement(Harness, { api, onCommit }));
  });
  const nodeEl = host.querySelector<HTMLElement>(`[data-node-id="${STICKY_ID}"]`);
  expect(nodeEl).not.toBeNull();
  return nodeEl!;
}

describe("sticky inline editing, end to end", () => {
  it("opens the editor on a double-press and keeps it focused", async () => {
    const onCommit = vi.fn();
    const nodeEl = await mount(onCommit);

    // Press #1: selects, arms a (zero-distance) drag, releases.
    await act(async () => {
      press(nodeEl, 50, 50);
      release(nodeEl, 50, 50);
    });
    expect(document.querySelector("textarea")).toBeNull();

    // Press #2 within 400ms and 6px: must open the inline editor.
    const target =
      host.querySelector<HTMLElement>(`[data-node-id="${STICKY_ID}"]`) ?? nodeEl;
    await act(async () => {
      press(target, 51, 50);
    });

    const textarea = document.querySelector<HTMLTextAreaElement>("textarea");
    expect(textarea).not.toBeNull();
    expect(textarea!.value).toBe("hello");
    expect(document.activeElement).toBe(textarea);

    // The sticky keeps its paper colour while editing. The regression here
    // was the editor falling back to the DARK card background for a sticky
    // with no chosen colour — near-black text on near-black paper, i.e.
    // typing produced invisible words.
    expect(textarea!.style.background).toBeTruthy();
    expect(textarea!.style.background).not.toContain("10, 10, 10");

    // The release of the second press must not close it.
    await act(async () => {
      release(textarea!, 51, 50);
    });
    expect(document.querySelector("textarea")).not.toBeNull();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("opens the editor on an unhurried second click on the selected sticky", async () => {
    // No double-click timing involved: click once to select, then click again
    // whenever — far outside the 6px double-press gate — and the RELEASE of
    // that second click starts editing (the FigJam click…click pattern).
    const onCommit = vi.fn();
    const nodeEl = await mount(onCommit);

    await act(async () => {
      press(nodeEl, 50, 50);
      release(nodeEl, 50, 50);
    });
    expect(document.querySelector("textarea")).toBeNull();

    await act(async () => {
      press(nodeEl, 120, 120);
    });
    // Not yet — the press might have been the start of a drag.
    expect(document.querySelector("textarea")).toBeNull();

    await act(async () => {
      release(nodeEl, 120, 120);
    });
    expect(document.querySelector("textarea")).not.toBeNull();
  });

  it("keeps the editor open for presses inside it and commits on an outside press", async () => {
    const onCommit = vi.fn();
    const nodeEl = await mount(onCommit);

    await act(async () => {
      press(nodeEl, 50, 50);
      release(nodeEl, 50, 50);
      press(nodeEl, 50, 50);
    });
    let textarea = document.querySelector<HTMLTextAreaElement>("textarea");
    expect(textarea).not.toBeNull();
    await act(async () => {
      release(textarea!, 50, 50);
    });

    // A press INSIDE the textarea (placing the caret) must not commit.
    textarea = document.querySelector<HTMLTextAreaElement>("textarea");
    await act(async () => {
      press(textarea!, 55, 55);
      release(textarea!, 55, 55);
    });
    expect(document.querySelector("textarea")).not.toBeNull();
    expect(onCommit).not.toHaveBeenCalled();

    // Typing goes into the editor.
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )!.set!;
      setter.call(textarea, "hello world");
      textarea!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(document.querySelector("textarea")!.value).toBe("hello world");

    // A press on the empty board commits the edit and closes the editor.
    await act(async () => {
      press(document.body, 900, 900);
    });
    expect(onCommit).toHaveBeenCalledWith(STICKY_ID, "hello world");
    expect(document.querySelector("textarea")).toBeNull();
  });
});
