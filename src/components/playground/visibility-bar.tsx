"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Loader2, Send, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { CanvasNodeData } from "./canvas/types";

/**
 * The publish control.
 *
 * Appears over the canvas whenever a Studio user has a selection, because
 * "is the client looking at this?" is the question they need answered most often
 * and the one with the worst consequences if guessed wrong.
 *
 * Two separate acts, deliberately not merged:
 *   MARK      set a node's visibility — the author's intent
 *   PUBLISH   push it across to the client — the deliberate act
 * A node needs both. Merging them into one toggle is how internal work reaches
 * a client by accident, because the intent flag gets set during a brainstorm
 * long before anyone means to present anything.
 */
export function VisibilityBar({
  roomId,
  selection,
  nodes,
  onChanged,
  onRequestApproval,
}: {
  roomId: string;
  selection: ReadonlySet<string>;
  nodes: CanvasNodeData[];
  onChanged: () => void;
  onRequestApproval: () => void;
}) {
  const t = useTranslations("playground");
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  const selected = React.useMemo(
    () => nodes.filter((node) => selection.has(node.id)),
    [nodes, selection]
  );

  if (selected.length === 0) return null;

  const publishedCount = selected.filter((n) => n.clientVisibleSince).length;
  const allPublished = publishedCount === selected.length;

  const publish = async (next: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/playground/rooms/${roomId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeIds: [...selection], publish: next }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ variant: "error", title: data.error ?? t("publish.failed") });
        return;
      }

      // A refusal is reported, never swallowed: the user selected something
      // that did not go across and needs to know which, and why.
      if (data.refused?.length > 0) {
        toast({
          variant: "warning",
          title: t("publish.someRefused"),
          description: t("publish.refusedBody", { count: data.refused.length }),
        });
      } else {
        toast({
          variant: "success",
          title: next
            ? t("publish.published", { count: data.updated })
            : t("publish.retracted", { count: data.updated }),
        });
      }
      onChanged();
    } catch {
      toast({ variant: "error", title: t("publish.failed") });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      // Same reasoning as NodeInspector: publishing while a node is open for
      // editing must not blur the textarea and commit the edit as a side effect.
      onMouseDown={(event) => event.preventDefault()}
      className="pointer-events-auto flex items-center gap-1.5 rounded-xl border border-white/10 bg-neutral-900/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-sm"
    >
      <span
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold",
          allPublished ? "text-emerald-400" : "text-white/50"
        )}
      >
        {allPublished ? (
          <Eye size={12} aria-hidden="true" />
        ) : (
          <EyeOff size={12} aria-hidden="true" />
        )}
        {allPublished
          ? t("publish.visibleToClient")
          : publishedCount > 0
            ? t("publish.partial", { count: publishedCount, total: selected.length })
            : t("publish.teamOnly")}
      </span>

      <span aria-hidden="true" className="h-5 w-px bg-white/10" />

      <button
        type="button"
        disabled={busy}
        onClick={() => publish(!allPublished)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors disabled:opacity-50",
          allPublished
            ? "text-white/70 hover:bg-white/10 hover:text-white"
            : "bg-red-600 text-white hover:bg-red-500"
        )}
      >
        {busy ? (
          <Loader2 size={12} className="animate-spin" aria-hidden="true" />
        ) : (
          <Send size={12} aria-hidden="true" className="rtl:-scale-x-100" />
        )}
        {allPublished ? t("publish.retract") : t("publish.presentToClient")}
      </button>

      {publishedCount > 0 && (
        <button
          type="button"
          onClick={onRequestApproval}
          className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 px-2.5 py-1.5 text-[11px] font-semibold text-amber-300 transition-colors hover:bg-amber-500/10"
        >
          <Sparkles size={12} aria-hidden="true" />
          {t("publish.requestApproval")}
        </button>
      )}
    </div>
  );
}
