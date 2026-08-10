"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircle,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  LayoutGrid,
  List,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateLocalized } from "@/lib/format";
import { isRTL, type Locale } from "@/i18n/config";
import { ContentMonthGrid } from "@/components/content/content-month-grid";
import { ContentItemCard } from "@/components/content/content-item-card";
import { ContentStatusPill } from "@/components/content/content-status-pill";
import { ContentReviewDrawer } from "@/components/content/content-review-drawer";
import { ContentFormModal } from "@/components/content/content-form-modal";
import {
  CONTENT_FORMATS,
  CONTENT_PLATFORMS,
  CONTENT_STATUSES,
  getPlatformIcon,
} from "@/components/content/content-meta";
import {
  createContentItem,
  deleteContentItem,
  fetchAssetLibrary,
  submitReview,
  updateContentItem,
} from "@/components/content/use-content-calendar";
import type {
  ContentAssetFile,
  ContentClientRef,
  ContentFormValues,
  ContentItem,
  ContentProjectRef,
  ContentStatus,
  ReviewAction,
} from "@/components/content/types";

type ViewMode = "calendar" | "list" | "table";

export default function AdminContentCalendarPage() {
  const t = useTranslations("content");
  const ta = useTranslations("adminUI");
  const tc = useTranslations("common");
  const locale = useLocale();
  const rtl = isRTL(locale as Locale);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [clientId, setClientId] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [formatFilter, setFormatFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");

  const [items, setItems] = useState<ContentItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [clients, setClients] = useState<ContentClientRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<Partial<ContentFormValues>>();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Asset library for the create-on-behalf picker, scoped to the chosen client.
  const [formClientId, setFormClientId] = useState<string>("");
  const [assets, setAssets] = useState<ContentAssetFile[]>([]);
  const [projects, setProjects] = useState<ContentProjectRef[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(Date.UTC(year, month - 1, 1)).toISOString();
      const to = new Date(Date.UTC(year, month, 1)).toISOString();
      const qs = new URLSearchParams({ from, to, pageSize: "200" });
      if (clientId !== "ALL") qs.set("clientId", clientId);
      if (statusFilter !== "ALL") qs.set("status", statusFilter);
      if (platformFilter !== "ALL") qs.set("platform", platformFilter);
      if (formatFilter !== "ALL") qs.set("format", formatFilter);

      const res = await fetch(`/api/admin/content-calendar?${qs}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load content");
      }
      const data = await res.json();
      setItems(data.items ?? []);
      setCounts(data.counts ?? {});
      setClients(data.clients ?? []);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [year, month, clientId, statusFilter, platformFilter, formatFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reload the picker whenever the target client changes.
  useEffect(() => {
    if (!formClientId) {
      setAssets([]);
      setProjects([]);
      return;
    }
    fetchAssetLibrary(formClientId)
      .then(({ files, projects: p }) => {
        setAssets(files);
        setProjects(p);
      })
      .catch(() => {
        setAssets([]);
        setProjects([]);
      });
  }, [formClientId]);

  // Search is applied client-side, matching the pattern in admin/projects.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      [
        i.title,
        i.caption ?? "",
        i.project?.title ?? "",
        i.plan?.client?.name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, search]);

  const awaiting = useMemo(
    () => visible.filter((i) => i.status === "AWAITING_APPROVAL"),
    [visible]
  );

  const openItem = (item: ContentItem) => {
    setActionError(null);
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  const openCreate = (scheduledAt?: string) => {
    setActionError(null);
    const preset = clientId !== "ALL" ? clientId : "";
    setFormClientId(preset);
    setFormInitial({ scheduledAt: scheduledAt ?? "", clientId: preset || null });
    setFormOpen(true);
  };

  const handleReview = async (id: string, action: ReviewAction, notes: string) => {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await submitReview(id, action, notes);
      setSelectedItem(updated);
      await load();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleStatusChange = async (id: string, status: ContentStatus) => {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await updateContentItem(id, { status });
      setSelectedItem(updated);
      await load();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (item: ContentItem) => {
    if (!window.confirm(`${tc("delete")} "${item.title}"?`)) return;
    setBusy(true);
    try {
      await deleteContentItem(item.id);
      setDrawerOpen(false);
      await load();
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
      await load();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const shift = (delta: number) =>
    setCurrentDate(new Date(year, month - 1 + delta, 1));

  const monthLabel = formatDateLocalized(currentDate, locale, {
    month: "long",
    year: "numeric",
  });
  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;

  const kpis = [
    { key: "scheduled", icon: Clock, tone: "text-blue-400", value: counts.SCHEDULED ?? 0 },
    {
      key: "awaitingApproval",
      icon: AlertCircle,
      tone: "text-amber-400",
      value: counts.AWAITING_APPROVAL ?? 0,
    },
    {
      key: "drafts",
      icon: FileText,
      tone: "text-purple-400",
      value: (counts.DRAFT ?? 0) + (counts.IN_PROGRESS ?? 0),
    },
    {
      key: "published",
      icon: CheckCircle2,
      tone: "text-emerald-400",
      value: counts.PUBLISHED ?? 0,
    },
  ] as const;

  const selectClass =
    "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-red-500/50 focus:outline-none";

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-white">
            <CalendarRange size={24} className="text-red-500" />
            {ta("contentCalendar")}
          </h1>
          <p className="mt-1 text-sm text-white/50">{ta("manageContent")}</p>
        </div>
        <button
          type="button"
          onClick={() => openCreate()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
        >
          <Plus size={16} />
          {ta("newContentItem")}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.key}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/50">
                  {t(`metrics.${k.key}`)}
                </span>
                <Icon size={16} className={k.tone} />
              </div>
              <p className="mt-2 text-3xl font-black text-white">{k.value}</p>
            </div>
          );
        })}
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          aria-label={ta("allClients")}
          className={selectClass}
        >
          <option value="ALL">{ta("allClients")}</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name ?? c.username ?? c.id}
            </option>
          ))}
        </select>

        <div className="relative min-w-[200px] flex-1">
          <Search
            size={14}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tc("searchPlaceholder")}
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 ps-9 pe-3 text-xs text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none"
          />
        </div>

        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          aria-label={t("calendar.filterByPlatform")}
          className={selectClass}
        >
          <option value="ALL">{t("platform.ALL")}</option>
          {CONTENT_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {t(`platform.${p}`)}
            </option>
          ))}
        </select>

        <select
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value)}
          className={selectClass}
        >
          <option value="ALL">{t("format.ALL")}</option>
          {CONTENT_FORMATS.map((f) => (
            <option key={f} value={f}>
              {t(`format.${f}`)}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label={t("calendar.prevMonth")}
            className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <PrevIcon size={16} />
          </button>
          <span className="min-w-36 text-center text-xs font-bold text-white">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label={t("calendar.nextMonth")}
            className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <NextIcon size={16} />
          </button>
        </div>

        <div className="flex overflow-hidden rounded-lg border border-white/10">
          {(
            [
              ["calendar", CalendarRange, ta("calendarView")],
              ["list", LayoutGrid, ta("listView")],
              ["table", List, ta("tableView")],
            ] as const
          ).map(([mode, Icon, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              title={label}
              aria-label={label}
              aria-pressed={viewMode === mode}
              className={cn(
                "p-2 transition",
                viewMode === mode
                  ? "bg-red-600/20 text-red-300"
                  : "text-white/50 hover:bg-white/10"
              )}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* status pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={cn(
            "rounded-full border px-3 py-1 text-[11px] font-medium transition",
            statusFilter === "ALL"
              ? "border-red-500/40 bg-red-600/20 text-red-300"
              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
          )}
        >
          {t("status.ALL")}
        </button>
        {CONTENT_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-medium transition",
              statusFilter === s
                ? "border-red-500/40 bg-red-600/20 text-red-300"
                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
            )}
          >
            {t(`status.${s}`)} ({counts[s] ?? 0})
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-9">
          {loading ? (
            <p className="py-16 text-center text-sm text-white/40">
              {t("calendar.loading")}
            </p>
          ) : visible.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/10 py-16 text-center text-sm text-white/40">
              {ta("noContentItems")}
            </p>
          ) : viewMode === "calendar" ? (
            <ContentMonthGrid
              year={year}
              month={month}
              items={visible}
              onDayAdd={openCreate}
              onItemClick={openItem}
              showClient
            />
          ) : viewMode === "list" ? (
            <div className="space-y-2">
              {visible.map((item) => (
                <ContentItemCard
                  key={item.id}
                  item={item}
                  variant="row"
                  showClient
                  onClick={openItem}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-white/50">
                  <tr>
                    <th className="px-3 py-2.5 text-start">{tc("title")}</th>
                    <th className="px-3 py-2.5 text-start">{tc("client")}</th>
                    <th className="px-3 py-2.5 text-start">{tc("project")}</th>
                    <th className="px-3 py-2.5 text-start">{t("form.platform")}</th>
                    <th className="px-3 py-2.5 text-start">
                      {t("form.publishDate")}
                    </th>
                    <th className="px-3 py-2.5 text-start">{tc("status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => openItem(item)}
                      className="cursor-pointer border-t border-white/5 transition hover:bg-white/5"
                    >
                      <td className="px-3 py-2.5 font-medium text-white">
                        {item.title}
                      </td>
                      <td className="px-3 py-2.5 text-white/60">
                        {item.plan?.client?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-white/60">
                        {item.project?.title ?? "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5 text-white/60">
                          {getPlatformIcon(item.platform, 12)}
                          {t(`platform.${item.platform}`)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-white/60">
                        {formatDateLocalized(item.scheduledAt, locale, {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2.5">
                        <ContentStatusPill status={item.status} size="xs" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="lg:col-span-3">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <Sparkles size={14} className="text-amber-400" />
              {ta("awaitingClientApproval")}
            </h2>
            {awaiting.length === 0 ? (
              <p className="py-6 text-center text-xs text-white/40">
                {ta("allCaughtUp")}
              </p>
            ) : (
              <div className="space-y-2">
                {awaiting.slice(0, 8).map((item) => (
                  <ContentItemCard
                    key={item.id}
                    item={item}
                    variant="card"
                    showClient
                    onClick={openItem}
                  />
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      <ContentReviewDrawer
        item={selectedItem}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        mode="admin"
        onReview={handleReview}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
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
        clients={clients}
        showClientField
        showStatusField
        onClientChange={setFormClientId}
        submitting={busy}
        error={actionError}
      />
    </div>
  );
}
