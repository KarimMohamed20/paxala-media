"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Clapperboard, Megaphone, Monitor, Smartphone, LineChart, Users, Workflow, Cpu,
  Infinity as InfinityIcon, TrendingUp, Timer, Sparkles, HeartHandshake, type LucideIcon,
} from "lucide-react";
import { SX, EASE_OUT } from "./service-shared";

const NODES: { label: string; Icon: LucideIcon }[] = [
  { label: "Content", Icon: Clapperboard },
  { label: "Advertising", Icon: Megaphone },
  { label: "Website", Icon: Monitor },
  { label: "Applications", Icon: Smartphone },
  { label: "Analytics", Icon: LineChart },
  { label: "CRM", Icon: Users },
  { label: "Automation", Icon: Workflow },
  { label: "AI", Icon: Cpu },
];

const RESULTS: { title: string; desc: string; Icon: LucideIcon }[] = [
  { title: "One Ecosystem", desc: "Everything connected, working as a single system.", Icon: InfinityIcon },
  { title: "More Growth", desc: "Smarter funnels that turn attention into revenue.", Icon: TrendingUp },
  { title: "Less Work", desc: "Automation handles the repetitive work for you.", Icon: Timer },
  { title: "Maximum Impact", desc: "Data + creativity + technology, combined.", Icon: Sparkles },
  { title: "All For You", desc: "Focus on your business while PMP powers everything.", Icon: HeartHandshake },
];

const N = NODES.length;
const R = 40;
function pos(i: number) {
  const a = ((-90 + i * (360 / N)) * Math.PI) / 180;
  return { x: 50 + R * Math.cos(a), y: 50 + R * Math.sin(a) };
}

export function RevealSection() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className="relative overflow-hidden py-24 md:py-32" style={{ backgroundColor: SX.bg }}>
      <div className="mx-auto max-w-7xl px-6 md:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="mb-16 max-w-2xl"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: SX.accent }}>
            The Reveal
          </span>
          <h2 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
            One connected ecosystem.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          {/* diagram */}
          <div className="relative mx-auto aspect-square w-full max-w-[520px]">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[110px]" style={{ background: "radial-gradient(circle, rgba(255,32,32,0.12), transparent 70%)" }} />
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
              <circle cx={50} cy={50} r={40} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              {NODES.map((_, i) => {
                const { x, y } = pos(i);
                const lit = hovered === null || hovered === i;
                return (
                  <line key={i} x1={50} y1={50} x2={x} y2={y} stroke={hovered === i ? SX.accent : "rgba(255,255,255,0.1)"} strokeWidth={hovered === i ? 1.6 : 1} vectorEffect="non-scaling-stroke" style={{ opacity: lit ? 1 : 0.3, transition: "all 0.3s" }} />
                );
              })}
              {NODES.map((_, i) => {
                const { x, y } = pos(i);
                return (
                  <motion.circle key={`p${i}`} r={0.9} fill={SX.accent}
                    initial={{ cx: 50, cy: 50, opacity: 0 }}
                    animate={{ cx: [50, x], cy: [50, y], opacity: hovered === i ? [0, 1, 0] : [0, 0.45, 0] }}
                    transition={{ duration: hovered === i ? 1.3 : 3.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.2 }} />
                );
              })}
            </svg>

            {/* center */}
            <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
              <motion.div
                className="flex aspect-square w-28 flex-col items-center justify-center rounded-full border text-center sm:w-32"
                style={{ backgroundColor: SX.card, borderColor: "rgba(255,32,32,0.5)" }}
                animate={{ boxShadow: ["0 0 40px -8px rgba(255,32,32,0.5)", "0 0 70px -6px rgba(255,32,32,0.7)", "0 0 40px -8px rgba(255,32,32,0.5)"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className="px-2 text-sm font-bold uppercase leading-tight tracking-wide text-white">Your<br />Business</span>
              </motion.div>
            </div>

            {/* nodes */}
            {NODES.map((node, i) => {
              const { x, y } = pos(i);
              const isHover = hovered === i;
              return (
                <div key={node.label} className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: `${x}%`, top: `${y}%` }}>
                  <button
                    type="button"
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    className="block focus:outline-none"
                  >
                    <motion.div
                      className="flex aspect-square w-11 items-center justify-center rounded-full border sm:w-12"
                      style={{ backgroundColor: isHover ? "rgba(255,32,32,0.16)" : SX.card2, borderColor: isHover ? SX.accent : "rgba(255,255,255,0.12)" }}
                      animate={{ scale: isHover ? 1.12 : 1, boxShadow: isHover ? "0 0 24px -4px rgba(255,32,32,0.7)" : "0 0 0 rgba(0,0,0,0)" }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <node.Icon size={17} style={{ color: isHover ? SX.accent : "rgba(255,255,255,0.8)" }} />
                    </motion.div>
                    <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide sm:text-[10px]" style={{ color: isHover ? "#fff" : "rgba(255,255,255,0.5)" }}>
                      {node.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* results panel */}
          <div className="divide-y" style={{ borderColor: SX.border }}>
            {RESULTS.map((r, i) => (
              <motion.div
                key={r.title}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, ease: EASE_OUT, delay: i * 0.08 }}
                className="flex items-start gap-4 py-5"
                style={{ borderColor: SX.border }}
              >
                <div className="flex aspect-square w-11 flex-shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: "rgba(255,32,32,0.12)" }}>
                  <r.Icon size={20} style={{ color: SX.accent }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{r.title}</h3>
                  <p className="mt-1 text-sm text-white/55">{r.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
