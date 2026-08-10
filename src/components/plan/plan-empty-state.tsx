"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CalendarX, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateLocalized } from "@/lib/format";
import type { MonthlyPlanState } from "./types";

export function PlanEmptyState({
  year,
  month,
  state,
  canEdit,
  clientId,
  className,
}: {
  year: number;
  month: number;
  state: MonthlyPlanState;
  canEdit: boolean;
  clientId: string | null;
  className?: string;
}) {
  const t = useTranslations("plan");
  const locale = useLocale();

  const monthLabel = formatDateLocalized(new Date(year, month - 1, 1), locale, {
    month: "long",
    year: "numeric",
  });

  // A draft the client isn't meant to see reads as "being prepared", not "missing".
  const description =
    state === "UNPUBLISHED"
      ? t("empty.preparing", { month: monthLabel })
      : t("empty.description");

  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center",
        className
      )}
    >
      <CalendarX size={40} className="mx-auto mb-3 text-white/20" />
      <p className="text-sm font-semibold text-white/70">
        {t("empty.title", { month: monthLabel })}
      </p>
      <p className="mx-auto mt-1 max-w-md text-xs text-white/40">{description}</p>

      {canEdit && (
        <Link
          href={`/admin/monthly-plans/new?clientId=${clientId ?? ""}&month=${month}&year=${year}`}
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-500"
        >
          <Plus size={14} />
          {t("empty.createCta")}
        </Link>
      )}
    </div>
  );
}
