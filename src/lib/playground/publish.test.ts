import { describe, expect, it } from "vitest";
import {
  buildApprovalPayload,
  canonicalize,
  contentHashOf,
  type PublishableEdge,
  type PublishableNode,
} from "./publish";

/**
 * The frozen approval payload.
 *
 * This is the file the plan singles out as needing line-by-line review, so the
 * structural pruning is tested exhaustively. Each case corresponds to a way the
 * client could infer that something was removed.
 */

const PUBLISHED = new Date("2026-08-01T10:00:00Z");

function node(
  id: string,
  overrides: Partial<PublishableNode> = {}
): PublishableNode {
  return {
    id,
    kind: "STICKY",
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    z: 0,
    rotation: 0,
    frameId: null,
    text: null,
    data: {},
    style: {},
    clientVisibleSince: PUBLISHED,
    createdByName: "Maya",
    ...overrides,
  };
}

function edge(id: string, from: string, to: string): PublishableEdge {
  return { id, fromNodeId: from, toNodeId: to, kind: "arrow", style: {} };
}

describe("only published nodes are frozen", () => {
  it("excludes a node that was never published", () => {
    const nodes = [node("a"), node("b", { clientVisibleSince: null })];
    const payload = buildApprovalPayload(["a", "b"], nodes, []);

    expect(payload.nodes.map((n) => n.id)).toEqual(["a"]);
    expect(payload.excluded).toContainEqual({ id: "b", reason: "not-published" });
  });

  it("ignores ids that do not exist in the room", () => {
    const payload = buildApprovalPayload(["ghost"], [node("a")], []);
    expect(payload.nodes).toHaveLength(0);
  });

  it("deduplicates repeated ids", () => {
    const payload = buildApprovalPayload(["a", "a", "a"], [node("a")], []);
    expect(payload.nodes).toHaveLength(1);
  });
});

describe("the serializer enumerates its columns", () => {
  it("never carries internal fields through", () => {
    // The load-bearing property: a column added to PlaygroundNode next year is
    // absent by default rather than included until someone adds it to a
    // deny-list.
    const dirty = {
      ...node("a"),
      visibility: "TEAM_ONLY",
      version: 7,
      editLockById: "user_1",
      editLockAt: new Date(),
      createdById: "user_1",
      roomId: "room_1",
      secretInternalNote: "budget is blown",
    } as unknown as PublishableNode;

    const payload = buildApprovalPayload(["a"], [dirty], []);
    const frozen = payload.nodes[0] as unknown as Record<string, unknown>;

    for (const field of [
      "visibility",
      "version",
      "editLockById",
      "editLockAt",
      "createdById",
      "roomId",
      "secretInternalNote",
      "clientVisibleSince",
    ]) {
      expect(frozen).not.toHaveProperty(field);
    }
  });

  it("keeps exactly the presentation fields", () => {
    const payload = buildApprovalPayload(["a"], [node("a")], []);
    expect(Object.keys(payload.nodes[0]).sort()).toEqual(
      [
        "createdByName",
        "data",
        "frameId",
        "h",
        "id",
        "kind",
        "rotation",
        "style",
        "text",
        "w",
        "x",
        "y",
        "z",
      ].sort()
    );
  });
});

describe("edges need both endpoints", () => {
  it("keeps an edge whose ends are both included", () => {
    const nodes = [node("a"), node("b")];
    const payload = buildApprovalPayload(["a", "b"], nodes, [edge("e1", "a", "b")]);
    expect(payload.edges.map((e) => e.id)).toEqual(["e1"]);
  });

  it("drops an edge into an unpublished node", () => {
    // An arrow to nowhere tells the client something was removed — a subtler
    // leak than showing the node itself.
    const nodes = [node("a"), node("b", { clientVisibleSince: null })];
    const payload = buildApprovalPayload(["a", "b"], nodes, [edge("e1", "a", "b")]);

    expect(payload.edges).toHaveLength(0);
    expect(payload.excluded).toContainEqual({ id: "e1", reason: "dangling-edge" });
  });

  it("drops an edge whose ends are both outside the selection silently", () => {
    // Neither end is in the approval, so there is no relationship to report.
    const nodes = [node("a"), node("b"), node("c")];
    const payload = buildApprovalPayload(["a"], nodes, [edge("e1", "b", "c")]);
    expect(payload.edges).toHaveLength(0);
    expect(payload.excluded).toHaveLength(0);
  });
});

