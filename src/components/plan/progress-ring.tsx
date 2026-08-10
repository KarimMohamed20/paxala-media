"use client";

import { motion } from "framer-motion";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { formatNumberLocalized } from "@/lib/format";

/**
 * Circular completion ring. Hand-rolled SVG — the repo has no chart library
 * (see `reports/charts/trend-chart.tsx` for the line/area equivalent).
 *
 * RTL: SVG geometry is not mirrored by `dir`, and it shouldn't be — a progress
 * ring reads clockwise in every locale. The percentage is rendered as absolutely
 * positioned HTML rather than SVG <text> to avoid SVG text-direction handling.
 */
export function ProgressRing({
  value,
  size = 44,
  stroke = 4,
  showLabel = true,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const locale = useLocale();
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${v}%`}
    >
      <svg width={size} height={size} className="block">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke="rgba(255,255,255,0.1)"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke="#dc2626"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v / 100) }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {showLabel && (
        <span
          className="absolute inset-0 grid place-items-center font-bold text-white"
          style={{ fontSize: Math.max(9, Math.round(size * 0.27)) }}
        >
          {formatNumberLocalized(v, locale)}
        </span>
      )}
    </div>
  );
}
