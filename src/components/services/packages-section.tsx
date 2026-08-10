"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight, Check, Star, Zap, Crown, Users, BarChart3, Settings,
} from "lucide-react";
import { packages } from "@/lib/constants";
import { SX, EASE_OUT } from "./service-shared";

const packageServices: Record<string, string> = {
  "package-01": "video-production,photography,graphic-design,social-media",
  "package-02": "video-production,photography,graphic-design,social-media,web-development",
  "package-03": "video-production,photography,graphic-design,social-media,web-development,app-development",
};

const tierIcons: Record<string, React.ElementType> = {
  base: Zap,
  plus: Star,
  infinite: Crown,
};

const tierColors: Record<string, { border: string; badge: string; text: string; glow: string }> = {
  base: {
    border: "rgba(255,32,32,0.35)",
    badge: "rgba(255,32,32,0.18)",
    text: SX.accent,
    glow: "rgba(255,32,32,0.08)",
  },
  plus: {
    border: "rgba(255,255,255,0.18)",
    badge: "rgba(255,255,255,0.10)",
    text: "rgba(255,255,255,0.8)",
    glow: "rgba(255,255,255,0.04)",
  },
  infinite: {
    border: "rgba(251,191,36,0.35)",
    badge: "rgba(251,191,36,0.15)",
    text: "#fbbf24",
    glow: "rgba(251,191,36,0.06)",
  },
};

const COMPARISON_FEATURES = [
  { name: "Professional Reels Videos",      p1: "3/month", p2: true,  p3: true  },
  { name: "Photography Session",            p1: "Monthly", p2: true,  p3: true  },
  { name: "Drone Footage",                  p1: true,      p2: true,  p3: true  },
  { name: "Graphic Design",                 p1: true,      p2: true,  p3: true  },
  { name: "Paid Ads Management",            p1: true,      p2: true,  p3: true  },
  { name: "Full Production Team",           p1: true,      p2: true,  p3: true  },
  { name: "Website Development",            p1: false,     p2: true,  p3: true  },
  { name: "Custom UI/UX Design",            p1: false,     p2: true,  p3: true  },
  { name: "SEO & Analytics",                p1: false,     p2: true,  p3: true  },
  { name: "Website Management",             p1: false,     p2: false, p3: true  },
  { name: "Mobile App Development",         p1: false,     p2: false, p3: true  },
  { name: "Full Ecosystem Integration",     p1: false,     p2: false, p3: true  },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true)  return <Check size={16} style={{ color: "#22c55e" }} className="mx-auto" />;
  if (value === false) return <span style={{ color: "rgba(255,255,255,0.18)" }}>—</span>;
  return <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{value}</span>;
}