describe("frames need every child", () => {
  it("drops a frame with an unpublished child", () => {
    // Otherwise the client sees a container with a visible gap in it.
    const nodes = [
      node("frame", { kind: "FRAME" }),
      node("child1", { frameId: "frame" }),
      node("child2", { frameId: "frame", clientVisibleSince: null }),
    ];
    const payload = buildApprovalPayload(["frame", "child1", "child2"], nodes, []);

    expect(payload.nodes.map((n) => n.id)).not.toContain("frame");
    expect(payload.excluded).toContainEqual({
      id: "frame",
      reason: "incomplete-frame",
    });
  });

  it("drops a frame whose child was simply not selected", () => {
    // The child exists and is published, but the staff member did not include
    // it. Same visible gap, same conclusion.
    const nodes = [
      node("frame", { kind: "FRAME" }),
      node("child1", { frameId: "frame" }),
      node("child2", { frameId: "frame" }),
    ];
    const payload = buildApprovalPayload(["frame", "child1"], nodes, []);
    expect(payload.nodes.map((n) => n.id)).not.toContain("frame");
  });

  it("takes surviving children down with the dropped frame", () => {
    // A card laid out inside a container, shown without the container, is not
    // the composition anyone approved.
    const nodes = [
      node("frame", { kind: "FRAME" }),
      node("child1", { frameId: "frame" }),
      node("child2", { frameId: "frame", clientVisibleSince: null }),
    ];
    const payload = buildApprovalPayload(["frame", "child1", "child2"], nodes, []);
    expect(payload.nodes).toHaveLength(0);
  });

  it("keeps a complete frame", () => {
    const nodes = [
      node("frame", { kind: "FRAME" }),
      node("child1", { frameId: "frame" }),
      node("child2", { frameId: "frame" }),
    ];
    const payload = buildApprovalPayload(["frame", "child1", "child2"], nodes, []);
    expect(payload.nodes.map((n) => n.id).sort()).toEqual([
      "child1",
      "child2",
      "frame",
    ]);
  });

  it("cascades through nested frames", () => {
    // Dropping the inner frame orphans the outer one, which must also go. This
    // is why the prune iterates to a fixed point rather than running once.
    const nodes = [
      node("outer", { kind: "FRAME" }),
      node("inner", { kind: "FRAME", frameId: "outer" }),
      node("leaf", { frameId: "inner", clientVisibleSince: null }),
    ];
    const payload = buildApprovalPayload(["outer", "inner", "leaf"], nodes, []);
    expect(payload.nodes).toHaveLength(0);
  });

  it("keeps an empty frame", () => {
    // No children, nothing missing — a section header frame is legitimate.
    const nodes = [node("frame", { kind: "FRAME" })];
    const payload = buildApprovalPayload(["frame"], nodes, []);
    expect(payload.nodes.map((n) => n.id)).toEqual(["frame"]);
  });
});

describe("canonicalize", () => {
  it("sorts keys at every depth", () => {
    const a = canonicalize({ b: 1, a: { d: 2, c: 3 } });
    const b = canonicalize({ a: { c: 3, d: 2 }, b: 1 });
    expect(a).toBe(b);
  });

  it("preserves array order, which is meaningful", () => {
    expect(canonicalize([1, 2, 3])).not.toBe(canonicalize([3, 2, 1]));
  });

  it("handles null and nested empties", () => {
    expect(canonicalize({ a: null, b: {}, c: [] })).toBe('{"a":null,"b":{},"c":[]}');
  });
});

describe("contentHashOf", () => {
  const nodes = [node("a", { text: "Hero moment" }), node("b")];

  it("is stable for identical content", () => {
    const one = buildApprovalPayload(["a", "b"], nodes, []);
    const two = buildApprovalPayload(["b", "a"], nodes, []);
    // Selection order must not change the hash — the approved CONTENT is the
    // same thing either way.
    expect(contentHashOf(one)).toBe(contentHashOf(two));
  });

  it("changes when any content changes", () => {
    const before = buildApprovalPayload(["a"], nodes, []);
    const after = buildApprovalPayload(
      ["a"],
      [node("a", { text: "Hero moment, revised" })],
      []
    );
    expect(contentHashOf(before)).not.toBe(contentHashOf(after));
  });

  it("changes when a node moves", () => {
    const before = buildApprovalPayload(["a"], [node("a")], []);
    const after = buildApprovalPayload(["a"], [node("a", { x: 40 })], []);
    expect(contentHashOf(before)).not.toBe(contentHashOf(after));
  });

  it("ignores the diagnostic excluded list", () => {
    // `excluded` describes the BUILD, not the approved content. Two payloads
    // with the same content must hash identically even if one pruned more.
    const clean = buildApprovalPayload(["a"], [node("a")], []);
    const withPruning = buildApprovalPayload(
      ["a", "ghost-unpublished"],
      [node("a"), node("ghost-unpublished", { clientVisibleSince: null })],
      []
    );
    expect(withPruning.excluded.length).toBeGreaterThan(0);
    expect(contentHashOf(clean)).toBe(contentHashOf(withPruning));
  });

  it("produces a hex sha-256", () => {
    const hash = contentHashOf(buildApprovalPayload(["a"], [node("a")], []));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
