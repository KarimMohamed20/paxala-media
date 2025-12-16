"use client";

import { motion, useInView, Variants, HTMLMotionProps } from "framer-motion";
import { useRef, ReactNode } from "react";
import {
  fadeUp,
  fadeIn,
  scaleIn,
  slideInLeft,
  slideInRight,
  slideInUp,
} from "@/lib/animation-variants";

type AnimationType =
  | "fadeUp"
  | "fadeIn"
  | "scaleIn"
  | "slideInLeft"
  | "slideInRight"
  | "slideInUp"
  | "custom";

const animationMap: Record<Exclude<AnimationType, "custom">, Variants> = {
  fadeUp,
  fadeIn,
  scaleIn,
  slideInLeft,
  slideInRight,
  slideInUp,
};

interface AnimateOnScrollProps extends Omit<HTMLMotionProps<"div">, "variants"> {
  children: ReactNode;
  animation?: AnimationType;
  variants?: Variants;
  delay?: number;
  duration?: number;
  once?: boolean;
  amount?: number;
  margin?: `${number}px` | `${number}%` | `${number}px ${number}px` | `${number}px ${number}px ${number}px ${number}px`;
  className?: string;
}

export function AnimateOnScroll({
  children,
  animation = "fadeUp",
  variants,
  delay = 0,
  duration,
  once = true,
  amount = 0.3,
  margin,
  className,
  ...props
}: AnimateOnScrollProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount, margin: margin as `${number}px` | undefined });

  const selectedVariants = animation === "custom" && variants
    ? variants
    : animationMap[animation as Exclude<AnimationType, "custom">];

  // Apply custom delay/duration if provided
  const customVariants: Variants = {
    hidden: selectedVariants.hidden,
    visible: {
      ...selectedVariants.visible,
      transition: {
        ...(typeof selectedVariants.visible === "object" &&
        "transition" in selectedVariants.visible
          ? selectedVariants.visible.transition
          : {}),
        delay,
        ...(duration ? { duration } : {}),
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={customVariants}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Convenient preset components
export function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <AnimateOnScroll animation="fadeUp" delay={delay} className={className}>
      {children}
    </AnimateOnScroll>
  );
}

export function SlideInLeft({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <AnimateOnScroll animation="slideInLeft" delay={delay} className={className}>
      {children}
    </AnimateOnScroll>
  );
}

export function SlideInRight({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <AnimateOnScroll animation="slideInRight" delay={delay} className={className}>
      {children}
    </AnimateOnScroll>
  );
}

export function ScaleIn({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <AnimateOnScroll animation="scaleIn" delay={delay} className={className}>
      {children}
    </AnimateOnScroll>
  );
}
