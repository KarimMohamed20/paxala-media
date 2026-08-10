"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getItemStatusBadgeStyle } from "./plan-meta";
import type { PlanItemStatus } from "./types";

const SIZES = {
  xs: "px-1.5 py-0.5 text-[10px]",
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-3 py-1 text-xs",
} as const;

export function PlanStatusPill({
  status,
  size = "xs",
  className,
}: {
  status: PlanItemStatus;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const t = useTranslations("plan");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-semibold whitespace-nowrap",
        SIZES[size],
        getItemStatusBadgeStyle(status),
        className
      )}
    >
      {t(`itemStatus.${status}`)}
    </span>
  );
}
