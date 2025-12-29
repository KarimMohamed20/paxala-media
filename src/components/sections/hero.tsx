"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion";
import { ArrowRight, Play, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

// Animated counter component
function AnimatedCounter({ value, delay = 0 }: { value: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const numericValue = parseInt(value.replace(/\D/g, ""));
  const suffix = value.replace(/[0-9]/g, "");
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isInView) {
      const timeout = setTimeout(() => {
        let start = 0;
        const duration = 2000;
        const increment = numericValue / (duration / 16);

        const timer = setInterval(() => {
          start += increment;
          if (start >= numericValue) {
            setCount(numericValue);
            clearInterval(timer);
          } else {
            setCount(Math.floor(start));
          }
        }, 16);

        return () => clearInterval(timer);
      }, delay * 1000);

      return () => clearTimeout(timeout);
    }
  }, [isInView, numericValue, delay]);

  return (
    <span ref={ref}>
      {count}{suffix}
    </span>
  );
}

// Text reveal animation component
function TextRevealHeading({ text }: { text: string }) {
  const words = text.split(" ");
  const firstWord = words[0] || "";
  const remainingWords = words.slice(1);

  return (
    <motion.h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight mb-6 md:mb-8">
      <motion.span
        className="block overflow-hidden"
        initial="hidden"
        animate="visible"
      >
        <motion.span
          className="inline-block"
          initial={{ y: 100, opacity: 0, rotateX: -80 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          transition={{
            duration: 0.8,
            ease: [0.25, 0.1, 0.25, 1],
            delay: 0.2
          }}
        >
          <span className="text-red-500">{firstWord.charAt(0)}</span>
          <span className="text-white">{firstWord.slice(1)}</span>
        </motion.span>
      </motion.span>
      <motion.span className="block overflow-hidden">
        {remainingWords.map((word, i) => (
          <motion.span
            key={word}
            className="inline-block text-white/90 mr-4"
            initial={{ y: 100, opacity: 0, rotateX: -80 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            transition={{
              duration: 0.8,
              ease: [0.25, 0.1, 0.25, 1],
              delay: 0.3 + i * 0.1
            }}
          >
            {word}
          </motion.span>
        ))}
      </motion.span>
    </motion.h1>
  );
}

interface HeroContent {
  heroBadge?: string;
  heroHeading?: string;
  heroSlogan?: string;
  heroSubtitle1?: string;
  heroSubtitle2?: string;
  heroStats?: Array<{ value: string; label: string }>;
}

export function HeroSection({ content }: { content?: HeroContent | null }) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const sectionRef = useRef(null);

  // Default values if content is not provided
  const badge = content?.heroBadge || "Creative Production Studio";
  const heading = content?.heroHeading || "Paxala Media Production";
  const slogan = content?.heroSlogan || "From Vision to Visual";
  const subtitle1 = content?.heroSubtitle1 || "Bringing brands to life through impactful visual storytelling.";
  const subtitle2 = content?.heroSubtitle2 || "Video production, photography, design, and development under one roof.";
  const stats = content?.heroStats || [
    { value: "1000+", label: "Projects Completed" },
    { value: "200+", label: "Happy Clients" },
    { value: "8+", label: "Services Offered" },
    { value: "10+", label: "Years Experience" },
  ];

  // Parallax scroll effect
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  // Smooth spring for mouse movement
  const springConfig = { damping: 25, stiffness: 150 };
  const mouseX = useSpring(0, springConfig);
  const mouseY = useSpring(0, springConfig);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 40;
      const y = (e.clientY / window.innerHeight - 0.5) * 40;
      mouseX.set(x);
      mouseY.set(y);
      setMousePosition({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <motion.section
      ref={sectionRef}
      style={{ opacity, scale }}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-black">
        {/* Animated gradient orbs with parallax */}
        <motion.div
          style={{ x: mouseX, y: mouseY }}
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-red-600/30 rounded-full blur-[150px]"
        />
        <motion.div
          style={{
            x: useTransform(mouseX, v => -v * 0.5),
            y: useTransform(mouseY, v => -v * 0.5)
          }}
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-red-600/20 rounded-full blur-[120px]"
        />
        <motion.div
          style={{
            x: useTransform(mouseX, v => v * 0.3),
            y: useTransform(mouseY, v => v * 0.3)
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-red-500/10 rounded-full blur-[100px]"
        />

        {/* Animated grid pattern */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ duration: 2 }}
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)`,
            backgroundSize: "80px 80px",
          }}
        />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-red-500/40 rounded-full"
            style={{
              left: `${20 + i * 15}%`,
              top: `${30 + (i % 3) * 20}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Content with scroll parallax */}
      <motion.div
        style={{ y }}
        className="relative z-10 mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 max-w-7xl pt-20"
      >
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge with cinematic entrance */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 mb-8 backdrop-blur-sm">
              <motion.span
                className="w-2 h-2 rounded-full bg-red-500"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              {badge}
            </span>
          </motion.div>

          {/* Main Heading with text reveal */}
          <TextRevealHeading text={heading} />

          {/* Slogan */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-xl md:text-2xl lg:text-3xl font-light text-white/80 tracking-wide mb-4"
          >
            {slogan}
          </motion.p>

          {/* Subtitle with staggered words */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="text-base md:text-lg lg:text-xl text-white/60 max-w-2xl mx-auto mb-8 md:mb-12 leading-relaxed px-4"
          >
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="inline-block"
            >
              {subtitle1}
            </motion.span>{" "}
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.85 }}
              className="inline-block"
            >
              {subtitle2}
            </motion.span>
          </motion.p>

          {/* CTA Buttons with hover effects */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/portfolio">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Button size="lg" className="group">
                  View Our Work
                  <motion.span
                    className="ml-2 inline-block"
                    initial={{ x: 0 }}
                    whileHover={{ x: 4 }}
                  >
                    <ArrowRight size={18} />
                  </motion.span>
                </Button>
              </motion.div>
            </Link>
            <Link href="/booking">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Button size="lg" variant="secondary" className="group">
                  <Play size={18} className="mr-2" />
                  Book a Consultation
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          {/* Stats with animated counters */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1, ease: [0.25, 0.1, 0.25, 1] }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mt-12 md:mt-20 pt-8 md:pt-12 border-t border-white/10"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className="text-center"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.2 + index * 0.1 }}
              >
                <motion.div
                  className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1 md:mb-2"
                  whileHover={{ scale: 1.1, color: "#ef4444" }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <AnimatedCounter value={stat.value} delay={1.3 + index * 0.15} />
                </motion.div>
                <motion.div
                  className="text-xs md:text-sm text-white/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 + index * 0.1 }}
                >
                  {stat.label}
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll Indicator with enhanced animation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          className="flex flex-col items-center gap-2 text-white/40 cursor-pointer"
          whileHover={{ scale: 1.1 }}
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}
        >
          <motion.span
            className="text-xs uppercase tracking-wider"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Scroll
          </motion.span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown size={20} />
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
