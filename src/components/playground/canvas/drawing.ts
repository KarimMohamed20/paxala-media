/**
 * Geometry for DRAWING nodes.
 *
 * A drawing's points are stored relative to the box it was CREATED with. For
 * a resize to scale the artwork, the SVG viewBox must stay at those creation
 * bounds while the element stretches — the same trick ShapeBody uses with its
 * fixed 0..100 viewBox. Using the current w/h as the viewBox (the old bug)
 * grew the canvas around a fixed-size path, so resizing appeared to do
 * nothing.
 */

export type DrawingNodeShape = {
  w: number;
  h: number;
  data: Record<string, unknown>;
};

/** The box the stored points are relative to — the viewBox to render with. */
export function drawingBaseSize(node: DrawingNodeShape): { w: number; h: number } {
  const { baseW, baseH } = node.data;
  if (isPositive(baseW) && isPositive(baseH)) {
    return { w: baseW, h: baseH };
  }

  // Drawings created before baseW/baseH shipped: reconstruct the creation
  // bounds from the points themselves. strokeBounds pads both sides equally,
  // so within the node box min ≈ pad and max ≈ w − pad, giving
  // base = min + max exactly (to the 2-decimal rounding of stored points).
  const points = Array.isArray(node.data.points)
    ? (node.data.points as Array<{ x?: unknown; y?: unknown }>)
    : [];

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    if (typeof point?.x !== "number" || typeof point?.y !== "number") continue;
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }

  if (Number.isFinite(minX) && Number.isFinite(minY)) {
    return {
      w: Math.max(1, minX + maxX),
      h: Math.max(1, minY + maxY),
    };
  }

  // No usable points: render 1:1, exactly the old behaviour.
  return { w: Math.max(1, node.w), h: Math.max(1, node.h) };
}

function isPositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
