"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { History, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateLocalized } from "@/lib/format";

/**
 * The room's history.
 *
 * Studio-only, enforced at the route: every row derives from PlaygroundEvent,
 * and the shape of what happened is internal even with payloads withheld.
 *
 * Paginated by SEQUENCE, not timestamp. Seq is gapless and totally ordered
 * within a room, so a page boundary can never drop or duplicate a row — which
 * two events sharing a millisecond absolutely can.
 */

export type ActivityEvent = {
  id: string;
  seq: number;
  type: string;
  actorName: string | null;
  actorRole: string;
  nodeId: string | null;
  createdAt: string;
};

/**
 * Events worth showing a human.
 *
 * Geometry ops are excluded on purpose: "Maya moved a sticky" three hundred
 * times is not history, it is noise that buries the decisions and publications
 * someone opened this tab to find.
 */
const NOISE = new Set(["NODE_MOVE", "NODE_RESIZE", "NODE_ORDER", "NODE_STYLE"]);

export function ActivityTimeline({
  roomId,
  revision,
  onFocusNode,
}: {
  roomId: string;
  revision: number;
  onFocusNode?: (nodeId: string) => void;
}) {
  const t = useTranslations("playground");
  const locale = useLocale();

  const [events, setEvents] = React.useState<ActivityEvent[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [nextBefore, setNextBefore] = React.useState<number | null>(null);

  const load = React.useCallback(
    async (before?: number) => {
      const query = before !== undefined ? `?before=${before}` : "";
      const res = await fetch(`/api/playground/rooms/${roomId}/activity${query}`);
      if (!res.ok) return null;
      return res.json();
    },
    [roomId]
  );

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void load().then((data) => {
      if (cancelled || !data) {
        if (!cancelled) setLoading(false);
        return;
      }
      setEvents(data.events ?? []);
      setNextBefore(data.nextBefore ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load, revision]);

  const loadMore = async () => {
    if (nextBefore === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await load(nextBefore);
      if (data) {
        setEvents((prev) => [...prev, ...(data.events ?? [])]);
        // A page that returns nothing new ends the list rather than looping.
        setNextBefore(data.events?.length > 0 ? data.nextBefore : null);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const visible = React.useMemo(
    () => events.filter((event) => !NOISE.has(event.type)),
    [events]
  );

  if (loading) {
    return (
      <div className="grid h-full place-items-center">
        <Loader2 size={16} className="animate-spin text-white/30" aria-hidden="true" />
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={History}
          size="compact"
          title={t("activity.emptyTitle")}
          description={t("activity.emptyBody")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <ol className="divide-y divide-white/5">
        {visible.map((event) => (
          <li key={event.id} className="px-4 py-2.5">
            <p className="text-[11px] leading-relaxed text-white/70">
              <span className="font-semibold text-white">
                {event.actorName ?? t("common.unnamed")}
              </span>{" "}
              {t(`activity.types.${event.type}`)}
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/30">
              <time dateTime={event.createdAt}>
                {formatDateLocalized(new Date(event.createdAt), locale, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              {event.nodeId && onFocusNode && (
                <>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => onFocusNode(event.nodeId!)}
                    className="font-semibold text-red-400 hover:text-red-300"
                  >
                    {t("activity.show")}
                  </button>
                </>
              )}
            </p>
          </li>
        ))}
      </ol>

      {nextBefore !== null && (
        <div className="p-3">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-semibold text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
          >
            {loadingMore && <Loader2 size={11} className="animate-spin" aria-hidden="true" />}
            {t("activity.loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}
