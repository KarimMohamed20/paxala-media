"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  Check,
  Star,
  Zap,
  Crown,
  Video,
  Camera,
  Palette,
  Globe,
  Smartphone,
  Target,
  Settings,
  Users,
  BarChart3,
} from "lucide-react";
import { useRef } from "react";
import { Section, SectionHeader } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { packages } from "@/lib/constants";
import { cn } from "@/lib/utils";

const tierIcons: Record<string, React.ElementType> = {
  bronze: Zap,
  silver: Star,
  gold: Crown,
};

const tierColors: Record<string, { gradient: string; border: string; glow: string; badge: string; text: string }> = {
  bronze: {
    gradient: "from-amber-900/30 via-amber-800/10 to-transparent",
    border: "border-amber-700/40",
    glow: "bg-amber-600/30",
    badge: "bg-gradient-to-r from-amber-600 to-amber-500",
    text: "text-amber-400",
  },
  silver: {
    gradient: "from-slate-400/30 via-slate-500/10 to-transparent",
    border: "border-slate-400/40",
    glow: "bg-slate-400/30",
    badge: "bg-gradient-to-r from-slate-400 to-slate-300",
    text: "text-slate-300",
  },
  gold: {
    gradient: "from-yellow-500/30 via-yellow-600/10 to-transparent",
    border: "border-yellow-500/40",
    glow: "bg-yellow-500/30",
    badge: "bg-gradient-to-r from-yellow-500 to-yellow-400",
    text: "text-yellow-400",
  },
};

