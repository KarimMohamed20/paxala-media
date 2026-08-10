"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getDeliverableIcon } from "./plan-meta";
import type { PlanDeliverable } from "./types";

export function DeliverablesCard({
  deliverables,
  className,
}: {
  deliverables: PlanDeliverable[];
  className?: string;
}) {
  const t = useTranslations("plan");

  return (
    <section
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.03] p-5",
        className
      )}
    >
      <h2 className="mb-4 text-sm font-bold text-white">
        {t("deliverables.title")}
      </h2>

      {deliverables.length === 0 ? (
        <p className="py-6 text-center text-xs text-white/40">
          {t("deliverables.empty")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {deliverables.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5"
            >
              <div className="flex items-center gap-2">
                {getDeliverableIcon(d.icon, 15)}
                <span className="truncate text-xs font-medium text-white/75">
                  {d.label}
                </span>
              </div>

              {/* dir="ltr": without it the bidi algorithm reorders "3 / 4"
                  around the slash in Arabic and Hebrew. */}
              <p
                dir="ltr"
                className="mt-2 inline-flex items-baseline gap-1 text-2xl font-black tabular-nums text-white"
              >
                {d.done}
                <span className="text-base font-bold text-white/30">/ {d.target}</span>
              </p>

              {/* A block child fills from the inline start, so the bar grows
                  right-to-left under dir="rtl" with no extra work. */}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-red-600 transition-[width] duration-700"
                  style={{ width: `${Math.min(100, d.percent)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
