"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * The PAX AI dock.
 *
 * PAX NEVER WRITES TO THE BOARD. A generation comes back as text on a card with
 * explicit actions — insert, regenerate, copy, discard — and putting it on the
 * canvas is an ordinary node creation the user triggers. That is the whole
 * guarantee: no model output can ever overwrite or appear beside human work
 * without someone deciding it should.
 *
 * Inserted cards are created TEAM_ONLY and are barred from publication by kind
 * (see isPublishableKind), so a raw generation cannot reach a client even by
 * mistake. It becomes client-facing only when a person copies its content into
 * a real card and publishes that.
 *
 * The dock is Studio-only — it is never rendered for a client, and the endpoint
 * refuses them before parsing the request anyway.
 */

/** Tasks offered as chips. Ordered by how often a session actually needs them. */
const QUICK_TASKS = [
  "campaign_route",
  "three_directions",
  "headline",
  "script",
  "shot_list",
  "challenge",
] as const;

const SPARKS = [
  "spark_visual",
  "spark_story",
  "spark_headline",
  "spark_camera",
  "spark_social",
  "spark_unexpected",
] as const;

export function PaxAiDock({
  roomId,
  selection,
  onInsert,
}: {
  roomId: string;
  selection: ReadonlySet<string>;
  /** Place a generation on the board as a team-only AI card. */
  onInsert: (text: string) => void;
}) {
  const t = useTranslations("playground");
  const { toast } = useToast();

  const [collapsed, setCollapsed] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ intent: string; output: string } | null>(
    null
  );
  const [notConfigured, setNotConfigured] = React.useState(false);

  const run = React.useCallback(
    async (intent: string) => {
      if (busy) return;
      setBusy(intent);
      try {
        const res = await fetch(`/api/playground/rooms/${roomId}/ai`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent, nodeIds: [...selection] }),
        });
        const data = await res.json();

        if (res.status === 501) {
          setNotConfigured(true);
          return;
        }
        if (!res.ok) {
          toast({ variant: "error", title: data.error ?? t("ai.failed") });
          return;
        }
        setResult({ intent, output: data.output });
      } catch {
        toast({ variant: "error", title: t("ai.failed") });
      } finally {
        setBusy(null);
      }
    },
    [busy, roomId, selection, t, toast]
  );

  const hasSelection = selection.size > 0;

  return (
    <div className="pointer-events-auto w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/95 shadow-2xl shadow-black/60 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
        <span className="flex items-center gap-2">
          <Sparkles size={14} aria-hidden="true" className="text-red-500" />
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-white">
            {t("ai.name")}
          </span>
          {/* The context strip: what PAX will actually be looking at. */}
          <span className="text-[10px] text-white/35">
            {hasSelection
              ? t("ai.contextSelected", { count: selection.size })
              : t("ai.contextRoom")}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t("ai.expand") : t("ai.collapse")}
          className="rounded-lg p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
        >
          {collapsed ? (
            <ChevronUp size={15} aria-hidden="true" />
          ) : (
            <ChevronDown size={15} aria-hidden="true" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="max-h-[60vh] overflow-y-auto border-t border-white/10 p-3">
          {notConfigured ? (
            <p className="text-[11px] leading-relaxed text-white/40">
              {t("ai.notConfigured")}
            </p>
          ) : result ? (
            <div>
              <p
                dir="auto"
                className="max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-dashed border-red-500/30 bg-white/[0.02] p-3 text-xs leading-relaxed text-white/85"
              >
                {result.output}
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onInsert(result.output);
                    setResult(null);
                    toast({ variant: "success", title: t("ai.inserted") });
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-red-500"
                >
                  <Plus size={11} aria-hidden="true" />
                  {t("ai.insert")}
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void run(result.intent)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/10 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw size={11} aria-hidden="true" />
                  )}
                  {t("ai.regenerate")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(result.output);
                    toast({ variant: "success", title: t("ai.copied") });
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
                >
                  <Copy size={11} aria-hidden="true" />
                  {t("ai.copy")}
                </button>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  aria-label={t("ai.discard")}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-white/40 transition hover:bg-white/10 hover:text-white"
                >
                  <X size={11} aria-hidden="true" />
                  {t("ai.discard")}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                {hasSelection ? t("ai.withSelection") : t("ai.sparks")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(hasSelection ? QUICK_TASKS : SPARKS).map((intent) => (
                  <button
                    key={intent}
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void run(intent)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg border border-white/12 px-2.5 py-1.5 text-[11px] font-medium text-white/70 transition",
                      "hover:border-white/25 hover:bg-white/5 hover:text-white disabled:opacity-50"
                    )}
                  >
                    {busy === intent && (
                      <Loader2 size={10} className="animate-spin" aria-hidden="true" />
                    )}
                    {t(`ai.tasks.${intent}`)}
                  </button>
                ))}
              </div>
              {!hasSelection && (
                <p className="mt-2 text-[10px] leading-relaxed text-white/30">
                  {t("ai.selectHint")}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
