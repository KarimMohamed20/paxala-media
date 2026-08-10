"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Folder,
  Plus,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateLocalized } from "@/lib/format";
import { isRTL, type Locale } from "@/i18n/config";
import { ContentMonthGrid } from "@/components/content/content-month-grid";
import { ContentItemCard } from "@/components/content/content-item-card";
import { ContentReviewDrawer } from "@/components/content/content-review-drawer";
import { ContentFormModal } from "@/components/content/content-form-modal";
import {
  CONTENT_PLATFORMS,
  CONTENT_STATUSES,
  getStatusDotClass,
} from "@/components/content/content-meta";
import {
  createContentItem,
  fetchAssetLibrary,
  submitReview,
  useContentCalendar,
} from "@/components/content/use-content-calendar";
import type {
  ContentAssetFile,
  ContentFormValues,
  ContentItem,
  ContentProjectRef,
  ReviewAction,
} from "@/components/content/types";

function ContentCalendarView() {
  const t = useTranslations("content");
  const tc = useTranslations("common");
  const searchParams = useSearchParams();
  const locale = useLocale();
  const rtl = isRTL(locale as Locale);

  const [currentDate, setCurrentDate] = useState(() => {
    const y = Number(searchParams.get("year"));
    const m = Number(searchParams.get("month"));
    return y && m ? new Date(y, m - 1, 1) : new Date();
  });
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  // Set by "View in calendar" on a project's Content tab.
  const [projectFilter, setProjectFilter] = useState<string | null>(
    searchParams.get("projectId")
  );
  // Agency users own no content plans, so they pick whose calendar to view.
  // Stays null for clients, who only ever see their own.
  const [clientFilter, setClientFilter] = useState<string | null>(
    searchParams.get("clientId")
  );

  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<Partial<ContentFormValues>>();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [assets, setAssets] = useState<ContentAssetFile[]>([]);
  const [projects, setProjects] = useState<ContentProjectRef[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const {
    items,
    metrics,
    platformMix,
    needsApproval,
    needsApprovalTotal,
    clients,
    resolvedClientId,
    loading,
    error,
    refetch,
  } = useContentCalendar({
    year,
    month,
    platform: platformFilter,
    status: statusFilter,
    projectId: projectFilter,
    clientId: clientFilter,
  });

  // The asset library does not change per month, but it is per-client — reload it
  // whenever an agency user switches whose calendar they are viewing.
  useEffect(() => {
    fetchAssetLibrary(resolvedClientId)
      .then(({ files, projects: p }) => {
        setAssets(files);
        setProjects(p);
      })
      .catch(() => {
        /* picker simply stays empty */
      });
  }, [resolvedClientId]);

  // Deep link: /portal/calendar?item=<id> opens that item's review drawer.
  const deepLinkId = searchParams.get("item");
  useEffect(() => {
    if (!deepLinkId || !items.length) return;
    const found = items.find((i) => i.id === deepLinkId);
    if (found) {
      setSelectedItem(found);
      setDrawerOpen(true);
    }
  }, [deepLinkId, items]);

  const openItem = useCallback((item: ContentItem) => {
    setActionError(null);
    setSelectedItem(item);
    setDrawerOpen(true);
  }, []);

  const openCreate = useCallback((scheduledAt?: string) => {
    setActionError(null);
    setFormInitial({ scheduledAt: scheduledAt ?? "" });
    setFormOpen(true);
  }, []);

  const shiftMonth = (delta: number) =>
    setCurrentDate(new Date(year, month - 1 + delta, 1));

  const handleReview = async (
    id: string,
    action: ReviewAction,
    notes: string
  ) => {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await submitReview(id, action, notes);
      setSelectedItem(updated);
      await refetch();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = async (values: ContentFormValues) => {
    setBusy(true);
    setActionError(null);
    try {
      await createContentItem(values);
      setFormOpen(false);
      await refetch();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const monthLabel = useMemo(
    () =>
      formatDateLocalized(currentDate, locale, {
        month: "long",
        year: "numeric",
      }),
    [currentDate, locale]
  );

  // In RTL, "previous" sits on the right — swap the glyphs, not the handlers.
  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;

  const cards = [
    {
      key: "scheduled",
      icon: Clock,
      value: metrics.scheduled,
      tone: "text-blue-400",
    },
    {
      key: "awaitingApproval",
      icon: AlertCircle,
      value: metrics.awaitingApproval,
      tone: "text-amber-400",
      glow: metrics.awaitingApproval > 0,
    },
    {
      key: "drafts",
      icon: FileText,
      value: metrics.drafts,
      tone: "text-purple-400",
    },
    {
      key: "published",
      icon: CheckCircle2,
      value: metrics.published,
      tone: "text-emerald-400",
    },
  ] as const;

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-16">
      {/* header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-white">
              {t("calendar.title")}
            </h1>
            <span className="rounded-full border border-red-500/30 bg-red-600/20 px-2.5 py-0.5 text-xs font-semibold text-red-400">
              {t("calendar.liveAssets")}
            </span>
          </div>
          <p className="mt-1 text-sm text-white/50">{t("calendar.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => openCreate()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
        >
          <Plus size={16} />
          {t("calendar.newContentRequest")}
        </button>
      </div>

      {/* metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.key}
              className={cn(
                "rounded-2xl border border-white/10 bg-white/[0.03] p-4",
                "glow" in c && c.glow && "border-amber-500/30 bg-amber-500/[0.06]"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/50">
                  {t(`metrics.${c.key}`)}
                </span>
                <Icon size={16} className={c.tone} />
              </div>
              <p className="mt-2 text-3xl font-black text-white">{c.value}</p>
              <p className="mt-0.5 text-[11px] text-white/35">
                {t(`metrics.${c.key}Hint`)}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* calendar */}
        <div className="space-y-4 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label={t("calendar.prevMonth")}
                className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <PrevIcon size={18} />
              </button>
              <span className="min-w-40 text-center text-sm font-bold text-white">
                {monthLabel}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label={t("calendar.nextMonth")}
                className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                <NextIcon size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Agency users only: clients never see this, since the list is
                  empty for them and they can only ever view their own plan. */}
              {clients.length > 0 && (
                <select
                  value={resolvedClientId ?? ""}
                  onChange={(e) => setClientFilter(e.target.value)}
                  aria-label={t("form.client")}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 focus:border-amber-400/60 focus:outline-none"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name ?? c.username ?? c.id}
                    </option>
                  ))}
                </select>
              )}

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label={t("calendar.filterByStatus")}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-red-500/50 focus:outline-none"
              >
                <option value="ALL">{t("status.ALL")}</option>
                {CONTENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`status.${s}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label={t("calendar.filterByPlatform")}
          >
            {(["ALL", ...CONTENT_PLATFORMS] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatformFilter(p)}
                className={cn(
                  "rounded-full border px-3 py-1 text-[11px] font-medium transition",
                  platformFilter === p
                    ? "border-red-500/40 bg-red-600/20 text-red-300"
                    : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                )}
              >
                {t(`platform.${p}`)}
              </button>
            ))}
          </div>

          {projectFilter && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-600/15 px-3 py-1 text-[11px] text-red-300">
                <Folder size={11} />
                {projects.find((p) => p.id === projectFilter)?.title ??
                  t("form.project")}
                <button
                  type="button"
                  onClick={() => setProjectFilter(null)}
                  aria-label={tc("close")}
                  className="ms-1 rounded-full p-0.5 hover:bg-red-500/20"
                >
                  <X size={11} />
                </button>
              </span>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          {loading ? (
            <p className="py-16 text-center text-sm text-white/40">
              {t("calendar.loading")}
            </p>
          ) : (
            <ContentMonthGrid
              year={year}
              month={month}
              items={items}
              onDayAdd={openCreate}
              onItemClick={openItem}
            />
          )}
        </div>

        {/* sidebar */}
        <div className="space-y-4 lg:col-span-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <Sparkles size={14} className="text-amber-400" />
                {t("calendar.needsYourApproval")}
              </h2>
              {needsApprovalTotal > 0 && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300">
                  {needsApprovalTotal}
                </span>
              )}
            </div>

            {needsApproval.length === 0 ? (
              <p className="py-6 text-center text-xs text-white/40">
                {t("calendar.allCaughtUp")}
              </p>
            ) : (
              <div className="space-y-2">
                {needsApproval.map((item) => (
                  <ContentItemCard
                    key={item.id}
                    item={item}
                    variant="card"
                    onClick={openItem}
                  />
                ))}
                {needsApprovalTotal > needsApproval.length && (
                  <p className="pt-1 text-center text-[11px] text-white/40">
                    {t("calendar.showingOfTotal", {
                      shown: needsApproval.length,
                      total: needsApprovalTotal,
                    })}
                  </p>
                )}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <Send size={14} className="text-red-400" />
              {t("calendar.platformMix")}
            </h2>
            {platformMix.length === 0 ? (
              <p className="py-4 text-center text-xs text-white/40">
                {t("calendar.nothingScheduled")}
              </p>
            ) : (
              <div className="space-y-2.5">
                {platformMix.map((p) => (
                  <div key={p.name}>
                    <div className="mb-1 flex items-center justify-between text-[11px]">
                      <span className="text-white/70">
                        {t(`platform.${p.name}`)}
                      </span>
                      <span className="text-white/40">
                        {p.percentage}% ({p.count})
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      {/* A block child fills from the inline start, so the bar
                          grows right-to-left under dir="rtl" automatically. */}
                      <div
                        className={cn(
                          "h-full rounded-full from-red-600 to-amber-500",
                          rtl ? "bg-gradient-to-l" : "bg-gradient-to-r"
                        )}
                        style={{ width: `${Math.max(p.percentage, 2)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="mb-3 text-sm font-bold text-white">
              {t("calendar.statusLegend")}
            </h2>
            <ul className="space-y-1.5">
              {CONTENT_STATUSES.map((s) => (
                <li key={s} className="flex items-center gap-2 text-[11px]">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      getStatusDotClass(s)
                    )}
                  />
                  <span className="text-white/60">{t(`status.${s}`)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <ContentReviewDrawer
        item={selectedItem}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode="client"
        onReview={handleReview}
        busy={busy}
        error={actionError}
      />

      <ContentFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        initial={formInitial}
        projects={projects}
        assets={assets}
        submitting={busy}
        error={actionError}
      />
    </div>
  );
}

export default function ContentCalendarPage() {
  // useSearchParams needs a Suspense boundary in the App Router.
  return (
    <Suspense
      fallback={<div className="py-24 text-center text-sm text-white/40">…</div>}
    >
      <ContentCalendarView />
    </Suspense>
  );
}
