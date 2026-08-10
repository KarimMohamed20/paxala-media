"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatDateLocalized } from "@/lib/format";
import { getItemStatusIcon } from "./plan-meta";
import { PlanStatusPill } from "./plan-status-pill";
import type { PlanWeek } from "./types";

/**
 * The four-week grid. CSS grid mirrors automatically under dir="rtl", and
 * `ms-auto` keeps each badge on the trailing edge in both directions.
 */
export function PlanTimeline({
  weeks,
  month,
  year,
  className,
}: {
  weeks: PlanWeek[];
  month: number;
  year: number;
  className?: string;
}) {
  const t = useTranslations("plan");
  const locale = useLocale();

  const monthLabel = formatDateLocalized(new Date(year, month - 1, 1), locale, {
    month: "long",
  });

  return (
    <section
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.03] p-5",
        className
      )}
    >
      <h2 className="mb-4 text-sm font-bold text-white">
        {t("timeline.title", { month: monthLabel })}
      </h2>

      {weeks.length === 0 ? (
        <p className="py-8 text-center text-xs text-white/40">
          {t("timeline.empty")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {weeks.map((week, i) => (
            <div key={week.id} className="min-w-0">
              <p className="mb-2.5 text-start text-[11px] font-bold text-white">
                {t("timeline.week", { number: i + 1 })}
                <span className="font-normal text-white/40">
                  {" "}
                  · {week.title}
                </span>
              </p>
              <ul className="space-y-2">
                {week.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <span className="shrink-0">
                      {getItemStatusIcon(item.status, 13)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-start text-xs text-white/70">
                      {item.title}
                    </span>
                    <PlanStatusPill
                      status={item.status}
                      size="xs"
                      className="ms-auto shrink-0"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
