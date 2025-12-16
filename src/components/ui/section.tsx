"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  animate?: boolean;
}

export function Section({
  children,
  className,
  containerClassName,
  animate = false,
  ...props
}: SectionProps) {
  return (
    <section className={cn("py-20 md:py-28 lg:py-32", className)} {...props}>
      <div className={cn("mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 max-w-7xl", containerClassName)}>
        {children}
      </div>
    </section>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  align?: "left" | "center" | "right";
  className?: string;
}

export function SectionHeader({
  title,
  subtitle,
  description,
  align = "center",
  className,
}: SectionHeaderProps) {
  const alignClasses = {
    left: "text-left",
    center: "text-center mx-auto",
    right: "text-right ml-auto",
  };

  return (
    <div className={cn("mb-10 md:mb-12 lg:mb-16 max-w-3xl", alignClasses[align], className)}>
      {subtitle && (
        <span className="inline-block text-red-500 font-medium mb-2 md:mb-3 lg:mb-4 tracking-wider uppercase text-xs md:text-sm">
          {subtitle}
        </span>
      )}
      <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-3 md:mb-4 lg:mb-6">
        <span className="text-red-500">{title.charAt(0)}</span>
        <span className="text-white">{title.slice(1)}</span>
      </h2>
      {description && (
        <p className="text-sm md:text-base lg:text-lg text-white/70 leading-relaxed">{description}</p>
      )}
    </div>
  );
}
