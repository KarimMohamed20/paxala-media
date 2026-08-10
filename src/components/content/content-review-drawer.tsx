"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import {
  Calendar,
  Check,
  Folder,
  Pencil,
  Send,
  Trash2,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateLocalized } from "@/lib/format";
import { isRTL, type Locale } from "@/i18n/config";
import { ContentStatusPill } from "./content-status-pill";
import {
  NEXT_STATUSES,
  REVIEWABLE_STATUSES,
  canSubmitForApproval,
  getApprovalActionStyle,
  getFormatIcon,
  getPlatformIcon,
} from "./content-meta";
import type {
  ContentApprovalEntry,
  ContentItem,
  ContentStatus,
  ReviewAction,
} from "./types";

export function ContentReviewDrawer({
  item,
  isOpen,
  onClose,
  mode = "client",
  onReview,
  onStatusChange,
  onEdit,
  onDelete,
  busy = false,
  error,
}: {
  item: ContentItem | null;
  isOpen: boolean;
  onClose: () => void;
  mode?: "client" | "admin";
  onReview?: (id: string, action: ReviewAction, notes: string) => Promise<void>;
  onStatusChange?: (id: string, status: ContentStatus) => Promise<void>;
  onEdit?: (item: ContentItem) => void;
  onDelete?: (item: ContentItem) => void;
  busy?: boolean;
  error?: string | null;
}) {
  const t = useTranslations("content");
  const tc = useTranslations("common");
  const locale = useLocale();
  const rtl = isRTL(locale as Locale);

  const [notes, setNotes] = useState("");
  const [notesFor, setNotesFor] = useState(item?.id);

  // Clear the note box when a different item is opened, so feedback never leaks
  // from one deliverable to the next. Adjusting during render (rather than in an
  // effect) avoids a second render pass with the stale note still shown.
  if (item?.id !== notesFor) {
    setNotesFor(item?.id);
    setNotes("");
  }

  if (!item) return null;

  const date = (v: string | Date) =>
    formatDateLocalized(v, locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const clientName = item.plan?.client?.name ?? item.plan?.client?.username;

  // Fall back to the denormalized note when the log is empty — this is what makes
  // a previously write-only clientNotes field visible at all.
  const thread: ContentApprovalEntry[] =
    item.approvals && item.approvals.length > 0
      ? item.approvals
      : item.clientNotes
        ? [
            {
              id: "legacy",
              action: item.rejectedAt ? "REJECTED" : "APPROVED",
              notes: item.clientNotes,
              reviewerName: null,
              reviewerRole: "CLIENT",
              toStatus: item.status,
              createdAt:
                item.rejectedAt ?? item.approvedAt ?? item.scheduledAt,
            },
          ]
        : [];

  const canReview = REVIEWABLE_STATUSES.includes(item.status);
  const transitions = mode === "admin" ? NEXT_STATUSES[item.status] : [];

  const review = (action: ReviewAction) => {
    if (!onReview) return;
    void onReview(item.id, action, notes).then(() => setNotes(""));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />
          <motion.aside
            // Slide in from the inline-end edge in both directions.
            initial={{ x: rtl ? "-100%" : "100%" }}
            animate={{ x: 0 }}
            exit={{ x: rtl ? "-100%" : "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed end-0 top-0 bottom-0 w-full sm:w-[520px] bg-neutral-950 border-s border-white/10 z-50 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label={item.title}
          >
            {/* header */}
            <div className="sticky top-0 z-10 bg-neutral-950/95 backdrop-blur border-b border-white/10 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <ContentStatusPill status={item.status} size="sm" />
                  <h2 className="mt-2 text-lg font-bold text-white leading-snug">
                    {item.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={tc("close")}
                  className="shrink-0 rounded-lg p-1.5 text-white/50 hover:text-white hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="px-5 py-5 space-y-6">
              {/* meta strip */}
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/70">
                  {getPlatformIcon(item.platform, 12)}
                  {t(`platform.${item.platform}`)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/70">
                  {getFormatIcon(item.format, 12)}
                  {t(`format.${item.format}`)}
                </span>
                {item.project ? (
                  item.project.slug ? (
                    <Link
                      href={`/portal/projects/${item.project.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-red-300 hover:bg-red-500/20"
                    >
                      <Folder size={12} />
                      {item.project.title}
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-red-300">
                      <Folder size={12} />
                      {item.project.title}
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/15 px-2.5 py-1 text-white/40">
                    <Folder size={12} />
                    {t("review.noProject")}
                  </span>
                )}
                {mode === "admin" && clientName && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-white/70">
                    <User size={12} />
                    {clientName}
                  </span>
                )}
              </div>

              {/* date rail */}
              <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs">
                <p className="flex items-center gap-2 text-white/70">
                  <Calendar size={13} className="text-white/40" />
                  {t("review.scheduledFor", { date: date(item.scheduledAt) })}
                </p>
                {item.approvedAt && (
                  <p className="flex items-center gap-2 text-green-400/90">
                    <Check size={13} />
                    {t("review.approvedOn", { date: date(item.approvedAt) })}
                  </p>
                )}
                {item.rejectedAt && (
                  <p className="flex items-center gap-2 text-red-400/90">
                    <X size={13} />
                    {t("review.rejectedOn", { date: date(item.rejectedAt) })}
                  </p>
                )}
                {item.publishedAt && (
                  <p className="flex items-center gap-2 text-emerald-400/90">
                    <Send size={13} />
                    {t("review.publishedOn", { date: date(item.publishedAt) })}
                  </p>
                )}
              </div>

              {/* media */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                  {t("review.attachedMedia")}
                </h3>
                {item.assets.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-white/10 py-5 text-center text-xs text-white/40">
                    {t("review.noMedia")}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {item.assets.map((asset) => (
                      <div
                        key={asset.id}
                        className="aspect-video overflow-hidden rounded-lg border border-white/10 bg-black"
                      >
                        {asset.file.type?.toLowerCase().includes("video") ? (
                          <video
                            src={asset.file.url}
                            poster={asset.file.thumbnail ?? undefined}
                            controls
                            preload="none"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={asset.file.thumbnail || asset.file.url}
                            alt={asset.file.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* caption */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                  {t("review.postCopy")}
                </h3>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                    {item.caption || (
                      <span className="text-white/35">{t("review.noCaption")}</span>
                    )}
                  </p>
                </div>
              </section>

              {/* approval thread */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                  {t("review.history")}
                </h3>
                {thread.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-white/10 py-4 text-center text-xs text-white/40">
                    {t("review.noHistory")}
                  </p>
                ) : (
                  <ol className="space-y-3">
                    {thread.map((entry) => {
                      const style = getApprovalActionStyle(entry.action);
                      return (
                        <li key={entry.id} className="flex gap-3">
                          <span className="relative mt-1 flex flex-col items-center">
                            <span
                              className={cn(
                                "h-2 w-2 shrink-0 rounded-full",
                                style.dot
                              )}
                            />
                            <span className="mt-1 w-px flex-1 bg-white/10" />
                          </span>
                          <div className="min-w-0 flex-1 pb-1">
                            <p className="text-xs text-white/70">
                              <span className="font-semibold text-white">
                                {entry.reviewerName ?? tc("client")}
                              </span>{" "}
                              <span className={style.text}>
                                {t(`review.action.${entry.action}`)}
                              </span>
                              {entry.reviewerRole === "ADMIN" && (
                                <span className="text-white/40">
                                  {" "}
                                  · {t("review.onBehalf")}
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 text-[10px] text-white/35">
                              {date(entry.createdAt)}
                            </p>
                            {entry.notes && (
                              <p className="mt-1.5 whitespace-pre-wrap rounded-lg border-s-2 border-white/15 bg-white/[0.03] px-3 py-2 text-xs leading-relaxed text-white/70">
                                {entry.notes}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>

              {/* notes + actions */}
              {(onReview || onStatusChange) && (
                <section className="space-y-3">
                  <label
                    htmlFor="content-review-notes"
                    className="block text-xs font-semibold uppercase tracking-wider text-white/50"
                  >
                    {t("review.notesLabel")}
                  </label>
                  <textarea
                    id="content-review-notes"
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("review.notesPlaceholder")}
                    className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none"
                  />

                  {error && (
                    <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      {error}
                    </p>
                  )}

                  {onReview && canReview && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => review("REJECT")}
                        className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                      >
                        {t("review.reject")}
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => review("APPROVE")}
                        className="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-500 disabled:opacity-50"
                      >
                        {t("review.approve")}
                      </button>
                    </div>
                  )}

                  {mode === "admin" && (
                    <div className="space-y-2">
                      {onReview && canSubmitForApproval(item.status) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => review("SUBMIT")}
                          className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                        >
                          {t("review.submitForApproval")}
                        </button>
                      )}

                      {onStatusChange && transitions.length > 0 && (
                        <div>
                          <p className="mb-1.5 text-[11px] text-white/40">
                            {t("review.changeStatus")}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {transitions.map((next) => (
                              <button
                                key={next}
                                type="button"
                                disabled={busy}
                                onClick={() => void onStatusChange(item.id, next)}
                                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 disabled:opacity-50"
                              >
                                {t(`status.${next}`)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {(onEdit || onDelete) && (
                        <div className="flex gap-2 pt-1">
                          {onEdit && (
                            <button
                              type="button"
                              onClick={() => onEdit(item)}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10"
                            >
                              <Pencil size={14} />
                              {tc("edit")}
                            </button>
                          )}
                          {onDelete && (
                            <button
                              type="button"
                              onClick={() => onDelete(item)}
                              className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/25 px-4 py-2 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
                            >
                              <Trash2 size={14} />
                              {tc("delete")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