function PackageCard({ pkg, index }: { pkg: (typeof packages)[0]; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const TierIcon = tierIcons[pkg.tier] || Star;
  const c = tierColors[pkg.tier] || tierColors.plus;
  const isPopular = pkg.popular;

  return (
    <motion.div
      ref={ref}
      id={pkg.id}
      initial={{ opacity: 0, y: 60 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, ease: EASE_OUT, delay: index * 0.08 }}
      className="relative rounded-3xl border p-8 md:p-10"
      style={{
        borderColor: c.border,
        backgroundColor: SX.card,
        boxShadow: isPopular ? `0 0 80px -20px ${c.border}` : "none",
        outline: isPopular ? `1.5px solid ${SX.accent}` : "none",
      }}
    >
      {isPopular && (
        <div className="absolute -top-4 right-8">
          <span
            className="px-5 py-1.5 text-xs font-semibold uppercase tracking-widest rounded-full text-white"
            style={{ backgroundColor: SX.accent, boxShadow: "0 8px 24px -8px rgba(255,32,32,0.6)" }}
          >
            Recommended
          </span>
        </div>
      )}

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Left */}
        <div>
          <div className="mb-6 flex items-start gap-4">
            <div className="flex aspect-square w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: c.badge }}>
              <TierIcon size={24} style={{ color: c.text }} />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: c.text }}>
                {pkg.tier}
              </span>
              <h3 className="mt-0.5 text-2xl font-bold text-white md:text-3xl">{pkg.name}</h3>
              <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{pkg.subtitle}</p>
            </div>
          </div>

          {/* Price block */}
          <div className="mb-7 rounded-2xl border p-5" style={{ borderColor: SX.border, backgroundColor: SX.card2 }}>
            <p className="text-3xl font-bold text-white">{pkg.price}</p>
            <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              {pkg.currency} {pkg.period}
            </p>
            {pkg.minimumCommitment && (
              <p className="mt-1 text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{pkg.minimumCommitment}</p>
            )}
          </div>

          <p className="mb-7 text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
            {pkg.description}
          </p>

          {/* Ideal For */}
          <div className="mb-7">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/80">
              <Users size={14} style={{ color: SX.accent }} />
              Ideal For
            </p>
            <div className="flex flex-wrap gap-2">
              {pkg.idealFor.map((item) => (
                <span key={item} className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: SX.border, color: "rgba(255,255,255,0.6)" }}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/booking?package=${pkg.id}&service=${packageServices[pkg.id] || "concept-strategy"}`}
              className="inline-flex h-12 items-center gap-2 rounded-full px-7 text-sm font-medium text-white transition-transform duration-300 hover:-translate-y-0.5"
              style={{ backgroundColor: SX.accent, boxShadow: "0 10px 32px -10px rgba(255,32,32,0.55)" }}
            >
              Get Started <ArrowRight size={16} />
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-12 items-center gap-2 rounded-full border px-7 text-sm font-medium text-white/80 transition-colors duration-300 hover:bg-white/5"
              style={{ borderColor: SX.border }}
            >
              Contact Us
            </Link>
          </div>
        </div>

        {/* Right — features */}
        <div>
          <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/80">
            <BarChart3 size={14} style={{ color: SX.accent }} />
            What&apos;s Included
          </p>
          <div className="space-y-3">
            {pkg.features.map((feat, fi) => (
              <motion.div
                key={fi}
                initial={{ opacity: 0, x: 16 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.25 + fi * 0.07 }}
                className="rounded-xl border p-4"
                style={{ borderColor: SX.border, backgroundColor: SX.card2 }}
              >
                <p className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: SX.accent }} />
                  {feat.category}
                </p>
                <ul className="space-y-1.5">
                  {feat.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                      <Check size={12} style={{ color: SX.accent, marginTop: 2, flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
          {pkg.note && (
            <div className="mt-4 rounded-xl border p-3" style={{ borderColor: "rgba(251,191,36,0.25)", backgroundColor: "rgba(251,191,36,0.07)" }}>
              <p className="flex items-center gap-2 text-xs" style={{ color: "#fbbf24" }}>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                {pkg.note}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ComparisonTable() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.1 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: EASE_OUT }}
      className="overflow-x-auto rounded-2xl border"
      style={{ borderColor: SX.border, backgroundColor: SX.card }}
    >
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: SX.border }}>
            <th className="px-5 py-4 text-left font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>Feature</th>
            {[
              { icon: Zap,    label: "Brand 360°",         color: tierColors.base.text },
              { icon: Star,   label: "Brand 360°+",        color: tierColors.plus.text },
              { icon: Crown,  label: "Brand 360° infinite",color: tierColors.infinite.text },
            ].map(({ icon: Icon, label, color }) => (
              <th key={label} className="px-5 py-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Icon size={16} style={{ color }} />
                  <span className="font-semibold text-xs" style={{ color }}>{label}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARISON_FEATURES.map((row, i) => (
            <tr key={row.name} className="border-b transition-colors hover:bg-white/[0.02]" style={{ borderColor: i === COMPARISON_FEATURES.length - 1 ? "transparent" : SX.border }}>
              <td className="px-5 py-3.5 text-white/75">{row.name}</td>
              <td className="px-5 py-3.5 text-center"><Cell value={row.p1} /></td>
              <td className="px-5 py-3.5 text-center" style={{ backgroundColor: "rgba(255,32,32,0.04)" }}><Cell value={row.p2} /></td>
              <td className="px-5 py-3.5 text-center"><Cell value={row.p3} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

export function PackagesSection() {
  return (
    <section id="packages" className="relative py-24 md:py-32" style={{ backgroundColor: SX.bg }}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "26px 26px" }} />

      <div className="relative mx-auto max-w-7xl px-6 md:px-8 lg:px-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="mb-16 max-w-2xl"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: SX.accent }}>
            Brand 360° Packages
          </span>
          <h2 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
            Pick your plan.
          </h2>
          <p className="mt-5 text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
            Integrated 360° marketing and digital production solutions — from strong visual presence to a complete digital ecosystem.
          </p>
        </motion.div>

        {/* Package cards */}
        <div className="space-y-10 mb-20">
          {packages.map((pkg, i) => (
            <PackageCard key={pkg.id} pkg={pkg} index={i} />
          ))}
        </div>

        {/* Comparison table */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="mb-16"
        >
          <h3 className="mb-8 text-2xl font-semibold text-white">Feature comparison</h3>
          <ComparisonTable />
        </motion.div>

        {/* General notes */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="rounded-2xl border p-7"
          style={{ borderColor: SX.border, backgroundColor: SX.card }}
        >
          <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-white">
            <Settings size={16} style={{ color: SX.accent }} />
            General Notes
          </p>
          <ul className="space-y-3">
            {[
              "All packages are managed and delivered by PMP – Paxala Media Production.",
              "Every project is customized to the client's brand identity and goals.",
              "Pricing reflects a professional team, high-end production, and strategic long-term management.",
            ].map((note) => (
              <li key={note} className="flex items-start gap-3 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: SX.accent }} />
                {note}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
