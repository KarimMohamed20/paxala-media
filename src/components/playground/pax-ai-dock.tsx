"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Copy,
  LayoutGrid,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  MAX_COMPOSE_INSTRUCTION,
  planItems,
  type ComposeKind,
  type ComposePlan,
} from "@/lib/playground/compose-plan";

/**
 * The PAX AI dock.
 *
 * Two ways to use PAX. "Build on the board" takes a person's own request,
 * reads the board, and proposes a PLAN of new items — previewed here, added
 * only on "Add to board". The task chips below it are the original fixed
 * tasks, answered as text on a card.
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

/** Board kind for each plan kind, for labels in the preview. */
const KIND_LABEL_KEY: Record<ComposeKind, string> = {
  sticky: "STICKY",
  text: "TEXT",
  shape: "SHAPE",
  campaign_route: "CAMPAIGN_ROUTE",
  script: "SCRIPT",
  palette: "PALETTE",
};

/** Compose-specific failures the server names by code, so they can be localised. */
const COMPOSE_ERRORS: Record<string, string> = {
  EMPTY_REQUEST: "ai.composeEmpty",
  REQUEST_TOO_LONG: "ai.composeTooLong",
  UNUSABLE_PLAN: "ai.composeUnusable",
};

export function PaxAiDock({
  roomId,
  selection,
  boardCount,
  onInsert,
  onAddPlan,
}: {
  roomId: string;
  selection: ReadonlySet<string>;
  /** How many items are on the board — what "build" reads with no selection. */
  boardCount: number;
  /** Place a generation on the board as a team-only AI card. */
  onInsert: (text: string) => void;
  /** Lay a confirmed plan out on the board. Returns how many items it added. */
  onAddPlan: (plan: ComposePlan, runId: string) => number;
}) {
  const t = useTranslations("playground");
  const { toast } = useToast();

  const [collapsed, setCollapsed] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ intent: string; output: string } | null>(
    null
  );
  const [notConfigured, setNotConfigured] = React.useState(false);

  const [instruction, setInstruction] = React.useState("");
  const [composing, setComposing] = React.useState(false);
  const [proposal, setProposal] = React.useState<{ id: string; plan: ComposePlan } | null>(
    null
  );

  /**
   * Ask PAX for a plan. The request AND the selection go up; the board's
   * content does not — the server re-reads it from the database, so what PAX
   * sees is what is really there, not what this tab believes.
   */
  const compose = React.useCallback(async () => {
    const request = instruction.trim();
    if (!request || composing || busy) return;
    setComposing(true);
    try {
      const res = await fetch(`/api/playground/rooms/${roomId}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "compose",
          instruction: request,
          nodeIds: [...selection],
        }),
      });
      const data = await res.json();
      if (res.status === 501) {
        setNotConfigured(true);
        return;
      }
      if (!res.ok) {
        const key = typeof data.code === "string" ? COMPOSE_ERRORS[data.code] : undefined;
        toast({
          variant: "error",
          title: key
            ? t(key, { max: MAX_COMPOSE_INSTRUCTION })
            : (data.error ?? t("ai.failed")),
        });
        return;
      }
      setProposal({ id: data.id, plan: data.plan as ComposePlan });
    } catch {
      toast({ variant: "error", title: t("ai.failed") });
    } finally {
      setComposing(false);
    }
  }, [busy, composing, instruction, roomId, selection, t, toast]);

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
          ) : proposal ? (
            <ComposePreview
              plan={proposal.plan}
              busy={composing}
              onAdd={() => {
                const count = onAddPlan(proposal.plan, proposal.id);
                setProposal(null);
                setInstruction("");
                toast({ variant: "success", title: t("ai.composeAdded", { count }) });
              }}
              onRegenerate={() => void compose()}
              onDiscard={() => setProposal(null)}
            />
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
              <Composer
                value={instruction}
                onChange={setInstruction}
                onSubmit={() => void compose()}
                busy={composing}
                disabled={busy !== null}
                context={
                  hasSelection
                    ? t("ai.contextSelected", { count: selection.size })
                    : t("ai.contextBoard", { count: boardCount })
                }
              />

              <p className="mb-1.5 mt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
                {hasSelection ? t("ai.withSelection") : t("ai.sparks")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(hasSelection ? QUICK_TASKS : SPARKS).map((intent) => (
                  <button
                    key={intent}
                    type="button"
                    disabled={busy !== null || composing}
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

/**
 * The "build on the board" request box.
 *
 * Says up front what PAX will read (the selection, or the whole board) so
 * nobody is surprised by what the answer drew on. Ctrl/Cmd+Enter submits;
 * plain Enter is a newline, because a real brief has more than one line.
 */
function Composer({
  value,
  onChange,
  onSubmit,
  busy,
  disabled,
  context,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  busy: boolean;
  disabled: boolean;
  context: string;
}) {
  const t = useTranslations("playground");
  const id = React.useId();
  const remaining = MAX_COMPOSE_INSTRUCTION - value.length;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35"
      >
        <Wand2 size={11} aria-hidden="true" />
        {t("ai.composeLabel")}
      </label>
      <textarea
        id={id}
        dir="auto"
        rows={3}
        value={value}
        maxLength={MAX_COMPOSE_INSTRUCTION}
        placeholder={t("ai.composePlaceholder")}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onSubmit();
          }
        }}
        className="w-full resize-none rounded-xl border border-white/10 bg-neutral-950 px-3 py-2 text-xs leading-relaxed text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/25"
      />
      <div className="mt-1.5 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[10px] text-white/35">
          {context}
          {remaining < 120 && (
            <span dir="ltr" className="ms-2 tabular-nums text-amber-400/80">
              {remaining}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!value.trim() || busy || disabled}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-white/30"
        >
          {busy ? (
            <Loader2 size={11} className="animate-spin" aria-hidden="true" />
          ) : (
            <ArrowRight size={11} aria-hidden="true" className="rtl:-scale-x-100" />
          )}
          {t("ai.composeSubmit")}
        </button>
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-white/25">{t("ai.composeHint")}</p>
    </div>
  );
}

/**
 * What PAX proposes, before any of it touches the board.
 *
 * An outline rather than a miniature canvas: the question a person is
 * answering here is "is this the right content?", and a list answers it
 * faster than a thumbnail too small to read. Placement is decided on "Add",
 * against the board as it is at that moment.
 */
function ComposePreview({
  plan,
  busy,
  onAdd,
  onRegenerate,
  onDiscard,
}: {
  plan: ComposePlan;
  busy: boolean;
  onAdd: () => void;
  onRegenerate: () => void;
  onDiscard: () => void;
}) {
  const t = useTranslations("playground");
  const items = planItems(plan);

  return (
    <div>
      <div className="rounded-xl border border-dashed border-red-500/30 bg-white/[0.02] p-3">
        <p dir="auto" className="flex items-center gap-1.5 text-xs font-semibold text-white">
          <LayoutGrid size={12} aria-hidden="true" className="shrink-0 text-red-500" />
          <span className="min-w-0 truncate">{plan.title}</span>
        </p>
        {plan.summary && (
          <p dir="auto" className="mt-1 text-[11px] leading-relaxed text-white/55">
            {plan.summary}
          </p>
        )}

        <div className="mt-2.5 max-h-56 space-y-2.5 overflow-y-auto">
          {plan.groups.map((group, index) => (
            <div key={index}>
              {group.heading && (
                <p dir="auto" className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white/40">
                  {group.heading}
                </p>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.ref} className="flex items-start gap-1.5 text-[11px] leading-snug">
                    <span className="mt-px shrink-0 rounded bg-white/5 px-1 text-[9px] uppercase tracking-wide text-white/40">
                      {t(`nodeKinds.${KIND_LABEL_KEY[item.kind]}`)}
                    </span>
                    {item.kind === "palette" ? (
                      <span className="flex items-center gap-0.5 pt-0.5">
                        {item.colors.map((colour) => (
                          <span
                            key={colour}
                            title={colour}
                            className="h-3 w-3 rounded-sm border border-white/15"
                            style={{ background: colour }}
                          />
                        ))}
                      </span>
                    ) : (
                      <span dir="auto" className="line-clamp-2 min-w-0 text-white/75">
                        {item.title ? `${item.title} — ${item.text}` : item.text}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-2 text-[10px] text-white/35">
          {t("ai.composeItems", { count: items.length })}
          {plan.connections.length > 0 &&
            ` · ${t("ai.composeLinks", { count: plan.connections.length })}`}
        </p>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onAdd}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
        >
          <Plus size={11} aria-hidden="true" />
          {t("ai.addToBoard")}
        </button>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={busy}
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
          onClick={onDiscard}
          aria-label={t("ai.discard")}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <X size={11} aria-hidden="true" />
          {t("ai.discard")}
        </button>
      </div>
    </div>
  );
}