function PackageDetailCard({
  pkg,
  index,
}: {
  pkg: (typeof packages)[0];
  index: number;
}) {
  const TierIcon = tierIcons[pkg.tier] || Star;
  const colors = tierColors[pkg.tier] || tierColors.silver;
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <motion.div
      ref={ref}
      id={pkg.id}
      initial={{ opacity: 0, y: 80 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="relative"
    >
      {/* Background glow */}
      <motion.div
        className={cn("absolute -inset-4 rounded-3xl blur-3xl -z-10", colors.glow)}
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 0.3 } : {}}
        transition={{ duration: 1, delay: 0.3 }}
      />

      <div
        className={cn(
          "relative rounded-3xl border p-8 md:p-12 bg-gradient-to-br",
          colors.gradient,
          colors.border,
          pkg.popular && "ring-2 ring-red-600/50"
        )}
      >
        {/* Popular badge */}
        {pkg.popular && (
          <div className="absolute -top-4 right-8">
            <span className="px-6 py-2 bg-red-600 text-white text-sm font-semibold rounded-full shadow-lg shadow-red-600/40">
              Recommended
            </span>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left column - Info */}
          <div>
            {/* Header */}
            <div className="flex items-start gap-4 mb-6">
              <motion.div
                className={cn("p-4 rounded-2xl", colors.badge)}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.3 }}
              >
                <TierIcon size={28} className="text-black" />
              </motion.div>
              <div>
                <span className={cn("text-sm font-medium uppercase tracking-wider", colors.text)}>
                  Package 0{index + 1}
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-white mt-1">{pkg.name}</h2>
                <p className="text-lg text-white/60 mt-2">{pkg.subtitle}</p>
              </div>
            </div>

            {/* Price */}
            <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10">
              {pkg.price === "Custom" ? (
                <div>
                  <span className="text-5xl font-bold text-white">Custom</span>
                  <p className="text-white/60 mt-2">{pkg.period}</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-white/60">{pkg.currency}</span>
                    <span className="text-5xl font-bold text-white">{pkg.price}</span>
                    <span className="text-white/60">/ {pkg.period}</span>
                  </div>
                  {pkg.minimumCommitment && (
                    <p className="text-sm text-white/50 mt-2">{pkg.minimumCommitment}</p>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <p className="text-lg text-white/70 leading-relaxed mb-8">
              {pkg.description}
            </p>

            {/* Ideal For */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-white/90 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users size={16} className="text-red-500" />
                Ideal For
              </h4>
              <div className="flex flex-wrap gap-2">
                {pkg.idealFor.map((item, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-full bg-white/10 text-sm text-white/70 border border-white/5"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-wrap gap-4">
              <Link href="/booking">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button size="lg">
                    Get Started
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </motion.div>
              </Link>
              <Link href="/contact">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button variant="secondary" size="lg">
                    Contact Us
                  </Button>
                </motion.div>
              </Link>
            </div>
          </div>

          {/* Right column - Features */}
          <div>
            <h4 className="text-sm font-semibold text-white/90 uppercase tracking-wider mb-6 flex items-center gap-2">
              <BarChart3 size={16} className="text-red-500" />
              What&apos;s Included
            </h4>

            <div className="space-y-6">
              {pkg.features.map((feature, featureIndex) => (
                <motion.div
                  key={featureIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + featureIndex * 0.1 }}
                  className="p-5 rounded-xl bg-white/5 border border-white/10"
                >
                  <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    {feature.category}
                  </h5>
                  <ul className="space-y-2">
                    {feature.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start gap-3 text-sm text-white/60">
                        <Check size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>

            {/* Note */}
            {pkg.note && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.8 }}
                className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
              >
                <p className="text-sm text-amber-400/90 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {pkg.note}
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ComparisonTable() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const features = [
    { name: "Professional Reels Videos", p1: "3/month", p2: true, p3: true },
    { name: "Photography Session", p1: "Monthly", p2: true, p3: true },
    { name: "Drone Footage", p1: true, p2: true, p3: true },
    { name: "Graphic Design", p1: true, p2: true, p3: true },
    { name: "Paid Ads Management", p1: true, p2: true, p3: true },
    { name: "Full Production Team", p1: true, p2: true, p3: true },
    { name: "Website Development", p1: false, p2: true, p3: true },
    { name: "Custom UI/UX Design", p1: false, p2: true, p3: true },
    { name: "SEO & Analytics", p1: false, p2: true, p3: true },
    { name: "Website Management", p1: false, p2: false, p3: true },
    { name: "Mobile App Development", p1: false, p2: false, p3: true },
    { name: "Full Ecosystem Integration", p1: false, p2: false, p3: true },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8 }}
      className="overflow-x-auto"
    >
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-white/10">
            <th className="text-left py-4 px-4 text-white/60 font-medium">Features</th>
            <th className="py-4 px-4 text-center">
              <div className="flex flex-col items-center">
                <Zap size={20} className="text-amber-500 mb-1" />
                <span className="text-amber-400 font-semibold">Package 01</span>
              </div>
            </th>
            <th className="py-4 px-4 text-center">
              <div className="flex flex-col items-center">
                <Star size={20} className="text-slate-300 mb-1" />
                <span className="text-slate-300 font-semibold">Package 02</span>
                <span className="text-xs text-red-500 mt-1">Popular</span>
              </div>
            </th>
            <th className="py-4 px-4 text-center">
              <div className="flex flex-col items-center">
                <Crown size={20} className="text-yellow-400 mb-1" />
                <span className="text-yellow-400 font-semibold">Package 03</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature, index) => (
            <motion.tr
              key={feature.name}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="border-b border-white/5 hover:bg-white/5 transition-colors"
            >
              <td className="py-4 px-4 text-white/80">{feature.name}</td>
              <td className="py-4 px-4 text-center">
                {feature.p1 === true ? (
                  <Check size={18} className="text-green-500 mx-auto" />
                ) : feature.p1 === false ? (
                  <span className="text-white/20">-</span>
                ) : (
                  <span className="text-white/60 text-sm">{feature.p1}</span>
                )}
              </td>
              <td className="py-4 px-4 text-center bg-red-600/5">
                {feature.p2 === true ? (
                  <Check size={18} className="text-green-500 mx-auto" />
                ) : feature.p2 === false ? (
                  <span className="text-white/20">-</span>
                ) : (
                  <span className="text-white/60 text-sm">{feature.p2}</span>
                )}
              </td>
              <td className="py-4 px-4 text-center">
                {feature.p3 === true ? (
                  <Check size={18} className="text-green-500 mx-auto" />
                ) : feature.p3 === false ? (
                  <span className="text-white/20">-</span>
                ) : (
                  <span className="text-white/60 text-sm">{feature.p3}</span>
                )}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

export default function PackagesPage() {
  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-neutral-950 to-black relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[150px]"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-600/10 rounded-full blur-[120px]"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.4, 0.2, 0.4],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="mx-auto px-6 md:px-8 lg:px-12 max-w-7xl relative z-10">
          <div className="max-w-3xl">
            <motion.span
              className="inline-block text-red-500 font-medium mb-4 tracking-wider uppercase text-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Brand 360 Packages
            </motion.span>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="text-red-500">P</span>
              <span className="text-white">ackages</span>
            </h1>
            <motion.p
              className="text-xl text-white/60 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Integrated 360° Marketing & Digital Production Solutions designed to
              support businesses at different growth stages - from strong visual
              presence to a complete digital ecosystem.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Quick Navigation */}
      <section className="py-8 bg-black border-b border-white/10 sticky top-16 z-40 backdrop-blur-lg bg-black/80">
        <div className="mx-auto px-6 md:px-8 lg:px-12 max-w-7xl">
          <div className="flex flex-wrap justify-center gap-4">
            {packages.map((pkg, index) => {
              const TierIcon = tierIcons[pkg.tier] || Star;
              const colors = tierColors[pkg.tier] || tierColors.silver;
              return (
                <Link key={pkg.id} href={`#${pkg.id}`}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full border transition-colors",
                      colors.border,
                      "hover:bg-white/5"
                    )}
                  >
                    <TierIcon size={16} className={colors.text} />
                    <span className="text-sm text-white/80">Package 0{index + 1}</span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Package Details */}
      <Section className="bg-black">
        <div className="space-y-24">
          {packages.map((pkg, index) => (
            <PackageDetailCard key={pkg.id} pkg={pkg} index={index} />
          ))}
        </div>
      </Section>

      {/* Comparison Table */}
      <Section className="bg-gradient-to-b from-black to-neutral-950">
        <SectionHeader
          subtitle="Compare"
          title="Feature Comparison"
          description="See what&apos;s included in each package at a glance."
        />
        <div className="bg-white/5 rounded-2xl border border-white/10 p-6 md:p-8">
          <ComparisonTable />
        </div>
      </Section>

      {/* General Notes */}
      <Section className="bg-neutral-950">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="p-8 rounded-2xl bg-white/5 border border-white/10"
          >
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-3">
              <Settings size={20} className="text-red-500" />
              General Notes
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                <span>All packages are managed and delivered by <strong className="text-white">PMP - Paxala Media Production</strong></span>
              </li>
              <li className="flex items-start gap-3 text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                <span>Every project is customized to the client&apos;s brand identity and goals</span>
              </li>
              <li className="flex items-start gap-3 text-white/70">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                <span>Pricing reflects professional team, high-end production, and strategic long-term management</span>
              </li>
            </ul>
          </motion.div>
        </div>
      </Section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-r from-red-600 to-red-700 relative overflow-hidden">
        {/* Animated background */}
        <motion.div
          className="absolute inset-0 opacity-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
        <motion.div
          className="absolute w-96 h-96 bg-white/10 rounded-full blur-[100px]"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          style={{ left: "10%", top: "20%" }}
        />
        <motion.div
          className="absolute w-80 h-80 bg-white/10 rounded-full blur-[80px]"
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          style={{ right: "15%", bottom: "10%" }}
        />

        <div className="mx-auto px-6 md:px-8 lg:px-12 max-w-7xl relative z-10">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <motion.h2
              className="text-4xl md:text-5xl font-bold text-white mb-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Ready to Elevate Your Brand?
            </motion.h2>
            <motion.p
              className="text-xl text-white/80 mb-10"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Let&apos;s discuss which package is right for your business. Our team
              is ready to create a customized solution for your needs.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Link href="/booking">
                <motion.div
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="xl"
                    className="bg-white text-red-600 hover:bg-white/90"
                  >
                    Book a Consultation
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </motion.div>
              </Link>
              <Link href="/contact">
                <motion.div
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="xl"
                    variant="secondary"
                    className="border-white/30 hover:bg-white/10"
                  >
                    Contact Us
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
