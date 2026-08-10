import { ContentFormat, ContentStatus, PlanItemStatus } from "@prisma/client";
import { packages } from "@/lib/constants";
import { clampString } from "@/lib/security";

/**
 * Pure helpers for the Monthly Plan: progress maths, deliverable resolution and
 * request validation. No Prisma client, no session — safe to import from both
 * route handlers and client components.
 */

/** ContentItem statuses that count as delivered against a deliverable target. */
export const DELIVERED_STATUSES: ContentStatus[] = [
  ContentStatus.APPROVED,
  ContentStatus.SCHEDULED,
  ContentStatus.PUBLISHED,
];

/**
 * Credit each timeline badge contributes to the completion ring.
 * Half credit for anything started but not finished — that is what makes the
 * ring move during a month instead of jumping at the end.
 */
export const PLAN_ITEM_WEIGHT: Record<PlanItemStatus, number> = {
  [PlanItemStatus.COMPLETED]: 1,
  [PlanItemStatus.IN_PROGRESS]: 0.5,
  [PlanItemStatus.AWAITING_CLIENT]: 0.5,
  [PlanItemStatus.SCHEDULED]: 0,
};

export interface PlanProgress {
  /** 0-100, rounded. The ring. */
  percent: number;
  timeline: {
    completed: number;
    inFlight: number;
    total: number;
    score: number;
    percent: number;
  };
  deliverables: { done: number; target: number; percent: number };
}

const pct = (num: number, den: number) =>
  den <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((num / den) * 100)));

/**
 * Overall plan completion.
 *
 * One credit unit per deliverable unit and per timeline item, combined into a
 * single ratio. Neither half alone reproduces a believable figure: a plan can
 * have every task done while half the deliverables are outstanding.
 *
 * Over-delivery is clamped per row (`min(done, target)`) so 5-of-4 cannot push
 * the ring past 100 — the chip still shows the raw 5.
 */
export function calculatePlanProgress(input: {
  weeks: { items: { status: PlanItemStatus }[] }[];
  deliverables: { target: number; done: number }[];
}): PlanProgress {
  let completed = 0;
  let inFlight = 0;
  let total = 0;
  let score = 0;

  for (const week of input.weeks) {
    for (const item of week.items) {
      total += 1;
      score += PLAN_ITEM_WEIGHT[item.status] ?? 0;
      if (item.status === PlanItemStatus.COMPLETED) completed += 1;
      else if (item.status !== PlanItemStatus.SCHEDULED) inFlight += 1;
    }
  }

  let done = 0;
  let target = 0;
  for (const d of input.deliverables) {
    // A target of 0 is not a deliverable anyone is tracking — skip both sides
    // so it cannot drag the ratio down.
    if (d.target <= 0) continue;
    target += d.target;
    done += Math.min(Math.max(d.done, 0), d.target);
  }

  const combinedNum = done + score;
  const combinedDen = target + total;

  return {
    percent: pct(combinedNum, combinedDen),
    timeline: {
      completed,
      inFlight,
      total,
      score,
      percent: pct(score, total),
    },
    deliverables: { done, target, percent: pct(done, target) },
  };
}

// ---------------------------------------------------------------------------
// Deliverables
// ---------------------------------------------------------------------------

export interface FormatCount {
  format: ContentFormat;
  _count: number;
}

export interface DeliverableInput {
  id: string;
  label: string;
  icon: string | null;
  target: number;
  formats: ContentFormat[];
  manualDone: number | null;
  order: number;
}

export interface DeliverableRow extends Omit<DeliverableInput, "manualDone"> {
  done: number;
  percent: number;
  /** true when `done` came from the content calendar, false when hand-entered. */
  auto: boolean;
}

/**
 * Resolve each deliverable's `done` from one pre-aggregated format count.
 *
 * The caller runs a single `groupBy({ by: ["format"] })` for the whole month, so
 * this stays O(rows) with no per-row query.
 */
