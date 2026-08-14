import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The dashed-border empty state.
 *
 * This recipe — `rounded-2xl border border-dashed border-white/10`, a 40px icon
 * at `text-white/20`, a `text-sm font-semibold text-white/70` title and a
 * `text-xs text-white/40` description — was hand-copied into roughly seventeen
 * files (portal/files, portal/dashboard, portal/reports, admin/monthly-plans,
 * admin/content-calendar, asset-picker-grid, chart-frame…). Extracted verbatim
 * so it stays one thing, and so a new surface gets it right for free.
 *
 * Deliberately takes NO translation dependency: callers pass already-localised
 * strings, exactly as PlanEmptyState does today.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "default",
  className,
}: {
  /** A lucide icon component, e.g. `CalendarX`. */
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Primary call to action — a <Link> or <button>, styled by the caller. */
  action?: React.ReactNode;
  /** `compact` for inside a panel or card; `default` for a full page region. */
  size?: "default" | "compact";
  className?: string;
}) {
  const compact = size === "compact";

  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-white/10 text-center",
        compact ? "px-4 py-8" : "px-6 py-16",
        className
      )}
    >
      {Icon && (
        <Icon
          size={compact ? 28 : 40}
          aria-hidden="true"
          className={cn("mx-auto text-white/20", compact ? "mb-2" : "mb-3")}
        />
      )}
      <p className="text-sm font-semibold text-white/70">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-white/40">
          {description}
        </p>
      )}
      {action && <div className={compact ? "mt-3" : "mt-5"}>{action}</div>}
    </div>
  );
}
