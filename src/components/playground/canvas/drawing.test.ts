import { describe, expect, it } from "vitest";
import { strokeBounds } from "@/lib/playground/geometry";
import { drawingBaseSize } from "./drawing";

/**
 * The viewBox contract that makes resizing a DRAWING scale its artwork:
 * drawingBaseSize must return the box the points were stored against, for
 * new nodes (explicit baseW/baseH) and for pre-existing ones (reconstructed).
 */

describe("drawingBaseSize", () => {
  it("prefers explicit base dimensions", () => {
    const node = {
      w: 400, // resized since creation
      h: 300,
      data: { baseW: 100, baseH: 50, points: [{ x: 3, y: 3 }] },
    };
    expect(drawingBaseSize(node)).toEqual({ w: 100, h: 50 });
  });

  it("ignores malformed base dimensions", () => {
    const node = {
      w: 80,
      h: 60,
      data: { baseW: "100", baseH: -5, points: [] },
    };
    expect(drawingBaseSize(node)).toEqual({ w: 80, h: 60 });
  });

  it("reconstructs the creation bounds from stored points (legacy drawings)", () => {
    // Mirror the creation path exactly: world stroke -> strokeBounds(…, 3)
    // -> points offset into the box and rounded to 2 decimals.
    const world = [
      { x: 210.4, y: 118.2 },
      { x: 264.9, y: 131.7 },
      { x: 241.3, y: 177.05 },
    ];
    const bounds = strokeBounds(world, 3);
    const node = {
      w: bounds.w,
      h: bounds.h,
      data: {
        points: world.map((point) => ({
          x: Math.round((point.x - bounds.x) * 100) / 100,
          y: Math.round((point.y - bounds.y) * 100) / 100,
        })),
      },
    };

    const base = drawingBaseSize(node);
    expect(base.w).toBeCloseTo(bounds.w, 1);
    expect(base.h).toBeCloseTo(bounds.h, 1);
  });

  it("falls back to the node box when there are no usable points", () => {
    expect(drawingBaseSize({ w: 120, h: 90, data: {} })).toEqual({ w: 120, h: 90 });
    expect(
      drawingBaseSize({ w: 0, h: -3, data: { points: [{ x: "a", y: null }] } })
    ).toEqual({ w: 1, h: 1 });
  });
});
