"use client";

import { useTranslations } from "next-intl";
import { Eye, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Which workspace mode this room is being viewed in.
 *
 * This is the control that stops a PMP user from talking about budget in front
 * of a client, so it is always visible and never subtle. Two independent signals
 * carry the meaning — an icon and the word itself — so it still reads when
 * colour is unavailable.
 *
 * CLIENT mode is drawn in amber rather than red: red is PMP's brand accent and
 * is already spent on LIVE, primary actions and selection, so a red mode chip
 * would compete with the recording indicator rather than stand apart from it.
 */
export function ModeIndicator({
  mode,
  className,
}: {
  mode: "STUDIO" | "CLIENT";
  className?: string;
}) {
  const t = useTranslations("playground");
  const isClient = mode === "CLIENT";
  const Icon = isClient ? Eye : Lock;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]",
        isClient
          ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
          : "border-white/15 bg-white/5 text-white/70",
        className
      )}
    >
      <Icon size={11} aria-hidden="true" />
      {isClient ? t("mode.client") : t("mode.studio")}
    </span>
  );
}
