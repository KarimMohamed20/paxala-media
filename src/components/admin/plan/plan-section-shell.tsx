"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Wrapper giving each editor tab a heading and its own Save button.
 *
 * Per-section saving (rather than one whole-document PUT) keeps each write small
 * and independently retryable, and means a failure in one tab cannot lose edits
 * made in another.
 */
export function PlanSectionShell({
  title,
  hint,
  dirty,
  saving,
  error,
  saved,
  onSave,
  children,
  className,
}: {
  title: string;
  hint?: string;
  dirty: boolean;
  saving: boolean;
  error?: string | null;
  saved?: boolean;
  onSave: () => void;
  children: React.ReactNode;
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white">{title}</h2>
          {hint && <p className="mt-0.5 text-[11px] text-white/40">{hint}</p>}
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <span className="text-[11px] text-amber-300">
              {t("admin.unsaved")}
            </span>
          )}
          {!dirty && saved && (
            <span className="text-[11px] text-emerald-400">{t("admin.saved")}</span>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-40"
          >
            {saving && <Loader2 size={13} className="animate-spin" />}
            {t("admin.save")}
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {children}
    </section>
  );
}

/** Shared field styling so every tab looks the same. */
export const planField =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none";
export const planLabel = "mb-1 block text-[11px] font-semibold text-white/60";
