"use client";

import { useLocale, useTranslations } from "next-intl";
import { Check, CornerUpRight, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateLocalized } from "@/lib/format";
import { formatTimecode } from "@/lib/content-versions";
import type { ContentApprovalEntry, ContentComment } from "./types";

export interface ThreadEntry {
  kind: "comment" | "verdict";
  id: string;
  createdAt: string;
  author: string | null;
  role: "ADMIN" | "STAFF" | "CLIENT";
  body: string | null;
  timecodeSec: number | null;
  resolved: boolean;
  /** Set for unresolved pinned comments; matches the timeline marker. */
  markerIndex: number | null;
  action?: ContentApprovalEntry["action"];
}

/**
 * Merges the feedback conversation with review verdicts into one chronological
 * thread. Pinned, unresolved comments carry the same number as their timeline
 * marker; resolved ones drop to a grey dot and disappear from the timeline.
 */
export function buildThread(
  comments: ContentComment[],
  approvals: ContentApprovalEntry[],
  activeAssetId: string | null
): ThreadEntry[] {
  let marker = 0;
  const commentEntries: ThreadEntry[] = [...comments]
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
    .map((c) => {
      const pinnedHere =
        c.timecodeSec != null &&
        !c.resolved &&
        (!activeAssetId || c.assetId === activeAssetId);
      return {
        kind: "comment" as const,
        id: c.id,
        createdAt: c.createdAt,
        author: c.authorName,
        role: c.authorRole,
        body: c.body,
        timecodeSec: c.timecodeSec,
        resolved: c.resolved,
        markerIndex: pinnedHere ? ++marker : null,
      };
    });

  const verdictEntries: ThreadEntry[] = approvals
    .filter((a) => a.notes)
    .map((a) => ({
      kind: "verdict" as const,
      id: `v-${a.id}`,
      createdAt: a.createdAt,
      author: a.reviewerName,
      role: a.reviewerRole,
      body: a.notes,
      timecodeSec: null,
      resolved: false,
      markerIndex: null,
      action: a.action,
    }));

  return [...commentEntries, ...verdictEntries].sort(
    (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)
  );
}

const VERDICT_STYLE = {
  APPROVED: { icon: Check, tone: "text-green-400", ring: "bg-green-500/15" },
  REJECTED: { icon: X, tone: "text-red-400", ring: "bg-red-500/15" },
  SUBMITTED: {
    icon: CornerUpRight,
    tone: "text-amber-400",
    ring: "bg-amber-500/15",
  },
} as const;

export function ApprovalFeedbackThread({
  entries,
  onSeek,
  className,
}: {
  entries: ThreadEntry[];
  onSeek?: (seconds: number) => void;
  className?: string;
}) {
  const t = useTranslations("content");
  const locale = useLocale();

  if (entries.length === 0) {
    return (
      <p
        className={cn(
          "rounded-lg border border-dashed border-white/10 py-6 text-center text-xs text-white/40",
          className
        )}
      >
        {t("approvals.noComments")}
      </p>
    );
  }

  return (
    <ul className={cn("divide-y divide-white/5", className)}>
      {entries.map((e) => {
        const style = e.action ? VERDICT_STYLE[e.action] : null;
        const Icon = style?.icon ?? MessageSquare;
        return (
          <li key={e.id} className="flex items-start gap-3 py-2.5">
            {/* Leading badge: pin number, or a status glyph */}
            {e.markerIndex != null ? (
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                {e.markerIndex}
              </span>
            ) : (
              <span
                className={cn(
                  "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                  style?.ring ?? "bg-white/10"
                )}
              >
                <Icon size={11} className={style?.tone ?? "text-white/40"} />
              </span>
            )}

            {/* Timecode — clicking seeks the player */}
            {e.timecodeSec != null ? (
              <button
                type="button"
                onClick={() => onSeek?.(e.timecodeSec!)}
                className="mt-0.5 shrink-0 font-mono text-[11px] text-red-300 hover:underline"
              >
                {formatTimecode(e.timecodeSec)}
              </button>
            ) : (
              <span className="mt-0.5 shrink-0 font-mono text-[11px] text-white/25">
                --:--
              </span>
            )}

            <span className="mt-0.5 shrink-0 max-w-32 truncate text-[11px] font-medium text-white/80">
              {e.author ?? "—"}
              {e.role !== "CLIENT" && (
                <span className="text-white/35"> · PMP</span>
              )}
            </span>

            <span
              className={cn(
                "min-w-0 flex-1 whitespace-pre-wrap text-[11px] leading-relaxed",
                e.resolved ? "text-white/35 line-through" : "text-white/70"
              )}
            >
              {e.kind === "verdict" && (
                <span className={cn("font-semibold", style?.tone)}>
                  {t(`review.action.${e.action}`)}:{" "}
                </span>
              )}
              {e.body}
            </span>

            <span className="mt-0.5 shrink-0 whitespace-nowrap text-[10px] text-white/25">
              {formatDateLocalized(e.createdAt, locale, {
                day: "numeric",
                month: "short",
              })}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
