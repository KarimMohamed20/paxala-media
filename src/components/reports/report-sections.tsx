"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatDateLocalized, formatNumberLocalized } from "@/lib/format";
import { getFormatIcon, getPlatformIcon } from "@/components/content/content-meta";
import type {
  ContentFormat,
  ContentPlatform,
} from "@/components/content/types";
import { ShareBars, SegmentedBar } from "./charts/share-bars";
import { TrendChart } from "./charts/trend-chart";
import type { ChartVariant, TrendPoint } from "./charts/types";
import type { ReportMonth, ReportTrendRow } from "./types";

/** Card shell shared by every report section, in both themes. */
export function ReportCard({
  title,
  subtitle,
  variant = "dark",
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  variant?: ChartVariant;
  className?: string;
  children: React.ReactNode;
}) {
  const isPrint = variant === "print";
  return (
    <section
      className={cn(
        "rounded-2xl border p-4",
        isPrint ? "border-neutral-200" : "border-white/10 bg-white/[0.03]",
        className
      )}
    >
      <h2
        className={cn(
          "text-sm font-bold",
          isPrint ? "text-neutral-900" : "text-white"
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={cn(
            "mt-0.5 mb-3 text-[11px]",
            isPrint ? "text-neutral-500" : "text-white/40"
          )}
        >
          {subtitle}
        </p>
      )}
      {!subtitle && <div className="mb-3" />}
      {children}
    </section>
  );
}

/** Locale-formatted month label for a trend bucket key ("2026-08" → "Aug"). */
function useBucketLabel() {
  const locale = useLocale();
  return (row: ReportTrendRow) =>
    formatDateLocalized(new Date(row.year, row.month - 1, 1), locale, {
      month: "short",
    });
}

const toPoints = (
  trend: ReportTrendRow[],
  pick: (r: ReportTrendRow) => number | null,
  label: (r: ReportTrendRow) => string
): TrendPoint[] =>
  trend.map((r) => ({ key: r.key, label: label(r), value: pick(r) }));

// ---------------------------------------------------------------------------
// Trends
// ---------------------------------------------------------------------------

export function DeliveryTrendCard({
  trend,
  variant = "dark",
}: {
  trend: ReportTrendRow[];
  variant?: ChartVariant;
}) {
  const t = useTranslations("reports");
  const label = useBucketLabel();

  return (
    <ReportCard
      title={t("charts.deliveredTitle")}
      subtitle={t("charts.deliveredSubtitle")}
      variant={variant}
    >
      <TrendChart
        height={200}
        variant={variant}
        animated={variant !== "print"}
        ariaLabel={t("charts.deliveredTitle")}
        series={[
          {
            id: "delivered",
            label: t("charts.deliveredSeries"),
            area: true,
            points: toPoints(trend, (r) => r.delivered, label),
          },
          {
            id: "planned",
            label: t("charts.plannedSeries"),
            dashed: true,
            color: "#71717a",
            // null on months with no plan, so the reference line breaks rather
            // than dropping to zero and implying a target of nothing.
            points: toPoints(
              trend,
              (r) => (r.hasPlan ? r.planned : null),
              label
            ),
          },
        ]}
      />
    </ReportCard>
  );
}

export function TurnaroundTrendCard({
  trend,
  variant = "dark",
}: {
  trend: ReportTrendRow[];
  variant?: ChartVariant;
}) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const label = useBucketLabel();

  return (
    <ReportCard
      title={t("charts.turnaroundTitle")}
      subtitle={t("charts.turnaroundSubtitle")}
      variant={variant}
    >
      <TrendChart
        height={140}
        variant={variant}
        animated={variant !== "print"}
        ariaLabel={t("charts.turnaroundTitle")}
        yFormat={(v) => formatNumberLocalized(Math.round(v * 10) / 10, locale)}
        series={[
          {
            id: "turnaround",
            label: t("charts.turnaroundTitle"),
            area: true,
            points: toPoints(trend, (r) => r.turnaroundMedian, label),
          },
        ]}
      />
    </ReportCard>
  );
}

