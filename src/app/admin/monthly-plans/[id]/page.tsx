"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateLocalized } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProgressRing } from "@/components/plan/progress-ring";
import { PlanAvatar } from "@/components/plan/plan-avatar";
import {
  clearMonthlyPlan,
  togglePlanPublished,
} from "@/components/plan/use-monthly-plan";
import { PlanOverviewTab } from "@/components/admin/plan/plan-overview-tab";
import { PlanStructureTab } from "@/components/admin/plan/plan-structure-tab";
import { PlanTimelineTab } from "@/components/admin/plan/plan-timeline-tab";
import { PlanActionsTeamTab } from "@/components/admin/plan/plan-actions-team-tab";
import type { MonthlyPlan, PlanChangeRequest } from "@/components/plan/types";

/**
 * Tabbed manage screen, modelled on admin/projects/[id]. A thin shell that owns
 * the plan and hands each tab a `onSaved` callback; every tab saves its own
 * section independently.
 */
export default function AdminMonthlyPlanEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("plan");
  const locale = useLocale();
  const router = useRouter();

  const [plan, setPlan] = useState<MonthlyPlan | null>(null);
  const [changeRequests, setChangeRequests] = useState<PlanChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/monthly-plan/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load plan");
      }
      const data = await res.json();
      setPlan(data.plan);
      setChangeRequests(data.changeRequests ?? []);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePublish = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      await togglePlanPublished(plan.id, !plan.isPublished);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const clearPlan = async () => {
    if (!plan) return;
    if (!window.confirm(t("admin.clearConfirm", { title: plan.title }))) return;
    setBusy(true);
    try {
      await clearMonthlyPlan(plan.id);
      router.push("/admin/monthly-plans");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="grid place-items-center py-24">
        <Loader2 size={40} className="animate-spin text-white/30" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-sm text-red-300">{error ?? "Plan not found"}</p>
        <Link
          href="/admin/monthly-plans"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft size={16} />
          {t("admin.backToPlans")}
        </Link>
      </div>
    );
  }

  const monthLabel = formatDateLocalized(
    new Date(plan.year, plan.month - 1, 1),
    locale,
    { month: "long", year: "numeric" }
  );

  return (
    <div className="space-y-6 pb-16">
      <Link
        href="/admin/monthly-plans"
        className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"
      >
        <ArrowLeft size={16} />
        {t("admin.backToPlans")}
      </Link>

      {/* header */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <PlanAvatar name={plan.client.name} image={plan.client.image} size={44} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-black tracking-tight text-white">
            {plan.client.name ?? plan.client.username}
          </h1>
          <p className="truncate text-sm text-white/50">
            {monthLabel} · {plan.title}
            {plan.package ? ` · ${plan.package.name}` : ""}
          </p>
        </div>

        <ProgressRing value={plan.progress.percent} size={44} stroke={4} />

        <span
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold",
            plan.isPublished
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
              : "border-white/10 bg-white/10 text-white/60"
          )}
        >
          {plan.isPublished ? t("admin.published") : t("admin.draft")}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePublish}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-40"
          >
            {plan.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
            {plan.isPublished ? t("admin.unpublish") : t("admin.publish")}
          </button>
          <button
            type="button"
            onClick={clearPlan}
            disabled={busy}
            title={t("admin.clearPlan")}
            aria-label={t("admin.clearPlan")}
            className="rounded-xl border border-red-500/25 p-2 text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {changeRequests.filter((c) => c.status === "OPEN").length > 0 && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
          <h2 className="mb-2 text-sm font-bold text-amber-200">
            {t("admin.changeRequests.title")}
          </h2>
          <ul className="space-y-2">
            {changeRequests
              .filter((c) => c.status === "OPEN")
              .map((c) => (
                <li key={c.id} className="text-xs text-white/70">
                  <span className="font-semibold text-white">
                    {c.requesterName ?? "—"}
                  </span>{" "}
                  <span className="text-white/35">
                    {formatDateLocalized(c.createdAt, locale, {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                  <p className="mt-0.5 whitespace-pre-wrap border-s-2 border-white/15 ps-2">
                    {c.message}
                  </p>
                </li>
              ))}
          </ul>
        </section>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-5">
          <TabsTrigger value="overview">{t("admin.tabs.overview")}</TabsTrigger>
          <TabsTrigger value="structure">{t("admin.tabs.structure")}</TabsTrigger>
          <TabsTrigger value="timeline">{t("admin.tabs.timeline")}</TabsTrigger>
          <TabsTrigger value="actions">{t("admin.tabs.actionsTeam")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PlanOverviewTab plan={plan} onSaved={setPlan} />
        </TabsContent>
        <TabsContent value="structure">
          <PlanStructureTab plan={plan} onSaved={setPlan} />
        </TabsContent>
        <TabsContent value="timeline">
          <PlanTimelineTab plan={plan} onSaved={setPlan} />
        </TabsContent>
        <TabsContent value="actions">
          <PlanActionsTeamTab plan={plan} onSaved={setPlan} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
