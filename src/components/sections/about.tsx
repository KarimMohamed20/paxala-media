"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";

const highlights = [
  "Full-service creative agency",
  "Expert team of filmmakers & designers",
  "Cutting-edge equipment & technology",
  "End-to-end project management",
  "Dedicated to client success",
];

export function AboutSection() {
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
            <div className="absolute inset-0 bg-[url('/images/studio.jpg')] bg-cover bg-center" />
            {/* Decorative elements */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <span className="text-8xl font-bold text-white/10">PMP</span>
              </div>
            </div>
          </div>
          {/* Floating Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="absolute -bottom-6 -right-6 bg-red-600 rounded-2xl p-6 shadow-2xl shadow-red-600/20"
          >
            <div className="text-4xl font-bold text-white mb-1">10+</div>
            <div className="text-white/80 text-sm">Years of Excellence</div>
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
            About Us
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6">
            <span className="text-red-500">A</span>
            <span className="text-white">bout Paxala Media</span>
          </h2>
          <div className="space-y-3 md:space-y-4 text-white/70 leading-relaxed mb-6 md:mb-8">
            <p>
              Paxala Media Production has grown into a creative home for visual
              professionals dedicated to bringing brands to life through
              impactful storytelling.
            </p>
            <p>
              What began as a small, passion-driven studio has evolved into a
              full-service creative agency where filmmakers, designers, editors,
              drone specialists, and developers collaborate seamlessly under one
              roof.
            </p>
            <p>
              We specialize in graphic design, 3D modeling, video and photo
              production, social media campaigns, and website development,
              offering businesses a comprehensive suite of visual solutions
              tailored for today&apos;s fast-paced, digital-first world.
            </p>
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
