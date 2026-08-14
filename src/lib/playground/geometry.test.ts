import { describe, expect, it } from "vitest";
import {
  anchorPoint,
  autoAnchorSide,
  arrowHeadPath,
  routeConnector,
  simplifyStroke,
  strokeBounds,
  strokeToPath,
} from "./geometry";

describe("simplifyStroke", () => {
  it("collapses a straight line to its endpoints", () => {
    const line = Array.from({ length: 50 }, (_, i) => ({ x: i * 10, y: 0 }));
    const simplified = simplifyStroke(line);
    expect(simplified).toEqual([
      { x: 0, y: 0 },
      { x: 490, y: 0 },
    ]);
  });

  it("keeps the corners of a zig-zag", () => {
    const zigzag = [
      { x: 0, y: 0 },
      { x: 50, y: 100 },
      { x: 100, y: 0 },
      { x: 150, y: 100 },
    ];
    expect(simplifyStroke(zigzag)).toHaveLength(4);
  });

  it("always preserves the first and last point", () => {
    const points = Array.from({ length: 200 }, (_, i) => ({
      x: i,
      y: Math.sin(i / 8) * 2,
    }));
    const simplified = simplifyStroke(points, 5);
    expect(simplified[0]).toEqual(points[0]);
    expect(simplified[simplified.length - 1]).toEqual(points[points.length - 1]);
  });

  it("removes most samples from a real-shaped stroke", () => {
    // The actual reason this exists: a two-second stroke is hundreds of samples
    // and would otherwise be persisted, re-rendered and broadcast in full.
    const points = Array.from({ length: 400 }, (_, i) => ({
      x: i * 1.5,
      y: Math.sin(i / 20) * 40,
    }));
    const simplified = simplifyStroke(points, 1.2);
    expect(simplified.length).toBeLessThan(points.length * 0.35);
    expect(simplified.length).toBeGreaterThan(4);
  });

  it("does not blow the stack on a very long stroke", () => {
    // A slow pointer over a long drag reaches thousands of samples; the naive
    // recursive RDP overflows at a depth a fast machine never produces.
    const points = Array.from({ length: 20_000 }, (_, i) => ({
      x: i,
      y: i % 2 === 0 ? 0 : 60,
    }));
    expect(() => simplifyStroke(points, 0.5)).not.toThrow();
  });

  it("survives duplicate consecutive points", () => {
    // A stationary pointer emits identical samples; the perpendicular-distance
    // formula divides by segment length and would produce NaN for a zero-length
    // segment, silently keeping every point.
    const points = [
      { x: 10, y: 10 },
      { x: 10, y: 10 },
      { x: 10, y: 10 },
      { x: 60, y: 10 },
    ];
    const simplified = simplifyStroke(points);
    expect(simplified.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
    expect(simplified.length).toBeLessThanOrEqual(points.length);
  });

  it("passes through short strokes untouched", () => {
    expect(simplifyStroke([])).toEqual([]);
    expect(simplifyStroke([{ x: 1, y: 2 }])).toEqual([{ x: 1, y: 2 }]);
  });
});

describe("strokeToPath", () => {
  it("returns an empty path for no points", () => {
    expect(strokeToPath([])).toBe("");
  });

  it("draws a single tap as a zero-length line so a round cap renders a dot", () => {
    expect(strokeToPath([{ x: 5, y: 7 }])).toBe("M 5 7 L 5 7");
  });

  it("starts with a move and ends with a line", () => {
    const path = strokeToPath([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 0 },
    ]);
    expect(path.startsWith("M 0 0")).toBe(true);
    expect(path).toContain("Q");
    expect(path.endsWith("L 20 0")).toBe(true);
  });

  it("rounds coordinates to keep the payload small", () => {
    const path = strokeToPath([
      { x: 0.123456, y: 0.987654 },
      { x: 1.111111, y: 2.222222 },
    ]);
    expect(path).not.toMatch(/\d\.\d{3,}/);
  });
});

describe("strokeBounds", () => {
  it("wraps the stroke with padding for its width", () => {
    const bounds = strokeBounds(
      [
        { x: 10, y: 10 },
        { x: 30, y: 50 },
      ],
      4
    );
    // Half the stroke width plus a pixel on each side.
    expect(bounds.x).toBe(7);
    expect(bounds.y).toBe(7);
    expect(bounds.w).toBe(26);
    expect(bounds.h).toBe(46);
  });
});

