import {
  ContentApprovalAction,
  ContentStatus,
  PlanItemStatus,
  Role,
} from "@prisma/client";

/**
 * Pure maths for the client Reports page. No Prisma, no session — importable
 * from both route handlers and client components, like `monthly-plan.ts`.
 *
 * The governing rule: **every ratio is `number | null`.** `null` means "no
 * denominator", never `0`. A month with zero reviewed items must not render
 * "0% first-pass approval" — that reads as failure rather than as absence.
 * Each rate therefore ships beside the counts it came from, plus a sample size
 * and a confidence flag.
 */

// ---------------------------------------------------------------------------
// Safe arithmetic
// ---------------------------------------------------------------------------

export function safeDiv(num: number, den: number, fallback = 0): number {
  return den > 0 && Number.isFinite(num) ? num / den : fallback;
}

/** 0-100 integer, clamped. Use when a zero denominator genuinely means zero. */
export function safePct(num: number, den: number): number {
  if (den <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((num / den) * 100)));
}

/** 0-100 integer, or null when there is nothing to divide by. The default. */
export function safeRate(num: number, den: number): number | null {
  if (den <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((num / den) * 100)));
}

/** Round to `dp` decimals, or null. Keeps day figures readable. */
export function round(value: number | null, dp = 1): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const f = 10 ** dp;
  return Math.round(value * f) / f;
}

// ---------------------------------------------------------------------------
// Percentiles
// ---------------------------------------------------------------------------

/**
 * Linear-interpolated percentile, matching Postgres `percentile_cont`.
 * Copies before sorting (never mutates the caller) and sorts numerically —
 * the default sort is lexicographic, which ranks 10 below 2.
 */
export function percentile(values: number[], p: number): number | null {
  const v = values.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  if (v.length === 1) return v[0];
  const idx = (v.length - 1) * Math.max(0, Math.min(1, p));
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return v[lo];
  return v[lo] + (v[hi] - v[lo]) * (idx - lo);
}

export const median = (v: number[]) => percentile(v, 0.5);
export const p90 = (v: number[]) => percentile(v, 0.9);

export function mean(values: number[]): number | null {
  const v = values.filter((n) => Number.isFinite(n));
  if (v.length === 0) return null;
  return v.reduce((s, n) => s + n, 0) / v.length;
}

// ---------------------------------------------------------------------------
// Confidence
// ---------------------------------------------------------------------------

export const LOW_CONFIDENCE_SAMPLE = 5;

export type Confidence = "OK" | "LOW_SAMPLE" | "NO_DATA";

