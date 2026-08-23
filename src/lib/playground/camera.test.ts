import { describe, expect, it } from "vitest";
import {
  IDENTITY,
  MAX_ZOOM,
  MIN_ZOOM,
  boundsOf,
  clampZoom,
  fitToBounds,
  inflate,
  normalizeWheelDelta,
  rectsIntersect,
  screenToWorld,
  visibleWorldRect,
  wheelZoomFactor,
  worldToScreen,
  zoomAt,
} from "./camera";

describe("world <-> screen", () => {
  it("round-trips through both conversions", () => {
    const camera = { x: -320, y: 47.5, z: 0.6 };
    const world = { x: 1234.5, y: -678.25 };
    const back = screenToWorld(camera, worldToScreen(camera, world));
    expect(back.x).toBeCloseTo(world.x, 9);
    expect(back.y).toBeCloseTo(world.y, 9);
  });

  it("maps the world origin to the camera offset", () => {
    expect(worldToScreen({ x: 100, y: 50, z: 2 }, { x: 0, y: 0 })).toEqual({
      x: 100,
      y: 50,
    });
  });
});

describe("zoomAt", () => {
  it("keeps the world point under the anchor fixed", () => {
    // The whole reason zoom feels like a physical object rather than a slider.
    const camera = { x: 120, y: -40, z: 1 };
    const anchor = { x: 640, y: 360 };
    const before = screenToWorld(camera, anchor);

    const zoomed = zoomAt(camera, anchor, 1.5);
    const after = screenToWorld(zoomed, anchor);

    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
  });

  it("survives repeated zooming without drift", () => {
    // Accumulated float error here shows up as the board slowly sliding away
    // under the cursor over a long session.
    //
    // 12 steps of 1.1 is ~3.14x, deliberately inside MAX_ZOOM: once a zoom
    // clamps, the inverse sequence CANNOT return to the start (the clamped steps
    // were no-ops going up but are real going down). That is correct behaviour,
    // asserted separately below — this test is about float precision only.
    const anchor = { x: 500, y: 300 };
    let camera = { x: 0, y: 0, z: 1 };
    const start = screenToWorld(camera, anchor);

    for (let i = 0; i < 12; i++) camera = zoomAt(camera, anchor, 1.1);
    expect(camera.z).toBeLessThan(MAX_ZOOM);
    for (let i = 0; i < 12; i++) camera = zoomAt(camera, anchor, 1 / 1.1);

    const end = screenToWorld(camera, anchor);
    expect(camera.z).toBeCloseTo(1, 6);
    expect(end.x).toBeCloseTo(start.x, 4);
    expect(end.y).toBeCloseTo(start.y, 4);
  });

  it("holds the anchor fixed even while clamping at the limit", () => {
    // Zooming past the limit must not move the board, and must not accumulate
    // offset — the user keeps scrolling and nothing should slide.
    let camera = { x: 33, y: -77, z: 3.9 };
    const anchor = { x: 400, y: 250 };
    const before = screenToWorld(camera, anchor);

    for (let i = 0; i < 20; i++) camera = zoomAt(camera, anchor, 1.2);

    expect(camera.z).toBe(MAX_ZOOM);
    const after = screenToWorld(camera, anchor);
    expect(after.x).toBeCloseTo(before.x, 6);
    expect(after.y).toBeCloseTo(before.y, 6);
  });

  it("does not translate when already clamped", () => {
    // Otherwise the board creeps sideways every time the user keeps scrolling
    // at maximum zoom.
    const atMax = { x: 10, y: 20, z: MAX_ZOOM };
    expect(zoomAt(atMax, { x: 300, y: 300 }, 2)).toEqual(atMax);

    const atMin = { x: 10, y: 20, z: MIN_ZOOM };
    expect(zoomAt(atMin, { x: 300, y: 300 }, 0.5)).toEqual(atMin);
  });

  it("clamps within bounds", () => {
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(0.0001)).toBe(MIN_ZOOM);
    expect(clampZoom(0.75)).toBe(0.75);
  });
});

