"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Lock, MessageSquare, Send, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateLocalized } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Room chat.
 *
 * Two channels, and the switch between them is styled to be unmissable: TEAM is
 * where PMP says things the client must not read, so "which channel am I typing
 * into" has to be answerable at a glance rather than by reading a label. The
 * composer itself changes colour, not just the tab.
 *
 * Clients never see the switch at all — their stream and their queries only ever
 * carry SHARED, so there is nothing to toggle.
 */

export type ChatMessage = {
  id: string;
  channel: "TEAM" | "SHARED";
  body: string;
  authorName: string | null;
  authorRole: string;
  createdAt: string;
  nodeId: string | null;
};

export function RoomChat({
  roomId,
  canPost,
  canPostTeam,
  /** Bumped by the live stream when a message lands, to trigger a refetch. */
  revision,
  onFocusNode,
}: {
  roomId: string;
  canPost: boolean;
  canPostTeam: boolean;
  revision: number;
  onFocusNode?: (nodeId: string) => void;
}) {
  const t = useTranslations("playground");
  const locale = useLocale();

  const [channel, setChannel] = React.useState<"TEAM" | "SHARED">(
    canPostTeam ? "TEAM" : "SHARED"
  );
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);

  const listRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(
        `/api/playground/rooms/${roomId}/messages?channel=${channel}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } finally {
      setLoading(false);
    }
  }, [channel, roomId]);

  React.useEffect(() => {
    setLoading(true);
    void load();
  }, [load, revision]);

  // Stick to the bottom on new messages, the way every chat does.
  React.useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setDraft("");
    try {
      const res = await fetch(`/api/playground/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, channel }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
      } else {
        // Put the text back rather than losing it to a failed request.
        setDraft(body);
      }
    } catch {
      setDraft(body);
    } finally {
      setSending(false);
    }
  };

  const isTeam = channel === "TEAM";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {canPostTeam && (
        <div className="flex shrink-0 gap-1 p-2">
          {(["TEAM", "SHARED"] as const).map((id) => {
            const active = channel === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setChannel(id)}
                aria-pressed={active}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors",
                  active
                    ? id === "TEAM"
                      ? "bg-white/10 text-white"
                      : "bg-amber-500/15 text-amber-300"
                    : "text-white/40 hover:bg-white/5 hover:text-white/70"
                )}
              >
                {id === "TEAM" ? (
                  <Lock size={11} aria-hidden="true" />
                ) : (
                  <Users size={11} aria-hidden="true" />
                )}
                {id === "TEAM" ? t("chat.team") : t("chat.shared")}
              </button>
            );
          })}
        </div>
      )}

      {/* The standing reminder of who can read this. */}
      {canPostTeam && (
        <p
          className={cn(
            "shrink-0 px-4 pb-2 text-[10px] leading-relaxed",
            isTeam ? "text-white/35" : "text-amber-400/70"
          )}
        >
          {isTeam ? t("chat.teamHint") : t("chat.sharedHint")}
        </p>
      )}

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4">
        {loading ? (
          <div className="grid h-full place-items-center">
            <Loader2 size={16} className="animate-spin text-white/30" aria-hidden="true" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            size="compact"
            title={t("panel.chatEmptyTitle")}
            description={
              isTeam ? t("chat.emptyTeam") : t("chat.emptyShared")
            }
          />
        ) : (
          <ul className="space-y-3 py-2">
            {messages.map((message) => (
              <li key={message.id} className="flex gap-2.5">
                <Avatar name={message.authorName} size={26} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-baseline gap-2">
                    <span className="truncate text-[11px] font-semibold text-white">
                      {message.authorName ?? t("common.unnamed")}
                    </span>
                    <time
                      dateTime={message.createdAt}
                      className="shrink-0 text-[10px] text-white/30"
                    >
                      {formatDateLocalized(new Date(message.createdAt), locale, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </p>
                  <p
                    dir="auto"
                    className="whitespace-pre-wrap break-words text-xs leading-relaxed text-white/75"
                  >
                    {message.body}
                  </p>
                  {message.nodeId && onFocusNode && (
                    <button
                      type="button"
                      onClick={() => onFocusNode(message.nodeId!)}
                      className="mt-1 text-[10px] font-semibold text-red-400 hover:text-red-300"
                    >
                      {t("chat.showOnCanvas")}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canPost && (
        <form
          onSubmit={send}
          className={cn(
            "flex shrink-0 items-end gap-2 border-t p-3",
            // The composer itself carries the channel's colour: a glance at
            // where you are typing answers "can the client read this".
            isTeam ? "border-white/10" : "border-amber-500/25 bg-amber-500/[0.04]"
          )}
        >
          <label htmlFor="pg-chat-input" className="sr-only">
            {isTeam ? t("chat.placeholderTeam") : t("chat.placeholderShared")}
          </label>
          <textarea
            id="pg-chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter breaks the line — the convention
              // everyone already has in their fingers.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(e);
              }
            }}
            rows={1}
            maxLength={4000}
            dir="auto"
            placeholder={
              isTeam ? t("chat.placeholderTeam") : t("chat.placeholderShared")
            }
            className="max-h-24 min-h-[2.25rem] flex-1 resize-none rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/50"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label={t("chat.send")}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-600 text-white transition hover:bg-red-500 disabled:opacity-40"
          >
            {sending ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <Send size={14} aria-hidden="true" className="rtl:-scale-x-100" />
            )}
          </button>
        </form>
      )}
    </div>
  );
}
