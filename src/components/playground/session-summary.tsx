"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, Check, FileText, Loader2, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatDateLocalized } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Session summaries.
 *
 * Every draft is labelled as machine-written and unreviewed until a PMP user
 * says otherwise. That label is not decoration: this text names people and
 * asserts what was decided, and the brief requires a human check before a client
 * sees it. Marking it reviewed is a deliberate, recorded act.
 */

type Summary = {
  id: string;
  draft: { text?: string; decisionCount?: number; approvalCount?: number };
  reviewedAt: string | null;
  sharedWithClientAt: string | null;
  createdAt: string;
};

export function SessionSummary({ roomId }: { roomId: string }) {
  const t = useTranslations("playground");
  const locale = useLocale();
  const { toast } = useToast();

  const [summaries, setSummaries] = React.useState<Summary[]>([]);
  const [canGenerate, setCanGenerate] = React.useState(false);
  const [state, setState] = React.useState<"loading" | "ready" | "denied">("loading");
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/playground/rooms/${roomId}/summary`);
      if (res.status === 403 || res.status === 404) {
        setState("denied");
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setSummaries(data.summaries ?? []);
      setCanGenerate(!!data.canGenerate);
      setState("ready");
    } catch {
      setState("denied");
    }
  }, [roomId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/playground/rooms/${roomId}/summary`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "error", title: data.error ?? t("summary.failed") });
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const markReviewed = async (summaryId: string) => {
    setSummaries((prev) =>
      prev.map((s) =>
        s.id === summaryId ? { ...s, reviewedAt: new Date().toISOString() } : s
      )
    );
    await fetch(`/api/playground/rooms/${roomId}/summary`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summaryId }),
    }).catch(() => void load());
  };

  if (state === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-black">
        <Loader2 size={20} className="animate-spin text-white/40" aria-hidden="true" />
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="grid min-h-screen place-items-center bg-black p-6">
        <EmptyState
          icon={FileText}
          title={t("summary.deniedTitle")}
          description={t("summary.deniedBody")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link
            href={`/playground/${roomId}`}
            aria-label={t("room.backToRooms")}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={16} aria-hidden="true" className="rtl:rotate-180" />
          </Link>
          <h1 className="flex-1 text-base font-bold text-white">
            {t("summary.title")}
          </h1>
          {canGenerate && (
            <button
              type="button"
              onClick={generate}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={12} className="animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles size={12} aria-hidden="true" />
              )}
              {t("summary.generate")}
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        {summaries.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={t("summary.emptyTitle")}
            description={t("summary.emptyBody")}
          />
        ) : (
          <ul className="space-y-4">
            {summaries.map((summary) => (
              <li
                key={summary.id}
                className="rounded-2xl border border-white/12 bg-white/[0.03] p-5"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]",
                      summary.reviewedAt
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                    )}
                  >
                    {summary.reviewedAt ? (
                      <Check size={10} aria-hidden="true" />
                    ) : (
                      <Sparkles size={10} aria-hidden="true" />
                    )}
                    {summary.reviewedAt
                      ? t("summary.reviewed")
                      : t("summary.unreviewed")}
                  </span>
                  <time
                    dateTime={summary.createdAt}
                    className="text-[11px] text-white/35"
                  >
                    {formatDateLocalized(new Date(summary.createdAt), locale, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>

                {!summary.reviewedAt && (
                  <p className="mb-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-200/80">
                    {t("summary.draftWarning")}
                  </p>
                )}

                <p
                  dir="auto"
                  className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/80"
                >
                  {summary.draft?.text ?? ""}
                </p>

                {!summary.reviewedAt && (
                  <button
                    type="button"
                    onClick={() => void markReviewed(summary.id)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10"
                  >
                    <Check size={12} aria-hidden="true" />
                    {t("summary.markReviewed")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