describe("autoAnchorSide", () => {
  const box = (x: number, y: number) => ({ x, y, w: 100, h: 100 });

  it("picks the horizontal side for a horizontal neighbour", () => {
    expect(autoAnchorSide(box(0, 0), box(400, 0))).toBe("right");
    expect(autoAnchorSide(box(400, 0), box(0, 0))).toBe("left");
  });

  it("picks the vertical side for a vertical neighbour", () => {
    expect(autoAnchorSide(box(0, 0), box(0, 400))).toBe("bottom");
    expect(autoAnchorSide(box(0, 400), box(0, 0))).toBe("top");
  });

  it("respects the source rect's aspect ratio, not the raw pixel delta", () => {
    // A 1200x80 banner with a sticky down and to the right. The HORIZONTAL delta
    // is much larger (860 vs 220), so a raw pixel comparison says "right" — but
    // the banner is only 40px tall from its centre, so the centre-to-centre ray
    // clears the bottom edge long before it reaches the right one. Anchoring
    // right would start the connector visibly off the card.
    const banner = { x: 0, y: 0, w: 1200, h: 80 };
    const sticky = { x: 1400, y: 200, w: 120, h: 120 };
    expect(Math.abs(1460 - 600)).toBeGreaterThan(Math.abs(260 - 40)); // raw delta says "right"
    expect(autoAnchorSide(banner, sticky)).toBe("bottom");
  });

  it("exits sideways from a tall rect even when the vertical delta is larger", () => {
    // The mirror case: a tall column card. Vertical delta dominates in pixels,
    // but the card is narrow, so the ray leaves through the side.
    const column = { x: 0, y: 0, w: 80, h: 1200 };
    const sticky = { x: 200, y: 1400, w: 120, h: 120 };
    expect(autoAnchorSide(column, sticky)).toBe("right");
  });

  it("does not divide by zero on a degenerate rect", () => {
    const flat = { x: 0, y: 0, w: 0, h: 0 };
    expect(["top", "right", "bottom", "left"]).toContain(
      autoAnchorSide(flat, { x: 100, y: 0, w: 10, h: 10 })
    );
  });
});

describe("anchorPoint", () => {
  const rect = { x: 100, y: 200, w: 80, h: 40 };

  it("sits on the middle of each edge", () => {
    expect(anchorPoint(rect, "top")).toEqual({ x: 140, y: 200 });
    expect(anchorPoint(rect, "bottom")).toEqual({ x: 140, y: 240 });
    expect(anchorPoint(rect, "left")).toEqual({ x: 100, y: 220 });
    expect(anchorPoint(rect, "right")).toEqual({ x: 180, y: 220 });
  });
});

describe("routeConnector", () => {
  const a = { x: 0, y: 0, w: 100, h: 100 };
  const b = { x: 400, y: 0, w: 100, h: 100 };

  it("starts and ends on the facing edges", () => {
    const route = routeConnector(a, b);
    expect(route.start).toEqual({ x: 100, y: 50 });
    expect(route.end).toEqual({ x: 400, y: 50 });
  });

  it("emits a cubic bezier", () => {
    expect(routeConnector(a, b).path).toMatch(/^M .* C .*,.*,.*$/);
  });

  it("points the arrowhead along the incoming direction", () => {
    // Left-to-right: the arrow arrives pointing right, i.e. angle 0.
    expect(routeConnector(a, b).endAngle).toBeCloseTo(0, 6);
    // Right-to-left: pointing left, i.e. pi.
    expect(Math.abs(routeConnector(b, a).endAngle)).toBeCloseTo(Math.PI, 6);
  });

  it("produces finite coordinates for overlapping rects", () => {
    // Two cards dropped on top of each other must not produce a NaN path, which
    // renders as nothing and cannot be selected to fix.
    const route = routeConnector(a, { ...a });
    expect(route.path).not.toContain("NaN");
    expect(Number.isFinite(route.endAngle)).toBe(true);
  });
});

describe("arrowHeadPath", () => {
  it("closes the triangle", () => {
    const path = arrowHeadPath({ x: 100, y: 100 }, 0, 10);
    expect(path.startsWith("M 100 100")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
  });

  it("puts the tip at the given point", () => {
    const path = arrowHeadPath({ x: 42, y: 24 }, Math.PI / 2);
    expect(path).toContain("M 42 24");
  });
});
