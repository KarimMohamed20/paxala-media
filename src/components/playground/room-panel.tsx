"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Users, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { ActivityTimeline } from "./activity-timeline";
import { CommentsPanel } from "./comments-panel";
import { DecisionPanel } from "./decision-panel";
import { RoomChat } from "./room-chat";
import type { CanvasNodeData } from "./canvas/types";
import { RoomOutline } from "./room-outline";
import type { RoomDetailData, RoomViewer } from "./types";

/**
 * The right ROOM panel: People, Chat, Decisions.
 *
 * People is live now — membership is real data. Chat and Decisions render their
 * genuine empty states rather than mock threads; they become interactive in
 * Stage 7, and an empty state that says "no messages yet" is truthful today and
 * still correct then.
 */

type TabId = "people" | "outline" | "comments" | "chat" | "decisions" | "activity";

export function RoomPanel({
  room,
  viewer,
  nodes,
  selection,
  onSelectNode,
  onClose,
  liveRevision = 0,
  onlineUserIds,
}: {
  room: RoomDetailData;
  viewer: RoomViewer;
  nodes: CanvasNodeData[];
  selection: ReadonlySet<string>;
  onSelectNode: (id: string, additive: boolean) => void;
  onClose: () => void;
  /** Bumped by the live stream so panels refetch without polling. */
  liveRevision?: number;
  /** Who is connected right now, from presence. */
  onlineUserIds?: ReadonlySet<string>;
}) {
  const t = useTranslations("playground");
  const [tab, setTab] = React.useState<TabId>("people");

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: "people", label: t("panel.people") },
    // A real tab, not a hidden accessibility surface: the board as a document,
    // usable by anyone. Hidden-only a11y views rot because nobody looks at them.
    { id: "outline", label: t("panel.outline") },
    { id: "comments", label: t("panel.comments") },
    { id: "chat", label: t("panel.chat") },
    { id: "decisions", label: t("panel.decisions") },
    // The timeline is Studio-only at the route; hiding the tab keeps a client
    // from meeting a 403 they can do nothing about.
    ...(viewer.mode === "STUDIO"
      ? [{ id: "activity" as TabId, label: t("panel.activity") }]
      : []),
  ];

  return (
    <aside
      aria-label={t("panel.label")}
      className="flex w-full shrink-0 flex-col border-s border-white/10 bg-neutral-950 md:w-[320px]"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-white">
          {t("panel.label")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="rounded-lg p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div role="tablist" aria-label={t("panel.label")} className="flex shrink-0 border-b border-white/10">
        {tabs.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              role="tab"
              type="button"
              id={`pg-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`pg-tabpanel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={cn(
                "relative flex-1 px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors",
                selected ? "text-white" : "text-white/35 hover:text-white/70"
              )}
            >
              {item.label}
              {selected && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-red-600"
                />
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`pg-tabpanel-${tab}`}
        aria-labelledby={`pg-tab-${tab}`}
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          // Chat and decisions manage their own scrolling (a sticky composer at
          // the bottom); the simpler tabs scroll here.
          tab === "people" || tab === "outline" || tab === "activity"
            ? "overflow-y-auto"
            : "overflow-hidden"
        )}
      >
        {tab === "people" && (
          <PeopleTab room={room} viewer={viewer} onlineUserIds={onlineUserIds} />
        )}
        {tab === "comments" && (
          <CommentsPanel
            roomId={room.id}
            selection={selection}
            canComment={viewer.can.comment}
            canResolve={viewer.can.edit}
            canVote={viewer.can.vote}
            revision={liveRevision}
          />
        )}
        {tab === "outline" && (
          <RoomOutline
            nodes={nodes}
            selection={selection}
            onSelect={onSelectNode}
            onFocusNode={(id) => onSelectNode(id, false)}
            showVisibility={viewer.mode === "STUDIO"}
          />
        )}
        {tab === "chat" && (
          <RoomChat
            roomId={room.id}
            canPost={viewer.can.comment}
            canPostTeam={viewer.isStaff && viewer.mode === "STUDIO"}
            revision={liveRevision}
            onFocusNode={(id) => onSelectNode(id, false)}
          />
        )}
        {tab === "decisions" && (
          <DecisionPanel
            roomId={room.id}
            canRecord={viewer.can.edit}
            canProduce={viewer.can.requestApproval}
            selection={selection}
            revision={liveRevision}
            onFocusNode={(id) => onSelectNode(id, false)}
          />
        )}
        {tab === "activity" && (
          <ActivityTimeline
            roomId={room.id}
            revision={liveRevision}
            onFocusNode={(id) => onSelectNode(id, false)}
          />
        )}
      </div>
    </aside>
  );
}

function PeopleTab({
  room,
  viewer,
  onlineUserIds,
}: {
  room: RoomDetailData;
  viewer: RoomViewer;
  onlineUserIds?: ReadonlySet<string>;
}) {
  const t = useTranslations("playground");

  if (room.members.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={Users}
          size="compact"
          title={t("panel.peopleEmptyTitle")}
          description={t("panel.peopleEmptyBody")}
        />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-white/5">
      {room.members.map((member) => {
        const isYou = member.user.id === viewer.userId;
        return (
          <li key={member.user.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar
              name={member.user.name}
              image={member.user.image}
              size={32}
              // Presence, not a stored field: someone who closed the tab is
              // offline the moment their stream drops.
              status={
                onlineUserIds
                  ? onlineUserIds.has(member.user.id)
                    ? "online"
                    : "offline"
                  : null
              }
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {member.user.name ?? t("common.unnamed")}
                {isYou && (
                  <span className="ms-1.5 text-[10px] font-medium text-white/35">
                    {t("panel.you")}
                  </span>
                )}
              </p>
              <p className="truncate text-[11px] text-white/40">
                {member.user.jobTitle ?? t(`roomRoles.${member.role}`)}
              </p>
            </div>
            {member.role === "OWNER" && (
              <span className="shrink-0 rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/50">
                {t("panel.host")}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
