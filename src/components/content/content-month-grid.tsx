"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContentItemCard } from "./content-item-card";
import type { ContentItem } from "./types";

const LOCALE_TAG: Record<string, string> = {
  ar: "ar-EG",
  he: "he-IL",
  en: "en-US",
};

/**
 * Weekday headers derived from the active locale rather than hardcoded SUN…SAT.
 * 2024-01-07 is a Sunday, so seven consecutive days from there give a Sunday-first
 * week — correct for en-US, ar-EG and he-IL alike.
 */
function useWeekdayLabels(locale: string) {
  return useMemo(() => {
    const fmt = new Intl.DateTimeFormat(LOCALE_TAG[locale] ?? "en-US", {
      weekday: "short",
      timeZone: "UTC",
    });
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(Date.UTC(2024, 0, 7 + i)))
    );
  }, [locale]);
}

export function ContentMonthGrid({
  year,
  month,
  items,
  onDayAdd,
  onItemClick,
  showProject = true,
  showClient = false,
  className,
}: {
  year: number;
  /** 1-12. */
  month: number;
  items: ContentItem[];
  /** Receives a local "YYYY-MM-DDTHH:mm" string for a datetime-local input. */
  onDayAdd?: (isoLocal: string) => void;
  onItemClick?: (item: ContentItem) => void;
  showProject?: boolean;
  showClient?: boolean;
  className?: string;
}) {
  const t = useTranslations("content");
  const locale = useLocale();
  const weekdays = useWeekdayLabels(locale);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const cells: (number | null)[] = [
    ...Array.from({ length: firstDayOfWeek }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Bucket by day once instead of filtering the whole list per cell.
  const byDay = useMemo(() => {
    const map = new Map<number, ContentItem[]>();
    for (const item of items) {
      const d = new Date(item.scheduledAt);
      if (d.getFullYear() !== year || d.getMonth() + 1 !== month) continue;
      const day = d.getDate();
      const bucket = map.get(day);
      if (bucket) bucket.push(item);
      else map.set(day, [item]);
    }
    return map;
  }, [items, year, month]);

  const today = new Date();
  const isToday = (day: number) =>
    today.getFullYear() === year &&
    today.getMonth() + 1 === month &&
    today.getDate() === day;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className={cn("space-y-2", className)}>
      {/* CSS Grid mirrors automatically under dir="rtl", and because the header
          and the day cells are two separate 7-column grids they stay aligned. */}
      <div className="grid grid-cols-7 gap-1.5">
        {weekdays.map((label, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-semibold uppercase tracking-wider text-white/40 py-1"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`pad-${idx}`} className="min-h-24 rounded-lg" />;
          }
          const dayItems = byDay.get(day) ?? [];
          return (
            <div
              key={day}
              className={cn(
                "group relative min-h-24 rounded-lg border border-white/10 bg-white/[0.02] p-1.5 transition hover:border-white/20",
                isToday(day) && "ring-1 ring-red-500/50"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    isToday(day) ? "text-red-400" : "text-white/50"
                  )}
                >
                  {day}
                </span>
                {onDayAdd && (
                  <button
                    type="button"
                    title={t("calendar.addPost")}
                    aria-label={t("calendar.addPost")}
                    onClick={() =>
                      onDayAdd(`${year}-${pad(month)}-${pad(day)}T18:00`)
                    }
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition rounded p-0.5 text-white/40 hover:text-white hover:bg-white/10"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {dayItems.map((item) => (
                  <ContentItemCard
                    key={item.id}
                    item={item}
                    variant="chip"
                    showProject={showProject}
                    showClient={showClient}
                    onClick={onItemClick}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
