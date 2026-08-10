"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, TrendingUp } from "lucide-react";
import { formatDateLocalized } from "@/lib/format";
import { TrendChart } from "./charts/trend-chart";

/**
 * Delivered-content trend for the portal dashboard.
 *
 * Replaces the old `CampaignPerformanceChart`, which charted six hardcoded
 * literals — this system has no reach or engagement data, so the card now shows
 * something it can actually prove and links through to the full report.
 */
export function DeliveredTrendCard({
  points,
}: {
  points: { key: string; value: number }[];
}) {
  const t = useTranslations("reports");
  const locale = useLocale();

  const series = [
    {
      id: "delivered",
      label: t("charts.deliveredSeries"),
      area: true,
      points: points.map((p) => {
        const [y, m] = p.key.split("-").map(Number);
        return {
          key: p.key,
          label: formatDateLocalized(new Date(y, m - 1, 1), locale, {
            month: "short",
          }),
          value: p.value,
        };
      }),
    },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/90 p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-red-500" />
          <h3 className="text-sm font-bold text-white">
            {t("charts.deliveredTitle")}
          </h3>
        </div>
        <Link
          href="/portal/reports"
          className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 transition-colors hover:text-red-400"
        >
          <span>{t("title")}</span>
          <ChevronRight size={14} />
        </Link>
      </div>

      <TrendChart
        series={series}
        height={150}
        ariaLabel={t("charts.deliveredTitle")}
      />
    </div>
  );
}
