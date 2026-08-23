import type { Point, Rect } from "./camera";

/**
 * Geometry for freehand strokes and connectors.
 *
 * Pure and DOM-free so it can be unit-tested: both of these are the kind of
 * arithmetic whose bugs are only visible as "the arrow points slightly wrong"
 * or "the line looks lumpy", which nobody files a reproducible report about.
 */

// ---------------------------------------------------------------------------
// Freehand strokes
// ---------------------------------------------------------------------------

/**
 * Ramer–Douglas–Peucker simplification.
 *
 * A pointer emits a sample every few milliseconds, so a two-second stroke is
 * several hundred points. Persisting those raw would put a ~10KB JSON blob in
 * every DRAWING node and re-render an enormous SVG path on every frame; RDP
 * typically removes 80-90% of them with no visible change to the curve.
 *
 * Iterative rather than recursive: a long stroke on a slow pointer can reach
 * thousands of points, and the naive recursion blows the stack at a depth the
 * developer's fast machine never reaches.
 */
export function simplifyStroke(points: Point[], tolerance = 1.2): Point[] {
  if (points.length <= 2) return [...points];

  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;

  const stack: Array<[number, number]> = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [first, last] = stack.pop()!;
    if (last <= first + 1) continue;

    let maxDistance = 0;
    let index = first;

    for (let i = first + 1; i < last; i++) {
      const distance = perpendicularDistance(points[i], points[first], points[last]);
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }

    if (maxDistance > tolerance) {
      keep[index] = true;
      stack.push([first, index], [index, last]);
    }
  }

  return points.filter((_, i) => keep[i]);
}

function perpendicularDistance(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Degenerate segment: the "line" is a point, so fall back to point distance.
  // Without this the division below is 0/0 and every distance becomes NaN,
  // which silently keeps every sample instead of simplifying.
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const numerator = Math.abs(
    dy * point.x - dx * point.y + end.x * start.y - end.y * start.x
  );
  return numerator / Math.hypot(dx, dy);
}

/**
 * An SVG path through a stroke, smoothed with quadratic midpoints.
 *
 * Each segment curves through the midpoint between consecutive samples, which
 * removes the polygonal look of a straight `L` chain without needing a spline
 * fit. Coordinates are rounded to two decimals: sub-pixel precision is invisible
 * and would otherwise inflate the persisted payload by a third.
 */
