"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform, useInView } from "framer-motion";
import {
  Video,
  Camera,
  Palette,
  Box,
  Code,
  Smartphone,
  Share2,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";
import { services } from "@/lib/constants";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  Video,
  Camera,
  Palette,
  Box,
  Code,
  Smartphone,
  Share2,
  Lightbulb,
};

// 3D Card component with tilt effect
function ServiceCard({
  service,
  index,
  isHovered,
  onHover,
  onLeave,
}: {
  service: (typeof services)[0];
  index: number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const Icon = iconMap[service.icon] || Box;
  const cardRef = useRef<HTMLDivElement>(null);

  // Motion values for 3D tilt
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Spring config for smooth movement
  const springConfig = { damping: 20, stiffness: 300 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), springConfig);

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
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 0.7,
        delay: index * 0.15,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: 1000,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={onHover}
      onMouseLeave={handleMouseLeave}
      className="relative group"
    >
      <Link href={`/services#${service.id}`}>
        <motion.div
          className={cn(
            "relative h-full p-5 md:p-6 lg:p-8 rounded-2xl border transition-colors duration-500",
            isHovered
              ? "bg-red-600 border-red-600"
              : "bg-white/5 border-white/10"
          )}
          style={{ transformStyle: "preserve-3d" }}
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.3 }}
        >
          {/* Glowing effect on hover */}
          <motion.div
            className="absolute inset-0 rounded-2xl bg-red-600/20 blur-xl -z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1.1 : 0.8 }}
            transition={{ duration: 0.4 }}
          />

          {/* Icon with animation */}
          <motion.div
            className={cn(
              "w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-4 md:mb-6 transition-colors duration-500",
              isHovered ? "bg-white/20" : "bg-red-600/10"
            )}
            style={{ transform: "translateZ(40px)" }}
            whileHover={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={isHovered ? {
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0],
              } : {}}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <Icon
                size={24}
                className={cn(
                  "md:w-7 md:h-7 transition-colors duration-500",
                  isHovered ? "text-white" : "text-red-500"
                )}
              />
            </motion.div>
          </motion.div>

          {/* Content with depth */}
          <motion.div style={{ transform: "translateZ(20px)" }}>
            <h3
              className={cn(
                "text-lg md:text-xl font-semibold mb-2 md:mb-3 transition-colors duration-500",
                isHovered ? "text-white" : "text-white"
              )}
            >
              {service.name}
            </h3>
            <p
              className={cn(
                "text-xs md:text-sm leading-relaxed transition-colors duration-500",
                isHovered ? "text-white/90" : "text-white/60"
              )}
            >
              {service.description}
            </p>
          </motion.div>

          {/* Arrow with slide-in animation */}
          <motion.div
            className="absolute bottom-5 right-5 md:bottom-6 md:right-6 lg:bottom-8 lg:right-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{
              opacity: isHovered ? 1 : 0,
              x: isHovered ? 0 : -20,
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{ transform: "translateZ(30px)" }}
          >
            <motion.div
              animate={isHovered ? { x: [0, 5, 0] } : {}}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowRight size={20} className="text-white" />
            </motion.div>
          </motion.div>

          {/* Shine effect on hover */}
          <motion.div
            className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              initial={{ x: "-100%" }}
              animate={isHovered ? { x: "100%" } : { x: "-100%" }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

export function ServicesSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  return (
    <Section className="bg-black relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-1/4 -left-32 w-64 h-64 bg-red-600/10 rounded-full blur-[100px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-32 w-64 h-64 bg-red-600/10 rounded-full blur-[100px]"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div ref={sectionRef}>
        {/* Enhanced Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <SectionHeader
            subtitle="What We Do"
            title="Our Services"
            description="Comprehensive creative solutions tailored for today's fast-paced, digital-first world."
          />
        </motion.div>

        {/* Services Grid with stagger */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.15,
                delayChildren: 0.2,
              },
            },
          }}
        >
          {services.map((service, index) => (
            <ServiceCard
              key={service.id}
              service={service}
              index={index}
              isHovered={hoveredIndex === index}
              onHover={() => setHoveredIndex(index)}
              onLeave={() => setHoveredIndex(null)}
            />
          ))}
        </motion.div>

        {/* View All Link with enhanced animation */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-8 md:mt-10 lg:mt-12"
        >
          <Link href="/services">
            <motion.span
              className="inline-flex items-center gap-2 text-red-500 hover:text-red-400 font-medium transition-colors group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              View All Services
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
