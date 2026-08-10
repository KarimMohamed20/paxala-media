"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  HardDrive,
  Minus,
  PackageCheck,
  ThumbsUp,
  Timer,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatBytesLocalized,
  formatDaysLocalized,
  formatNumberLocalized,
  formatSignedLocalized,
} from "@/lib/format";
import type { MetricValue } from "@/lib/reports-queries";
import {
  KPI_ORDER,
  KPI_SENTIMENT,
  type ReportKpiKey,
  type ReportKpis,
  type ReportMonth,
} from "./types";
import type { ChartVariant } from "./charts/types";

const ICONS: Record<ReportKpiKey, React.ElementType> = {
  delivered: PackageCheck,
  deliveryRate: PackageCheck,
  turnaroundDays: Timer,
  firstPassRate: ThumbsUp,
  onTimeRate: PackageCheck,
  assetsCount: HardDrive,
};

/**
 * KPI tiles for the selected month, each with a month-over-month delta.
 *
 * Three rules keep the delta honest:
 *  - sentiment is declared per metric, never inferred from the sign
 *  - one figure only: counts/days show the absolute change, rates show
 *    percentage points ("+6 pts"), never "+3 (+18%)"
 *  - the sign comes from Intl, because bidi relocates a literal "+"
 */
export function ReportKpiCards({
  kpis,
  month,
  previousLabel,
  variant = "dark",
}: {
  kpis: ReportKpis;
  month: ReportMonth;
  previousLabel: string;
  variant?: ChartVariant;
}) {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isPrint = variant === "print";

  const formatValue = (key: ReportKpiKey, m: MetricValue): string => {
    if (m.value === null) return "—";
    if (key === "assetsCount") return formatNumberLocalized(m.value, locale);
    switch (m.unit) {
      case "percent":
        return `${formatNumberLocalized(m.value, locale)}%`;
      case "days":
        return formatDaysLocalized(m.value, locale);
      default:
        return formatNumberLocalized(m.value, locale);
    }
  };

  const hintFor = (key: ReportKpiKey): string => {
    if (key === "delivered") {
      return month.delivery.state === "NO_PLAN"
        ? t("metrics.deliveredHintNoPlan")
        : t("metrics.deliveredHint", {
            planned: formatNumberLocalized(month.delivery.planned, locale),
          });
    }
    if (key === "assetsCount") {
      return month.assets.bytes > 0
        ? t("metrics.assetsHint", {
            size: formatBytesLocalized(month.assets.bytes, locale),
          })
        : t("metrics.assetsHintNoSize");
    }
    return t(`metrics.${key}Hint`);
  };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {KPI_ORDER.map((key) => {
        const m = kpis[key];
        const Icon = ICONS[key];
        const sentiment = KPI_SENTIMENT[key];
        const change = m.delta.change;

        const favourable =
          change === null || change === 0 || sentiment === "neutral"
            ? null
            : sentiment === "up-good"
              ? change > 0
              : change < 0;

        const DeltaIcon =
          change === null || change === 0
            ? Minus
            : change > 0
              ? TrendingUp
              : TrendingDown;

        return (
          <div
            key={key}
            className={cn(
              "rounded-2xl border p-4",
              isPrint
                ? "border-neutral-200"
                : "border-white/10 bg-white/[0.03]"
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-xs font-medium",
                  isPrint ? "text-neutral-500" : "text-white/50"
                )}
                title={t(`metrics.${key}Tooltip`)}
              >
                {t(`metrics.${key}`)}
              </span>
              <Icon
                size={16}
                className={isPrint ? "text-neutral-400" : "text-white/40"}
              />
            </div>

            <p
              dir="ltr"
              className={cn(
                "mt-2 text-3xl font-black tabular-nums",
                isPrint ? "text-neutral-900" : "text-white"
              )}
            >
              {formatValue(key, m)}
            </p>

            <p
              className={cn(
                "mt-0.5 text-[11px]",
                isPrint ? "text-neutral-500" : "text-white/35"
              )}
            >
              {m.value === null ? tc("noData") : hintFor(key)}
            </p>

            <div className="mt-2 flex items-center gap-1.5">
              {change === null ? (
                <span
                  className={cn(
                    "text-[11px]",
                    isPrint ? "text-neutral-400" : "text-white/30"
                  )}
                >
                  {t("delta.noPrevious")}
                </span>
              ) : (
                <>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                      isPrint && "px-0",
                      favourable === null
                        ? isPrint
                          ? "text-neutral-500"
                          : "bg-white/5 text-white/50"
                        : favourable
                          ? isPrint
                            ? "text-emerald-600"
                            : "bg-emerald-500/10 text-emerald-300"
                          : isPrint
                            ? "text-rose-600"
                            : "bg-rose-500/10 text-rose-300"
                    )}
                  >
                    <DeltaIcon size={11} />
                    <span dir="ltr">
                      {formatSignedLocalized(change, locale)}
                      {m.delta.kind === "points" ? ` ${t("metrics.points")}` : ""}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "text-[10px]",
                      isPrint ? "text-neutral-400" : "text-white/30"
                    )}
                  >
                    {t("delta.vsPrevious", { month: previousLabel })}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
