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
        /* Top and bottom margins are deliberately deeper than the sides: they
           reserve the strip the running header and footer are positioned into. */
        @page {
          size: A4;
          margin: 20mm 12mm 16mm;
        }

        /* Separate rule on purpose: Chrome and Safari do not implement @page
           margin boxes, and keeping this out of the rule above guarantees the
           size and margin declarations survive however a parser treats it.
           Engines that do support it (Firefox, Prince, paged.js) get real page
           numbers; in Chrome they come from its own "Headers and footers"
           checkbox in the print dialog. */
        @page {
          @bottom-right { content: counter(page) " / " counter(pages); }
        }

        .running-head, .running-foot { display: none; }

        @media print {
          .no-print { display: none !important; }

          /* A4 minus the 12mm side margins. Without this the sheet is wider than
             the printable area and Chrome silently shrinks the whole document to
             fit, which is what made the type look inconsistently sized. */
          .report-sheet {
            width: 186mm;
            max-width: 186mm;
            padding: 0 !important;
            margin: 0 auto;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          /* Fixed elements repeat on every printed page. The negative offsets
             place them in the page margin reserved above, so they never overlap
             the report body. */
          .running-head, .running-foot {
            position: fixed;
            inset-inline: 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8mm;
            font-size: 8pt;
            color: #737373;
          }
          .running-head {
            top: -12mm;
            padding-bottom: 2mm;
            border-bottom: 0.3mm solid #e5e5e5;
          }
          .running-foot {
            bottom: -10mm;
            padding-top: 2mm;
            border-top: 0.3mm solid #e5e5e5;
          }

          /* Nothing that reads as one unit may be split across a page break:
             a card, a chart and its caption, or a row of paired cards. */
          section, figure, .avoid-break { break-inside: avoid; }
          h1, h2, h3 { break-after: avoid; }
          p { orphans: 3; widows: 3; }
        }
      `}</style>

      {/* Print-only running header and footer — see the @media print block. */}
      <div className="running-head" aria-hidden="true">
        <span className="font-bold uppercase tracking-widest text-red-600">
          Paxala Media Production
        </span>
        <span>
          {[client?.name, monthLabel].filter(Boolean).join(" · ")}
        </span>
      </div>
      <div className="running-foot" aria-hidden="true">
        <span>{t("print.heading")}</span>
        {generatedAt && (
          <span>
            {t("generatedAt", {
              date: formatDateLocalized(generatedAt, locale, {
                day: "numeric",
                month: "short",
                year: "numeric",
              }),
            })}
          </span>
        )}
      </div>

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
            {/* Plain div at the root, so it needs the class explicitly to keep
                the KPI strip whole across a page break. */}
            <div className="avoid-break">
              <ReportKpiCards
                kpis={report.kpis}
                month={report.month}
                previousLabel={previousLabel}
                variant="print"
              />
            </div>

            <DeliveryTrendCard trend={report.trend} variant="print" />

            <div className="avoid-break grid grid-cols-2 gap-4">
              <TurnaroundTrendCard trend={report.trend} variant="print" />
              <CompletionTrendCard trend={report.trend} variant="print" />
            </div>

            <div className="avoid-break grid grid-cols-2 gap-4">
              <PlatformMixCard month={report.month} variant="print" />
              <FormatMixCard month={report.month} variant="print" />
            </div>

            <div className="avoid-break grid grid-cols-2 gap-4">
              <RevisionDepthCard month={report.month} variant="print" />
              <ActionPunctualityCard month={report.month} variant="print" />
            </div>

            <div className="avoid-break grid grid-cols-2 gap-4">
              <AdherenceCard month={report.month} variant="print" />
              <FeedbackVolumeCard month={report.month} variant="print" />
            </div>
          </div>

          {/* Prints once, at the end of the document — the running footer is what
              repeats on every page. */}
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
