"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  CalendarCheck,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateLocalized } from "@/lib/format";
import { PlanMonthNav } from "@/components/plan/plan-month-nav";
import { PlanAvatar } from "@/components/plan/plan-avatar";
import { ProgressRing } from "@/components/plan/progress-ring";
import { togglePlanPublished } from "@/components/plan/use-monthly-plan";
import type {
  MonthlyPlanSummary,
  PlanClientRef,
} from "@/components/plan/types";

interface ListResponse {
  month: number;
  year: number;
  plans: MonthlyPlanSummary[];
  clients: PlanClientRef[];
  missingClients: PlanClientRef[];
  counts: { published: number; draft: number };
}

function MonthlyPlansView() {
  const t = useTranslations("plan");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [clientFilter, setClientFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        month: String(month),
        year: String(year),
      });
      if (clientFilter !== "ALL") qs.set("clientId", clientFilter);
      if (statusFilter !== "ALL") qs.set("status", statusFilter);

      const res = await fetch(`/api/admin/monthly-plan?${qs}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load plans");
      }
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [month, year, clientFilter, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  // Client-side search, matching admin/content-calendar and admin/projects.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || !data) return data?.plans ?? [];
    return data.plans.filter((p) =>
      [p.title, p.subtitle ?? "", p.client.name ?? "", p.client.username ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [data, search]);

  const togglePublish = async (plan: MonthlyPlanSummary) => {
    setBusyId(plan.id);
    try {
      await togglePlanPublished(plan.id, !plan.isPublished);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const selectClass =
    "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-red-500/50 focus:outline-none";

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-600/10">
            <CalendarCheck size={20} className="text-red-500" />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              {t("admin.title")}
            </h1>
            <p className="text-sm text-white/50">{t("admin.subtitle")}</p>
          </div>
        </div>
        <Link
          href={`/admin/monthly-plans/new?month=${month}&year=${year}`}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
        >
          <Plus size={16} />
          {t("admin.newPlan")}
        </Link>
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-2">
        <PlanMonthNav
          year={year}
          month={month}
          onChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
          dense
        />

        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          aria-label={t("admin.allClients")}
          className={selectClass}
        >
          <option value="ALL">{t("admin.allClients")}</option>
          {data?.clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name ?? c.username ?? c.id}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label={t("admin.allStatuses")}
          className={selectClass}
        >
          <option value="ALL">{t("admin.allStatuses")}</option>
          <option value="PUBLISHED">{t("admin.published")}</option>
          <option value="DRAFT">{t("admin.draft")}</option>
        </select>

        <div className="relative min-w-[200px] flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-white/40"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.searchPlaceholder")}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 ps-9 pe-3 text-xs text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid place-items-center py-24">
          <Loader2 size={32} className="animate-spin text-white/30" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <p className="text-sm text-white/55">{t("admin.noPlans")}</p>
          <p className="mt-1 text-xs text-white/35">{t("admin.noPlansHint")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-white/20"
            >
              <PlanAvatar name={p.client.name} image={p.client.image} size={36} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {p.client.name ?? p.client.username}
                </p>
                <p className="truncate text-[11px] text-white/45">
                  {p.title}
                  {p.package ? ` · ${p.package.name}` : ""}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <ProgressRing value={p.progressPercent} size={32} stroke={3} />
              </div>

              <span className="hidden text-[11px] text-white/40 sm:block">
                {t("admin.contentItems", { count: p.contentItemCount })}
              </span>

              <span
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                  p.isPublished
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                    : "border-white/10 bg-white/10 text-white/60"
                )}
              >
                {p.isPublished ? t("admin.published") : t("admin.draft")}
              </span>

              <span className="hidden text-[11px] text-white/35 lg:block">
                {formatDateLocalized(p.updatedAt, locale, {
                  day: "2-digit",
                  month: "short",
                })}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={busyId === p.id}
                  onClick={() => togglePublish(p)}
                  title={p.isPublished ? t("admin.unpublish") : t("admin.publish")}
                  aria-label={
                    p.isPublished ? t("admin.unpublish") : t("admin.publish")
                  }
                  className="rounded-lg p-2 text-white/50 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                >
                  {p.isPublished ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/admin/monthly-plans/${p.id}`)}
                  title={tc("edit")}
                  aria-label={tc("edit")}
                  className="rounded-lg p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
                >
                  <Pencil size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* The block that drives the monthly workflow: who still needs a plan. */}
      {!loading && (data?.missingClients.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
          <h2 className="mb-3 text-sm font-bold text-amber-200">
            {t("admin.missingClients")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {data?.missingClients.map((c) => (
              <Link
                key={c.id}
                href={`/admin/monthly-plans/new?clientId=${c.id}&month=${month}&year=${year}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75 transition hover:bg-white/10"
              >
                <Plus size={12} />
                {t("admin.createFor", { client: c.name ?? c.username ?? c.id })}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function AdminMonthlyPlansPage() {
  return (
    <Suspense
      fallback={<div className="py-24 text-center text-sm text-white/40">…</div>}
    >
      <MonthlyPlansView />
    </Suspense>
  );
}
