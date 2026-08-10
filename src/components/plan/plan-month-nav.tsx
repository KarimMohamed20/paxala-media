"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateLocalized } from "@/lib/format";
import { isRTL, type Locale } from "@/i18n/config";

/**
 * Month stepper shared by the portal plan page and the admin list.
 * In RTL "previous" sits on the right, so the glyphs swap — the handlers don't.
 */
export function PlanMonthNav({
  year,
  month,
  onChange,
  dense = false,
  className,
}: {
  year: number;
  /** 1-12. */
  month: number;
  onChange: (year: number, month: number) => void;
  dense?: boolean;
  className?: string;
}) {
  const t = useTranslations("plan");
  const locale = useLocale();
  const rtl = isRTL(locale as Locale);

  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;

  const shift = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    onChange(d.getFullYear(), d.getMonth() + 1);
  };

  const label = formatDateLocalized(new Date(year, month - 1, 1), locale, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={() => shift(-1)}
        aria-label={t("prevMonth")}
        className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <PrevIcon size={dense ? 16 : 18} />
      </button>
      <span
        className={cn(
          "text-center font-bold text-white",
          dense ? "min-w-36 text-xs" : "min-w-40 text-sm"
        )}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={() => shift(1)}
        aria-label={t("nextMonth")}
        className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <NextIcon size={dense ? 16 : 18} />
      </button>
    </div>
  );
}
