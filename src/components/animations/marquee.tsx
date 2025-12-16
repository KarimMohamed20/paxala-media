"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface MarqueeProps {
  children: ReactNode;
  speed?: number;
  direction?: "left" | "right";
  pauseOnHover?: boolean;
  className?: string;
}

export function Marquee({
  children,
  speed = 30,
  direction = "left",
  pauseOnHover = true,
  className = "",
}: MarqueeProps) {
  const directionMultiplier = direction === "left" ? -1 : 1;

  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{ maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)" }}
    >
      <motion.div
        className={`flex gap-8 ${pauseOnHover ? "hover:[animation-play-state:paused]" : ""}`}
        animate={{
          x: [0, directionMultiplier * -1000],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: speed,
            ease: "linear",
          },
        }}
        style={{ width: "fit-content" }}
      >
        {children}
        {children}
        {children}
      </motion.div>
    </div>
  );
}

// Vertical marquee for special effects
interface VerticalMarqueeProps {
  children: ReactNode;
  speed?: number;
  direction?: "up" | "down";
  className?: string;
}

export function VerticalMarquee({
  children,
  speed = 20,
  direction = "up",
  className = "",
}: VerticalMarqueeProps) {
  const directionMultiplier = direction === "up" ? -1 : 1;

  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{ maskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)" }}
    >
      <motion.div
        className="flex flex-col gap-4"
        animate={{
          y: [0, directionMultiplier * -500],
        }}
        transition={{
          y: {
            repeat: Infinity,
            repeatType: "loop",
            duration: speed,
            ease: "linear",
          },
        }}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
}
