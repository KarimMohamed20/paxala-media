"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  MessageSquarePlus,
  TriangleAlert,
} from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { formatDateLocalized } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The approval deck.
 *
 * A card-per-direction, snap-scrolled vertically. Deliberately NOT a canvas: the
 * client is being asked a question, not invited to explore, and a pannable
 * infinite plane on a phone is a worse way to read four options than a stack of
 * cards is.
 *
 * Everything here comes from the approval's FROZEN payload, so what is reviewed
 * is exactly what was submitted — the live board may have moved on. It also
 * means this page needs no realtime connection, which matters because mobile
 * Safari drops streams for backgrounded tabs and this is the one screen that
 * absolutely must work for the audience whose signature it exists to collect.
 */

type FrozenNode = {
  id: string;
  kind: string;
  text: string | null;
  data: Record<string, unknown>;
};

type ApprovalAction = {
  id: string;
  action: string;
  notes: string | null;
  responderName: string | null;
  responderRole: string;
  createdAt: string;
};

type Approval = {
  id: string;
  status: "PENDING" | "APPROVED" | "CHANGES_REQUESTED" | "WITHDRAWN";
  title: string;
  note: string | null;
  contentHash: string;
  createdAt: string;
  requestedByName: string | null;
  payload: { nodes: FrozenNode[] };
  actions: ApprovalAction[];
};

