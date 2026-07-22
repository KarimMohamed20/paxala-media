"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";
import { SX, EASE_OUT } from "./service-shared";
import { EcosystemGraphic } from "./ecosystem-graphic";

const TIER_DEFS = [
  {
    id: "silver" as const,
    color: "#A8B5C0",
    services: ["production", "photography", "advertising", "brand"] as readonly string[],
  },
  {
    id: "gold" as const,
    color: "#C9A84C",
    services: ["production", "photography", "advertising", "brand", "website"] as readonly string[],
  },
  {
    id: "infinite" as const,
    color: "#FF2020",
    services: null,
  },
] as const;

type TierId = (typeof TIER_DEFS)[number]["id"];

export function ServicesHero() {
  const t = useTranslations("servicesHero");
  const [selectedTier, setSelectedTier] = useState<TierId | null>("silver");

  // Build tiers with translated labels
  const TIERS = TIER_DEFS.map((def) => ({
    ...def,
    label:    t(`tier${def.id.charAt(0).toUpperCase() + def.id.slice(1)}Label`    as any),
    sublabel: t(`tier${def.id.charAt(0).toUpperCase() + def.id.slice(1)}Sublabel` as any),
    desc:     t(`tier${def.id.charAt(0).toUpperCase() + def.id.slice(1)}Desc`     as any),
  }));

  const tier = TIERS.find((ti) => ti.id === selectedTier) ?? null;

  // Split heading at [[…]] marker so we can colour the middle word
  const headingRaw = t("heading");
  const headingParts = headingRaw.split(/\[\[|\]\]/); // [before, highlight, after]

  return (
    <section
      className="relative overflow-hidden pt-28 pb-16 md:pt-32 md:pb-24"
      style={{ backgroundColor: SX.bg }}
    >
      {/* dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }}
      />

      <div className="relative z-10 mx-auto flex max-w-[1440px] flex-col items-start gap-16 px-6 md:px-8 lg:flex-row lg:items-center lg:gap-10 lg:px-12">

        {/* ── LEFT ── */}
        <div className="w-full shrink-0 lg:w-[400px] xl:w-[440px]">
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: SX.accent }}
          >
            <span className="h-px w-8" style={{ background: SX.accent }} />
            {t("badge")}
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.08 }}
            className="mt-6 text-5xl font-semibold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl"
          >
            {headingParts[0]}
            <span style={{ color: SX.accent }}>{headingParts[1]}</span>
            {headingParts[2]}
            <span className="mt-3 block text-white/40">{t("headingSubline")}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.18 }}
            className="mt-6 text-2xl font-medium text-white/70"
          >
            {t("slogan")}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.26 }}
            className="mt-6 max-w-md text-base leading-relaxed text-white/55"
          >
            {t("description")}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.34 }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <Link
              href="#journey"
              className="group inline-flex h-14 items-center gap-2 rounded-full px-8 text-sm font-medium text-white transition-transform duration-300 hover:-translate-y-0.5"
              style={{ backgroundColor: SX.accent, boxShadow: "0 12px 40px -12px rgba(255,32,32,0.6)" }}
            >
              {t("exploreServices")}
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/booking"
              className="inline-flex h-14 items-center gap-2 rounded-full border px-8 text-sm font-medium text-white/90 backdrop-blur-sm transition-colors duration-300 hover:bg-white/5"
              style={{ borderColor: SX.border }}
            >
              <Calendar size={16} />
              {t("bookConsultation")}
            </Link>
          </motion.div>

          {/* ── PACKAGE TABS ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.46 }}
            className="mt-8"
          >
            <p
              className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: "rgba(255,255,255,0.22)" }}
            >
              {t("exploreByPackage")}
            </p>
            <div className="flex gap-2">
              {TIERS.map((ti) => {
                const isSelected = selectedTier === ti.id;
                return (
                  <div key={ti.id} className="relative">
                    {/* sublabel floats below — outside the button so it never affects button width */}
                    <span
                      className="pointer-events-none absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest"
                      style={{
                        backgroundColor: `${ti.color}2A`,
                        color: ti.color,
                        opacity: isSelected ? 1 : 0,
                        transition: "opacity 0.25s",
                      }}
                    >
                      {ti.sublabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedTier(isSelected ? null : ti.id)}
                      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-all duration-300"
                      style={{
                        borderColor: isSelected ? ti.color : "rgba(255,255,255,0.10)",
                        backgroundColor: isSelected ? `${ti.color}1A` : "transparent",
                        color: isSelected ? "#fff" : "rgba(255,255,255,0.45)",
                        boxShadow: isSelected ? `0 0 22px -8px ${ti.color}` : "none",
                      }}
                    >
                      <span
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{
                          backgroundColor: ti.color,
                          boxShadow: isSelected ? `0 0 8px 2px ${ti.color}88` : "none",
                          transition: "box-shadow 0.3s",
                        }}
                      />
                      {ti.label}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Tier description + price */}
            <div className="mt-8 min-h-[72px]">
              {tier && (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {tier.desc}
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── RIGHT — ecosystem + side panel ── */}
        <motion.div
          className="w-full min-w-0 lg:flex-1"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: EASE_OUT, delay: 0.2 }}
        >
          <EcosystemGraphic
            packageColor={tier?.color}
            includedServices={tier ? tier.services : undefined}
          />
        </motion.div>
      </div>
    </section>
  );
}
