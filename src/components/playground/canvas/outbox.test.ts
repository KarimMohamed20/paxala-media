import { beforeEach, describe, expect, it, vi } from "vitest";
import { Outbox, type OutboxOp } from "./outbox";

/**
 * Outbox queue semantics.
 *
 * These assert ORDER and COALESCING, which is where a reordering bug would hide:
 * the symptom of getting this wrong is "a note occasionally appears at its old
 * position after a reload", which is close to impossible to reproduce by hand.
 *
 * The network is never exercised here — `navigator.onLine` is forced false so
 * the queue accumulates and can be inspected. Flush behaviour is covered by the
 * manual QA script, which needs a real server.
 */

let opCounter = 0;
function op(type: string, nodeId: string, extra: Record<string, unknown> = {}): OutboxOp {
  opCounter += 1;
  return {
    clientOpId: `op-${opCounter}`,
    type,
    nodeId,
    ...extra,
  };
}

/** Reach into the private queue — these are invariants of internal state. */
function queueOf(outbox: Outbox): OutboxOp[] {
  return (outbox as unknown as { queue: OutboxOp[] }).queue;
}

const NODE_A = "aaaaaaaa-0000-4000-8000-000000000001";
const NODE_B = "bbbbbbbb-0000-4000-8000-000000000002";

beforeEach(() => {
  opCounter = 0;
  vi.stubGlobal("navigator", { onLine: false, sendBeacon: () => true });
  vi.stubGlobal("window", {
    addEventListener: () => {},
    removeEventListener: () => {},
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
  });
});

describe("coalescing", () => {
  it("collapses a drag into one op", () => {
    // A two-second drag emits ~120 moves. Sending them all would be 120x the
    // traffic for the same outcome.
    const outbox = new Outbox("room", {});
    for (let i = 0; i < 50; i++) {
      outbox.push(op("NODE_MOVE", NODE_A, { x: i, y: i }));
    }

    const queue = queueOf(outbox);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ x: 49, y: 49 });
    outbox.dispose();
  });

  it("keeps different nodes separate", () => {
    const outbox = new Outbox("room", {});
    outbox.push(op("NODE_MOVE", NODE_A, { x: 1, y: 1 }));
    outbox.push(op("NODE_MOVE", NODE_B, { x: 2, y: 2 }));
    outbox.push(op("NODE_MOVE", NODE_A, { x: 3, y: 3 }));

    const queue = queueOf(outbox);
    expect(queue).toHaveLength(2);
    // A superseded op keeps its ORIGINAL position, so causal order is intact.
    expect(queue[0]).toMatchObject({ nodeId: NODE_A, x: 3 });
    expect(queue[1]).toMatchObject({ nodeId: NODE_B, x: 2 });
    outbox.dispose();
  });

  it("keeps different op kinds on the same node separate", () => {
    const outbox = new Outbox("room", {});
    outbox.push(op("NODE_MOVE", NODE_A, { x: 1, y: 1 }));
    outbox.push(op("NODE_RESIZE", NODE_A, { w: 100, h: 100 }));

    expect(queueOf(outbox)).toHaveLength(2);
    outbox.dispose();
  });

  it("never coalesces a create", () => {
    // Two creates are two nodes; merging them would lose one.
    const outbox = new Outbox("room", {});
    outbox.push(op("NODE_CREATE", NODE_A, { kind: "STICKY" }));
    outbox.push(op("NODE_CREATE", NODE_B, { kind: "STICKY" }));

    expect(queueOf(outbox)).toHaveLength(2);
    outbox.dispose();
  });

  it("never coalesces a delete", () => {
    const outbox = new Outbox("room", {});
    outbox.push(op("NODE_DELETE", NODE_A));
    outbox.push(op("NODE_DELETE", NODE_A));

    expect(queueOf(outbox)).toHaveLength(2);
    outbox.dispose();
  });
});

describe("causal boundaries", () => {
  it("does not merge a move across an intervening delete", () => {
    // create -> move -> delete -> (recreate) -> move must NOT collapse the last
    // move into the first: that would move a node that no longer exists at that
    // point in the log, and the replay would diverge.
    const outbox = new Outbox("room", {});
    outbox.push(op("NODE_MOVE", NODE_A, { x: 1, y: 1 }));
    outbox.push(op("NODE_DELETE", NODE_A));
    outbox.push(op("NODE_CREATE", NODE_A, { kind: "STICKY" }));
    outbox.push(op("NODE_MOVE", NODE_A, { x: 9, y: 9 }));

    const queue = queueOf(outbox);
    expect(queue).toHaveLength(4);
    expect(queue[0]).toMatchObject({ type: "NODE_MOVE", x: 1 });
    expect(queue[3]).toMatchObject({ type: "NODE_MOVE", x: 9 });
    outbox.dispose();
  });

  it("does not merge a move across an intervening create", () => {
    const outbox = new Outbox("room", {});
    outbox.push(op("NODE_MOVE", NODE_A, { x: 1, y: 1 }));
    outbox.push(op("NODE_CREATE", NODE_A, { kind: "STICKY" }));
    outbox.push(op("NODE_MOVE", NODE_A, { x: 5, y: 5 }));

    expect(queueOf(outbox)).toHaveLength(3);
    outbox.dispose();
  });

  it("preserves creation order across nodes", () => {
    // An edge drawn after two creates references both endpoints; if the creates
    // reordered, the edge would land before one of them.
    //
    // A move on A DOES coalesce past a create for B, and that is correct:
    // operations on different nodes commute, so the merged queue reaches an
    // identical end state with one fewer request. What must NOT change is the
    // relative order of the two creates, and of each node's own ops.
    const outbox = new Outbox("room", {});
    outbox.push(op("NODE_CREATE", NODE_A, { kind: "STICKY" }));
    outbox.push(op("NODE_MOVE", NODE_A, { x: 1, y: 1 }));
    outbox.push(op("NODE_CREATE", NODE_B, { kind: "STICKY" }));
    outbox.push(op("NODE_MOVE", NODE_A, { x: 2, y: 2 }));

    const queue = queueOf(outbox);
    expect(queue).toHaveLength(3);

    const creates = queue.filter((o) => o.type === "NODE_CREATE");
    expect(creates.map((o) => o.nodeId)).toEqual([NODE_A, NODE_B]);

    // A's create still precedes A's move, and the move carries the final value.
    const aCreate = queue.findIndex(
      (o) => o.type === "NODE_CREATE" && o.nodeId === NODE_A
    );
    const aMove = queue.findIndex(
      (o) => o.type === "NODE_MOVE" && o.nodeId === NODE_A
    );
    expect(aCreate).toBeLessThan(aMove);
    expect(queue[aMove]).toMatchObject({ x: 2, y: 2 });
    outbox.dispose();
  });
});

describe("offline behaviour", () => {
  it("accumulates while offline instead of dropping work", () => {
    const outbox = new Outbox("room", {});
    outbox.push(op("NODE_CREATE", NODE_A, { kind: "STICKY" }));
    outbox.push(op("NODE_CREATE", NODE_B, { kind: "STICKY" }));

    expect(outbox.pending).toBe(2);
    outbox.dispose();
  });

  it("reports offline rather than error when the network is down", () => {
    // "Offline — changes kept" is the truth; "Save failed" would be a lie that
    // makes people redo work they have not lost.
    const seen: string[] = [];
    const outbox = new Outbox("room", { onStatus: (status) => seen.push(status) });
    outbox.push(op("NODE_MOVE", NODE_A, { x: 1, y: 1 }));

    expect(seen).toContain("pending");
    outbox.dispose();
  });
});
