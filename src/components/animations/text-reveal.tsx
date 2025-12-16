"use client";

import { motion, useInView, Variants } from "framer-motion";
import { useRef } from "react";

interface TextRevealProps {
  children: string;
  className?: string;
  delay?: number;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
  type?: "letters" | "words" | "lines";
  staggerDelay?: number;
}

const letterVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 50,
    rotateX: -80,
  },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 12,
    }
  },
};

const wordVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 40,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
    }
  },
};

export function TextReveal({
  children,
  className = "",
  delay = 0,
  as: Component = "span",
  type = "words",
  staggerDelay = 0.03,
}: TextRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  const items = type === "letters" ? children.split("") : children.split(" ");
  const variants = type === "letters" ? letterVariants : wordVariants;

  return (
    <Component ref={ref} className={className}>
      <span className="sr-only">{children}</span>
      <motion.span
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        aria-hidden
        className="inline-flex flex-wrap"
        transition={{ delayChildren: delay, staggerChildren: staggerDelay }}
      >
        {items.map((item, i) => (
          <motion.span
            key={i}
            variants={variants}
            className="inline-block"
            style={{
              whiteSpace: type === "letters" ? "pre" : "normal",
              marginRight: type === "words" ? "0.25em" : 0,
            }}
          >
            {item}
          </motion.span>
        ))}
      </motion.span>
    </Component>
  );
}

// Simpler line-by-line reveal for paragraphs
interface LineRevealProps {
  children: string;
  className?: string;
  delay?: number;
}

export function LineReveal({ children, className = "", delay = 0 }: LineRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <span ref={ref} className={`overflow-hidden inline-block ${className}`}>
      <motion.span
        initial={{ y: "100%", opacity: 0 }}
        animate={isInView ? { y: 0, opacity: 1 } : { y: "100%", opacity: 0 }}
        transition={{
          duration: 0.6,
          delay,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        className="inline-block"
      >
        {children}
      </motion.span>
    </span>
  );
}

// Animated heading component with built-in styling
interface AnimatedHeadingProps {
  children: string;
  className?: string;
  highlightFirst?: boolean;
  highlightColor?: string;
  delay?: number;
}

export function AnimatedHeading({
  children,
  className = "",
  highlightFirst = true,
  highlightColor = "text-red-500",
  delay = 0,
}: AnimatedHeadingProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const words = children.split(" ");

  return (
    <span ref={ref} className={className}>
      <motion.span
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        className="inline-flex flex-wrap"
        transition={{ delayChildren: delay, staggerChildren: 0.08 }}
      >
        {words.map((word, i) => (
          <motion.span
            key={i}
            variants={wordVariants}
            className={`inline-block mr-[0.25em] ${
              highlightFirst && i === 0 ? highlightColor : ""
            }`}
          >
            {word}
          </motion.span>
        ))}
      </motion.span>
    </span>
  );
}
