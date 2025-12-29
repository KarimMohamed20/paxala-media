"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";

interface AboutContent {
  aboutBadge?: string;
  aboutHeading?: string;
  aboutImage?: string | null;
  aboutParagraph1?: string;
  aboutParagraph2?: string;
  aboutParagraph3?: string;
  aboutParagraph4?: string;
  aboutParagraph5?: string;
  aboutHighlights?: string[];
  aboutYearsText?: string;
  aboutYearsLabel?: string;
}

export function AboutSection({ content }: { content?: AboutContent | null }) {
  // Default values
  const badge = content?.aboutBadge || "About Us";
  const heading = content?.aboutHeading || "About Paxala Media";
  const image = content?.aboutImage || "/images/studio.jpg";
  const paragraph1 = content?.aboutParagraph1 || "Paxala Media Production is a full-service creative agency with in-house production, built to shape, scale, and elevate brands through strategic visual storytelling.";
  const paragraph2 = content?.aboutParagraph2 || "What began as a passion-driven studio has evolved into a multidisciplinary creative house that leads with strategy and creative direction, while executing everything under one roof — from branding and content to film, digital, and growth.";
  const paragraph3 = content?.aboutParagraph3 || "Every project is led under a single creative direction and executed through a fully integrated in-house system — ensuring clarity, consistency, and control from strategy to final delivery.";
  const paragraph4 = content?.aboutParagraph4 || "We partner with ambitious brands, institutions, and companies that understand visuals are not decoration — they are a business asset.";
  const paragraph5 = content?.aboutParagraph5 || "At PMP, we don't just produce content. We build visual systems that tell stories, build trust, and drive results.";
  const highlights = content?.aboutHighlights || [
    "Full-service creative agency",
    "Expert team of filmmakers & designers",
    "Cutting-edge equipment & technology",
    "End-to-end project management",
    "Dedicated to client success",
  ];
  const yearsText = content?.aboutYearsText || "10+";
  const yearsLabel = content?.aboutYearsLabel || "Years of Excellence";
  return (
    <Section className="bg-gradient-to-b from-black via-neutral-950 to-black">
      <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
        {/* Image Column */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative"
        >
          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
            {/* Placeholder for actual image */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/20 to-transparent" />
            {image && image !== "/images/studio.jpg" ? (
              <div className="absolute inset-x-4 inset-y-0">
                <Image
                  src={image}
                  alt="About"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-8xl font-bold text-white/10">PMP</span>
              </div>
            )}
          </div>
          {/* Floating Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="absolute -bottom-6 -right-6 bg-red-600 rounded-2xl p-6 shadow-2xl shadow-red-600/20"
          >
            <div className="text-4xl font-bold text-white mb-1">{yearsText}</div>
            <div className="text-white/80 text-sm">{yearsLabel}</div>
          </motion.div>
        </motion.div>

        {/* Content Column */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="inline-block text-red-500 font-medium mb-3 md:mb-4 tracking-wider uppercase text-sm">
            {badge}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6">
            <span className="text-red-500">{heading.charAt(0)}</span>
            <span className="text-white">{heading.slice(1)}</span>
          </h2>
          <div className="space-y-3 md:space-y-4 text-white/70 leading-relaxed mb-6 md:mb-8">
            <p>{paragraph1}</p>
            <p>{paragraph2}</p>
            <p>{paragraph3}</p>
            <p>{paragraph4}</p>
            <p>{paragraph5}</p>
          </div>

          {/* Highlights */}
          <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
            {highlights.map((item, index) => (
              <motion.li
                key={item}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex items-center gap-3 text-white/80"
              >
                <CheckCircle2 size={20} className="text-red-500 flex-shrink-0" />
                {item}
              </motion.li>
            ))}
          </ul>

          <Link href="/about">
            <Button size="lg" className="group">
              Learn More About Us
              <ArrowRight
                size={18}
                className="ml-2 group-hover:translate-x-1 transition-transform"
              />
            </Button>
          </Link>
        </motion.div>
      </div>
    </Section>
  );
}