export function CompletionTrendCard({
  trend,
  variant = "dark",
}: {
  trend: ReportTrendRow[];
  variant?: ChartVariant;
}) {
  const t = useTranslations("reports");
  const label = useBucketLabel();

  return (
    <ReportCard
      title={t("charts.completionTitle")}
      subtitle={t("charts.completionSubtitle")}
      variant={variant}
    >
      <TrendChart
        height={140}
        yMax={100}
        variant={variant}
        animated={variant !== "print"}
        ariaLabel={t("charts.completionTitle")}
        yFormat={(v) => `${Math.round(v)}%`}
        series={[
          {
            id: "completion",
            label: t("charts.completionTitle"),
            area: true,
            points: toPoints(trend, (r) => r.planProgress, label),
          },
        ]}
      />
    </ReportCard>
  );
}

// ---------------------------------------------------------------------------
// Mixes
// ---------------------------------------------------------------------------

export function PlatformMixCard({
  month,
  variant = "dark",
}: {
  month: ReportMonth;
  variant?: ChartVariant;
}) {
  const t = useTranslations("content");
  const tr = useTranslations("reports");

  return (
    <ReportCard title={tr("charts.platformMixTitle")} variant={variant}>
      <ShareBars
        variant={variant}
        ariaLabel={tr("charts.platformMixTitle")}
        rows={month.platformMix.map((p) => ({
          key: p.name,
          label: t(`platform.${p.name}`),
          count: p.count,
          percent: p.percentage,
          icon: getPlatformIcon(p.name as ContentPlatform, 12),
        }))}
      />
    </ReportCard>
  );
}

export function FormatMixCard({
  month,
  variant = "dark",
}: {
  month: ReportMonth;
  variant?: ChartVariant;
}) {
  const t = useTranslations("content");
  const tr = useTranslations("reports");

  return (
    <ReportCard title={tr("charts.formatMixTitle")} variant={variant}>
      <ShareBars
        variant={variant}
        ariaLabel={tr("charts.formatMixTitle")}
        rows={month.formatMix.map((f) => ({
          key: f.name,
          label: t(`format.${f.name}`),
          count: f.count,
          percent: f.percentage,
          icon: getFormatIcon(f.name as ContentFormat, 12),
        }))}
      />
    </ReportCard>
  );
}

// ---------------------------------------------------------------------------
// Collaboration
// ---------------------------------------------------------------------------

export function RevisionDepthCard({
  month,
  variant = "dark",
}: {
  month: ReportMonth;
  variant?: ChartVariant;
}) {
  const t = useTranslations("reports");
  const { zero, one, twoPlus, total } = month.review.revisionDepth;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <ReportCard
      title={t("charts.revisionsTitle")}
      subtitle={t("charts.revisionsSubtitle")}
      variant={variant}
    >
      <SegmentedBar
        variant={variant}
        ariaLabel={t("charts.revisionsTitle")}
        segments={[
          { key: "0", label: t("charts.revisions0"), count: zero, percent: pct(zero), fill: "#10b981" },
          { key: "1", label: t("charts.revisions1"), count: one, percent: pct(one), fill: "#f59e0b" },
          { key: "2", label: t("charts.revisions2"), count: twoPlus, percent: pct(twoPlus), fill: "#dc2626" },
        ]}
      />
      <CoverageNote month={month} variant={variant} />
    </ReportCard>
  );
}

/**
 * The honesty line. Only `/approve` writes a ContentApproval row — staff can
 * move an item to AWAITING_APPROVAL via PUT, or create one straight into
 * PUBLISHED, with no log entry. So review metrics cover a subset, and the
 * report says which subset rather than implying it saw everything.
 */
export function CoverageNote({
  month,
  variant = "dark",
}: {
  month: ReportMonth;
  variant?: ChartVariant;
}) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const { reachedVerdict, items } = month.review.coverage;

  if (items === 0 || reachedVerdict >= items) return null;

  return (
    <p
      className={cn(
        "mt-3 text-[10px]",
        variant === "print" ? "text-neutral-400" : "text-white/30"
      )}
    >
      {t("coverage.note", {
        measured: formatNumberLocalized(reachedVerdict, locale),
        total: formatNumberLocalized(items, locale),
      })}
    </p>
  );
}

