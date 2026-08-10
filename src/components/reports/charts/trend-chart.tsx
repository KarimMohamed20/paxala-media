"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatCompactLocalized } from "@/lib/format";
import { ChartEmpty, ChartFrame } from "./chart-frame";
import {
  CHART_THEME,
  SERIES_COLORS,
  areaPath,
  buildTicks,
  labelStride,
  niceCeil,
  smoothPath,
  splitSegments,
  type Point,
} from "./chart-scale";
import type { ChartVariant, TrendSeries } from "./types";

const PAD_X = 6;

/**
 * Multi-series line/area trend chart. Hand-rolled SVG — the repo has no chart
 * library and `progress-ring.tsx` is the established precedent.
 *
 * Renders at measured pixel size rather than a scaling `viewBox`: two charts in
 * unequal grid columns must line up, and `preserveAspectRatio="none"` would
 * distort dots into ellipses and stretch stroke widths.
 */
export function TrendChart({
  series,
  height = 180,
  yMin = 0,
  yMax,
  tickCount = 4,
  yFormat,
  ariaLabel,
  showXAxis = true,
  showYAxis = true,
  animated = true,
  variant = "dark",
  emptyLabel,
  className,
}: {
  series: TrendSeries[];
  height?: number;
  yMin?: number;
  /** Hard ceiling — pass 100 for percentage charts. */
  yMax?: number;
  tickCount?: number;
  yFormat?: (v: number) => string;
  ariaLabel: string;
  showXAxis?: boolean;
  showYAxis?: boolean;
  animated?: boolean;
  variant?: ChartVariant;
  emptyLabel?: string;
  className?: string;
}) {
  const t = useTranslations("reports");
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const theme = CHART_THEME[variant];

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(600);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth || 600);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // React 19's useId returns «r1»; strip the guillemets so url(#…) resolves.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  const points = series[0]?.points ?? [];
  const n = points.length;
  const hasAnyValue = series.some((s) =>
    s.points.some((p) => p.value !== null)
  );

  if (n === 0 || !hasAnyValue) {
    return (
      <ChartEmpty height={height} label={emptyLabel} variant={variant} />
    );
  }

  const values = series.flatMap((s) =>
    s.points.map((p) => p.value).filter((v): v is number => v !== null)
  );
  const rawMax = values.length ? Math.max(...values) : 0;
  const top = yMax ?? niceCeil(rawMax, tickCount);
  const ticks = buildTicks(yMin, top, tickCount);
  const fmt = yFormat ?? ((v: number) => formatCompactLocalized(v, locale));

  const innerW = Math.max(1, width - PAD_X * 2);
  // A single point sits centred — a lone dot at x=0 reads as a rendering bug.
  const xAt = (i: number) =>
    n === 1 ? width / 2 : PAD_X + (i / (n - 1)) * innerW;
  const yAt = (v: number) =>
    height - ((v - yMin) / Math.max(1e-9, top - yMin)) * height;

  const stride = labelStride(n);

  return (
    <ChartFrame
      ariaLabel={ariaLabel}
      variant={variant}
      className={className}
      table={{
        caption: t("chart.a11yTable", { chart: ariaLabel }),
        rows: series.flatMap((s) =>
          s.points.map((p) => ({
            label: `${s.label} — ${p.label}`,
            value: p.value === null ? t("chart.empty") : fmt(p.value),
          }))
        ),
      }}
    >
      {/* The whole plot block is forced LTR: SVG geometry is never mirrored, so
          if the axis column followed document direction the labels would land
          beside the wrong end of the scale. */}
      <div dir="ltr" className="relative">
        <div
          className={cn("relative", showYAxis && "ps-9")}
          style={{ height }}
        >
          {showYAxis && (
            <div
              className={cn(
                "absolute inset-y-0 left-0 flex w-9 flex-col justify-between pe-1 text-end text-[9px] tabular-nums",
                theme.axisText
              )}
            >
              {ticks.map((v, i) => (
                <span key={i}>{fmt(v)}</span>
              ))}
            </div>
          )}

          {/* The ref sits on an UNPADDED inner box: clientWidth includes
              padding, so measuring the ps-9 parent made the SVG a full axis
              gutter too wide and pushed it out of the card. */}
          <div ref={wrapRef} className="h-full w-full">
            <svg
              width={width}
              height={height}
              // No overflow-visible: nothing should ever escape the card, which
              // is exactly how the old campaign-chart leaked past its bounds.
              className="block"
              aria-hidden
            >
            <defs>
              {series.map((s) => (
                <linearGradient
                  key={s.id}
                  id={`trend-${uid}-${s.id}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={s.color ?? SERIES_COLORS.primary}
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="100%"
                    stopColor={s.color ?? SERIES_COLORS.primary}
                    stopOpacity={0}
                  />
                </linearGradient>
              ))}
            </defs>

            {ticks.map((v, i) => (
              <line
                key={i}
                x1={0}
                x2={width}
                y1={yAt(v)}
                y2={yAt(v)}
                stroke={theme.grid}
                strokeDasharray="3 3"
              />
            ))}

            {series.map((s) => {
              const color = s.color ?? SERIES_COLORS.primary;
              const runs = splitSegments(s.points);
              return (
                <g key={s.id}>
                  {runs.map((run, ri) => {
                    const pts: Point[] = run.map((r) => ({
                      x: xAt(r.index),
                      y: yAt(r.point.value as number),
                    }));

                    // A run of one has no path to draw — render the dot only.
                    if (pts.length === 1) {
                      return (
                        <circle
                          key={ri}
                          cx={pts[0].x}
                          cy={pts[0].y}
                          r={3.5}
                          fill={color}
                          stroke={theme.dotStroke}
                          strokeWidth={2}
                        />
                      );
                    }

                    const d = smoothPath(pts);
                    const shouldAnimate = animated && !reduceMotion;

                    return (
                      <g key={ri}>
                        {s.area && (
                          <motion.path
                            d={areaPath(pts, height)}
                            fill={`url(#trend-${uid}-${s.id})`}
                            initial={shouldAnimate ? { opacity: 0 } : false}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.8 }}
                          />
                        )}
                        <motion.path
                          key={`${s.id}-${n}`}
                          d={d}
                          fill="none"
                          stroke={color}
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeDasharray={s.dashed ? "5 4" : undefined}
                          initial={shouldAnimate ? { pathLength: 0 } : false}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1, ease: "easeInOut" }}
                        />
                        {pts.map((p, i) => (
                          <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r={2.5}
                            fill={color}
                            stroke={theme.dotStroke}
                            strokeWidth={1.5}
                          >
                            <title>
                              {`${s.label} — ${run[i].point.label}: ${fmt(
                                run[i].point.value as number
                              )}`}
                            </title>
                          </circle>
                        ))}
                      </g>
                    );
                  })}
                </g>
              );
            })}
            </svg>
          </div>
        </div>

        {showXAxis && (
          <div className={cn("relative mt-1 h-4", showYAxis && "ps-9")}>
            {points.map((p, i) => {
              if (i % stride !== 0 && i !== n - 1) return null;
              const isFirst = i === 0;
              const isLast = i === n - 1;
              return (
                <span
                  key={p.key}
                  className={cn(
                    "absolute text-[10px] whitespace-nowrap",
                    // Centring the edge labels would hang half of each outside
                    // the plot; anchor them inward instead.
                    isFirst
                      ? "translate-x-0"
                      : isLast
                        ? "-translate-x-full"
                        : "-translate-x-1/2",
                    theme.axisText
                  )}
                  style={{ left: `${(xAt(i) / Math.max(1, width)) * 100}%` }}
                >
                  {p.label}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </ChartFrame>
  );
}
