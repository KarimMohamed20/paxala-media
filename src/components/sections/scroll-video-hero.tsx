"use client";

import { useEffect, useState, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
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

import { useLocale } from "next-intl";

// ... existing imports ...

// ... AnimatedCounter and TextRevealHeading components remain same ...

interface HeroContent {
  [key: string]: any; // Allow indexing
  heroBadgeEn?: string;
  heroBadgeAr?: string;
  heroBadgeHe?: string;
  // ... add other specific keys if needed or rely on dynamic access
}

// Media query gating the heavy hero video: wide viewport AND motion allowed.
const HERO_VIDEO_MEDIA_QUERY =
  "(min-width: 768px) and (prefers-reduced-motion: no-preference)";

function subscribeHeroVideoMedia(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(HERO_VIDEO_MEDIA_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getHeroVideoMediaSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(HERO_VIDEO_MEDIA_QUERY).matches;
}

export function ScrollVideoHero({ content }: { content?: HeroContent | null }) {
  const locale = useLocale();

  // Only mount the (still multi-MB) background video on larger screens where the
  // user hasn't asked for reduced motion. Mobile + reduced-motion visitors get the
  // lightweight poster image only — avoids shipping the hero video on the mobile
  // networks this audience uses, and honours prefers-reduced-motion (PERF-01 / A11Y-02).
  // SSR snapshot is `false`, so the server renders the poster only (no hydration flash).
  const enableVideo = useSyncExternalStore(
    subscribeHeroVideoMedia,
    getHeroVideoMediaSnapshot,
    () => false
  );

  // Helper to get localized content
  const getLocalized = (key: string, defaultValue: string) => {
    if (!content) return defaultValue;
    const localeKey = `${key}${locale.charAt(0).toUpperCase() + locale.slice(1)}`;
    return content[localeKey] || content[`${key}En`] || defaultValue;
  };

  // Helper for array content (stats)
  const getLocalizedArray = (key: string, defaultValue: any[]) => {
    if (!content) return defaultValue;
    const localeKey = `${key}${locale.charAt(0).toUpperCase() + locale.slice(1)}`;
    const val = content[localeKey];
    return Array.isArray(val) && val.length > 0 ? val : (content[`${key}En`] || defaultValue);
  };

  const badge = getLocalized("heroBadge", "Creative Production Studio");
  const heading = getLocalized("heroHeading", "Paxala Media Production");
  const slogan = getLocalized("heroSlogan", "From Vision to Visual");
  const subtitle1 = getLocalized("heroSubtitle1", "Bringing brands to life through impactful visual storytelling.");
  const subtitle2 = getLocalized("heroSubtitle2", "Video production, photography, design, and development under one roof.");

  const stats = getLocalizedArray("heroStats", [
    { value: "1000+", label: "Projects Completed" },
    { value: "200+", label: "Happy Clients" },
    { value: "8+", label: "Services Offered" },
    { value: "10+", label: "Years Experience" },
  ]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Poster image — the LCP element. Lightweight (~100KB) and shown on every
          device immediately; on mobile/reduced-motion it's the only hero media. */}
      <img
        src="/videos/hero-poster.jpg"
        alt=""
        aria-hidden="true"
        className="absolute top-0 left-0 w-full h-full object-cover"
      />

      {/* Looping video background — desktop only, ~2MB optimized file, deferred
          (preload="none") so it never blocks first paint. */}
      {enableVideo && (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster="/videos/hero-poster.jpg"
          className="absolute top-0 left-0 w-full h-full object-cover"
        >
          <source src="/videos/video-optimized.mp4" type="video/mp4" />
          <source src="/videos/video.mp4" type="video/mp4" />
        </video>
      )}

      {/* Dark overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />

      {/* Bottom gradient fade to black - creates seamless transition to Services section */}
      <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-b from-transparent to-black pointer-events-none z-10" />

      {/* Content Overlay */}
      <div className="relative z-20 h-full flex items-center justify-center">
        <div className="mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 max-w-7xl">
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
              {stats.map((stat: { value: string, label: string }, index: number) => (
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
        </div>
      </div>

      {/* Scroll Indicator with enhanced animation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30"
      >
        <motion.div
          className="flex flex-col items-center gap-2 text-white/60 cursor-pointer"
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
    </section>
  );
}