export function ActionPunctualityCard({
  month,
  variant = "dark",
}: {
  month: ReportMonth;
  variant?: ChartVariant;
}) {
  const t = useTranslations("reports");
  const a = month.collaboration.clientActions;
  const total = a.onTime + a.late + a.outstanding;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <ReportCard
      title={t("charts.actionsTitle")}
      subtitle={t("charts.actionsSubtitle")}
      variant={variant}
    >
      <SegmentedBar
        variant={variant}
        ariaLabel={t("charts.actionsTitle")}
        segments={[
          { key: "onTime", label: t("charts.actionsOnTime"), count: a.onTime, percent: pct(a.onTime), fill: "#10b981" },
          { key: "late", label: t("charts.actionsLate"), count: a.late, percent: pct(a.late), fill: "#f59e0b" },
          { key: "open", label: t("charts.actionsPending"), count: a.outstanding, percent: pct(a.outstanding), fill: "#71717a" },
        ]}
      />
    </ReportCard>
  );
}

export function FeedbackVolumeCard({
  month,
  variant = "dark",
}: {
  month: ReportMonth;
  variant?: ChartVariant;
}) {
  const t = useTranslations("reports");
  const c = month.collaboration.comments;
  const pct = (n: number) => (c.total > 0 ? Math.round((n / c.total) * 100) : 0);

  return (
    <ReportCard
      title={t("charts.feedbackTitle")}
      subtitle={t("charts.feedbackSubtitle")}
      variant={variant}
    >
      <ShareBars
        variant={variant}
        ariaLabel={t("charts.feedbackTitle")}
        rows={[
          {
            key: "client",
            label: t("charts.feedbackClient"),
            count: c.byRole.client,
            percent: pct(c.byRole.client),
            fill: "#dc2626",
          },
          {
            // ADMIN and STAFF collapse into one bucket — a client report should
            // not expose the agency's internal role split.
            key: "agency",
            label: t("charts.feedbackAgency"),
            count: c.byRole.agency,
            percent: pct(c.byRole.agency),
            fill: "#71717a",
            barClassName: "bg-zinc-500",
          },
        ]}
      />
    </ReportCard>
  );
}

export function AdherenceCard({
  month,
  variant = "dark",
}: {
  month: ReportMonth;
  variant?: ChartVariant;
}) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const locale = useLocale();
  const s = month.schedule;
  const isPrint = variant === "print";

  return (
    <ReportCard
      title={t("charts.adherenceTitle")}
      subtitle={t("charts.adherenceSubtitle")}
      variant={variant}
    >
      {s.onTimeRate === null ? (
        <p
          className={cn(
            "py-4 text-center text-xs",
            isPrint ? "text-neutral-400" : "text-white/40"
          )}
        >
          {tc("noData")}
        </p>
      ) : (
        <>
          <p
            dir="ltr"
            className={cn(
              "text-3xl font-black tabular-nums",
              isPrint ? "text-neutral-900" : "text-white"
            )}
          >
            {formatNumberLocalized(s.onTimeRate, locale)}%
          </p>
          <p
            className={cn(
              "mt-1 text-[11px]",
              isPrint ? "text-neutral-500" : "text-white/45"
            )}
          >
            {t("charts.adherenceValue", {
              onTime: formatNumberLocalized(s.onTime, locale),
              total: formatNumberLocalized(s.measurable, locale),
            })}
          </p>
          {s.unknown > 0 && (
            <p
              className={cn(
                "mt-2 text-[10px]",
                isPrint ? "text-neutral-400" : "text-white/30"
              )}
            >
              {t("charts.adherenceUnknown", {
                count: formatNumberLocalized(s.unknown, locale),
              })}
            </p>
          )}
        </>
      )}
    </ReportCard>
  );
}
