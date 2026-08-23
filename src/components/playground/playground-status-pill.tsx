"use client";

import type { PlaygroundRoomStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

/**
 * Room status pill.
 *
 * Same shape and size scale as ContentStatusPill so a PMP status reads
 * identically on a room card and on a content item. The colour vocabulary is
 * lifted from getStatusBadgeStyle() in components/content/content-meta.tsx
 * rather than invented, because a third parallel palette is how a design system
 * stops being one.
 *
 * Status is never colour alone — the label is always rendered.
 */

const SIZES = {
  xs: "px-1.5 py-0.5 text-[10px]",
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-3 py-1 text-xs",
} as const;

/** Includes the derived "AWAITING_CLIENT" state, which is not a stored status. */
export type RoomPillStatus = PlaygroundRoomStatus | "AWAITING_CLIENT" | "LIVE";

const STYLE: Record<RoomPillStatus, string> = {
  LIVE: "bg-red-500/10 text-red-400 border-red-500/20",
  ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  AWAITING_CLIENT: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  DRAFT: "bg-white/10 text-white/60 border-white/10",
  ARCHIVED: "bg-white/5 text-white/40 border-white/10",
};

const DOT: Record<RoomPillStatus, string> = {
  LIVE: "bg-red-500",
  ACTIVE: "bg-emerald-400",
  AWAITING_CLIENT: "bg-amber-400",
  DRAFT: "bg-white/40",
  ARCHIVED: "bg-white/25",
};

export function PlaygroundStatusPill({
  status,
  label,
  size = "sm",
  showDot = true,
  className,
}: {
  status: RoomPillStatus;
  /** Localised text. Passed in so this component takes no i18n dependency. */
  label: string;
  size?: keyof typeof SIZES;
  showDot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-semibold",
        SIZES[size],
        STYLE[status],
        className
      )}
    >
      {showDot && (
        <span
          aria-hidden="true"
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            DOT[status],
            // Only a live session pulses, and only when motion is welcome.
            status === "LIVE" && "motion-safe:animate-pulse"
          )}
        />
      )}
      {label}
    </span>
  );
}