export function ApprovalDeck({
  roomId,
  approvalId,
}: {
  roomId: string;
  approvalId: string;
}) {
  const t = useTranslations("playground");
  const locale = useLocale();
  const { toast } = useToast();

  const [approval, setApproval] = React.useState<Approval | null>(null);
  const [canRespond, setCanRespond] = React.useState(false);
  const [state, setState] = React.useState<"loading" | "ready" | "error">("loading");
  const [notes, setNotes] = React.useState("");
  const [composing, setComposing] = React.useState(false);
  const [submitting, setSubmitting] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/playground/rooms/${roomId}/approvals`);
      if (!res.ok) {
        setState("error");
        return;
      }
      const data = await res.json();
      const found = (data.approvals ?? []).find(
        (item: Approval) => item.id === approvalId
      );
      if (!found) {
        setState("error");
        return;
      }
      setApproval(found);
      setCanRespond(!!data.canRespond);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [approvalId, roomId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const respond = async (action: "APPROVED" | "CHANGES_REQUESTED") => {
    if (submitting) return;
    setSubmitting(action);
    try {
      const res = await fetch(
        `/api/playground/rooms/${roomId}/approvals/${approvalId}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, notes: notes.trim() || null }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast({ variant: "error", title: data.error ?? t("approve.failed") });
        return;
      }
      setApproval(data.approval);
      setComposing(false);
      setNotes("");
      toast({
        variant: "success",
        title:
          action === "APPROVED" ? t("approve.approved") : t("approve.changesSent"),
      });
    } catch {
      toast({ variant: "error", title: t("approve.failed") });
    } finally {
      setSubmitting(null);
    }
  };

  if (state === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-black">
        <Loader2 size={20} className="animate-spin text-white/40" aria-hidden="true" />
      </div>
    );
  }

  if (state === "error" || !approval) {
    return (
      <div className="grid min-h-screen place-items-center bg-black p-6">
        <EmptyState
          icon={TriangleAlert}
          title={t("approve.unavailableTitle")}
          description={t("approve.unavailableBody")}
        />
      </div>
    );
  }

  const decided = approval.status !== "PENDING";

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-start gap-3">
          <Link
            href={`/playground/${roomId}`}
            aria-label={t("room.backToRooms")}
            className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft size={16} aria-hidden="true" className="rtl:rotate-180" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-red-500">
              {t("approve.eyebrow")}
            </p>
            <h1 dir="auto" className="truncate text-base font-bold text-white">
              {approval.title}
            </h1>
            <p className="text-[11px] text-white/40">
              {approval.requestedByName} ·{" "}
              {formatDateLocalized(new Date(approval.createdAt), locale, {
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
        </div>
      </header>

      {approval.note && (
        <p
          dir="auto"
          className="mx-auto w-full max-w-2xl px-4 py-4 text-sm leading-relaxed text-white/70"
        >
          {approval.note}
        </p>
      )}

      {/* Snap scrolling: one direction at a time, so a client on a phone
          considers each option rather than skimming past them. */}
      <main className="mx-auto w-full max-w-2xl flex-1 snap-y snap-mandatory px-4 pb-40">
        <ul className="space-y-4">
          {approval.payload.nodes.map((node, index) => (
            <li
              key={node.id}
              className="snap-start scroll-mt-24 rounded-2xl border border-white/12 bg-white/[0.03] p-5"
            >
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
                {t(`nodeKinds.${node.kind}`)} · {index + 1}/
                {approval.payload.nodes.length}
              </p>
              {typeof node.data.title === "string" && (
                <p dir="auto" className="text-base font-bold leading-snug text-white">
                  {node.data.title}
                </p>
              )}
              {typeof node.data.url === "string" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    typeof node.data.thumbUrl === "string"
                      ? node.data.thumbUrl
                      : node.data.url
                  }
                  alt={node.text ?? ""}
                  className="mt-3 w-full rounded-xl"
                />
              )}
              {node.text && (
                <p
                  dir="auto"
                  className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/70"
                >
                  {node.text}
                </p>
              )}
            </li>
          ))}
        </ul>

        {approval.actions.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
              {t("approve.history")}
            </h2>
            <ol className="space-y-2">
              {approval.actions.map((entry) => (
                <li key={entry.id} className="text-[11px] text-white/50">
                  <span className="font-semibold text-white/75">
                    {entry.responderName ?? t("common.unnamed")}
                  </span>{" "}
                  {t(`approve.actions.${entry.action}`)}
                  {entry.notes && (
                    <span dir="auto" className="mt-0.5 block text-white/45">
                      “{entry.notes}”
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}
      </main>

      {canRespond && !decided && (
        <div
          className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-neutral-950/95 backdrop-blur"
          // Clears the iOS home indicator; without it the primary action sits
          // under the gesture bar on exactly the devices this page is built for.
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="mx-auto max-w-2xl p-4">
            {composing && (
              <>
                <label htmlFor="pg-approval-notes" className="sr-only">
                  {t("approve.notesLabel")}
                </label>
                <textarea
                  id="pg-approval-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={4000}
                  dir="auto"
                  autoFocus
                  placeholder={t("approve.notesPlaceholder")}
                  className="mb-3 w-full resize-none rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none"
                />
              </>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  composing ? void respond("CHANGES_REQUESTED") : setComposing(true)
                }
                disabled={submitting !== null}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-50"
              >
                {submitting === "CHANGES_REQUESTED" ? (
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                ) : (
                  <MessageSquarePlus size={15} aria-hidden="true" />
                )}
                {t("approve.requestChanges")}
              </button>
              <button
                type="button"
                onClick={() => void respond("APPROVED")}
                disabled={submitting !== null}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {submitting === "APPROVED" ? (
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Check size={15} aria-hidden="true" />
                )}
                {t("approve.approve")}
              </button>
            </div>
          </div>
        </div>
      )}

      {decided && (
        <div
          className={cn(
            "fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur",
            approval.status === "APPROVED"
              ? "border-emerald-500/25 bg-emerald-500/10"
              : "border-amber-500/25 bg-amber-500/10"
          )}
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <p className="mx-auto flex max-w-2xl items-center gap-2 p-4 text-sm font-semibold text-white">
            <CheckCircle2 size={16} aria-hidden="true" />
            {t(`approve.status.${approval.status}`)}
          </p>
        </div>
      )}
    </div>
  );
}
