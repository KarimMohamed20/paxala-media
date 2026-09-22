import { describe, expect, it } from "vitest";
import { inflate, rectsIntersect, type Rect } from "@/lib/playground/camera";
import { STICKY_COLOR_HEX, type ComposePlan } from "@/lib/playground/compose-plan";
import { estimateTextHeight, findFreeSpot, layoutPlan, type NodeSpec } from "./compose-layout";

const item = (ref: string, overrides: Record<string, unknown> = {}) => ({
  ref,
  kind: "sticky" as const,
  text: `Idea ${ref}`,
  title: null,
  color: null,
  colors: [],
  ...overrides,
});

function plan(overrides: Partial<ComposePlan> = {}): ComposePlan {
  return {
    title: "Ramadan campaign",
    summary: "Routes and headlines.",
    groups: [
      { heading: "Routes", items: [item("i1"), item("i2")] },
      { heading: "Headlines", items: [item("i3", { kind: "text", text: "A headline" })] },
    ],
    connections: [],
    ...overrides,
  };
}

const rectOf = (spec: NodeSpec): Rect => ({ x: spec.x, y: spec.y, w: spec.w, h: spec.h });

function layout(p: ComposePlan, obstacles: Rect[] = [], existing: string[] = []) {
  return layoutPlan(p, {
    anchor: { x: 0, y: 0 },
    obstacles,
    existingIds: new Set(existing),
    runId: "run-1",
  });
}

describe("findFreeSpot", () => {
  it("centres on the anchor when the board is empty there", () => {
    expect(findFreeSpot({ w: 200, h: 100 }, { x: 500, y: 300 }, [])).toEqual({
      x: 400,
      y: 250,
    });
  });

  it("never lands on top of existing work", () => {
    const obstacle = { x: -300, y: -300, w: 600, h: 600 };
    const spot = findFreeSpot({ w: 400, h: 300 }, { x: 0, y: 0 }, [obstacle]);
    expect(rectsIntersect({ ...spot, w: 400, h: 300 }, obstacle)).toBe(false);
  });

  it("stays near the anchor rather than jumping to the far side of the board", () => {
    const obstacle = { x: -150, y: -150, w: 300, h: 300 };
    const spot = findFreeSpot({ w: 200, h: 200 }, { x: 0, y: 0 }, [obstacle]);
    expect(Math.hypot(spot.x + 100, spot.y + 100)).toBeLessThan(800);
  });
});

describe("layoutPlan", () => {
  it("puts one frame around everything", () => {
    const result = layout(plan());
    const frame = rectOf(result.frame);
    for (const child of result.children) {
      const c = rectOf(child);
      expect(c.x).toBeGreaterThanOrEqual(frame.x);
      expect(c.y).toBeGreaterThanOrEqual(frame.y);
      expect(c.x + c.w).toBeLessThanOrEqual(frame.x + frame.w);
      expect(c.y + c.h).toBeLessThanOrEqual(frame.y + frame.h);
    }
    expect(result.frame.kind).toBe("FRAME");
    expect(result.frame.data.title).toBe("Ramadan campaign");
  });

  it("never overlaps its own items", () => {
    const children = layout(plan()).children.map(rectOf);
    for (let i = 0; i < children.length; i++) {
      for (let j = i + 1; j < children.length; j++) {
        // Touching counts as overlap in rectsIntersect, so shrink by a pixel.
        expect(rectsIntersect(inflate(children[i], -1), inflate(children[j], -1))).toBe(false);
      }
    }
  });

  it("keeps the whole frame clear of the existing board", () => {
    const obstacles = [
      { x: -400, y: -300, w: 800, h: 600 },
      { x: 500, y: -100, w: 300, h: 300 },
    ];
    const frame = rectOf(layout(plan(), obstacles).frame);
    for (const obstacle of obstacles) expect(rectsIntersect(frame, obstacle)).toBe(false);
  });

  it("lays groups out left to right with a bold heading on each", () => {
    const { children } = layout(plan());
    const headings = children.filter((child) => child.key.startsWith("heading:"));
    expect(headings.map((h) => h.text)).toEqual(["Routes", "Headlines"]);
    expect(headings[0].x).toBeLessThan(headings[1].x);
    expect(headings[0].style).toEqual({ fontSize: 20, bold: true });
  });

  it("uses the model's sticky colour, or one colour per column when it chose none", () => {
    const { children } = layout(
      plan({
        groups: [
          { heading: "A", items: [item("i1", { color: "pink" }), item("i2")] },
          { heading: "B", items: [item("i3")] },
        ],
      })
    );
    const bg = (key: string) => children.find((c) => c.key === key)?.style.background;
    expect(bg("item:i1")).toBe(STICKY_COLOR_HEX.pink);
    expect(bg("item:i2")).toBe(STICKY_COLOR_HEX.yellow);
    expect(bg("item:i3")).toBe(STICKY_COLOR_HEX.blue);
  });

  it("maps each kind onto the fields its card actually renders", () => {
    const { children } = layout(
      plan({
        groups: [
          {
            heading: "",
            items: [
              item("r", { kind: "campaign_route", title: "Iftar together", text: "Idea" }),
              item("p", { kind: "palette", text: "Warm dusk", colors: ["#1c2541", "#f4d6a0"] }),
              item("s", { kind: "shape", text: "Step one" }),
            ],
          },
        ],
      })
    );
    const byKey = new Map(children.map((c) => [c.key, c]));
    expect(byKey.get("item:r")).toMatchObject({ kind: "CAMPAIGN_ROUTE", text: "Idea" });
    expect(byKey.get("item:r")?.data.title).toBe("Iftar together");
    expect(byKey.get("item:p")?.data).toMatchObject({
      colors: ["#1c2541", "#f4d6a0"],
      title: "Warm dusk",
    });
    expect(byKey.get("item:s")).toMatchObject({ kind: "SHAPE", style: { shape: "rect" } });
    // An empty heading adds no heading node.
    expect([...byKey.keys()].some((key) => key.startsWith("heading:"))).toBe(false);
  });

  it("records which PAX run made every node, frame included", () => {
    const result = layout(plan());
    for (const spec of [result.frame, ...result.children]) {
      expect(spec.data.pax).toEqual({ runId: "run-1" });
    }
  });

  it("wires arrows to new items and to nodes still on the board", () => {
    const result = layout(
      plan({
        connections: [
          { from: { item: "i1" }, to: { item: "i2" } },
          { from: { existing: "still-here" }, to: { item: "i1" } },
          { from: { existing: "deleted-meanwhile" }, to: { item: "i2" } },
        ],
      }),
      [],
      ["still-here"]
    );
    expect(result.edges).toEqual([
      { from: { key: "item:i1" }, to: { key: "item:i2" } },
      { from: { nodeId: "still-here" }, to: { key: "item:i1" } },
    ]);
  });
});

describe("estimateTextHeight", () => {
  it("grows with the text and stays within bounds", () => {
    const short = estimateTextHeight("Hi", 260);
    const long = estimateTextHeight("word ".repeat(80), 260);
    expect(long).toBeGreaterThan(short);
    expect(short).toBeGreaterThanOrEqual(48);
    expect(estimateTextHeight("x".repeat(10_000), 260)).toBeLessThanOrEqual(480);
  });

  it("counts explicit line breaks", () => {
    expect(estimateTextHeight("a\nb\nc\nd", 260)).toBeGreaterThan(estimateTextHeight("abcd", 260));
  });
});
