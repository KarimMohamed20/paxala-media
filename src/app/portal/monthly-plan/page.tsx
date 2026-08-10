"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Download, MessageSquarePlus, Pencil, X } from "lucide-react";
import { formatDateLocalized } from "@/lib/format";
import { PlanMonthNav } from "@/components/plan/plan-month-nav";
import { PlanStatusStrip } from "@/components/plan/plan-status-strip";
import { DeliverablesCard } from "@/components/plan/deliverables-card";
import { KeyDatesCard } from "@/components/plan/key-dates-card";
import { PlanTimeline } from "@/components/plan/plan-timeline";
import { ClientActionsCard } from "@/components/plan/client-actions-card";
import { PlanTeamCard } from "@/components/plan/plan-team-card";
import { PlanEmptyState } from "@/components/plan/plan-empty-state";
import { RequestChangeModal } from "@/components/plan/request-change-modal";
import {
  setActionDone,
  useMonthlyPlan,
} from "@/components/plan/use-monthly-plan";
import type { PlanAction } from "@/components/plan/types";

function MonthlyPlanView() {
  const t = useTranslations("plan");
  const locale = useLocale();
  const searchParams = useSearchParams();

  const now = new Date();
  const [year, setYear] = useState(
    Number(searchParams.get("year")) || now.getFullYear()
  );
  const [month, setMonth] = useState(
    Number(searchParams.get("month")) || now.getMonth() + 1
  );
  const [clientFilter, setClientFilter] = useState<string | null>(
    searchParams.get("clientId")
  );

  const [changeOpen, setChangeOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const {
    plan,
    state,
    clients,
    resolvedClientId,
    canEdit,
    loading,
    error,
    refetch,
    setPlan,
  } = useMonthlyPlan({ year, month, clientId: clientFilter });

  const onMonthChange = useCallback((y: number, m: number) => {
    setYear(y);
    setMonth(m);
  }, []);

  const toggleAction = async (action: PlanAction, done: boolean) => {
    setBusyAction(action.id);
    try {
      const res = await setActionDone(action.id, done);
      // Patch locally so the ring animates without a full refetch.
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              progress: res.progress ?? prev.progress,
              actions: prev.actions.map((a) =>
                a.id === action.id ? { ...a, ...res.action } : a
              ),
            }
          : prev
      );
    } catch {
      await refetch();
    } finally {
      setBusyAction(null);
    }
  };

  const monthLabel = formatDateLocalized(new Date(year, month - 1, 1), locale, {
    month: "long",
    year: "numeric",
  });

  const printHref = `/portal/monthly-plan/print?year=${year}&month=${month}${
    resolvedClientId ? `&clientId=${resolvedClientId}` : ""
  }`;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {plan?.subtitle
              ? `${monthLabel} · ${plan.subtitle}`
              : t("subtitle", { month: monthLabel })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {clients.length > 0 && (
            <select
              value={resolvedClientId ?? ""}
              onChange={(e) => setClientFilter(e.target.value)}
              aria-label={t("strip.client")}
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

          {plan && (
            <>
              {/* Opens the print view, which renders the same components under
                  print styles — the browser handles Arabic shaping and bidi. */}
              <a
                href={printHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <Download size={15} />
                {t("downloadPlan")}
              </a>
              <button
                type="button"
                onClick={() => setChangeOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                <MessageSquarePlus size={15} />
                {t("requestChange")}
              </button>
            </>
          )}
        </div>
      </div>

      {banner && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          <span className="flex-1">{banner}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="rounded p-0.5 hover:bg-white/10"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {canEdit && plan && !plan.isPublished && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <span className="flex-1">{t("draftBanner")}</span>
          <Link
            href={`/admin/monthly-plans/${plan.id}`}
            className="inline-flex items-center gap-1 font-semibold underline-offset-2 hover:underline"
          >
            <Pencil size={11} />
            {t("editInAdmin")}
          </Link>
        </div>
      )}

      {loading ? (
        <p className="py-24 text-center text-sm text-white/40">{t("loading")}</p>
      ) : !plan ? (
        <PlanEmptyState
          year={year}
          month={month}
          state={state}
          canEdit={canEdit}
          clientId={resolvedClientId}
        />
      ) : (
        <>
          <PlanStatusStrip plan={plan} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-8">
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h2 className="mb-3 text-sm font-bold text-white">
                  {t("objective.title")}
                </h2>
                <p className="text-start text-sm leading-relaxed text-white/70">
                  {plan.objective || (
                    <span className="text-white/35">{t("objective.empty")}</span>
                  )}
                </p>
                {plan.tags.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {plan.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] text-white/70"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              <DeliverablesCard deliverables={plan.deliverables} />
              <PlanTimeline weeks={plan.weeks} month={month} year={year} />
            </div>

            <div className="space-y-6 lg:col-span-4">
              <KeyDatesCard keyDates={plan.keyDates} />
              <ClientActionsCard
                actions={plan.actions}
                onToggle={toggleAction}
                busyId={busyAction}
              />
            </div>
          </div>

          <PlanTeamCard team={plan.team} />
        </>
      )}

      <RequestChangeModal
        isOpen={changeOpen}
        onClose={() => setChangeOpen(false)}
        onSuccess={setBanner}
        month={month}
        year={year}
        clientId={resolvedClientId}
      />
    </div>
  );
}

export default function MonthlyPlanPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense
      fallback={<div className="py-24 text-center text-sm text-white/40">…</div>}
    >
      <MonthlyPlanView />
    </Suspense>
  );
}
