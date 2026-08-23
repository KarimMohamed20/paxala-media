"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2, MessageSquare, MousePointerClick } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateLocalized } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Comments and reactions, keyed to the current selection.
 *
 * Anchored to a SELECTION rather than pinned to the canvas: pins under a
 * zoomable transform need their own popover layer, collide with each other at
 * low zoom, and are the single largest source of fiddliness in tools that have
 * them. Selecting a card and reading its thread is the same information without
 * the geometry problem, and it works identically on a phone.
 *
 * Reactions live here too because they answer the same question — what does the
 * room think of this thing — and splitting them across two surfaces would mean
 * checking two places before speaking.
 */

type Comment = {
  id: string;
  nodeId: string | null;
  body: string;
  authorName: string | null;
  authorRole: string;
  resolved: boolean;
  createdAt: string;
};

type Reaction = { nodeId: string; kind: string; mine: boolean; name: string | null };

/** A small, opinionated set. An open emoji picker turns a board into a sticker book. */
const REACTIONS = ["👍", "❤️", "🔥", "🤔", "👀"] as const;

export function CommentsPanel({
  roomId,
  selection,
  canComment,
  canResolve,
  canVote,
  revision,
}: {
  roomId: string;
  selection: ReadonlySet<string>;
  canComment: boolean;
  canResolve: boolean;
  canVote: boolean;
  revision: number;
}) {
  const t = useTranslations("playground");
  const locale = useLocale();

  const [comments, setComments] = React.useState<Comment[]>([]);
  const [reactions, setReactions] = React.useState<Reaction[]>([]);
  const [draft, setDraft] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);

  // One node at a time: a thread belongs to a thing, and merging several would
  // make it unclear which card a comment is about.
  const nodeId = selection.size === 1 ? [...selection][0] : null;

  const load = React.useCallback(async () => {
    try {
      const [commentRes, reactionRes] = await Promise.all([
        fetch(`/api/playground/rooms/${roomId}/comments`),
        fetch(`/api/playground/rooms/${roomId}/reactions`),
      ]);
      if (commentRes.ok) {
        const data = await commentRes.json();
        setComments(data.comments ?? []);
      }
      if (reactionRes.ok) {
        const data = await reactionRes.json();
        setReactions(data.reactions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  React.useEffect(() => {
    void load();
  }, [load, revision]);

  const thread = React.useMemo(
    () => comments.filter((comment) => comment.nodeId === nodeId),
    [comments, nodeId]
  );

  const nodeReactions = React.useMemo(
    () => reactions.filter((reaction) => reaction.nodeId === nodeId),
    [reactions, nodeId]
  );

  const react = async (kind: string) => {
    if (!nodeId || !canVote) return;

    // Optimistic: a reaction that waits for a round trip feels broken, and the
    // unique index means a double-tap cannot corrupt the tally either way.
    const mine = nodeReactions.some((r) => r.kind === kind && r.mine);
    setReactions((prev) =>
      mine
        ? prev.filter((r) => !(r.nodeId === nodeId && r.kind === kind && r.mine))
        : [...prev, { nodeId, kind, mine: true, name: null }]
    );

    try {
      await fetch(`/api/playground/rooms/${roomId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId, kind }),
      });
    } catch {
      void load();
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !nodeId || sending) return;

    setSending(true);
    setDraft("");
    try {
      const res = await fetch(`/api/playground/rooms/${roomId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, nodeId }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
      } else {
        setDraft(body);
      }
    } catch {
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  const resolve = async (commentId: string, resolved: boolean) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, resolved } : c))
    );
    await fetch(`/api/playground/rooms/${roomId}/comments`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, resolved }),
    }).catch(() => void load());
  };

  if (loading) {
    return (
      <div className="grid h-full place-items-center">
        <Loader2 size={16} className="animate-spin text-white/30" aria-hidden="true" />
      </div>
    );
  }

  // Nothing selected — say what to do rather than showing an empty list that
  // looks like the feature is broken.
  if (!nodeId) {
    return (
      <div className="p-4">
        <EmptyState
          icon={MousePointerClick}
          size="compact"
          title={
            selection.size > 1
              ? t("comments.multiSelectTitle")
              : t("comments.noSelectionTitle")
          }
          description={
            selection.size > 1
              ? t("comments.multiSelectBody")
              : t("comments.noSelectionBody")
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {canVote && (
        <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-white/10 p-3">
          {REACTIONS.map((kind) => {
            const forKind = nodeReactions.filter((r) => r.kind === kind);
            const mine = forKind.some((r) => r.mine);
            return (
              <button
                key={kind}
                type="button"
                onClick={() => void react(kind)}
                aria-pressed={mine}
                // The count is in the label, not only in colour.
                aria-label={`${kind} ${forKind.length}`}
                className={cn(
                  "flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition-colors",
                  mine
                    ? "border-red-500/40 bg-red-500/10 text-white"
                    : "border-white/10 text-white/50 hover:bg-white/5 hover:text-white"
                )}
              >
                <span aria-hidden="true">{kind}</span>
                {forKind.length > 0 && (
                  <span dir="ltr" className="tabular-nums">
                    {forKind.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {thread.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={MessageSquare}
              size="compact"
              title={t("comments.emptyTitle")}
              description={t("comments.emptyBody")}
            />
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {thread.map((comment) => (
              <li
                key={comment.id}
                className={cn("px-4 py-3", comment.resolved && "opacity-45")}
              >
                <div className="flex gap-2.5">
                  <Avatar name={comment.authorName} size={24} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline gap-2">
                      <span className="truncate text-[11px] font-semibold text-white">
                        {comment.authorName ?? t("common.unnamed")}
                      </span>
                      <time
                        dateTime={comment.createdAt}
                        className="shrink-0 text-[10px] text-white/30"
                      >
                        {formatDateLocalized(new Date(comment.createdAt), locale, {
                          day: "numeric",
                          month: "short",
                        })}
                      </time>
                    </p>
                    <p
                      dir="auto"
                      className="whitespace-pre-wrap break-words text-xs leading-relaxed text-white/75"
                    >
                      {comment.body}
                    </p>
                  </div>
                  {canResolve && (
                    <button
                      type="button"
                      onClick={() => void resolve(comment.id, !comment.resolved)}
                      aria-label={
                        comment.resolved
                          ? t("comments.reopen")
                          : t("comments.resolve")
                      }
                      title={
                        comment.resolved
                          ? t("comments.reopen")
                          : t("comments.resolve")
                      }
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-md transition-colors",
                        comment.resolved
                          ? "text-emerald-400"
                          : "text-white/25 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Check size={13} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canComment && (
        <form onSubmit={submit} className="flex shrink-0 gap-2 border-t border-white/10 p-3">
          <label htmlFor="pg-comment-input" className="sr-only">
            {t("comments.placeholder")}
          </label>
          <textarea
            id="pg-comment-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit(e);
              }
            }}
            rows={1}
            maxLength={4000}
            dir="auto"
            placeholder={t("comments.placeholder")}
            className="max-h-24 min-h-[2.25rem] flex-1 resize-none rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            className="shrink-0 self-end rounded-lg bg-red-600 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-red-500 disabled:opacity-40"
          >
            {sending ? (
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            ) : (
              t("comments.post")
            )}
          </button>
        </form>
      )}
    </div>
  );
}
