"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, CalendarCheck, Loader2 } from "lucide-react";
import { createMonthlyPlan } from "@/components/plan/use-monthly-plan";
import type { PlanClientRef } from "@/components/plan/types";

/**
 * Create is its own route rather than the `params.id === "new"` trick used by
 * admin/services: the per-section endpoints need a parent id to exist, so the
 * plan must be created before its collections can be edited.
 */
function NewPlanView() {
  const t = useTranslations("plan");
  const tc = useTranslations("common");
  const router = useRouter();
  const params = useSearchParams();

  const now = new Date();
  const [clientId, setClientId] = useState(params.get("clientId") ?? "");
  const [month, setMonth] = useState(
    Number(params.get("month")) || now.getMonth() + 1
  );
  const [year, setYear] = useState(
    Number(params.get("year")) || now.getFullYear()
  );
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("Creative & Marketing Roadmap");

  const [clients, setClients] = useState<PlanClientRef[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/monthly-plan?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((d) => setClients(d.clients ?? []))
      .catch(() => setClients([]));
  }, [month, year]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      setError(t("admin.fields.selectClient"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const plan = await createMonthlyPlan({
        clientId,
        month,
        year,
        title: title || undefined,
        subtitle: subtitle || undefined,
      });
      router.replace(`/admin/monthly-plans/${plan.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  const field =
    "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none";
  const label = "mb-1.5 block text-xs font-semibold text-white/70";

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16">
      <Link
        href="/admin/monthly-plans"
        className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"
      >
        <ArrowLeft size={16} />
        {t("admin.backToPlans")}
      </Link>

      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-600/10">
          <CalendarCheck size={20} className="text-red-500" />
        </span>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            {t("admin.createTitle")}
          </h1>
          <p className="text-sm text-white/50">{t("admin.createSubtitle")}</p>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      >
        <div>
          <label className={label} htmlFor="np-client">
            {t("admin.fields.selectClient")} <span className="text-red-400">*</span>
          </label>
          <select
            id="np-client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={field}
          >
            <option value="">{t("admin.fields.selectClient")}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.username ?? c.id}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="np-month">
              {t("admin.fields.month")}
            </label>
            <select
              id="np-month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className={field}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2026, m - 1, 1).toLocaleString("en-US", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="np-year">
              {t("admin.fields.year")}
            </label>
            <input
              id="np-year"
              type="number"
              dir="ltr"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className={field}
            />
          </div>
        </div>

        <div>
          <label className={label} htmlFor="np-title">
            {t("admin.fields.title")}
          </label>
          <input
            id="np-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("admin.fields.titlePlaceholder")}
            className={field}
          />
        </div>

        <div>
          <label className={label} htmlFor="np-subtitle">
            {t("admin.fields.subtitle")}
          </label>
          <input
            id="np-subtitle"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder={t("admin.fields.subtitlePlaceholder")}
            className={field}
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Link
            href="/admin/monthly-plans"
            className="flex-1 rounded-xl border border-white/15 px-4 py-2.5 text-center text-sm font-medium text-white/80 transition hover:bg-white/10"
          >
            {tc("cancel")}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {t("admin.create")}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewMonthlyPlanPage() {
  return (
    <Suspense
      fallback={<div className="py-24 text-center text-sm text-white/40">…</div>}
    >
      <NewPlanView />
    </Suspense>
  );
}