describe("visibleWorldRect", () => {
  it("covers exactly the viewport at scale 1", () => {
    const rect = visibleWorldRect(IDENTITY, { width: 1200, height: 800 });
    expect(rect).toEqual({ x: 0, y: 0, w: 1200, h: 800 });
  });

  it("covers more world area when zoomed out", () => {
    const rect = visibleWorldRect({ x: 0, y: 0, z: 0.5 }, { width: 1200, height: 800 });
    expect(rect.w).toBe(2400);
    expect(rect.h).toBe(1600);
  });
});

describe("culling", () => {
  const viewport = { x: 0, y: 0, w: 1000, h: 1000 };

  it("keeps a node that overlaps the viewport", () => {
    expect(rectsIntersect(viewport, { x: 990, y: 990, w: 100, h: 100 })).toBe(true);
  });

  it("drops a node fully outside", () => {
    expect(rectsIntersect(viewport, { x: 2000, y: 0, w: 100, h: 100 })).toBe(false);
  });

  it("keeps a node just outside once the margin is applied", () => {
    // The margin is what stops nodes popping in at the edge during a fast pan.
    const padded = inflate(viewport, 400);
    expect(rectsIntersect(viewport, { x: 1200, y: 0, w: 50, h: 50 })).toBe(false);
    expect(rectsIntersect(padded, { x: 1200, y: 0, w: 50, h: 50 })).toBe(true);
  });
});

describe("boundsOf", () => {
  it("returns null for an empty board", () => {
    expect(boundsOf([])).toBeNull();
  });

  it("wraps every rect", () => {
    expect(
      boundsOf([
        { x: 0, y: 0, w: 100, h: 100 },
        { x: 500, y: -200, w: 50, h: 50 },
      ])
    ).toEqual({ x: 0, y: -200, w: 550, h: 300 });
  });
});

describe("fitToBounds", () => {
  it("centres the content", () => {
    const size = { width: 1000, height: 1000 };
    const bounds = { x: 0, y: 0, w: 200, h: 200 };
    const camera = fitToBounds(bounds, size, 0);

    const centre = worldToScreen(camera, { x: 100, y: 100 });
    expect(centre.x).toBeCloseTo(500, 6);
    expect(centre.y).toBeCloseTo(500, 6);
  });

  it("fits the constraining axis", () => {
    const camera = fitToBounds(
      { x: 0, y: 0, w: 2000, h: 100 },
      { width: 1000, height: 1000 },
      0
    );
    expect(camera.z).toBeCloseTo(0.5, 6);
  });

  it("returns identity rather than dividing by zero", () => {
    // A zero-area selection or an empty board must not blank the screen.
    expect(fitToBounds(null, { width: 100, height: 100 })).toEqual(IDENTITY);
    expect(fitToBounds({ x: 0, y: 0, w: 0, h: 0 }, { width: 100, height: 100 })).toEqual(IDENTITY);
    expect(fitToBounds({ x: 0, y: 0, w: 10, h: 10 }, { width: 0, height: 0 })).toEqual(IDENTITY);
  });
});

describe("wheel normalisation", () => {
  it("passes pixel deltas through", () => {
    expect(normalizeWheelDelta(120, 0)).toBe(120);
  });

  it("scales line deltas — Firefox on Linux reports lines, not pixels", () => {
    expect(normalizeWheelDelta(3, 1)).toBe(48);
  });

  it("scales page deltas", () => {
    expect(normalizeWheelDelta(1, 2)).toBe(400);
  });

  it("produces reciprocal zoom factors so in-then-out returns to the start", () => {
    const inFactor = wheelZoomFactor(-100);
    const outFactor = wheelZoomFactor(100);
    expect(inFactor * outFactor).toBeCloseTo(1, 9);
  });

  it("clamps a violent trackpad flick", () => {
    // Unclamped, one flick jumps from 100% to single-digit percent.
    expect(wheelZoomFactor(5000)).toBeCloseTo(wheelZoomFactor(120), 9);
    expect(wheelZoomFactor(-5000)).toBeCloseTo(wheelZoomFactor(-120), 9);
  });
});
