"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import { formatDateLocalized } from "@/lib/format";
import { parseRange } from "@/lib/reports";
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

/**
 * Printable report. A light document rather than the dark portal cards — those
 * waste ink and most print settings drop them entirely.
 *
 * Every section passes `variant="print"`, which also swaps the CSS `%`-width
 * bars for inline `<svg><rect>`: a background is dropped whenever "Background
 * graphics" is off (the browser default), and the mixes would print as empty
 * grey tracks. Inline SVG is painted content and always prints.
 */
function ReportPrintView() {
  const t = useTranslations("reports");
  const locale = useLocale();
  const params = useSearchParams();

  const now = new Date();
  const year = Number(params.get("year")) || now.getFullYear();
  const month = Number(params.get("month")) || now.getMonth() + 1;
  const range = parseRange(params.get("range"));
  const clientId = params.get("clientId");

  const { report, client, generatedAt, loading } = useReports({
    year,
    month,
    range,
    clientId,
  });

  const printed = useRef(false);

  useEffect(() => {
    // Guard on real data: an empty period should print a one-line document,
    // not a page of blank axes.
    if (loading || !report || printed.current) return;
    printed.current = true;
    const id = setTimeout(() => window.print(), 500);
    return () => clearTimeout(id);
  }, [loading, report]);

  const monthLabel = formatDateLocalized(new Date(year, month - 1, 1), locale, {
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return <p className="p-10 text-sm text-neutral-500">{t("loading")}</p>;
  }
  if (!report) {
    return (
      <p className="p-10 text-sm text-neutral-500">{t("empty.description")}</p>
    );
  }

  const previousLabel = formatDateLocalized(
    new Date(report.previous.year, report.previous.month - 1, 1),
    locale,
    { month: "short" }
  );

  return (
    <>
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          .no-print { display: none !important; }
          .report-sheet { padding: 0 !important; }
          section, figure { break-inside: avoid; }
          /* Belt-and-braces only — the SVG bar branch is what actually
             guarantees the mixes survive Background-graphics-off. */
          .report-sheet { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>

      <div className="min-h-screen bg-white text-neutral-900">
        <div className="report-sheet mx-auto max-w-4xl p-10">
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print mb-6 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
          >
            <Printer size={15} />
            {t("print")}
          </button>

          <header className="mb-6 border-b border-neutral-200 pb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-600">
              Paxala Media Production
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              {t("print.heading")}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {client?.name ?? ""} · {monthLabel}
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              {t("print.period", {
                range: t("range.months", { count: range }),
                month: monthLabel,
              })}
              {generatedAt &&
                ` · ${t("generatedAt", {
                  date: formatDateLocalized(generatedAt, locale, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  }),
                })}`}
            </p>
          </header>

          <div className="space-y-5">
            <ReportKpiCards
              kpis={report.kpis}
              month={report.month}
              previousLabel={previousLabel}
              variant="print"
            />

            <DeliveryTrendCard trend={report.trend} variant="print" />

            <div className="grid grid-cols-2 gap-4">
              <TurnaroundTrendCard trend={report.trend} variant="print" />
              <CompletionTrendCard trend={report.trend} variant="print" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <PlatformMixCard month={report.month} variant="print" />
              <FormatMixCard month={report.month} variant="print" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <RevisionDepthCard month={report.month} variant="print" />
              <ActionPunctualityCard month={report.month} variant="print" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <AdherenceCard month={report.month} variant="print" />
              <FeedbackVolumeCard month={report.month} variant="print" />
            </div>
          </div>

          <footer className="mt-8 border-t border-neutral-200 pt-4 text-[11px] text-neutral-400">
            {t("scopeNote")}
          </footer>
        </div>
      </div>
    </>
  );
}

export default function ReportsPrintPage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-neutral-500">…</div>}>
      <ReportPrintView />
    </Suspense>
  );
}
