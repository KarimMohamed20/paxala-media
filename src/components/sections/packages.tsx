"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform, useInView } from "framer-motion";
import {
  Video,
  Camera,
  Palette,
  Globe,
  Smartphone,
  Target,
  Settings,
  Check,
  ArrowRight,
  Star,
  Zap,
  Crown,
} from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { packages } from "@/lib/constants";
import { cn } from "@/lib/utils";

const tierIcons: Record<string, React.ElementType> = {
  base: Zap,
  plus: Star,
  infinite: Crown,
};

const tierColors: Record<string, { bg: string; border: string; glow: string; badge: string }> = {
  base: {
    bg: "from-red-700/30 to-red-800/10",
    border: "border-red-600/40 hover:border-red-500/60",
    glow: "bg-red-600/25",
    badge: "bg-red-600",
  },
  plus: {
    bg: "from-gray-500/30 to-gray-600/10",
    border: "border-gray-500/40 hover:border-gray-400/60",
    glow: "bg-gray-500/25",
    badge: "bg-gray-500",
  },
  infinite: {
    bg: "from-amber-500/30 to-amber-600/10",
    border: "border-amber-500/40 hover:border-amber-400/60",
    glow: "bg-amber-500/25",
    badge: "bg-amber-500",
  },
};

function PackageCard({
  pkg,
  index,
  isHovered,
  onHover,
  onLeave,
}: {
  pkg: (typeof packages)[0];
  index: number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const TierIcon = tierIcons[pkg.tier] || Star;
  const colors = tierColors[pkg.tier] || tierColors.plus;
  const cardRef = useRef<HTMLDivElement>(null);

  // Motion values for 3D tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring config for smooth movement
  const springConfig = { damping: 25, stiffness: 200 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), springConfig);

  // Handle mouse movement for 3D effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
    onLeave();
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 60, scale: 0.9 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{
        duration: 0.7,
        delay: index * 0.2,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: 1200,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={onHover}
      onMouseLeave={handleMouseLeave}
      className="relative group h-full"
    >
      <motion.div
        className={cn(
          "relative h-full p-6 md:p-8 rounded-2xl border transition-all duration-500",
          `bg-gradient-to-b ${colors.bg}`,
          colors.border
        )}
        style={{ transformStyle: "preserve-3d" }}
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.3 }}
      >
        {/* Glowing effect on hover */}
        <motion.div
          className={cn("absolute inset-0 rounded-2xl blur-xl -z-10", colors.glow)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: isHovered ? 0.6 : 0, scale: isHovered ? 1.1 : 0.8 }}
          transition={{ duration: 0.4 }}
        />

        {/* Header */}
        <div className="mb-6" style={{ transform: "translateZ(30px)" }}>
          <div className="flex items-center gap-3 mb-3">
            <motion.div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                colors.badge
              )}
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
            >
              <TierIcon size={20} className="text-black" />
            </motion.div>
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white">{pkg.name}</h3>
              <p className="text-xs md:text-sm text-white/60">{pkg.subtitle}</p>
            </div>
          </div>

          {/* Price */}
          <div className="mt-4">
            {pkg.price === "Custom" ? (
              <div>
                <span className="text-3xl md:text-4xl font-bold text-white">Custom</span>
                <p className="text-sm text-white/60 mt-1">{pkg.period}</p>
              </div>
            ) : (
              <div>
                <span className="text-sm text-white/60">{pkg.currency}</span>
                <span className="text-3xl md:text-4xl font-bold text-white ml-1">{pkg.price}</span>
                <span className="text-sm text-white/60 ml-2">/ {pkg.period}</span>
                {pkg.minimumCommitment && (
                  <p className="text-xs text-white/50 mt-1">{pkg.minimumCommitment}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-white/70 mb-6 leading-relaxed" style={{ transform: "translateZ(20px)" }}>
          {pkg.description}
        </p>

        {/* Features */}
        <div className="space-y-4 mb-6" style={{ transform: "translateZ(15px)" }}>
          {pkg.features.map((feature, featureIndex) => (
            <div key={featureIndex}>
              <h4 className="text-xs font-semibold text-white/90 uppercase tracking-wider mb-2">
                {feature.category}
              </h4>
              <ul className="space-y-1.5">
                {feature.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex items-start gap-2 text-sm text-white/60">
                    <Check size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Note */}
        {pkg.note && (
          <p className="text-xs text-amber-400/80 mb-4 italic" style={{ transform: "translateZ(10px)" }}>
            * {pkg.note}
          </p>
        )}

        {/* CTA Button */}
        <div style={{ transform: "translateZ(25px)" }}>
          <Link href="/booking">
            <Button
              variant="outline"
              className="w-full group/btn border-white/20 hover:bg-white/10"
            >
              Get Started
              <motion.span
                className="inline-block ml-2"
                initial={{ x: 0 }}
                whileHover={{ x: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <ArrowRight size={16} />
              </motion.span>
            </Button>
          </Link>
        </div>

        {/* Shine effect on hover */}
        <motion.div
          className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            initial={{ x: "-100%" }}
            animate={isHovered ? { x: "100%" } : { x: "-100%" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function PackagesSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  return (
    <Section className="bg-black relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-1/3 -left-32 w-96 h-96 bg-red-600/10 rounded-full blur-[120px]"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/3 -right-32 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px]"
          animate={{
            scale: [1.3, 1, 1.3],
            opacity: [0.4, 0.2, 0.4],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/5 rounded-full blur-[150px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div ref={sectionRef}>
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <SectionHeader
            subtitle="Brand 360 Packages"
            title="Packages"
            description="Integrated 360° Marketing & Digital Production Solutions designed to support businesses at different growth stages."
          />
        </motion.div>

        {/* Packages Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {packages.map((pkg, index) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              index={index}
              isHovered={hoveredIndex === index}
              onHover={() => setHoveredIndex(index)}
              onLeave={() => setHoveredIndex(null)}
            />
          ))}
        </div>

        {/* Bottom Notes */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-12 md:mt-16 text-center"
        >
          <div className="max-w-2xl mx-auto space-y-3">
            <p className="text-sm text-white/50">
              All packages are managed and delivered by <span className="text-white/70 font-medium">PMP - Paxala Media Production</span>
            </p>
            <p className="text-sm text-white/50">
              Every project is customized to the client&apos;s brand identity and goals
            </p>
          </div>

          <Link href="/packages" className="inline-block mt-8">
            <motion.span
              className="inline-flex items-center gap-2 text-red-500 hover:text-red-400 font-medium transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              View Package Details
              <motion.span
                className="inline-block"
                initial={{ x: 0 }}
                whileHover={{ x: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <ArrowRight size={18} />
              </motion.span>
            </motion.span>
          </Link>
        </motion.div>
      </div>
    </Section>
  );
}
