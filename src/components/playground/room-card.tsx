"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Building2, Clock, Folder, Lock, StickyNote } from "lucide-react";
import { AvatarStack } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDateLocalized } from "@/lib/format";
import {
  PlaygroundStatusPill,
  type RoomPillStatus,
} from "./playground-status-pill";
import type { RoomCardData } from "./types";

/**
 * One room on the dashboard.
 *
 * Deliberately no canvas preview yet: a cover image would mean reading node
 * content on a list endpoint, and every node read has to go through the Client
 * Mode filter. Cover selection arrives with the canvas in Stage 3, sourced from
 * a node the team explicitly nominates.
 */
export function RoomCard({ room }: { room: RoomCardData }) {
  const t = useTranslations("playground");
  const locale = useLocale();

  const status: RoomPillStatus = room.awaitingClient
    ? "AWAITING_CLIENT"
    : room.status;

  const activity = room.lastActiveAt ?? room.updatedAt;

  return (
    <Link
      href={`/playground/${room.id}`}
      className={cn(
        "group flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5",
        "transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.06]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        room.status === "ARCHIVED" && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold leading-snug text-white">
            {room.title}
          </h3>
          {room.description && (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/45">
              {room.description}
            </p>
          )}
        </div>
        <PlaygroundStatusPill
          status={status}
          label={t(`status.${status}`)}
          size="xs"
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-white/50">
        {room.client && (
          <span className="inline-flex items-center gap-1.5">
            <Building2 size={12} aria-hidden="true" className="text-white/30" />
            {room.client.name ?? room.client.username}
          </span>
        )}
        {room.project && (
          <span className="inline-flex items-center gap-1.5">
            <Folder size={12} aria-hidden="true" className="text-white/30" />
            {room.project.title}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <StickyNote size={12} aria-hidden="true" className="text-white/30" />
          {t("card.nodeCount", { count: room._count.nodes })}
        </span>
        {room.restricted && (
          <span
            className="inline-flex items-center gap-1.5 text-white/40"
            title={t("card.restricted")}
          >
            <Lock size={12} aria-hidden="true" />
            {t("card.restricted")}
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/5 pt-3">
        <AvatarStack
          people={room.members.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            image: m.user.image,
          }))}
          size={24}
          max={4}
        />
        {activity && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-white/35">
            <Clock size={11} aria-hidden="true" />
            {formatDateLocalized(new Date(activity), locale, {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>
    </Link>
  );
}
