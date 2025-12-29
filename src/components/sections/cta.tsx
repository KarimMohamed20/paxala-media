"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, Calendar, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// Floating particle component
function FloatingParticle({
  delay,
  duration,
  size,
  startX,
  startY,
}: {
  delay: number;
  duration: number;
  size: number;
  startX: string;
  startY: string;
}) {
  return (
    <motion.div
      className="absolute rounded-full bg-white/20"
      style={{
        width: size,
        height: size,
        left: startX,
        top: startY,
      }}
      animate={{
        y: [0, -100, 0],
        x: [0, Math.random() * 40 - 20, 0],
        opacity: [0, 0.6, 0],
        scale: [0.5, 1, 0.5],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

// Animated word reveal component
function AnimatedHeading({ text }: { text: string }) {
  const words = text.split(" ");

  return (
    <motion.h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-4 md:mb-6">
      {words.map((word, index) => (
        <motion.span
          key={index}
          className="inline-block mr-3"
          initial={{ opacity: 0, y: 50, rotateX: -90 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.6,
            delay: index * 0.1,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.h2>
  );
}

interface CTAContent {
  ctaBadge?: string;
  ctaHeading?: string;
  ctaSubtitle?: string;
}

export function CTASection({ content }: { content?: CTAContent | null }) {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });

  // Default values
  const badge = content?.ctaBadge || "Let's Create Together";
  const heading = content?.ctaHeading || "Ready to Bring Your Vision to Life?";
  const subtitle = content?.ctaSubtitle || "Let's create something amazing together. Book a consultation or get in touch to discuss your next project.";

  // Mouse position for parallax effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 30, stiffness: 100 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);

  // Transform mouse position to gradient position
  const gradientX = useTransform(smoothMouseX, [-0.5, 0.5], [30, 70]);
  const gradientY = useTransform(smoothMouseY, [-0.5, 0.5], [30, 70]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5);
      const y = (e.clientY / window.innerHeight - 0.5);
      mouseX.set(x);
      mouseY.set(y);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  // Generate floating particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    delay: i * 0.3,
    duration: 4 + Math.random() * 4,
    size: 4 + Math.random() * 8,
    startX: `${Math.random() * 100}%`,
    startY: `${80 + Math.random() * 20}%`,
  }));

  return (
    <section
      ref={sectionRef}
      className="relative py-20 md:py-28 lg:py-32 overflow-hidden"
    >
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, rgb(220 38 38) 0%, rgb(185 28 28) 50%, rgb(153 27 27) 100%)`,
        }}
      >
        {/* Moving gradient overlay */}
        <motion.div
          className="absolute inset-0 opacity-50"
          animate={{
            background: [
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 70% 70%, rgba(255,255,255,0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 30% 70%, rgba(255,255,255,0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 70% 30%, rgba(255,255,255,0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 50%)",
            ],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Animated pattern overlay */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 1 }}
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* Animated glow orbs */}
        <motion.div
          className="absolute w-[400px] h-[400px] bg-white/10 rounded-full blur-[100px]"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ left: "10%", top: "20%" }}
        />
        <motion.div
          className="absolute w-[300px] h-[300px] bg-white/10 rounded-full blur-[80px]"
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1.2, 1, 1.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ right: "15%", bottom: "10%" }}
        />
      </motion.div>

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((particle) => (
          <FloatingParticle key={particle.id} {...particle} />
        ))}
      </div>

      {/* Animated lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
            style={{
              width: "100%",
              top: `${30 + i * 20}%`,
            }}
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              duration: 8,
              delay: i * 2,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 max-w-7xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Sparkle badge */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm text-white/90 mb-6 backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles size={16} />
            </motion.div>
            {badge}
          </motion.div>

          {/* Animated heading */}
          <AnimatedHeading text={heading} />

          {/* Subtitle with fade up */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-lg md:text-xl text-white/80 mb-8 md:mb-10 max-w-2xl mx-auto"
          >
            {subtitle}
          </motion.p>

          {/* Buttons with stagger */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/booking">
              <motion.div
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Button
                  size="xl"
                  className="bg-white text-red-600 hover:bg-white/90 group relative overflow-hidden"
                >
                  {/* Button shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-red-100 to-transparent opacity-0 group-hover:opacity-100"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6 }}
                  />
                  <Calendar size={20} className="mr-2 relative z-10" />
                  <span className="relative z-10">Book a Consultation</span>
                  <motion.span
                    className="ml-2 relative z-10 inline-block"
                    initial={{ x: 0 }}
                    whileHover={{ x: 5 }}
                  >
                    <ArrowRight size={18} />
                  </motion.span>
                </Button>
              </motion.div>
            </Link>
            <Link href="/contact">
              <motion.div
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Button
                  size="xl"
                  variant="secondary"
                  className="border-white/30 hover:bg-white/10 group"
                >
                  <MessageSquare size={20} className="mr-2" />
                  Contact Us
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          {/* Decorative bottom element */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={isInView ? { opacity: 1, scaleX: 1 } : {}}
            transition={{ duration: 0.8, delay: 1 }}
            className="mt-12 md:mt-16 flex items-center justify-center gap-4"
          >
            <motion.div
              className="h-px w-16 bg-gradient-to-r from-transparent to-white/40"
              animate={{ scaleX: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="w-2 h-2 rounded-full bg-white/60"
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.div
              className="h-px w-16 bg-gradient-to-l from-transparent to-white/40"
              animate={{ scaleX: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
