"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { SX, EASE_OUT } from "./service-shared";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-28 md:py-40" style={{ backgroundColor: SX.bg }}>
      {/* practical red lighting + haze */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[150px]"
        style={{ background: "radial-gradient(circle, rgba(255,32,32,0.18), transparent 70%)" }}
      />
      {/* floating particles */}
      {Array.from({ length: 18 }).map((_, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-white/30"
          style={{ left: `${(i * 53) % 100}%`, top: `${(i * 31) % 100}%` }}
          animate={{ y: [0, -30, 0], opacity: [0, 0.6, 0] }}
          transition={{ duration: 6 + (i % 5), repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
        />
      ))}

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center md:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
          className="text-5xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl"
        >
          Ready to build<br />
          something <span style={{ color: SX.accent }}>extraordinary?</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.1 }}
          className="mx-auto mt-6 max-w-xl text-lg text-white/55"
        >
          Let&apos;s design the complete ecosystem your brand deserves — from the
          first frame to lasting growth.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.2 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="/booking"
            className="group inline-flex items-center gap-2 rounded-full px-9 py-4 text-base font-medium text-white transition-transform duration-300 hover:-translate-y-0.5"
            style={{ backgroundColor: SX.accent, boxShadow: "0 16px 50px -14px rgba(255,32,32,0.65)" }}
          >
            Book Consultation
            <ArrowUpRight size={18} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 rounded-full border px-9 py-4 text-base font-medium text-white/90 transition-colors duration-300 hover:bg-white/5"
            style={{ borderColor: SX.border }}
          >
            View Portfolio
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
