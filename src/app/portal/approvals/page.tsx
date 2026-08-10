"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateLocalized } from "@/lib/format";
import { formatTimecode } from "@/lib/content-versions";
import { ContentStatusPill } from "@/components/content/content-status-pill";
import { ContentVersionHistory } from "@/components/content/content-version-history";
import { ApprovalMediaPlayer } from "@/components/content/approval-media-player";
import {
  ApprovalFeedbackThread,
  buildThread,
} from "@/components/content/approval-feedback-thread";
import {
  CONTENT_FORMATS,
  getPlatformIcon,
} from "@/components/content/content-meta";
import { submitReview } from "@/components/content/use-content-calendar";
import type {
  ContentClientRef,
  ContentItem,
  ReviewAction,
} from "@/components/content/types";

const REVIEW_STATUSES = ["AWAITING_APPROVAL", "REJECTED", "APPROVED"] as const;

interface ApprovalsResponse {
  items: ContentItem[];
  selected: ContentItem | null;
  counts: {
    awaitingApproval: number;
    changesRequested: number;
    approved: number;
  };
  clients: ContentClientRef[];
  clientId: string | null;
}

function ApprovalsView() {
  const t = useTranslations("content");
  const locale = useLocale();
  const searchParams = useSearchParams();

  const [data, setData] = useState<ApprovalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("item")
  );
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [formatFilter, setFormatFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pinTime, setPinTime] = useState<number | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [seekTo, setSeekTo] = useState<{ seconds: number; nonce: number } | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter !== "ALL") qs.set("status", statusFilter);
      if (formatFilter !== "ALL") qs.set("format", formatFilter);
      if (debouncedSearch.trim()) qs.set("q", debouncedSearch.trim());
      if (clientFilter) qs.set("clientId", clientFilter);
      if (selectedId) qs.set("itemId", selectedId);

      const res = await fetch(`/api/portal/approvals?${qs}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load approvals");
      }
      const json: ApprovalsResponse = await res.json();
      setData(json);
      setSelectedId(json.selected?.id ?? null);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, formatFilter, debouncedSearch, clientFilter, selectedId]);

  useEffect(() => {
    void load();
    // `load` changes with selectedId, which is what we want: picking a queue item
    // refetches that item's full thread.
  }, [load]);

  const selected = data?.selected ?? null;

  // Default the preview to the first attached file whenever the item changes.
  useEffect(() => {
    setActiveAssetId(selected?.assets?.[0]?.file.id ?? null);
    setDraft("");
    setPinTime(null);
    setPlayhead(0);
  }, [selected?.id, selected?.assets]);

  const thread = useMemo(
    () =>
      selected
        ? buildThread(
            selected.comments ?? [],
            selected.approvals ?? [],
            activeAssetId
          )
        : [],
    [selected, activeAssetId]
  );

  const markers = useMemo(
    () =>
      thread
        .filter((e) => e.markerIndex != null && e.timecodeSec != null)
        .map((e) => ({
          id: e.id,
          index: e.markerIndex!,
          timecodeSec: e.timecodeSec!,
          label: e.body ?? "",
        })),
    [thread]
  );

  const seek = (seconds: number) =>
    setSeekTo({ seconds, nonce: Date.now() });

  const sendComment = async () => {
    if (!selected || !draft.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/portal/content-calendar/${selected.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: draft,
            ...(pinTime != null && activeAssetId
              ? { timecodeSec: pinTime, assetId: activeAssetId }
              : {}),
          }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to post comment");
      }
      setDraft("");
      setPinTime(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verdict = async (action: ReviewAction) => {
    if (!selected) return;
    setBusy(true);
    try {
      // Anything typed in the box travels with the decision as its note.
      await submitReview(selected.id, action, draft.trim());
      setDraft("");
      setPinTime(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const dueLabel = (item: ContentItem) => {
    const due = new Date(item.reviewDueAt ?? item.scheduledAt);
    const today = new Date();
    const sameDay =
      due.getFullYear() === today.getFullYear() &&
      due.getMonth() === today.getMonth() &&
      due.getDate() === today.getDate();
    if (sameDay) return t("approvals.dueToday");
    if (due < today && item.status === "AWAITING_APPROVAL")
      return t("approvals.overdue");
    return t("approvals.dueOn", {
      date: formatDateLocalized(due, locale, { day: "numeric", month: "short" }),
    });
  };

  const subtitleFor = (item: ContentItem) => {
    const n = item.assets?.length ?? 0;
    if (item.format === "CAROUSEL" && n > 0)
      return t("approvals.imageCount", { count: n });
    if (item.format === "STORIES" && n > 0)
      return t("approvals.storyCount", { count: n });
    return t(`format.${item.format}`);
  };

  const stats = [
    {
      key: "awaitingApproval",
      icon: Clock,
      tone: "text-red-400",
      value: data?.counts.awaitingApproval ?? 0,
    },
    {
      key: "changesRequested",
      icon: RefreshCw,
      tone: "text-amber-400",
      value: data?.counts.changesRequested ?? 0,
    },
    {
      key: "approved",
      icon: CheckCircle2,
      tone: "text-green-400",
      value: data?.counts.approved ?? 0,
    },
  ] as const;

  const canAct =
    selected?.status === "AWAITING_APPROVAL" || selected?.status === "REJECTED";

  const selectClass =
    "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-red-500/50 focus:outline-none";

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 pb-16">
      {/* header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            {t("approvals.title")}
          </h1>
          <p className="mt-1 text-sm text-white/50">{t("approvals.subtitle")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(data?.clients.length ?? 0) > 0 && (
            <select
              value={data?.clientId ?? ""}
              onChange={(e) => setClientFilter(e.target.value)}
              aria-label={t("form.client")}
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 focus:outline-none"
            >
              {data?.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? c.username ?? c.id}
                </option>
              ))}
            </select>
          )}
          <div className="relative min-w-[200px]">
            <Search
              size={14}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("approvals.searchPlaceholder")}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2 ps-9 pe-3 text-xs text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none"
            />
          </div>
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className={selectClass}
          >
            <option value="ALL">{t("approvals.allContent")}</option>
            {CONTENT_FORMATS.map((f) => (
              <option key={f} value={f}>
                {t(`format.${f}`)}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClass}
          >
            <option value="ALL">{t("approvals.allStatus")}</option>
            {REVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* ---------- workspace ---------- */}
        <div className="space-y-5 xl:col-span-8">
          <div className="grid grid-cols-3 gap-3">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.key}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <Icon size={18} className={s.tone} />
                  <div>
                    <p className="text-2xl font-black leading-none text-white">
                      {s.value}
                    </p>
                    <p className="mt-1 text-[11px] text-white/45">
                      {t(`approvals.stats.${s.key}`)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            {loading && !selected ? (
              <p className="py-24 text-center text-sm text-white/40">
                {t("calendar.loading")}
              </p>
            ) : !selected ? (
              <div className="py-24 text-center">
                <p className="text-sm text-white/50">
                  {t("approvals.emptyQueue")}
                </p>
                <p className="mt-1 text-xs text-white/35">
                  {t("approvals.emptyQueueHint")}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {selected.title}
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/45">
                      <span>{t(`format.${selected.format}`)}</span>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1">
                        {getPlatformIcon(selected.platform, 12)}
                        {t(`platform.${selected.platform}`)}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{dueLabel(selected)}</span>
                    </p>
                  </div>
                  <ContentStatusPill status={selected.status} size="md" pulse />
                </div>

                <ApprovalMediaPlayer
                  assets={selected.assets ?? []}
                  activeAssetId={activeAssetId}
                  onActiveAssetChange={setActiveAssetId}
                  markers={markers}
                  onTimeChange={setPlayhead}
                  seekTo={seekTo}
                  onMarkerClick={(m) => seek(m.timecodeSec)}
                />

                {selected.caption && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/75">
                      {selected.caption}
                    </p>
                  </div>
                )}

                <section className="mt-5">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-white/50">
                    {t("approvals.feedback")}
                  </h3>
                  <ApprovalFeedbackThread entries={thread} onSeek={seek} />
                </section>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendComment();
                        }
                      }}
                      placeholder={t("approvals.commentPlaceholder")}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 pe-28 text-sm text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none"
                    />
                    {/* Pin the comment to the current frame of the active video */}
                    {activeAssetId && (
                      <button
                        type="button"
                        onClick={() =>
                          setPinTime((p) => (p == null ? playhead : null))
                        }
                        title={
                          pinTime == null
                            ? t("approvals.pinAtCurrentTime", {
                                time: formatTimecode(playhead),
                              })
                            : t("approvals.unpin")
                        }
                        className={cn(
                          "absolute end-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-lg px-2 py-1 font-mono text-[11px] transition",
                          pinTime == null
                            ? "text-white/40 hover:bg-white/10 hover:text-white/70"
                            : "bg-red-600/20 text-red-300"
                        )}
                      >
                        <MapPin size={11} />
                        {formatTimecode(pinTime ?? playhead)}
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={busy || !draft.trim()}
                    onClick={() => void sendComment()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    <Send size={14} />
                    {t("approvals.sendComment")}
                  </button>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={busy || !canAct}
                    onClick={() => void verdict("REJECT")}
                    className="flex-1 rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10 disabled:opacity-40"
                  >
                    {t("approvals.requestChanges")}
                  </button>
                  <button
                    type="button"
                    disabled={busy || !canAct}
                    onClick={() => void verdict("APPROVE")}
                    className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-40"
                  >
                    {t("approvals.approveContent")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ---------- right rail ---------- */}
        <div className="space-y-4 xl:col-span-4">
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <h2 className="mb-3 text-sm font-bold text-white">
              {t("approvals.queue")}
            </h2>
            {(data?.items.length ?? 0) === 0 ? (
              <p className="py-6 text-center text-xs text-white/40">
                {t("approvals.emptyQueueHint")}
              </p>
            ) : (
              <ul className="space-y-2">
                {data?.items.map((item) => {
                  const active = item.id === selectedId;
                  const thumb = item.assets?.[0]?.file.thumbnail;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border p-2 text-start transition",
                          active
                            ? "border-red-500/60 bg-red-500/[0.07]"
                            : "border-white/10 hover:border-white/25 hover:bg-white/5"
                        )}
                      >
                        <span className="h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                          {thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumb}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-white">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-white/45">
                            {subtitleFor(item)} · {dueLabel(item)}
                          </span>
                        </span>
                        <ContentStatusPill
                          status={item.status}
                          size="xs"
                          className="shrink-0"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {selected && (
            <>
              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h2 className="mb-3 text-sm font-bold text-white">
                  {t("approvals.contentDetails")}
                </h2>
                <dl className="space-y-2 text-xs">
                  <Row label={t("approvals.details.campaign")}>
                    {selected.project ? (
                      selected.project.slug ? (
                        <Link
                          href={`/portal/projects/${selected.project.slug}`}
                          className="text-red-300 hover:underline"
                        >
                          {selected.project.title}
                        </Link>
                      ) : (
                        selected.project.title
                      )
                    ) : (
                      <span className="text-white/35">
                        {t("approvals.details.noCampaign")}
                      </span>
                    )}
                  </Row>
                  <Row label={t("approvals.details.owner")}>
                    {selected.assets?.[0]?.file.project?.title ??
                      "PMP Creative Team"}
                  </Row>
                  <Row label={t("approvals.details.uploaded")}>
                    {formatDateLocalized(
                      selected.approvals?.[selected.approvals.length - 1]
                        ?.createdAt ?? selected.scheduledAt,
                      locale,
                      {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </Row>
                  <Row label={t("approvals.details.version")}>
                    {t("approvals.version.label", {
                      n: Math.max(
                        1,
                        (selected.approvals ?? []).filter(
                          (a) => a.action === "SUBMITTED"
                        ).length
                      ),
                    })}
                  </Row>
                  <Row label={t("approvals.details.platforms")}>
                    <span className="inline-flex items-center gap-1.5">
                      {getPlatformIcon(selected.platform, 13)}
                      {t(`platform.${selected.platform}`)}
                    </span>
                  </Row>
                </dl>
              </section>

              <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <h2 className="mb-3 text-sm font-bold text-white">
                  {t("approvals.versionHistory")}
                </h2>
                <ContentVersionHistory approvals={selected.approvals ?? []} />
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-white/45">{label}</dt>
      <dd className="min-w-0 text-end text-white/85">{children}</dd>
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense
      fallback={<div className="py-24 text-center text-sm text-white/40">…</div>}
    >
      <ApprovalsView />
    </Suspense>
  );
}
