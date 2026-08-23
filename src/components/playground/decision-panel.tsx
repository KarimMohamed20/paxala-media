"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { CheckCircle2, Loader2, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatDateLocalized } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Decision records.
 *
 * The brief's complaint is that decisions "disappear inside chat", so these are
 * rows rather than pinned messages: what was chosen, out of what, by whom, when.
 *
 * The option list is a SNAPSHOT taken when the decision was recorded. The cards
 * it came from stay editable — a record that drifted along with them would be
 * worth nothing when someone asks in six weeks what was actually agreed.
 */

export type DecisionOption = {
  label: string;
  nodeId: string | null;
  votes: number;
  chosen: boolean;
};

export type DecisionRecord = {
  id: string;
  title: string;
  description: string | null;
  options: DecisionOption[];
  outcome: string | null;
  nodeIds: string[];
  createdByName: string | null;
  createdAt: string;
};

type ApprovalSummary = {
  id: string;
  status: "PENDING" | "APPROVED" | "CHANGES_REQUESTED" | "WITHDRAWN";
  title: string;
  contentHash: string;
  createdAt: string;
};

export function DecisionPanel({
  roomId,
  canRecord,
  canProduce,
  selection,
  revision,
  onFocusNode,
}: {
  roomId: string;
  canRecord: boolean;
  /** May turn an approved direction into project work. */
  canProduce?: boolean;
  /** Currently selected node ids — a new decision cites them. */
  selection: ReadonlySet<string>;
  revision: number;
  onFocusNode?: (nodeId: string) => void;
}) {
  const t = useTranslations("playground");
  const locale = useLocale();
  const { toast } = useToast();

  const [decisions, setDecisions] = React.useState<DecisionRecord[]>([]);
  const [approvals, setApprovals] = React.useState<ApprovalSummary[]>([]);
  const [producing, setProducing] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [composing, setComposing] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [outcome, setOutcome] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [decisionRes, approvalRes] = await Promise.all([
        fetch(`/api/playground/rooms/${roomId}/decisions`),
        fetch(`/api/playground/rooms/${roomId}/approvals`),
      ]);
      if (decisionRes.ok) {
        const data = await decisionRes.json();
        setDecisions(data.decisions ?? []);
      }
      if (approvalRes.ok) {
        const data = await approvalRes.json();
        setApprovals(data.approvals ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  /**
   * Turn an approved direction into project work.
   *
   * Reads the approval's FROZEN payload server-side, not the live board: if the
   * team kept iterating after sign-off — which is normal — the live nodes have
   * moved on and would produce tasks for work nobody agreed to.
   */
  const saveToProject = async (approvalId: string) => {
    if (producing) return;
    setProducing(approvalId);
    try {
      const res = await fetch(`/api/playground/rooms/${roomId}/save-to-project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "error", title: data.error ?? t("produce.failed") });
        return;
      }
      toast({
        variant: "success",
        title: t("produce.saved", { count: data.tasks?.length ?? 0 }),
        description: data.note ?? data.project?.title,
      });
    } catch {
      toast({ variant: "error", title: t("produce.failed") });
    } finally {
      setProducing(null);
    }
  };

  React.useEffect(() => {
    void load();
  }, [load, revision]);

  const record = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || saving) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/playground/rooms/${roomId}/decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          outcome: outcome.trim() || null,
          nodeIds: [...selection],
        }),
      });
      if (res.ok) {
        setTitle("");
        setOutcome("");
        setComposing(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid h-full place-items-center">
        <Loader2 size={16} className="animate-spin text-white/30" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {canRecord && (
        <div className="shrink-0 border-b border-white/10 p-3">
          {composing ? (
            <form onSubmit={record} className="space-y-2">
              <label htmlFor="pg-decision-title" className="sr-only">
                {t("decisions.titleLabel")}
              </label>
              <input
                id="pg-decision-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("decisions.titlePlaceholder")}
                maxLength={200}
                dir="auto"
                autoFocus
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none"
              />
              <label htmlFor="pg-decision-outcome" className="sr-only">
                {t("decisions.outcomeLabel")}
              </label>
              <textarea
                id="pg-decision-outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder={t("decisions.outcomePlaceholder")}
                rows={2}
                maxLength={500}
                dir="auto"
                className="w-full resize-none rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none"
              />
              {selection.size > 0 && (
                <p className="text-[10px] text-white/40">
                  {t("decisions.citing", { count: selection.size })}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setComposing(false)}
                  className="flex-1 rounded-lg border border-white/15 px-3 py-1.5 text-[11px] font-medium text-white/70 hover:bg-white/10"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || saving}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-500 disabled:opacity-40"
                >
                  {saving && <Loader2 size={11} className="animate-spin" aria-hidden="true" />}
                  {t("decisions.record")}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 px-3 py-2 text-[11px] font-semibold text-white/60 transition hover:border-white/25 hover:text-white"
            >
              <Plus size={12} aria-hidden="true" />
              {t("decisions.record")}
            </button>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Client approvals sit above internal decisions: an outstanding request
            is the thing the room is waiting on, and burying it under a list of
            notes is how it gets missed. */}
        {approvals.length > 0 && (
          <ul className="divide-y divide-white/5 border-b border-white/10">
            {approvals.slice(0, 3).map((approval) => (
              <li
                key={approval.id}
                className={cn(
                  "px-4 py-3",
                  approval.status === "PENDING" && "bg-amber-500/[0.06]"
                )}
              >
                <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-400">
                  <ShieldCheck size={10} aria-hidden="true" />
                  {t(`approve.status.${approval.status}`)}
                </p>
                <p dir="auto" className="mt-1 text-xs font-bold text-white">
                  {approval.title}
                </p>
                <div className="mt-2 flex gap-2">
                  <Link
                    href={`/playground/${roomId}/approve/${approval.id}`}
                    className="flex-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-center text-[11px] font-semibold text-white/80 transition hover:bg-white/10"
                  >
                    {t("produce.review")}
                  </Link>
                  {canProduce && approval.status === "APPROVED" && (
                    <button
                      type="button"
                      onClick={() => void saveToProject(approval.id)}
                      disabled={producing !== null}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
                    >
                      {producing === approval.id ? (
                        <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Sparkles size={11} aria-hidden="true" />
                      )}
                      {t("produce.saveToProject")}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {decisions.length === 0 && approvals.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={CheckCircle2}
              size="compact"
              title={t("panel.decisionsEmptyTitle")}
              description={t("panel.decisionsEmptyBody")}
            />
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {decisions.map((decision, index) => (
              <li
                key={decision.id}
                className={cn(
                  "px-4 py-3",
                  // The most recent decision is the one the room is acting on.
                  index === 0 && "bg-amber-500/[0.05]"
                )}
              >
                {index === 0 && (
                  <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-400">
                    {t("decisions.latest")}
                  </p>
                )}
                <p dir="auto" className="text-xs font-bold leading-snug text-white">
                  {decision.title}
                </p>
                {decision.outcome && (
                  <p
                    dir="auto"
                    className="mt-1 text-[11px] leading-relaxed text-white/60"
                  >
                    {decision.outcome}
                  </p>
                )}

                {decision.options.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {decision.options.map((option, i) => (
                      <li
                        key={i}
                        className={cn(
                          "flex items-center gap-1.5 text-[11px]",
                          option.chosen ? "text-emerald-400" : "text-white/45"
                        )}
                      >
                        {option.chosen && (
                          <CheckCircle2 size={10} aria-hidden="true" />
                        )}
                        <span dir="auto" className="truncate">
                          {option.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <p className="mt-2 flex items-center gap-1.5 text-[10px] text-white/30">
                  <span>{decision.createdByName ?? t("common.unnamed")}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={decision.createdAt}>
                    {formatDateLocalized(new Date(decision.createdAt), locale, {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </p>

                {decision.nodeIds.length > 0 && onFocusNode && (
                  <button
                    type="button"
                    onClick={() => onFocusNode(decision.nodeIds[0])}
                    className="mt-1.5 text-[10px] font-semibold text-red-400 hover:text-red-300"
                  >
                    {t("decisions.showOnCanvas", { count: decision.nodeIds.length })}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
