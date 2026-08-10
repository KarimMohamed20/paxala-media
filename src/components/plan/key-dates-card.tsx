"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatDateLocalized } from "@/lib/format";
import type { PlanKeyDate } from "./types";

/**
 * Day-over-month badge. Stacked, so there is no bidi reordering to worry about.
 * The day uses Latin digits deliberately — Eastern-Arabic numerals in a two-line
 * date chip read as noise at this size.
 */
export function DateBadge({
  date,
  className,
}: {
  date: string | Date;
  className?: string;
}) {
  const locale = useLocale();
  const d = new Date(date);

  return (
    <span
      className={cn(
        "grid w-12 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] py-1.5",
        className
      )}
    >
      <span className="text-lg font-extrabold leading-none text-white">
        {String(d.getUTCDate()).padStart(2, "0")}
      </span>
      <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-400">
        {formatDateLocalized(d, locale, { month: "short", timeZone: "UTC" })}
      </span>
    </span>
  );
}

export function KeyDatesCard({
  keyDates,
  className,
}: {
  keyDates: PlanKeyDate[];
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
      <h2 className="mb-4 text-sm font-bold text-white">{t("keyDates.title")}</h2>

      {keyDates.length === 0 ? (
        <p className="py-6 text-center text-xs text-white/40">
          {t("keyDates.empty")}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {keyDates.map((k) => (
            <li key={k.id} className="flex items-center gap-3">
              <DateBadge date={k.date} />
              <span className="min-w-0 flex-1 text-start">
                <span className="block truncate text-sm text-white/85">
                  {k.title}
                </span>
                {k.note && (
                  <span className="block truncate text-[11px] text-white/40">
                    {k.note}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
