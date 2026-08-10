"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatDateLocalized } from "@/lib/format";
import { deriveVersions, type ApprovalLike } from "@/lib/content-versions";

const STATE_STYLE = {
  CURRENT: { dot: "bg-red-500", label: "current", tone: "text-white" },
  REVIEWED: { dot: "bg-amber-400", label: "reviewed", tone: "text-white/70" },
  ARCHIVED: { dot: "bg-white/30", label: "archived", tone: "text-white/50" },
} as const;

/**
 * Version history rendered from the approval log — every resubmission after a
 * change request is the next version. No separate version table involved.
 */
export function ContentVersionHistory({
  approvals,
  className,
}: {
  approvals: ApprovalLike[];
  className?: string;
}) {
  const t = useTranslations("content");
  const locale = useLocale();

  const versions = deriveVersions(approvals);
  if (versions.length === 0) {
    return (
      <p className={cn("text-xs text-white/40", className)}>
        {t("approvals.version.none")}
      </p>
    );
  }

  return (
    <ul className={cn("space-y-3", className)}>
      {[...versions].reverse().map((v) => {
        const style = STATE_STYLE[v.state];
        return (
          <li key={v.version} className="flex items-center gap-3 text-xs">
            <span className={cn("font-bold", style.tone)}>
              {t("approvals.version.label", { n: v.version })}
            </span>
            <span className="flex items-center gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
              <span className={style.tone}>
                {t(`approvals.version.${style.label}`)}
              </span>
            </span>
            <span className="ms-auto whitespace-nowrap text-white/40">
              {formatDateLocalized(v.displayAt, locale, {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {v.displayBy && (
              <span className="max-w-28 truncate text-white/50">
                {v.displayBy}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
