"use client";

import { motion } from "framer-motion";
import { ChevronRight, Clapperboard, Monitor, Smartphone, Megaphone, Cpu, CheckCircle2, type LucideIcon } from "lucide-react";
import { SX, EASE_OUT } from "./service-shared";

const STEPS: { n: string; title: string; desc: string; Icon: LucideIcon }[] = [
  { n: "01", title: "Content", desc: "Cinematic video, photography and assets that tell your story.", Icon: Clapperboard },
  { n: "02", title: "Website", desc: "A high-performance home that turns attention into customers.", Icon: Monitor },
  { n: "03", title: "Applications", desc: "Mobile & web apps that extend your brand experience.", Icon: Smartphone },
  { n: "04", title: "Advertising", desc: "Targeted campaigns that put it all in front of the right people.", Icon: Megaphone },
  { n: "05", title: "AI Automation", desc: "Smart systems that handle the repetitive work for you.", Icon: Cpu },
  { n: "06", title: "Complete System", desc: "Everything connected into one growth engine.", Icon: CheckCircle2 },
];

export function JourneySection() {
  return (
    <section id="journey" className="relative py-24 md:py-32" style={{ backgroundColor: "#101010" }}>
      <div className="mx-auto max-w-7xl px-6 md:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
          className="mb-16 max-w-2xl"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: SX.accent }}>
            The Journey
          </span>
          <h2 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
            You build the ecosystem.
          </h2>
          <p className="mt-5 text-lg text-white/55">
            Each layer compounds on the last — until your brand runs as one
            connected system.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: (i % 3) * 0.1 }}
              className="group relative"
            >
              <div
                className="relative h-full overflow-hidden border p-7 transition-all duration-300 hover:-translate-y-1"
                style={{ backgroundColor: "#141414", borderColor: SX.border, borderRadius: SX.radius }}
              >
                {/* number watermark */}
                <span className="pointer-events-none absolute -right-2 -top-6 text-8xl font-bold text-white/[0.04]">{step.n}</span>

                <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-2xl border" style={{ borderColor: SX.border, background: "linear-gradient(150deg,#161616,#0a0a0a)" }}>
                  <div className="absolute h-24 w-24 rounded-full blur-2xl" style={{ background: "radial-gradient(circle, rgba(255,32,32,0.25), transparent 70%)" }} />
                  <step.Icon size={40} className="relative text-white/80 transition-transform duration-500 group-hover:scale-110" />
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <span className="text-sm font-bold tracking-widest" style={{ color: SX.accent }}>{step.n}</span>
                  <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{step.desc}</p>
              </div>

              {/* connector arrow (between cards on large screens) */}
              {i < STEPS.length - 1 && (
                <div className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 lg:block" style={{ display: (i % 3 === 2) ? "none" : undefined }}>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border" style={{ backgroundColor: SX.bg, borderColor: SX.border }}>
                    <ChevronRight size={14} style={{ color: SX.accent }} />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
