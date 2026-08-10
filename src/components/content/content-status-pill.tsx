"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getStatusBadgeStyle } from "./content-meta";
import type { ContentStatus } from "./types";

const SIZES = {
  xs: "px-1.5 py-0.5 text-[10px]",
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-3 py-1 text-xs",
} as const;

export function ContentStatusPill({
  status,
  size = "sm",
  pulse = false,
  className,
}: {
  status: ContentStatus;
  size?: keyof typeof SIZES;
  /** Draw attention when something is waiting on the viewer. Off in dense tables. */
  pulse?: boolean;
  className?: string;
}) {
  const t = useTranslations("content");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold whitespace-nowrap",
        SIZES[size],
        getStatusBadgeStyle(status, { pulse }),
        className
      )}
    >
      {t(`status.${status}`)}
    </span>
  );
}
