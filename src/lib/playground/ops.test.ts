import { describe, expect, it } from "vitest";
import { EDIT_LOCK_TTL_MS, canEditText, isGeometryOp, parseOp } from "./ops";
import {
  MAX_NODE_TEXT,
  MAX_WORLD_COORD,
  parseCoord,
  parseNodeId,
  parseNodeJson,
  parseNodeText,
  parseVersion,
} from "./node-schema";

const ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const OP = "9c858901-8a57-4791-81fe-4c455b099bc9";

describe("parseOp — hostile input", () => {
  it("rejects a non-UUID node id", () => {
    // Ids are client-minted, so the server cannot assume they are well formed.
    expect(parseOp({ type: "NODE_MOVE", clientOpId: OP, nodeId: "'; drop--", x: 0, y: 0 })).toBeNull();
  });

  it("rejects NaN and Infinity coordinates", () => {
    // Both survive `typeof x === "number"`, serialise to null through JSON, and
    // make a node permanently unselectable because every hit test fails.
    for (const bad of [NaN, Infinity, -Infinity]) {
      expect(
        parseOp({ type: "NODE_MOVE", clientOpId: OP, nodeId: ID, x: bad, y: 0 })
      ).toBeNull();
    }
  });

  it("rejects coordinates beyond the world bound", () => {
    expect(parseCoord(MAX_WORLD_COORD + 1)).toBeUndefined();
    expect(parseCoord(-MAX_WORLD_COORD - 1)).toBeUndefined();
    expect(parseCoord(0)).toBe(0);
  });

  it("rejects a resize below the minimum dimension", () => {
    expect(
      parseOp({ type: "NODE_RESIZE", clientOpId: OP, nodeId: ID, x: 0, y: 0, w: 1, h: 100 })
    ).toBeNull();
  });

  it("rejects a discrete op with no baseVersion", () => {
    // Without it the optimistic guard has nothing to compare and would silently
    // become a last-write-wins overwrite.
    expect(parseOp({ type: "NODE_TEXT", clientOpId: OP, nodeId: ID, text: "hi" })).toBeNull();
    expect(parseVersion(-1)).toBeUndefined();
    expect(parseVersion(1.5)).toBeUndefined();
    expect(parseVersion(0)).toBe(0);
  });

  it("rejects an unknown op type", () => {
    expect(parseOp({ type: "DROP_TABLE", clientOpId: OP, nodeId: ID })).toBeNull();
  });

  it("caps node text rather than truncating silently at the database", () => {
    const long = "x".repeat(MAX_NODE_TEXT + 500);
    expect(parseNodeText(long)?.length).toBe(MAX_NODE_TEXT);
  });

  it("normalises empty text to null", () => {
    expect(parseNodeText("   ")).toBeNull();
    expect(parseNodeText("")).toBeNull();
  });

  it("rejects an array or primitive where an object payload is required", () => {
    expect(parseNodeJson([1, 2, 3])).toBeUndefined();
    expect(parseNodeJson("nope")).toBeUndefined();
    expect(parseNodeJson({ ok: true })).toEqual({ ok: true });
  });

  it("rejects an oversized data payload", () => {
    expect(parseNodeJson({ blob: "x".repeat(70_000) })).toBeUndefined();
  });

  it("accepts a well-formed move", () => {
    const op = parseOp({ type: "NODE_MOVE", clientOpId: OP, nodeId: ID, x: 12, y: -8 });
    expect(op).toEqual({ type: "NODE_MOVE", clientOpId: OP, nodeId: ID, x: 12, y: -8 });
  });

  it("defaults a create's z and json payloads", () => {
    const op = parseOp({
      type: "NODE_CREATE",
      clientOpId: OP,
      nodeId: ID,
      kind: "STICKY",
      x: 0,
      y: 0,
      w: 180,
      h: 180,
    });
    expect(op).toMatchObject({ type: "NODE_CREATE", z: 0, data: {}, style: {} });
  });
});

