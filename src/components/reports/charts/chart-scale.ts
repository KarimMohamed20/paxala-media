/**
 * Chart maths and theme tokens. Pure — no React, no "use client".
 *
 * The Bézier smoothing is carried over from the deleted `portal/campaign-chart.tsx`,
 * the one part of it worth keeping. Everything else here exists to fix that
 * component's defects: a hardcoded `maxVal = 100000` that pushed real values
 * outside the viewBox, axis labels hardcoded as `100K/75K/50K/25K/0`, and a
 * `points[0]` access that threw on an empty series.
 */

export type ChartVariant = "dark" | "print";

export interface Point {
  x: number;
  y: number;
}

/** Ladder of tick sizes that keep every generated label a clean number. */
const NICE_STEPS = [1, 2, 2.5, 5, 10] as const;

/**
 * A "nice" ceiling divisible by `steps`, so every tick label is clean.
 *
 * The ceiling is **strictly greater** than `rawMax`. Allowing equality pins the
 * series flush to the top of the plot, and with an area fill that renders as a
 * solid block rather than a chart — which is what a flat series of 1s did.
 *
 * Returns `steps` for empty/zero data, so a flat zero line sits honestly on the
 * baseline with labels 4/3/2/1/0 rather than dividing by zero.
 */
export function niceCeil(rawMax: number, steps = 4): number {
  if (!Number.isFinite(rawMax) || rawMax <= 0) return steps;
  const mag = 10 ** Math.floor(Math.log10(rawMax / steps));
  for (let scale = mag; scale <= mag * 100; scale *= 10) {
    for (const n of NICE_STEPS) {
      const ceil = n * scale * steps;
      if (ceil > rawMax) return ceil;
    }
  }
  return rawMax * 1.25;
}

/** Tick values from top to bottom, matching how the axis column renders. */
export function buildTicks(min: number, max: number, steps = 4): number[] {
  const span = max - min;
  return Array.from({ length: steps + 1 }, (_, i) => max - (span * i) / steps);
}

/**
 * Horizontal-midpoint cubic smoothing: control points share the X midpoint, so
 * the curve is continuous and never overshoots horizontally.
 */
export function smoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cpX = (curr.x + next.x) / 2;
    d += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
  }
  return d;
}

export function areaPath(points: Point[], baselineY: number): string {
  if (points.length < 2) return "";
  const last = points[points.length - 1];
  return `${smoothPath(points)} L ${last.x} ${baselineY} L ${points[0].x} ${baselineY} Z`;
}

/**
 * Split a series into contiguous runs of measurable values.
 *
 * A `null` month means "not measurable", not "zero" — plotting it as zero would
 * claim an instant approval turnaround or a total delivery failure. Each run is
 * drawn as its own path so the gap stays a gap.
 */
export function splitSegments<T extends { value: number | null }>(
  points: T[]
): { index: number; point: T }[][] {
  const runs: { index: number; point: T }[][] = [];
  let current: { index: number; point: T }[] = [];
  points.forEach((point, index) => {
    if (point.value === null) {
      if (current.length) runs.push(current);
      current = [];
    } else {
      current.push({ index, point });
    }
  });
  if (current.length) runs.push(current);
  return runs;
}

/** Label stride so a 12-month axis doesn't overlap. Always shows the last. */
export function labelStride(count: number): number {
  return count <= 6 ? 1 : count <= 9 ? 2 : 3;
}

export const CHART_THEME: Record<
  ChartVariant,
  {
    grid: string;
    axisText: string;
    labelText: string;
    dotStroke: string;
    track: string;
    emptyText: string;
  }
> = {
  dark: {
    grid: "rgba(255,255,255,0.06)",
    axisText: "text-white/35",
    labelText: "text-white/55",
    dotStroke: "#0a0a0a",
    track: "bg-white/10",
    emptyText: "text-white/40",
  },
  print: {
    grid: "rgba(0,0,0,0.10)",
    axisText: "text-neutral-500",
    labelText: "text-neutral-600",
    dotStroke: "#ffffff",
    track: "bg-neutral-200",
    emptyText: "text-neutral-400",
  },
};

export const SERIES_COLORS = {
  primary: "#dc2626",
  secondary: "#f59e0b",
  muted: "#71717a",
} as const;
