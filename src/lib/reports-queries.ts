import { Prisma, Role } from "@prisma/client";
import { db } from "@/lib/db";
import {
  DELIVERED_STATUSES,
  calculatePlanProgress,
  resolveDeliverables,
} from "@/lib/monthly-plan";
import {
  Confidence,
  MixEntry,
  REPORT_LIMITS,
  ReportRange,
  aggregateReviews,
  bucketByMonth,
  calculateDelivery,
  calculateResolutionTimes,
  calculateResponsiveness,
  calculateScheduleAdherence,
  confidenceOf,
  deltaAbsolute,
  monthKey,
  monthKeyOf,
  previousMonth,
  rangeWindow,
  rollingMonths,
  safeRate,
  summarizeReviews,
  toMixEntries,
} from "@/lib/reports";

/**
 * Data access + assembly for the client Reports page.
 *
 * Lives here rather than in the route file because App Router route modules may
 * only export HTTP handlers — the same reason `monthly-plan-queries.ts` exists.
 *
 * Strategy: bounded, index-served `findMany`s in two dependent waves, then one
 * JS pass. Prisma `groupBy` cannot DATE_TRUNC (see api/admin/stats/route.ts,
 * which groups by exact timestamp and is silently useless), and introducing raw
 * SQL would mean the codebase's first `Prisma.sql` parameterisation with no test
 * framework to protect it.
 */

// ---------------------------------------------------------------------------
// Raw fetch
// ---------------------------------------------------------------------------

export const reportItemSelect = {
  id: true,
  status: true,
  platform: true,
  format: true,
  scheduledAt: true,
  publishedAt: true,
} satisfies Prisma.ContentItemSelect;

export const reportPlanSelect = {
  id: true,
  month: true,
  year: true,
  isPublished: true,
  deliverables: {
    select: {
      id: true,
      label: true,
      icon: true,
      target: true,
      formats: true,
      manualDone: true,
      order: true,
    },
    orderBy: { order: "asc" },
  },
  weeks: { select: { items: { select: { status: true } } } },
  actions: { select: { dueAt: true, completedAt: true, status: true } },
  changeRequests: {
    select: { createdAt: true, resolvedAt: true, status: true },
    orderBy: { createdAt: "desc" },
    take: REPORT_LIMITS.CHANGE_REQUESTS,
  },
} satisfies Prisma.ContentPlanSelect;

export interface ReportRawData {
  items: Prisma.ContentItemGetPayload<{ select: typeof reportItemSelect }>[];
  plans: Prisma.ContentPlanGetPayload<{ select: typeof reportPlanSelect }>[];
  files: { createdAt: Date; size: number | null; category: string | null }[];
  approvals: {
    contentItemId: string;
    action: "SUBMITTED" | "APPROVED" | "REJECTED";
    reviewerRole: Role;
    createdAt: Date;
  }[];
  comments: { contentItemId: string; authorRole: Role; resolved: boolean }[];
  truncated: boolean;
}

/**
 * Fetches `months.length` months of raw rows for one client.
 * Callers pass `range + 1` months so a month-over-month delta is always
 * computable; the extra oldest month is sliced off the trend afterwards.
 */
export async function fetchReportData(
  clientId: string,
  months: { year: number; month: number }[]
): Promise<ReportRawData> {
  const first = months[0];
  const last = months[months.length - 1];
  const startDate = new Date(Date.UTC(first.year, first.month - 1, 1));
  const endDate = new Date(Date.UTC(last.year, last.month, 1));

  let truncated = false;

  const [items, plans, files] = await Promise.all([
    db.contentItem.findMany({
      where: { plan: { clientId }, scheduledAt: { gte: startDate, lt: endDate } },
      select: reportItemSelect,
      orderBy: { scheduledAt: "asc" },
      take: REPORT_LIMITS.ITEMS,
    }),
    db.contentPlan.findMany({
      where: {
        clientId,
        OR: months.map(({ year, month }) => ({ year, month })),
      },
      select: reportPlanSelect,
    }),
    db.projectFile.findMany({
      where: {
        project: { clientId },
        createdAt: { gte: startDate, lt: endDate },
      },
      select: { createdAt: true, size: true, category: true },
      take: REPORT_LIMITS.FILES,
    }),
  ]);

  if (items.length === REPORT_LIMITS.ITEMS) truncated = true;
  if (files.length === REPORT_LIMITS.FILES) truncated = true;

  const itemIds = items.map((i) => i.id);
  if (itemIds.length === 0) {
    return { items, plans, files, approvals: [], comments: [], truncated };
  }

  const [approvalsRaw, comments] = await Promise.all([
    db.contentApproval.findMany({
      where: { contentItemId: { in: itemIds } },
      select: {
        contentItemId: true,
        action: true,
        reviewerRole: true,
        createdAt: true,
      },
      orderBy: [{ contentItemId: "asc" }, { createdAt: "asc" }],
      take: REPORT_LIMITS.APPROVALS,
    }),
    db.contentComment.findMany({
      where: { contentItemId: { in: itemIds } },
      select: { contentItemId: true, authorRole: true, resolved: true },
      take: REPORT_LIMITS.COMMENTS,
    }),
  ]);

  let approvals = approvalsRaw;
  if (approvalsRaw.length === REPORT_LIMITS.APPROVALS) {
    // Ordered by (contentItemId, createdAt), so the cap truncates mid-item — and
    // a half-read log fabricates a "submitted but never reviewed" row. Drop the
    // last item's rows entirely rather than report a lie.
    const lastId = approvalsRaw[approvalsRaw.length - 1].contentItemId;
    approvals = approvalsRaw.filter((a) => a.contentItemId !== lastId);
    truncated = true;
  }
  if (comments.length === REPORT_LIMITS.COMMENTS) truncated = true;

  return { items, plans, files, approvals, comments, truncated };
}

