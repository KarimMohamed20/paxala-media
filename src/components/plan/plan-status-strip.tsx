"use client";

import { useLocale, useTranslations } from "next-intl";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateLocalized } from "@/lib/format";
import { PlanAvatar } from "./plan-avatar";
import { ProgressRing } from "./progress-ring";
import type { MonthlyPlan } from "./types";

/**
 * The five-cell status row under the header.
 *
 * Cell dividers use `border-e … last:border-e-0` rather than `divide-x`, whose
 * logical-vs-physical behaviour in Tailwind v4 is unverified — `border-e` is
 * guaranteed to mirror under dir="rtl".
 */
export function PlanStatusStrip({
  plan,
  className,
}: {
  plan: MonthlyPlan;
  className?: string;
}) {
  const t = useTranslations("plan");
  const locale = useLocale();

  const cell = "flex items-center gap-2.5 p-4 border-e border-white/10 last:border-e-0";

  return (
    <div
      className={cn(
        "grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.03] sm:grid-cols-3 lg:grid-cols-5",
        className
      )}
    >
      <div className={cell}>
        <span className="h-2 w-2 shrink-0 rounded-full bg-red-600 animate-pulse" />
        <span className="text-xs font-semibold text-white/85">
          {plan.package
            ? t("strip.packageActive", { package: plan.package.name })
            : t("strip.noPackage")}
        </span>
      </div>

      <div className={cell}>
        <ProgressRing value={plan.progress.percent} size={34} stroke={3} showLabel={false} />
        <span className="text-xs text-white/70">
          {t("strip.completed", { percent: plan.progress.percent })}
        </span>
      </div>

      <div className={cell}>
        <CalendarDays size={15} className="shrink-0 text-white/40" />
        <span className="text-xs text-white/70">
          {t("strip.updated", {
            date: formatDateLocalized(plan.updatedAt, locale, {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
          })}
        </span>
      </div>

      <div className={cell}>
        <span className="text-xs text-white/45">{t("strip.client")}</span>
        <PlanAvatar name={plan.client.name} image={plan.client.image} size={28} />
      </div>

      <div className={cell}>
        <span className="text-xs text-white/45">{t("strip.agency")}</span>
        <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-full border border-red-500/30 bg-red-600/20 text-[11px] font-bold text-red-300">
          P
        </span>
      </div>
    </div>
  );
}