describe("edge ops", () => {
  const OTHER = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
  const EDGE = "16fd2706-8baf-433b-82eb-8c7fada847da";

  it("accepts a well-formed connector", () => {
    const op = parseOp({
      type: "EDGE_CREATE",
      clientOpId: OP,
      nodeId: ID,
      edgeId: EDGE,
      toNodeId: OTHER,
    });
    expect(op).toMatchObject({
      type: "EDGE_CREATE",
      edgeId: EDGE,
      toNodeId: OTHER,
      kind: "arrow",
    });
  });

  it("rejects a self-loop", () => {
    // No meaningful route exists between a rect and itself; the bezier would be
    // degenerate and the arrow unrenderable.
    expect(
      parseOp({
        type: "EDGE_CREATE",
        clientOpId: OP,
        nodeId: ID,
        edgeId: EDGE,
        toNodeId: ID,
      })
    ).toBeNull();
  });

  it("rejects malformed endpoint ids", () => {
    expect(
      parseOp({
        type: "EDGE_CREATE",
        clientOpId: OP,
        nodeId: ID,
        edgeId: EDGE,
        toNodeId: "../../etc/passwd",
      })
    ).toBeNull();
  });

  it("caps a hostile connector kind rather than storing it whole", () => {
    const op = parseOp({
      type: "EDGE_CREATE",
      clientOpId: OP,
      nodeId: ID,
      edgeId: EDGE,
      toNodeId: OTHER,
      kind: "x".repeat(5000),
    });
    expect(op).not.toBeNull();
    expect((op as { kind: string }).kind).toHaveLength(32);
  });

  it("parses a delete without requiring a node id", () => {
    // EDGE_DELETE is the only op with no node of its own; requiring one would
    // make a connector undeletable once its source node was gone.
    const op = parseOp({ type: "EDGE_DELETE", clientOpId: OP, edgeId: EDGE });
    expect(op).toEqual({
      type: "EDGE_DELETE",
      clientOpId: OP,
      nodeId: null,
      edgeId: EDGE,
    });
  });

  it("rejects a delete with no edge id", () => {
    expect(parseOp({ type: "EDGE_DELETE", clientOpId: OP })).toBeNull();
  });
});

describe("geometry vs discrete", () => {
  it("classifies motion as geometry", () => {
    // Geometry is unguarded: a version guard on a continuous drag makes two
    // users rubber-band against each other for the whole gesture.
    expect(isGeometryOp("NODE_MOVE")).toBe(true);
    expect(isGeometryOp("NODE_RESIZE")).toBe(true);
    expect(isGeometryOp("NODE_ORDER")).toBe(true);
  });

  it("classifies decisions as discrete", () => {
    expect(isGeometryOp("NODE_TEXT")).toBe(false);
    expect(isGeometryOp("NODE_DATA")).toBe(false);
    expect(isGeometryOp("NODE_VISIBILITY")).toBe(false);
    expect(isGeometryOp("NODE_DELETE")).toBe(false);
  });

  it("never asks a geometry op for a baseVersion", () => {
    // If this ever starts parsing, geometry has acquired a guard and drags will
    // begin rejecting.
    const op = parseOp({ type: "NODE_MOVE", clientOpId: OP, nodeId: ID, x: 1, y: 1 });
    expect(op).not.toHaveProperty("baseVersion");
  });
});

describe("canEditText — the server-enforced lock", () => {
  const now = 1_000_000;
  const other = "user_other";
  const me = "user_me";

  it("allows editing when nobody holds the lock", () => {
    expect(canEditText({ editLockById: null, editLockAt: null }, me, now)).toBe(true);
  });

  it("allows the holder to keep typing", () => {
    expect(
      canEditText({ editLockById: me, editLockAt: new Date(now - 1000) }, me, now)
    ).toBe(true);
  });

  it("refuses a second writer inside the TTL", () => {
    // This is the whole reason a colleague's paragraph cannot silently vanish.
    expect(
      canEditText({ editLockById: other, editLockAt: new Date(now - 1000) }, me, now)
    ).toBe(false);
  });

  it("refuses right up to the TTL boundary", () => {
    expect(
      canEditText(
        { editLockById: other, editLockAt: new Date(now - EDIT_LOCK_TTL_MS) },
        me,
        now
      )
    ).toBe(false);
  });

  it("releases once the TTL expires", () => {
    // Someone who closed their laptop mid-edit must not hold the node forever.
    expect(
      canEditText(
        { editLockById: other, editLockAt: new Date(now - EDIT_LOCK_TTL_MS - 1) },
        me,
        now
      )
    ).toBe(true);
  });

  it("treats a lock holder with no timestamp as stale", () => {
    // Defensive: a half-written lock must fail OPEN, or the node becomes
    // permanently uneditable by anyone.
    expect(canEditText({ editLockById: other, editLockAt: null }, me, now)).toBe(true);
  });
});

describe("parseNodeId", () => {
  it("accepts a v4 uuid", () => {
    expect(parseNodeId(ID)).toBe(ID);
  });

  it("rejects a cuid, so client ids cannot collide with server-generated ones", () => {
    expect(parseNodeId("clx1234567890abcdefghijk")).toBeUndefined();
  });

  it("rejects non-strings", () => {
    expect(parseNodeId(42)).toBeUndefined();
    expect(parseNodeId(null)).toBeUndefined();
  });
});