export function strokeToPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    // A dot. Rendered as a zero-length line, which a round linecap turns into a
    // circle — tapping to place a dot is a real gesture and must draw something.
    const { x, y } = points[0];
    return `M ${r(x)} ${r(y)} L ${r(x)} ${r(y)}`;
  }

  let path = `M ${r(points[0].x)} ${r(points[0].y)}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    path += ` Q ${r(points[i].x)} ${r(points[i].y)} ${r(midX)} ${r(midY)}`;
  }
  const last = points[points.length - 1];
  path += ` L ${r(last.x)} ${r(last.y)}`;
  return path;
}

function r(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Bounding box of a stroke, padded by half the stroke width. */
export function strokeBounds(points: Point[], strokeWidth = 4): Rect {
  if (points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }

  const pad = strokeWidth / 2 + 1;
  return {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  };
}

// ---------------------------------------------------------------------------
// Connectors
// ---------------------------------------------------------------------------

export type Side = "top" | "right" | "bottom" | "left";

export function rectCentre(rect: Rect): Point {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

/**
 * Which side of `from` faces `to`.
 *
 * Answers the geometric question directly: which edge does the ray from
 * centre(from) to centre(to) exit through? That is decided by comparing the
 * ray's slope against the rect's OWN aspect ratio — dividing each delta by the
 * corresponding half-dimension.
 *
 * Comparing raw pixel deltas instead gets wide and tall cards wrong. A 1200x80
 * banner with something down and to the right of it is a case where the
 * horizontal delta is the larger number, yet the ray still leaves through the
 * bottom edge, because the banner is only 40px tall from its centre. Anchoring
 * to the right edge there draws a connector that visibly starts off the card.
 */
export function autoAnchorSide(from: Rect, to: Rect): Side {
  const a = rectCentre(from);
  const b = rectCentre(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  // Guard against zero-size rects: a degenerate card must not produce NaN and
  // an unrenderable path.
  const halfW = Math.max(0.5, from.w / 2);
  const halfH = Math.max(0.5, from.h / 2);

  if (Math.abs(dx) / halfW >= Math.abs(dy) / halfH) {
    return dx >= 0 ? "right" : "left";
  }
  return dy >= 0 ? "bottom" : "top";
}

/** The point on `rect` where a connector leaves or arrives, for a given side. */
export function anchorPoint(rect: Rect, side: Side): Point {
  switch (side) {
    case "top":
      return { x: rect.x + rect.w / 2, y: rect.y };
    case "bottom":
      return { x: rect.x + rect.w / 2, y: rect.y + rect.h };
    case "left":
      return { x: rect.x, y: rect.y + rect.h / 2 };
    case "right":
      return { x: rect.x + rect.w, y: rect.y + rect.h / 2 };
  }
}

export type ConnectorRoute = {
  path: string;
  start: Point;
  end: Point;
  /** Direction at the end point, in radians — used to orient the arrowhead. */
  endAngle: number;
};

/**
 * Route a connector between two rects as a cubic bezier.
 *
 * Control points project outward along each anchor's normal, which is what makes
 * the curve leave a card perpendicular to its edge rather than cutting across a
 * corner. The projection scales with the distance between the two anchors so
 * short connectors stay tight and long ones bow gently.
 */
export function routeConnector(from: Rect, to: Rect): ConnectorRoute {
  const fromSide = autoAnchorSide(from, to);
  const toSide = opposite(autoAnchorSide(to, from));

  const start = anchorPoint(from, fromSide);
  const end = anchorPoint(to, opposite(toSide));

  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  // Clamped so a very long connector does not develop an absurd bulge, and a
  // very short one still curves enough to read as deliberate.
  const reach = Math.min(160, Math.max(30, distance * 0.4));

  const c1 = project(start, fromSide, reach);
  const c2 = project(end, opposite(toSide), reach);

  return {
    path: `M ${r(start.x)} ${r(start.y)} C ${r(c1.x)} ${r(c1.y)}, ${r(c2.x)} ${r(c2.y)}, ${r(end.x)} ${r(end.y)}`,
    start,
    end,
    // The tangent at t=1 of a cubic points from the last control point to the
    // end point, which is exactly the arrowhead's direction.
    endAngle: Math.atan2(end.y - c2.y, end.x - c2.x),
  };
}

function opposite(side: Side): Side {
  switch (side) {
    case "top":
      return "bottom";
    case "bottom":
      return "top";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}

function project(point: Point, side: Side, distance: number): Point {
  switch (side) {
    case "top":
      return { x: point.x, y: point.y - distance };
    case "bottom":
      return { x: point.x, y: point.y + distance };
    case "left":
      return { x: point.x - distance, y: point.y };
    case "right":
      return { x: point.x + distance, y: point.y };
  }
}

/** Triangle points for an arrowhead at `tip`, pointing along `angle`. */
export function arrowHeadPath(tip: Point, angle: number, size = 9): string {
  const spread = 0.42;
  const left = {
    x: tip.x - size * Math.cos(angle - spread),
    y: tip.y - size * Math.sin(angle - spread),
  };
  const right = {
    x: tip.x - size * Math.cos(angle + spread),
    y: tip.y - size * Math.sin(angle + spread),
  };
  return `M ${r(tip.x)} ${r(tip.y)} L ${r(left.x)} ${r(left.y)} L ${r(right.x)} ${r(right.y)} Z`;
}
