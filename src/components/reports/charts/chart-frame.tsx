"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { CHART_THEME, type ChartVariant } from "./chart-scale";

/**
 * Shared shell: a labelled figure, an accessible data table, and the empty
 * state. Every chart in the report goes through this so screen-reader users get
 * the numbers rather than an opaque image.
 */
export function ChartFrame({
  ariaLabel,
  table,
  className,
  children,
}: {
  ariaLabel: string;
  /** Rendered visually hidden so the figures are readable, not just paintable. */
  table?: { caption: string; rows: { label: string; value: string }[] };
  /** Accepted for call-site symmetry with the chart components; unused here. */
  variant?: ChartVariant;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <figure role="img" aria-label={ariaLabel} className={cn("m-0", className)}>
      {children}
      {table && table.rows.length > 0 && (
        <table className="sr-only">
          <caption>{table.caption}</caption>
          <tbody>
            {table.rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}

export function ChartEmpty({
  height,
  label,
  variant = "dark",
}: {
  height: number;
  label?: string;
  variant?: ChartVariant;
}) {
  const t = useTranslations("reports");
  return (
    <div
      className={cn(
        "grid place-items-center rounded-lg border border-dashed text-xs",
        variant === "print"
          ? "border-neutral-200 text-neutral-400"
          : "border-white/10 text-white/40",
        CHART_THEME[variant].emptyText
      )}
      style={{ height }}
    >
      {label ?? t("chart.empty")}
    </div>
  );
}
