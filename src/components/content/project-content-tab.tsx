"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CalendarRange, ExternalLink, Plus } from "lucide-react";
import { formatDateLocalized } from "@/lib/format";
import { ContentItemCard } from "./content-item-card";
import { ContentReviewDrawer } from "./content-review-drawer";
import { ContentFormModal } from "./content-form-modal";
import {
  createContentItem,
  submitReview,
  useContentCalendar,
} from "./use-content-calendar";
import type {
  ContentAssetFile,
  ContentFormValues,
  ContentItem,
  ReviewAction,
} from "./types";

/**
 * A project's content, grouped by publish date. Uses the per-project route so it
 * shows the whole arc of the project rather than one calendar month.
 */
export function ProjectContentTab({
  projectId,
  projectSlug,
  projectTitle,
  assets,
}: {
  projectId: string;
  projectSlug: string;
  projectTitle: string;
  /** The project's own files — the picker is already correctly scoped. */
  assets: ContentAssetFile[];
}) {
  const t = useTranslations("content");
  const locale = useLocale();

  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { items, loading, error, refetch } = useContentCalendar({
    scope: "project",
    projectSlug,
  });

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up: ContentItem[] = [];
    const done: ContentItem[] = [];
    for (const item of items) {
      if (item.publishedAt || new Date(item.scheduledAt).getTime() < now) done.push(item);
      else up.push(item);
    }
    up.sort(
      (a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt)
    );
    done.sort(
      (a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt)
    );
    return { upcoming: up, past: done };
  }, [items]);

  const openItem = useCallback((item: ContentItem) => {
    setActionError(null);
    setSelectedItem(item);
    setDrawerOpen(true);
  }, []);

  // Keep the drawer's copy in step with a refetch so the thread stays current.
  useEffect(() => {
    if (!selectedItem) return;
    const fresh = items.find((i) => i.id === selectedItem.id);
    if (fresh && fresh !== selectedItem) setSelectedItem(fresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const handleReview = async (id: string, action: ReviewAction, notes: string) => {
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

  const monthOf = (item: ContentItem) =>
    formatDateLocalized(item.scheduledAt, locale, {
      month: "long",
      year: "numeric",
    });

  const renderGroup = (label: string, list: ContentItem[]) => {
    if (list.length === 0) return null;
    // Sub-group by month so a long retainer reads as a timeline.
    const months: { label: string; items: ContentItem[] }[] = [];
    for (const item of list) {
      const m = monthOf(item);
      const bucket = months[months.length - 1];
      if (bucket && bucket.label === m) bucket.items.push(item);
      else months.push({ label: m, items: [item] });
    }

    return (
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">
          {label} ({list.length})
        </h3>
        {months.map((group) => (
          <div key={group.label} className="space-y-2">
            <p className="text-[11px] font-medium text-white/35">{group.label}</p>
            {group.items.map((item) => (
              <ContentItemCard
                key={item.id}
                item={item}
                variant="row"
                showProject={false}
                onClick={openItem}
              />
            ))}
          </div>
        ))}
      </section>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarRange size={18} className="text-red-400" />
          <h2 className="text-lg font-bold text-white">{t("projectTab.title")}</h2>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">
            {items.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/portal/calendar?projectId=${projectId}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
          >
            <ExternalLink size={14} />
            {t("projectTab.viewInCalendar")}
          </Link>
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-500"
          >
            <Plus size={14} />
            {t("projectTab.newForProject")}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-12 text-center text-sm text-white/40">
          {t("calendar.loading")}
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-14 text-center">
          <CalendarRange size={40} className="mx-auto mb-3 text-white/20" />
          <p className="text-sm text-white/50">{t("projectTab.empty")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {renderGroup(t("projectTab.upcoming"), upcoming)}
          {renderGroup(t("projectTab.past"), past)}
        </div>
      )}

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
        projects={[{ id: projectId, title: projectTitle, slug: projectSlug }]}
        lockedProjectId={projectId}
        assets={assets}
        submitting={busy}
        error={actionError}
      />
    </div>
  );
}