export function resolveDeliverables(
  rows: DeliverableInput[],
  formatCounts: FormatCount[]
): DeliverableRow[] {
  const counts = new Map<ContentFormat, number>(
    formatCounts.map((g) => [g.format, g._count])
  );

  return rows.map(({ manualDone, ...row }) => {
    const auto = row.formats.length > 0;
    const done = auto
      ? row.formats.reduce((sum, f) => sum + (counts.get(f) ?? 0), 0)
      : manualDone ?? 0;
    return { ...row, done, auto, percent: pct(Math.min(done, row.target), row.target) };
  });
}

// ---------------------------------------------------------------------------
// Validation — hand-rolled; the project has no zod
// ---------------------------------------------------------------------------

/** Lucide icon names an admin may pick for a deliverable tile. */
export const DELIVERABLE_ICONS = [
  "Video",
  "Camera",
  "Share2",
  "Megaphone",
  "Palette",
  "Globe",
  "PenTool",
  "BarChart3",
  "FileText",
  "Sparkles",
] as const;

export type DeliverableIcon = (typeof DELIVERABLE_ICONS)[number];

export const PLAN_LIMITS = {
  TITLE: 200,
  SUBTITLE: 160,
  OBJECTIVE: 4000,
  TAG: 40,
  TAGS: 6,
  LABEL: 120,
  NOTE: 500,
  DELIVERABLES: 12,
  KEY_DATES: 20,
  WEEKS: 6,
  ITEMS_PER_WEEK: 12,
  ACTIONS: 20,
  TEAM: 12,
  CHANGE_MESSAGE: 4000,
} as const;

function parseEnum<T extends Record<string, string>>(
  enumObj: T,
  value: unknown
): T[keyof T] | undefined {
  if (typeof value !== "string") return undefined;
  return Object.values(enumObj).includes(value)
    ? (value as T[keyof T])
    : undefined;
}

export const parsePlanItemStatus = (v: unknown) => parseEnum(PlanItemStatus, v);

export function parseDeliverableIcon(v: unknown): string | null {
  return typeof v === "string" &&
    (DELIVERABLE_ICONS as readonly string[]).includes(v)
    ? v
    : null;
}

/** Deduped, whitelisted, capped. Anything unrecognised is dropped, not rejected. */
export function parseContentFormats(v: unknown): ContentFormat[] {
  if (!Array.isArray(v)) return [];
  const valid = Object.values(ContentFormat) as string[];
  const seen = new Set<string>();
  const out: ContentFormat[] = [];
  for (const raw of v) {
    if (typeof raw !== "string" || !valid.includes(raw) || seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw as ContentFormat);
  }
  return out.slice(0, Object.values(ContentFormat).length);
}

/** Validate against the packages constant — ids are code, not database rows. */
export function parsePackageId(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  return packages.some((p) => p.id === v) ? v : null;
}

export function resolvePackage(packageId: string | null | undefined) {
  if (!packageId) return null;
  const pkg = packages.find((p) => p.id === packageId);
  return pkg ? { id: pkg.id, name: pkg.name, tier: pkg.tier } : null;
}

export function parseTags(v: unknown, max = PLAN_LIMITS.TAGS): string[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of v) {
    const tag = clampString(raw, PLAN_LIMITS.TAG);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= max) break;
  }
  return out;
}

/** Non-negative integer, or null when absent/invalid. */
export function parseCount(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/** UTC month bounds — `scheduledAt` is stored in UTC. */
export function monthWindow(year: number, month: number) {
  return {
    startDate: new Date(Date.UTC(year, month - 1, 1)),
    endDate: new Date(Date.UTC(year, month, 1)),
  };
}

export function isValidMonthYear(month: number, year: number): boolean {
  return (
    Number.isInteger(month) &&
    month >= 1 &&
    month <= 12 &&
    Number.isInteger(year) &&
    year >= 2000 &&
    year <= 2100
  );
}
