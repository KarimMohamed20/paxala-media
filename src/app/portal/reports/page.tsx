"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BarChart3, Download, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateLocalized } from "@/lib/format";
import { REPORT_RANGES, type ReportRange, parseRange } from "@/lib/reports";
import { PlanMonthNav } from "@/components/plan/plan-month-nav";
import { ReportKpiCards } from "@/components/reports/report-kpi-cards";
import {
  ActionPunctualityCard,
  AdherenceCard,
  CompletionTrendCard,
  DeliveryTrendCard,
  FeedbackVolumeCard,
  FormatMixCard,
  PlatformMixCard,
  RevisionDepthCard,
  TurnaroundTrendCard,
} from "@/components/reports/report-sections";
import { useReports } from "@/components/reports/use-reports";

function ReportsView() {
  const t = useTranslations("reports");
  const tc = useTranslations("common");
  const locale = useLocale();
  const searchParams = useSearchParams();

  const now = new Date();
  const [year, setYear] = useState(
    Number(searchParams.get("year")) || now.getFullYear()
  );
  const [month, setMonth] = useState(
    Number(searchParams.get("month")) || now.getMonth() + 1
  );
  const [range, setRange] = useState<ReportRange>(
    parseRange(searchParams.get("range"))
  );
  const [clientFilter, setClientFilter] = useState<string | null>(
    searchParams.get("clientId")
  );

  const {
    report,
    state,
    clients,
    resolvedClientId,
    generatedAt,
    loading,
    error,
    refetch,
  } = useReports({ year, month, range, clientId: clientFilter });

  // Plain function: the React Compiler memoizes this, and a manual useCallback
  // here is redundant memoization it cannot preserve.
  const onMonthChange = (y: number, m: number) => {
    setYear(y);
    setMonth(m);
  };

  const monthLabel = formatDateLocalized(new Date(year, month - 1, 1), locale, {
    month: "long",
    year: "numeric",
  });

  const previousLabel = report
    ? formatDateLocalized(
        new Date(report.previous.year, report.previous.month - 1, 1),
        locale,
        { month: "short" }
      )
    : "";

  const printHref = `/portal/reports/print?year=${year}&month=${month}&range=${range}${
    resolvedClientId ? `&clientId=${resolvedClientId}` : ""
  }`;

  // Only the very first load blanks the page. Range, month and client are
  // controls a user clicks repeatedly — blanking on each one is the wrong trade.
  const firstLoad = loading && !report;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {t("subtitle", { month: monthLabel })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {clients.length > 0 && (
            <select
              value={resolvedClientId ?? ""}
              onChange={(e) => setClientFilter(e.target.value)}
              aria-label={tc("client")}
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 focus:border-amber-400/60 focus:outline-none"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? c.username ?? c.id}
                </option>
              ))}
            </select>
          )}

          <PlanMonthNav year={year} month={month} onChange={onMonthChange} dense />

          {report && (
            <a
              href={printHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <Download size={15} />
              {t("print")}
            </a>
          )}
        </div>
      </div>

      {/* range pills */}
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label={t("range.label")}
      >
        {REPORT_RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            aria-pressed={range === r}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-medium transition",
              range === r
                ? "border-red-500/40 bg-red-600/20 text-red-300"
                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
            )}
          >
            {t("range.months", { count: r })}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 px-2.5 py-1 font-semibold transition hover:bg-red-500/10"
          >
            <RotateCcw size={11} />
            {t("retry")}
          </button>
        </div>
      )}

      {firstLoad ? (
        <p className="py-24 text-center text-sm text-white/40">{t("loading")}</p>
      ) : !report ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
          <BarChart3 size={40} className="mx-auto mb-3 text-white/20" />
          <p className="text-sm font-semibold text-white/70">
            {t("empty.title")}
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-white/40">
            {state === "NO_CLIENT" ? t("empty.noClient") : t("empty.description")}
          </p>
          {state !== "NO_CLIENT" && (
            <Link
              href="/portal/calendar"
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-500"
            >
              {t("empty.cta")}
            </Link>
          )}
        </div>
      ) : (
        <div
          aria-busy={loading}
          className={cn(
            "space-y-6 transition-opacity",
            loading && "pointer-events-none opacity-60"
          )}
        >
          <ReportKpiCards
            kpis={report.kpis}
            month={report.month}
            previousLabel={previousLabel}
          />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              <DeliveryTrendCard trend={report.trend} />
              <div className="grid gap-6 md:grid-cols-2">
                <TurnaroundTrendCard trend={report.trend} />
                <CompletionTrendCard trend={report.trend} />
              </div>
              <div className="grid gap-6 md:grid-cols-2">
                <RevisionDepthCard month={report.month} />
                <ActionPunctualityCard month={report.month} />
              </div>
            </div>

            <div className="space-y-6 lg:col-span-4">
              <AdherenceCard month={report.month} />
              <PlatformMixCard month={report.month} />
              <FormatMixCard month={report.month} />
              <FeedbackVolumeCard month={report.month} />
            </div>
          </div>

          <p className="text-[11px] text-white/30">
            {t("scopeNote")}
            {generatedAt &&
              ` · ${t("generatedAt", {
                date: formatDateLocalized(generatedAt, locale, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}`}
          </p>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={<div className="py-24 text-center text-sm text-white/40">…</div>}
    >
      <ReportsView />
    </Suspense>
  );
}
