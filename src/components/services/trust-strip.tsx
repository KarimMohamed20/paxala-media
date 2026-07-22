"use client";

import { useRef, useEffect, useState } from "react";
import { useInView } from "framer-motion";
import { useTranslations } from "next-intl";
import { SX } from "./service-shared";

function Counter({ to, suffix = "", duration = 1400 }: { to: number; suffix?: string; duration?: number }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  useEffect(() => {
    if (!isInView) return;
    let current = 0;
    const increment = to / (duration / 16);
    const id = setInterval(() => {
      current = Math.min(current + increment, to);
      setVal(Math.round(current));
      if (current >= to) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [isInView, to, duration]);

  return <span ref={ref}>{val}{suffix}</span>;
}

export function TrustStrip() {
  const t = useTranslations("trustStrip");

  const stats = [
    { to: 10, suffix: "+", label: t("clients") },
    { to: 2,  suffix: "",  label: t("retainers") },
    { to: 3,  suffix: "",  label: t("industries") },
    { to: 6,  suffix: "+", label: t("engagement") },
  ];

  return (
    <div
      className="border-y"
      style={{ borderColor: SX.border, backgroundColor: "#080808" }}
    >
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 px-6 md:grid-cols-4 md:px-8 lg:px-12">
        {stats.map((s, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1.5 py-10"
            style={i > 0 ? { borderLeft: `1px solid ${SX.border}` } : undefined}
          >
            <span
              className="text-4xl font-bold tabular-nums text-white sm:text-5xl"
            >
              <Counter to={s.to} suffix={s.suffix} />
            </span>
            <span
              className="text-center text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "rgba(255,255,255,0.30)" }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