// ---------------------------------------------------------------------------
// Per-month computation
// ---------------------------------------------------------------------------

export interface MonthReport {
  key: string;
  month: number;
  year: number;
  hasPlan: boolean;
  hasData: boolean;
  delivery: ReturnType<typeof calculateDelivery> & {
    totalItems: number;
    byStatus: Record<string, number>;
  };
  platformMix: MixEntry[];
  formatMix: MixEntry[];
  review: ReturnType<typeof aggregateReviews>;
  schedule: ReturnType<typeof calculateScheduleAdherence>;
  assets: {
    count: number;
    bytes: number;
    byCategory: { name: string; count: number; bytes: number }[];
  };
  collaboration: {
    clientActions: ReturnType<typeof calculateResponsiveness>;
    changeRequests: ReturnType<typeof calculateResolutionTimes>;
    comments: {
      total: number;
      resolved: number;
      resolvedRate: number | null;
      byRole: { client: number; agency: number };
    };
  };
  plan: {
    exists: boolean;
    isPublished: boolean;
    progress: ReturnType<typeof calculatePlanProgress> | null;
  };
}

function computeMonth(
  bucket: { year: number; month: number; key: string },
  raw: ReportRawData,
  itemsByMonth: Map<string, ReportRawData["items"]>,
  filesByMonth: Map<string, ReportRawData["files"]>,
  approvalsByMonth: Map<string, ReportRawData["approvals"]>,
  commentsByMonth: Map<string, ReportRawData["comments"]>
): MonthReport {
  const items = itemsByMonth.get(bucket.key) ?? [];
  const files = filesByMonth.get(bucket.key) ?? [];
  const approvals = approvalsByMonth.get(bucket.key) ?? [];
  const comments = commentsByMonth.get(bucket.key) ?? [];
  const plan = raw.plans.find(
    (p) => p.year === bucket.year && p.month === bucket.month
  );

  // ---- delivery ----
  const byStatus: Record<string, number> = {};
  for (const i of items) byStatus[i.status] = (byStatus[i.status] ?? 0) + 1;
  const deliveredCount = items.filter((i) =>
    DELIVERED_STATUSES.includes(i.status)
  ).length;

  // Deliverable targets come from the plan; auto-counted rows resolve against
  // this month's delivered content, exactly as the Monthly Plan page does.
  const formatCounts = Object.values(
    items
      .filter((i) => DELIVERED_STATUSES.includes(i.status))
      .reduce<Record<string, { format: never; _count: number }>>((acc, i) => {
        const k = i.format as string;
        acc[k] = acc[k]
          ? { ...acc[k], _count: acc[k]._count + 1 }
          : { format: i.format as never, _count: 1 };
        return acc;
      }, {})
  );

  const deliverables = plan
    ? resolveDeliverables(
        plan.deliverables.map((d) => ({
          id: d.id,
          label: d.label,
          icon: d.icon,
          target: d.target,
          formats: d.formats,
          manualDone: d.manualDone,
          order: d.order,
        })),
        formatCounts
      )
    : [];

  const planned = deliverables.reduce((s, d) => s + d.target, 0);

  // ---- mixes ----
  const countBy = <K extends string>(get: (i: (typeof items)[number]) => K) => {
    const m = new Map<K, number>();
    for (const i of items) m.set(get(i), (m.get(get(i)) ?? 0) + 1);
    return [...m.entries()].map(([key, count]) => ({ key, count }));
  };

  // ---- review ----
  const outcomes = [...summarizeReviews(approvals).values()];
  const review = aggregateReviews(outcomes, items.length);

  // ---- assets ----
  const catMap = new Map<string, { count: number; bytes: number }>();
  let bytes = 0;
  for (const f of files) {
    const name = f.category ?? "Uncategorized";
    const size = f.size ?? 0;
    bytes += size;
    const prev = catMap.get(name) ?? { count: 0, bytes: 0 };
    catMap.set(name, { count: prev.count + 1, bytes: prev.bytes + size });
  }

  // ---- collaboration ----
  const clientComments = comments.filter((c) => c.authorRole === Role.CLIENT);
  const resolvedComments = comments.filter((c) => c.resolved).length;

  return {
    key: bucket.key,
    month: bucket.month,
    year: bucket.year,
    hasPlan: !!plan,
    hasData: items.length > 0 || files.length > 0 || !!plan,
    delivery: {
      ...calculateDelivery(deliveredCount, planned),
      totalItems: items.length,
      byStatus,
    },
    platformMix: toMixEntries(countBy((i) => i.platform as string)),
    formatMix: toMixEntries(countBy((i) => i.format as string)),
    review,
    schedule: calculateScheduleAdherence(items),
    assets: {
      count: files.length,
      bytes,
      byCategory: [...catMap.entries()]
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
    },
    collaboration: {
      clientActions: calculateResponsiveness(plan?.actions ?? []),
      changeRequests: calculateResolutionTimes(plan?.changeRequests ?? []),
      comments: {
        total: comments.length,
        resolved: resolvedComments,
        resolvedRate: safeRate(resolvedComments, comments.length),
        byRole: {
          client: clientComments.length,
          agency: comments.length - clientComments.length,
        },
      },
    },
    plan: {
      exists: !!plan,
      isPublished: plan?.isPublished ?? false,
      progress: plan
        ? calculatePlanProgress({ weeks: plan.weeks, deliverables })
        : null,
    },
  };
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export interface MetricValue {
  value: number | null;
  previous: number | null;
  delta: ReturnType<typeof deltaAbsolute>;
  unit: "count" | "percent" | "days" | "bytes";
  sampleSize: number;
  confidence: Confidence;
}

export interface TrendRow {
  key: string;
  month: number;
  year: number;
  hasPlan: boolean;
  hasData: boolean;
  delivered: number;
  planned: number;
  deliveryRate: number | null;
  planProgress: number | null;
  turnaroundMedian: number | null;
  turnaroundSample: number;
  firstPassRate: number | null;
  firstPassSample: number;
  onTimeRate: number | null;
  onTimeSample: number;
  assetCount: number;
  assetBytes: number;
  comments: number;
}

const toTrendRow = (m: MonthReport): TrendRow => ({
  key: m.key,
  month: m.month,
  year: m.year,
  hasPlan: m.hasPlan,
  hasData: m.hasData,
  delivered: m.delivery.delivered,
  planned: m.delivery.planned,
  deliveryRate: m.delivery.rate,
  planProgress: m.plan.progress?.percent ?? null,
  turnaroundMedian: m.review.turnaround.byReviewer.client.median,
  turnaroundSample: m.review.turnaround.byReviewer.client.sampleSize,
  firstPassRate: m.review.firstPass.rate,
  firstPassSample: m.review.firstPass.total,
  onTimeRate: m.schedule.onTimeRate,
  onTimeSample: m.schedule.measurable,
  assetCount: m.assets.count,
  assetBytes: m.assets.bytes,
  comments: m.collaboration.comments.total,
});

export function buildReport(
  raw: ReportRawData,
  year: number,
  month: number,
  range: ReportRange
) {
  // range + 1 months so the delta always has a previous month to read.
  const buckets = rollingMonths(year, month, range + 1);

  // Bucketing rule: approvals and comments follow their ITEM's scheduled month,
  // not their own createdAt — otherwise the feedback trend drifts out of phase
  // with the delivery trend and the two charts contradict each other.
  const itemMonth = new Map(
    raw.items.map((i) => [i.id, monthKeyOf(i.scheduledAt)])
  );

  const itemsByMonth = bucketByMonth(raw.items, (i) => i.scheduledAt);
  const filesByMonth = bucketByMonth(raw.files, (f) => f.createdAt);

  const groupByItemMonth = <T extends { contentItemId: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      const key = itemMonth.get(r.contentItemId);
      if (!key) continue;
      const b = m.get(key);
      if (b) b.push(r);
      else m.set(key, [r]);
    }
    return m;
  };

  const approvalsByMonth = groupByItemMonth(raw.approvals);
  const commentsByMonth = groupByItemMonth(raw.comments);

  const all = buckets.map((b) =>
    computeMonth(
      b,
      raw,
      itemsByMonth,
      filesByMonth,
      approvalsByMonth,
      commentsByMonth
    )
  );

  const current = all[all.length - 1];
  const prior = all[all.length - 2] ?? null;
  const trend = all.slice(1).map(toTrendRow);

  const metric = (
    value: number | null,
    previous: number | null,
    unit: MetricValue["unit"],
    sampleSize: number,
    kind: "absolute" | "points" = "absolute"
  ): MetricValue => ({
    value,
    previous,
    delta: deltaAbsolute(value, previous, kind),
    unit,
    sampleSize,
    confidence: confidenceOf(sampleSize),
  });

  const kpis = {
    delivered: metric(
      current.delivery.delivered,
      prior?.delivery.delivered ?? null,
      "count",
      current.delivery.totalItems
    ),
    deliveryRate: metric(
      current.delivery.rate,
      prior?.delivery.rate ?? null,
      "percent",
      current.delivery.planned,
      "points"
    ),
    // The CLIENT median, not the blended one: staff can correct their own
    // verdicts, and those land with sub-minute turnarounds that would drag a
    // blended median toward zero.
    turnaroundDays: metric(
      current.review.turnaround.byReviewer.client.median,
      prior?.review.turnaround.byReviewer.client.median ?? null,
      "days",
      current.review.turnaround.byReviewer.client.sampleSize
    ),
    firstPassRate: metric(
      current.review.firstPass.rate,
      prior?.review.firstPass.rate ?? null,
      "percent",
      current.review.firstPass.total,
      "points"
    ),
    onTimeRate: metric(
      current.schedule.onTimeRate,
      prior?.schedule.onTimeRate ?? null,
      "percent",
      current.schedule.measurable,
      "points"
    ),
    assetsCount: metric(
      current.assets.count,
      prior?.assets.count ?? null,
      "count",
      current.assets.count
    ),
  };

  // ---- confidence notes ----
  const notes: string[] = [];
  if (current.delivery.totalItems === 0) notes.push("SELECTED_MONTH_EMPTY");
  if (!current.hasPlan) notes.push("NO_PLAN_IN_MONTH");
  if (current.review.turnaround.confidence === "LOW_SAMPLE")
    notes.push("TURNAROUND_LOW_SAMPLE");
  if (current.review.firstPass.confidence === "LOW_SAMPLE")
    notes.push("FIRST_PASS_LOW_SAMPLE");
  if (current.schedule.confidence === "LOW_SAMPLE")
    notes.push("SCHEDULE_LOW_SAMPLE");
  if (current.schedule.unknown > 0) notes.push("PUBLISHED_WITHOUT_TIMESTAMP");
  // The approval log is only written by /approve — staff can move an item to
  // AWAITING_APPROVAL via PUT, or create one straight into PUBLISHED, with no
  // row at all. Surface the gap rather than imply full coverage.
  if (current.review.coverage.submitted < current.review.coverage.items)
    notes.push("PARTIAL_APPROVAL_COVERAGE");
  if (raw.truncated) notes.push("TRUNCATED");

  const prev = previousMonth(year, month);

  return {
    selected: { month, year, key: monthKey(year, month) },
    previous: { month: prev.month, year: prev.year, key: monthKey(prev.year, prev.month) },
    range: {
      months: range,
      from: trend[0]?.key ?? monthKey(year, month),
      to: monthKey(year, month),
    },
    kpis,
    month: current,
    trend,
    confidence: {
      overall: confidenceOf(current.delivery.totalItems),
      minSampleSize: 5,
      truncated: raw.truncated,
      notes,
    },
  };
}

export type SerializedReport = ReturnType<typeof buildReport>;

// ---------------------------------------------------------------------------
// Shared with the portal dashboard
// ---------------------------------------------------------------------------

/**
 * Delivered-content-per-month for the last `months` months. Replaces the
 * hardcoded `campaignPerformance` literals the dashboard used to render.
 */
export async function getDeliveryTrend(
  clientId: string,
  months = 6
): Promise<{ key: string; value: number }[]> {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const { startDate, endDate } = rangeWindow(year, month, months);

  const items = await db.contentItem.findMany({
    where: {
      plan: { clientId },
      scheduledAt: { gte: startDate, lt: endDate },
      status: { in: DELIVERED_STATUSES },
    },
    select: { scheduledAt: true },
    take: REPORT_LIMITS.ITEMS,
  });

  const byMonth = bucketByMonth(items, (i) => i.scheduledAt);
  return rollingMonths(year, month, months).map((b) => ({
    key: b.key,
    value: byMonth.get(b.key)?.length ?? 0,
  }));
}
