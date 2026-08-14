/**
 * Canvas camera math.
 *
 * Pure and dependency-free so it can be unit-tested without a DOM — the zoom
 * anchoring in particular is the kind of arithmetic that is either exactly right
 * or subtly, infuriatingly wrong, and "the board drifts when I zoom" is not a
 * bug anyone enjoys reproducing by hand.
 *
 * MODEL: the world layer is a single element carrying
 *     transform: translate(<x>px, <y>px) scale(<z>)
 * with `transform-origin: 0 0`. Nodes are positioned at world coordinates inside
 * it, so panning and zooming are ONE style write regardless of node count.
 *
 * Because transform-origin is the top-left corner, world -> screen is:
 *     screen = world * z + offset
 * Everything below follows from that one line.
 */

export type Camera = {
  /** Screen-space offset of the world origin, in CSS pixels. */
  x: number;
  y: number;
  /** Scale. 1 means one world unit per CSS pixel. */
  z: number;
};

export type Point = { x: number; y: number };

export type Rect = { x: number; y: number; w: number; h: number };

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 4;

/**
 * Below this scale a node is drawn as a plain block instead of its real content.
 * At 35% a sticky note's text is ~4px tall — illegible, but still costing a full
 * layout and paint per node. The LOD block keeps a 500-node board smooth when
 * zoomed out to survey it, which is exactly when the node count is highest.
 */
export const LOD_THRESHOLD = 0.35;

export const IDENTITY: Camera = { x: 0, y: 0, z: 1 };

export function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

export function worldToScreen(camera: Camera, point: Point): Point {
  return {
    x: point.x * camera.z + camera.x,
    y: point.y * camera.z + camera.y,
  };
}

export function screenToWorld(camera: Camera, point: Point): Point {
  return {
    x: (point.x - camera.x) / camera.z,
    y: (point.y - camera.y) / camera.z,
  };
}

/**
 * Zoom while keeping the world point under `anchor` (a screen coordinate)
 * exactly where it is.
 *
 * This is what makes ctrl+wheel and pinch feel like the board is a physical
 * object rather than a slider: the pixel under the cursor does not move.
 */
export function zoomAt(camera: Camera, anchor: Point, factor: number): Camera {
  const z = clampZoom(camera.z * factor);
  // Already at a limit — do not translate, or the board creeps on every event.
  if (z === camera.z) return camera;

  const world = screenToWorld(camera, anchor);
  return {
    z,
    x: anchor.x - world.x * z,
    y: anchor.y - world.y * z,
  };
}

/** Set an absolute zoom level, still anchored to a screen point. */
export function zoomTo(camera: Camera, anchor: Point, z: number): Camera {
  const next = clampZoom(z);
  if (next === camera.z) return camera;
  const world = screenToWorld(camera, anchor);
  return { z: next, x: anchor.x - world.x * next, y: anchor.y - world.y * next };
}

export function panBy(camera: Camera, dx: number, dy: number): Camera {
  return { ...camera, x: camera.x + dx, y: camera.y + dy };
}

/** The world-space rectangle currently visible in a viewport of `size`. */
export function visibleWorldRect(
  camera: Camera,
  size: { width: number; height: number }
): Rect {
  const topLeft = screenToWorld(camera, { x: 0, y: 0 });
  return {
    x: topLeft.x,
    y: topLeft.y,
    w: size.width / camera.z,
    h: size.height / camera.z,
  };
}

/** Grow a rect by `margin` on every side. */
export function inflate(rect: Rect, margin: number): Rect {
  return {
    x: rect.x - margin,
    y: rect.y - margin,
    w: rect.w + margin * 2,
    h: rect.h + margin * 2,
  };
}

/** Do two axis-aligned rectangles overlap? Touching edges count as overlapping. */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x <= b.x + b.w &&
    a.x + a.w >= b.x &&
    a.y <= b.y + b.h &&
    a.y + a.h >= b.y
  );
}

export function rectContains(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  );
}

/** Bounding box of a set of rects, or null when empty. */
export function boundsOf(rects: readonly Rect[]): Rect | null {
  if (rects.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const r of rects) {
    if (r.x < minX) minX = r.x;
    if (r.y < minY) minY = r.y;
    if (r.x + r.w > maxX) maxX = r.x + r.w;
    if (r.y + r.h > maxY) maxY = r.y + r.h;
  }

  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * Camera that fits `bounds` inside `size` with padding.
 *
 * Used by zoom-to-fit and by "focus this node". Degenerate bounds (a zero-area
 * selection, or an empty board) return the identity camera rather than dividing
 * by zero and blanking the screen.
 */
export function fitToBounds(
  bounds: Rect | null,
  size: { width: number; height: number },
  padding = 80
): Camera {
  if (!bounds || bounds.w <= 0 || bounds.h <= 0) return IDENTITY;
  if (size.width <= 0 || size.height <= 0) return IDENTITY;

  const usableW = Math.max(1, size.width - padding * 2);
  const usableH = Math.max(1, size.height - padding * 2);
  const z = clampZoom(Math.min(usableW / bounds.w, usableH / bounds.h));

  // Centre the bounds in the viewport at the chosen scale.
  return {
    z,
    x: size.width / 2 - (bounds.x + bounds.w / 2) * z,
    y: size.height / 2 - (bounds.y + bounds.h / 2) * z,
  };
}

/** The CSS transform string for the world layer. */
export function cameraTransform(camera: Camera): string {
  // translate before scale, matching the screen = world * z + offset model.
  return `translate(${camera.x}px, ${camera.y}px) scale(${camera.z})`;
}

/**
 * Normalise a wheel event's delta to CSS pixels.
 *
 * Browsers report three different units. Firefox on Linux commonly sends
 * DOM_DELTA_LINE, where a raw delta of 3 means "three lines" — treating that as
 * 3 pixels makes the canvas feel broken on exactly one platform, which is the
 * kind of bug that never reproduces on the developer's machine.
 */
export function normalizeWheelDelta(
  deltaY: number,
  deltaMode: number
): number {
  if (deltaMode === 1) return deltaY * 16; // DOM_DELTA_LINE
  if (deltaMode === 2) return deltaY * 400; // DOM_DELTA_PAGE
  return deltaY; // DOM_DELTA_PIXEL
}

/**
 * Wheel delta -> zoom factor.
 *
 * Exponential so each notch is a constant proportion: zooming out and back in
 * returns to exactly the previous scale, which a linear step does not do.
 * Clamped because a trackpad pinch can emit deltas in the hundreds, and an
 * unclamped exponent turns one flick into a jump from 100% to 5%.
 */
export function wheelZoomFactor(pixelDelta: number): number {
  const clamped = Math.max(-120, Math.min(120, pixelDelta));
  return Math.exp(-clamped * 0.002);
}