export function confidenceOf(
  sampleSize: number,
  min = LOW_CONFIDENCE_SAMPLE
): Confidence {
  if (sampleSize <= 0) return "NO_DATA";
  return sampleSize < min ? "LOW_SAMPLE" : "OK";
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export const MS_PER_DAY = 86_400_000;

const asDate = (v: Date | string) => (v instanceof Date ? v : new Date(v));

/** Fractional, signed. */
export function daysBetween(from: Date | string, to: Date | string): number {
  return (asDate(to).getTime() - asDate(from).getTime()) / MS_PER_DAY;
}

/** Whole UTC days since epoch — for calendar-day comparisons. */
export function utcDayIndex(d: Date | string): number {
  return Math.floor(asDate(d).getTime() / MS_PER_DAY);
}

export interface MonthKey {
  year: number;
  month: number;
  key: string;
}

export const monthKey = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}`;

export function monthKeyOf(date: Date | string): string {
  const d = asDate(date);
  return monthKey(d.getUTCFullYear(), d.getUTCMonth() + 1);
}

export function previousMonth(year: number, month: number) {
  const d = new Date(Date.UTC(year, month - 2, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/** Ascending, ending at (year, month) inclusive. */
export function rollingMonths(
  year: number,
  month: number,
  count: number
): MonthKey[] {
  const out: MonthKey[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    out.push({ year: y, month: m, key: monthKey(y, m) });
  }
  return out;
}

/** UTC bounds spanning `count` months back from (year, month) inclusive. */
export function rangeWindow(year: number, month: number, count: number) {
  return {
    startDate: new Date(Date.UTC(year, month - count, 1)),
    endDate: new Date(Date.UTC(year, month, 1)),
  };
}

export function bucketByMonth<T>(
  rows: T[],
  at: (row: T) => Date | string | null | undefined
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const when = at(row);
    if (!when) continue;
    const key = monthKeyOf(when);
    const bucket = map.get(key);
    if (bucket) bucket.push(row);
    else map.set(key, [row]);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Deltas
// ---------------------------------------------------------------------------

export type DeltaKind = "absolute" | "points" | "relative";

export interface Delta {
  current: number | null;
  previous: number | null;
  change: number | null;
  kind: DeltaKind;
  direction: "up" | "down" | "flat" | "unknown";
}

const directionOf = (change: number | null): Delta["direction"] => {
  if (change === null) return "unknown";
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
};

/**
 * Absolute difference. `kind: "points"` labels a percentage-point change so the
 * UI can render "+6 pts" rather than an ambiguous "% of a %".
 */
export function deltaAbsolute(
  current: number | null,
  previous: number | null,
  kind: "absolute" | "points" = "absolute"
): Delta {
  const change =
    current === null || previous === null ? null : round(current - previous, 1);
  return { current, previous, change, kind, direction: directionOf(change) };
}

/** Percentage change. A previous of 0 or null yields null — not Infinity. */
export function deltaRelative(
  current: number | null,
  previous: number | null
): Delta {
  const change =
    current === null || previous === null || previous === 0
      ? null
      : round(((current - previous) / previous) * 100, 1);
  return {
    current,
    previous,
    change,
    kind: "relative",
    direction: directionOf(change),
  };
}

// ---------------------------------------------------------------------------
// Share percentages
// ---------------------------------------------------------------------------

/**
 * Largest-remainder apportionment, so the results sum to exactly 100.
 * Naive rounding can print 101% — which the existing calendar platform-mix does.
 */
export function largestRemainderPercentages(counts: number[]): number[] {
  const total = counts.reduce((s, n) => s + n, 0);
  if (total <= 0) return counts.map(() => 0);

  const exact = counts.map((c) => (c / total) * 100);
  const floors = exact.map(Math.floor);
  let remainder = 100 - floors.reduce((s, n) => s + n, 0);

  const order = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  const out = [...floors];
  for (const { i } of order) {
    if (remainder <= 0) break;
    out[i] += 1;
    remainder -= 1;
  }
  return out;
}

export interface MixEntry<T extends string = string> {
  name: T;
  count: number;
  percentage: number;
}

/** Sorted count desc then name asc, so print output is stable. */
export function toMixEntries<T extends string>(
  groups: { key: T; count: number }[]
): MixEntry<T>[] {
  const sorted = [...groups]
    .filter((g) => g.count > 0)
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  const pcts = largestRemainderPercentages(sorted.map((g) => g.count));
  return sorted.map((g, i) => ({
    name: g.key,
    count: g.count,
    percentage: pcts[i],
  }));
}

// ---------------------------------------------------------------------------
// Review analytics — the core of the report
// ---------------------------------------------------------------------------

export interface ApprovalLogRow {
  contentItemId: string;
  action: ContentApprovalAction;
  reviewerRole: Role;
  createdAt: Date | string;
}

export interface ReviewOutcome {
  itemId: string;
  /** First SUBMITTED → first following verdict, in days. Null when unmeasurable. */
  turnaroundDays: number | null;
  verdictBy: "CLIENT" | "AGENCY" | null;
  rejections: number;
  reachedVerdict: boolean;
  /** Submitted with no verdict after it. */
  pending: boolean;
  /** Ended on a rejection with no resubmission or approval. */
  abandoned: boolean;
  /** A verdict exists with no preceding submission — the log is incomplete. */
  verdictWithoutSubmission: boolean;
}

/**
 * Reduce an approval log into one outcome per content item.
 *
 * Sorts defensively by (itemId, createdAt) so a caller cannot get the contract
 * wrong. Only the FIRST review round is timed — later rounds are carried by
 * `rejections` rather than blended into the turnaround, which would flatter a
 * slow first review with a fast second one.
 */
export function summarizeReviews(
  rows: ApprovalLogRow[]
): Map<string, ReviewOutcome> {
  const sorted = [...rows].sort(
    (a, b) =>
      a.contentItemId.localeCompare(b.contentItemId) ||
      asDate(a.createdAt).getTime() - asDate(b.createdAt).getTime()
  );

  const out = new Map<string, ReviewOutcome>();
  // Local, not module-level: two requests reduce logs concurrently in the same
  // Node process, and shared scratch state would cross-contaminate them.
  const firstSubmit = new Map<string, Date>();

  for (const row of sorted) {
    let o = out.get(row.contentItemId);
    if (!o) {
      o = {
        itemId: row.contentItemId,
        turnaroundDays: null,
        verdictBy: null,
        rejections: 0,
        reachedVerdict: false,
        pending: false,
        abandoned: false,
        verdictWithoutSubmission: false,
      };
      out.set(row.contentItemId, o);
    }

    const isVerdict =
      row.action === ContentApprovalAction.APPROVED ||
      row.action === ContentApprovalAction.REJECTED;

    if (row.action === ContentApprovalAction.SUBMITTED) {
      // Remember the first submission only.
      if (firstSubmit.get(row.contentItemId) === undefined) {
        firstSubmit.set(row.contentItemId, asDate(row.createdAt));
      }
      o.pending = true;
      o.abandoned = false;
      continue;
    }

    if (!isVerdict) continue;

    if (row.action === ContentApprovalAction.REJECTED) o.rejections += 1;
    o.reachedVerdict = true;
    o.pending = false;
    o.abandoned = row.action === ContentApprovalAction.REJECTED;

    // Time only the first verdict that follows the first submission.
    if (o.turnaroundDays === null && o.verdictBy === null) {
      const submitted = firstSubmit.get(row.contentItemId);
      if (submitted) {
        o.turnaroundDays = Math.max(
          0,
          daysBetween(submitted, row.createdAt)
        );
      } else {
        o.verdictWithoutSubmission = true;
      }
      o.verdictBy = row.reviewerRole === Role.CLIENT ? "CLIENT" : "AGENCY";
    }
  }

  return out;
}

export interface TurnaroundBucket {
  median: number | null;
  p90: number | null;
  mean: number | null;
  sampleSize: number;
}

export interface ReviewStats {
  turnaround: {
    all: TurnaroundBucket;
    byReviewer: { client: TurnaroundBucket; agency: TurnaroundBucket };
    confidence: Confidence;
  };
  firstPass: {
    passed: number;
    total: number;
    rate: number | null;
    confidence: Confidence;
  };
  revisionDepth: { zero: number; one: number; twoPlus: number; total: number };
  coverage: {
    items: number;
    submitted: number;
    reachedVerdict: number;
    pending: number;
    notSubmitted: number;
    verdictWithoutSubmission: number;
  };
}

const bucketOf = (values: number[]): TurnaroundBucket => ({
  median: round(median(values), 1),
  p90: round(p90(values), 1),
  mean: round(mean(values), 1),
  sampleSize: values.length,
});

export function aggregateReviews(
  outcomes: ReviewOutcome[],
  totalItems: number
): ReviewStats {
  const measured = outcomes.filter((o) => o.turnaroundDays !== null);
  const all = measured.map((o) => o.turnaroundDays!);
  const client = measured
    .filter((o) => o.verdictBy === "CLIENT")
    .map((o) => o.turnaroundDays!);
  const agency = measured
    .filter((o) => o.verdictBy === "AGENCY")
    .map((o) => o.turnaroundDays!);

  const reviewed = outcomes.filter((o) => o.reachedVerdict);
  const passed = reviewed.filter((o) => o.rejections === 0).length;

  return {
    turnaround: {
      all: bucketOf(all),
      byReviewer: { client: bucketOf(client), agency: bucketOf(agency) },
      confidence: confidenceOf(all.length),
    },
    firstPass: {
      passed,
      total: reviewed.length,
      rate: safeRate(passed, reviewed.length),
      confidence: confidenceOf(reviewed.length),
    },
    revisionDepth: {
      zero: reviewed.filter((o) => o.rejections === 0).length,
      one: reviewed.filter((o) => o.rejections === 1).length,
      twoPlus: reviewed.filter((o) => o.rejections >= 2).length,
      total: reviewed.length,
    },
    coverage: {
      items: totalItems,
      submitted: outcomes.length,
      reachedVerdict: reviewed.length,
      pending: outcomes.filter((o) => o.pending).length,
      notSubmitted: Math.max(0, totalItems - outcomes.length),
      verdictWithoutSubmission: outcomes.filter(
        (o) => o.verdictWithoutSubmission
      ).length,
    },
  };
}

// ---------------------------------------------------------------------------
// Schedule adherence
// ---------------------------------------------------------------------------

export interface ScheduleRow {
  status: ContentStatus;
  scheduledAt: Date | string;
  publishedAt: Date | string | null;
}

export interface ScheduleAdherence {
  published: number;
  measurable: number;
  /** PUBLISHED rows with no publishedAt — real, see the POST path. */
  unknown: number;
  onTime: number;
  late: number;
  onTimeRate: number | null;
  avgDaysLate: number | null;
  medianDaysLate: number | null;
  confidence: Confidence;
}

/**
 * Compares UTC calendar days, not instants: publishing at 23:50Z on the
 * scheduled day is on time, not 0.6 days late. `avgDaysLate` averages over late
 * rows only — folding the early ones in produces a flattering meaningless number.
 */
export function calculateScheduleAdherence(
  rows: ScheduleRow[]
): ScheduleAdherence {
  const published = rows.filter((r) => r.status === ContentStatus.PUBLISHED);
  const measurableRows = published.filter((r) => r.publishedAt);

  let onTime = 0;
  const lateBy: number[] = [];

  for (const r of measurableRows) {
    const diff = utcDayIndex(r.publishedAt!) - utcDayIndex(r.scheduledAt);
    if (diff <= 0) onTime += 1;
    else lateBy.push(diff);
  }

  return {
    published: published.length,
    measurable: measurableRows.length,
    unknown: published.length - measurableRows.length,
    onTime,
    late: lateBy.length,
    onTimeRate: safeRate(onTime, measurableRows.length),
    avgDaysLate: round(mean(lateBy), 1),
    medianDaysLate: round(median(lateBy), 1),
    confidence: confidenceOf(measurableRows.length),
  };
}

// ---------------------------------------------------------------------------
// Delivery
// ---------------------------------------------------------------------------

export interface DeliveryResult {
  delivered: number;
  planned: number;
  rate: number | null;
  /** NO_PLAN when nothing was targeted — the calendar auto-creates bare plans. */
  state: "OK" | "NO_PLAN";
}

export function calculateDelivery(
  delivered: number,
  planned: number
): DeliveryResult {
  if (planned <= 0) {
    return { delivered, planned: 0, rate: null, state: "NO_PLAN" };
  }
  return {
    delivered,
    planned,
    rate: safeRate(delivered, planned),
    state: "OK",
  };
}

// ---------------------------------------------------------------------------
// Collaboration
// ---------------------------------------------------------------------------

export interface DueRow {
  dueAt: Date | string | null;
  completedAt: Date | string | null;
  status?: PlanItemStatus;
}

export interface Responsiveness {
  total: number;
  /** Rows with a due date — the only ones punctuality can be judged on. */
  measurable: number;
  completed: number;
  outstanding: number;
  onTime: number;
  late: number;
  onTimeRate: number | null;
  medianDaysToComplete: number | null;
  confidence: Confidence;
}

export function calculateResponsiveness(rows: DueRow[]): Responsiveness {
  const withDue = rows.filter((r) => r.dueAt);
  const completed = withDue.filter((r) => r.completedAt);

  let onTime = 0;
  let late = 0;
  const durations: number[] = [];

  for (const r of completed) {
    const diff = utcDayIndex(r.completedAt!) - utcDayIndex(r.dueAt!);
    if (diff <= 0) onTime += 1;
    else late += 1;
    durations.push(Math.max(0, daysBetween(r.dueAt!, r.completedAt!)));
  }

  return {
    total: rows.length,
    measurable: withDue.length,
    completed: completed.length,
    outstanding: withDue.length - completed.length,
    onTime,
    late,
    onTimeRate: safeRate(onTime, completed.length),
    medianDaysToComplete: round(median(durations), 1),
    confidence: confidenceOf(completed.length),
  };
}

export interface ResolutionTimes {
  total: number;
  resolved: number;
  open: number;
  medianDays: number | null;
  p90Days: number | null;
  confidence: Confidence;
}

export function calculateResolutionTimes(
  rows: { createdAt: Date | string; resolvedAt: Date | string | null }[]
): ResolutionTimes {
  const resolved = rows.filter((r) => r.resolvedAt);
  const days = resolved.map((r) =>
    Math.max(0, daysBetween(r.createdAt, r.resolvedAt!))
  );
  return {
    total: rows.length,
    resolved: resolved.length,
    open: rows.length - resolved.length,
    medianDays: round(median(days), 1),
    p90Days: round(p90(days), 1),
    confidence: confidenceOf(resolved.length),
  };
}

// ---------------------------------------------------------------------------
// Range validation
// ---------------------------------------------------------------------------

export const REPORT_RANGES = [3, 6, 12] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];
export const DEFAULT_RANGE: ReportRange = 6;

/** A filter, so an unrecognised value is silently clamped rather than a 400. */
export function parseRange(v: unknown): ReportRange {
  const n = Number(v);
  return (REPORT_RANGES as readonly number[]).includes(n)
    ? (n as ReportRange)
    : DEFAULT_RANGE;
}

/** Row caps. Hitting one sets confidence.truncated rather than lying silently. */
export const REPORT_LIMITS = {
  ITEMS: 1500,
  APPROVALS: 6000,
  COMMENTS: 4000,
  FILES: 3000,
  CHANGE_REQUESTS: 50,
} as const;
