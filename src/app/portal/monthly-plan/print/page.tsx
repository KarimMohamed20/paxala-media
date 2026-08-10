"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Printer } from "lucide-react";
import { formatDateLocalized } from "@/lib/format";
import { useMonthlyPlan } from "@/components/plan/use-monthly-plan";

/**
 * Printable Monthly Plan.
 *
 * Deliberately a light, document-styled view rather than the dark portal cards:
 * a plan people print or save as PDF should read as a document, and dark
 * backgrounds are dropped by most print settings anyway.
 *
 * This replaces a server-rendered PDF. @react-pdf/renderer ships no Arabic or
 * Hebrew glyphs and performs no bidi reordering or Arabic shaping, whereas the
 * browser does all three correctly — so printing from here is the only route
 * that works in all three locales.
 */
function PrintView() {
  const t = useTranslations("plan");
  const locale = useLocale();
  const params = useSearchParams();

  const now = new Date();
  const year = Number(params.get("year")) || now.getFullYear();
  const month = Number(params.get("month")) || now.getMonth() + 1;
  const clientId = params.get("clientId");

  const { plan, loading } = useMonthlyPlan({ year, month, clientId });
  // A ref, not state: firing the dialog once is a side effect, and tracking it
  // in state would re-render for nothing.
  const printed = useRef(false);

  // Open the print dialog once the document has actually rendered.
  useEffect(() => {
    if (loading || !plan || printed.current) return;
    printed.current = true;
    const id = setTimeout(() => window.print(), 400);
    return () => clearTimeout(id);
  }, [loading, plan]);

  const monthLabel = formatDateLocalized(new Date(year, month - 1, 1), locale, {
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return <p className="p-10 text-sm text-neutral-500">{t("loading")}</p>;
  }
  if (!plan) {
    return (
      <p className="p-10 text-sm text-neutral-500">
        {t("empty.title", { month: monthLabel })}
      </p>
    );
  }

  const d = (v: string | Date, opts?: Intl.DateTimeFormatOptions) =>
    formatDateLocalized(v, locale, opts ?? { day: "2-digit", month: "short", year: "numeric" });

  return (
    <>
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          .no-print { display: none !important; }
          .plan-sheet { padding: 0 !important; }
          section { break-inside: avoid; }
        }
      `}</style>

      <div className="min-h-screen bg-white text-neutral-900">
        <div className="plan-sheet mx-auto max-w-4xl p-10">
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print mb-6 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
          >
            <Printer size={15} />
            {t("downloadPlan")}
          </button>

          {/* header */}
          <header className="mb-6 border-b border-neutral-200 pb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-600">
              Paxala Media Production
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {plan.client.name} · {monthLabel}
              {plan.subtitle ? ` · ${plan.subtitle}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-neutral-600">
              {plan.package && <span>{plan.package.name}</span>}
              <span>{t("strip.completed", { percent: plan.progress.percent })}</span>
              <span>{t("strip.updated", { date: d(plan.updatedAt) })}</span>
            </div>
          </header>

          {/* objective */}
          {plan.objective && (
            <section className="mb-6">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
                {t("objective.title")}
              </h2>
              <p className="text-sm leading-relaxed text-neutral-800">
                {plan.objective}
              </p>
              {plan.tags.length > 0 && (
                <p className="mt-2 text-xs text-neutral-500">
                  {plan.tags.join(" · ")}
                </p>
              )}
            </section>
          )}

          {/* deliverables */}
          {plan.deliverables.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
                {t("deliverables.title")}
              </h2>
              <div className="grid grid-cols-4 gap-3">
                {plan.deliverables.map((x) => (
                  <div
                    key={x.id}
                    className="rounded-lg border border-neutral-200 p-3"
                  >
                    <p className="truncate text-[11px] text-neutral-500">
                      {x.label}
                    </p>
                    <p dir="ltr" className="mt-1 text-xl font-black tabular-nums">
                      {x.done}
                      <span className="text-sm text-neutral-400"> / {x.target}</span>
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* key dates */}
          {plan.keyDates.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
                {t("keyDates.title")}
              </h2>
              <ul className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
                {plan.keyDates.map((k) => (
                  <li key={k.id} className="flex justify-between gap-3">
                    <span className="text-neutral-800">{k.title}</span>
                    <span className="shrink-0 text-neutral-500">
                      {d(k.date, { day: "2-digit", month: "short" })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* timeline */}
          {plan.weeks.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
                {t("timeline.title", {
                  month: formatDateLocalized(new Date(year, month - 1, 1), locale, {
                    month: "long",
                  }),
                })}
              </h2>
              <div className="grid grid-cols-4 gap-4">
                {plan.weeks.map((w, i) => (
                  <div key={w.id}>
                    <p className="mb-1.5 text-[11px] font-bold">
                      {t("timeline.week", { number: i + 1 })}
                      <span className="font-normal text-neutral-500"> · {w.title}</span>
                    </p>
                    <ul className="space-y-1">
                      {w.items.map((it) => (
                        <li key={it.id} className="text-[11px] text-neutral-700">
                          <span className="text-neutral-400">
                            {it.status === "COMPLETED" ? "✓" : "•"}{" "}
                          </span>
                          {it.title}
                          <span className="text-neutral-400">
                            {" "}
                            ({t(`itemStatus.${it.status}`)})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* client actions */}
          {plan.actions.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
                {t("actions.title")}
              </h2>
              <ul className="space-y-1.5 text-sm">
                {plan.actions.map((a) => (
                  <li key={a.id} className="flex justify-between gap-3">
                    <span className="text-neutral-800">
                      {a.title}
                      <span className="text-neutral-400">
                        {" "}
                        — {t(`itemStatus.${a.status}`)}
                      </span>
                    </span>
                    <span className="shrink-0 text-neutral-500">
                      {a.dueAt ? d(a.dueAt) : t("actions.noDue")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* team */}
          {plan.team.length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-neutral-400">
                {t("team.title")}
              </h2>
              <ul className="grid grid-cols-4 gap-3 text-sm">
                {plan.team.map((m) => (
                  <li key={m.id}>
                    <span className="block font-semibold text-neutral-900">
                      {m.user.name ?? m.user.username}
                    </span>
                    <span className="block text-[11px] text-neutral-500">
                      {m.roleLabel ?? m.user.jobTitle ?? ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

export default function MonthlyPlanPrintPage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-neutral-500">…</div>}>
      <PrintView />
    </Suspense>
  );
}
