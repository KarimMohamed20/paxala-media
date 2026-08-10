"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatNumberLocalized } from "@/lib/format";
import { isRTL, type Locale } from "@/i18n/config";
import { ChartEmpty, ChartFrame } from "./chart-frame";
import { CHART_THEME } from "./chart-scale";
import type { ChartVariant, ShareRow } from "./types";

/**
 * Ranked share bars — the repo's established idiom for this data
 * (portal/calendar's platform mix). Chosen over a donut: there is no tooltip
 * primitive, so slice values would need SVG <text>, and six platforms produce
 * unlabelable sub-5% slices at rail width.
 */
export function ShareBars({
  rows,
  ariaLabel,
  emptyLabel,
  max = 6,
  variant = "dark",
  className,
}: {
  rows: ShareRow[];
  ariaLabel: string;
  emptyLabel?: string;
  max?: number;
  variant?: ChartVariant;
  className?: string;
}) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const rtl = isRTL(locale as Locale);
  const theme = CHART_THEME[variant];
  const isPrint = variant === "print";

  const visible = [...rows]
    .sort((a, b) => b.count - a.count)
    .slice(0, max);

  if (visible.length === 0) {
    return <ChartEmpty height={96} label={emptyLabel} variant={variant} />;
  }

  return (
    <ChartFrame
      ariaLabel={ariaLabel}
      variant={variant}
      className={className}
      table={{
        caption: t("chart.a11yTable", { chart: ariaLabel }),
        rows: visible.map((r) => ({
          label: r.label,
          value: `${r.percent}% (${r.count})`,
        })),
      }}
    >
      <ul className="space-y-2.5">
        {visible.map((row) => (
          <li key={row.key}>
            <div className="mb-1 flex items-center gap-2">
              {row.icon}
              <span
                className={cn("flex-1 truncate text-[11px]", theme.labelText)}
              >
                {row.label}
              </span>
              {/* dir="ltr": bidi reorders "42% (17)" around the parenthesis. */}
              <span
                dir="ltr"
                className={cn("text-[11px] tabular-nums", theme.axisText)}
              >
                {row.percent}% ({formatNumberLocalized(row.count, locale)})
              </span>
            </div>

            {isPrint ? (
              // A CSS background is dropped whenever "Background graphics" is
              // off — the browser default. An inline <rect> is painted content
              // and always prints.
              <svg width="100%" height="6" className="block">
                <rect x="0" y="0" width="100%" height="6" rx="3" fill="#e5e5e5" />
                <rect
                  x="0"
                  y="0"
                  width={`${Math.max(row.percent, 2)}%`}
                  height="6"
                  rx="3"
                  fill={row.fill ?? "#dc2626"}
                />
              </svg>
            ) : (
              <div
                className={cn(
                  "h-1.5 overflow-hidden rounded-full",
                  theme.track
                )}
              >
                {/* A block child fills from the inline start, so the bar grows
                    right-to-left under dir="rtl" for free. Only the gradient
                    direction needs mirroring. */}
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-700",
                    row.barClassName ??
                      cn(
                        "from-red-600 to-amber-500",
                        rtl ? "bg-gradient-to-l" : "bg-gradient-to-r"
                      )
                  )}
                  style={{ width: `${Math.max(row.percent, 2)}%` }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}

/**
 * A single 100%-stacked bar plus legend — for "parts of one whole" sets such as
 * revision depth (0 / 1 / 2+ rounds), where ranked bars would obscure that the
 * segments sum to the total.
 */
export function SegmentedBar({
  segments,
  ariaLabel,
  emptyLabel,
  variant = "dark",
  className,
}: {
  segments: (ShareRow & { fill: string })[];
  ariaLabel: string;
  emptyLabel?: string;
  variant?: ChartVariant;
  className?: string;
}) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const theme = CHART_THEME[variant];
  const isPrint = variant === "print";

  const visible = segments.filter((s) => s.count > 0);
  if (visible.length === 0) {
    return <ChartEmpty height={72} label={emptyLabel} variant={variant} />;
  }

  return (
    <ChartFrame
      ariaLabel={ariaLabel}
      variant={variant}
      className={className}
      table={{
        caption: t("chart.a11yTable", { chart: ariaLabel }),
        rows: visible.map((s) => ({
          label: s.label,
          value: `${s.percent}% (${s.count})`,
        })),
      }}
    >
      {isPrint ? (
        <svg width="100%" height="10" className="block">
          {visible.reduce<{ x: number; nodes: React.ReactNode[] }>(
            (acc, s) => {
              acc.nodes.push(
                <rect
                  key={s.key}
                  x={`${acc.x}%`}
                  y="0"
                  width={`${s.percent}%`}
                  height="10"
                  fill={s.fill}
                />
              );
              acc.x += s.percent;
              return acc;
            },
            { x: 0, nodes: [] }
          ).nodes}
        </svg>
      ) : (
        // Bare `flex`, never `flex-row`: src/styles/rtl.css reverses .flex-row
        // under dir="rtl", which would double-mirror an already-correct layout.
        <div className={cn("flex h-2.5 overflow-hidden rounded-full", theme.track)}>
          {visible.map((s) => (
            <div
              key={s.key}
              className={s.barClassName}
              style={{ width: `${s.percent}%`, backgroundColor: s.fill }}
            />
          ))}
        </div>
      )}

      <ul className="mt-3 space-y-1.5">
        {visible.map((s) => (
          <li key={s.key} className="flex items-center gap-2 text-[11px]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: s.fill }}
            />
            <span className={cn("flex-1 truncate", theme.labelText)}>
              {s.label}
            </span>
            <span dir="ltr" className={cn("tabular-nums", theme.axisText)}>
              {formatNumberLocalized(s.count, locale)}
            </span>
          </li>
        ))}
      </ul>
    </ChartFrame>
  );
}
