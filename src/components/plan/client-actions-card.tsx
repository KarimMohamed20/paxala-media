"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, CircleAlert, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateLocalized } from "@/lib/format";
import type { PlanAction } from "./types";

export function ClientActionsCard({
  actions,
  onToggle,
  busyId,
  className,
}: {
  actions: PlanAction[];
  /** Omitted in the print view, where nothing is interactive. */
  onToggle?: (action: PlanAction, done: boolean) => void;
  busyId?: string | null;
  className?: string;
}) {
  const t = useTranslations("plan");
  const locale = useLocale();

  return (
    <section
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.03] p-5",
        className
      )}
    >
      <h2 className="mb-4 text-sm font-bold text-white">{t("actions.title")}</h2>

      {actions.length === 0 ? (
        <p className="py-6 text-center text-xs text-white/40">
          {t("actions.empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {actions.map((a) => {
            const done = a.status === "COMPLETED";
            return (
              <li key={a.id} className="flex items-start gap-3">
                {onToggle ? (
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => onToggle(a, !done)}
                    aria-label={done ? t("actions.markPending") : t("actions.markDone")}
                    className={cn(
                      "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border transition disabled:opacity-40",
                      done
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-white/15 bg-white/5 text-white/40 hover:border-white/30 hover:text-white/70"
                    )}
                  >
                    {done ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}
                  </button>
                ) : (
                  <span
                    className={cn(
                      "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border",
                      done
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-white/15 bg-white/5 text-white/40"
                    )}
                  >
                    {done ? <CheckCircle2 size={15} /> : <CircleAlert size={15} />}
                  </span>
                )}

                <span className="min-w-0 flex-1 text-start">
                  <span className="block text-sm font-semibold text-white">
                    {a.title}
                  </span>
                  <span
                    className={cn(
                      "block text-[11px] font-semibold",
                      done ? "text-emerald-400" : "text-red-400"
                    )}
                  >
                    {done ? t("actions.done") : t("actions.required")}
                  </span>
                  {a.contentItemId && (
                    <Link
                      href={`/portal/approvals?item=${a.contentItemId}`}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-white/50 hover:text-white/80"
                    >
                      <ExternalLink size={10} />
                      {t("actions.openReview")}
                    </Link>
                  )}
                </span>

                <span className="ms-auto shrink-0 text-end">
                  <span className="block text-[10px] uppercase tracking-wider text-white/35">
                    {t("actions.due")}
                  </span>
                  <span className="block text-[11px] text-white/70">
                    {a.dueAt
                      ? formatDateLocalized(a.dueAt, locale, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : t("actions.noDue")}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
