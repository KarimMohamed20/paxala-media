import type { ChartVariant } from "./chart-scale";

export type { ChartVariant };

export interface TrendPoint {
  /** Stable React key, never rendered. */
  key: string;
  /** Locale-formatted axis label, built by the caller. */
  label: string;
  /** null = not measurable this month → a gap, never a zero. */
  value: number | null;
}

export interface TrendSeries {
  id: string;
  label: string;
  points: TrendPoint[];
  color?: string;
  /** Gradient fill under the line. */
  area?: boolean;
  /** For a reference series such as "planned". */
  dashed?: boolean;
}

export interface ShareRow {
  key: string;
  label: string;
  count: number;
  /** 0-100, apportioned server-side so client and server agree. */
  percent: number;
  icon?: React.ReactNode;
  /** Tailwind bg class for screen. */
  barClassName?: string;
  /** Same colour as a CSS value, for the print <rect>. */
  fill?: string;
}
