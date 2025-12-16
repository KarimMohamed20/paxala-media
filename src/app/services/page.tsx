"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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
  Check,
} from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { services } from "@/lib/constants";

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

// Service section with alternating animations
function ServiceSection({
  service,
  index,
}: {
  service: (typeof services)[0];
  index: number;
}) {
  const Icon = iconMap[service.icon] || Box;
  const isEven = index % 2 === 0;

  return (
    <motion.div
      id={service.id}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6 }}
      className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${
        isEven ? "" : "lg:flex-row-reverse"
      }`}
    >
      {/* Content */}
      <div className={isEven ? "" : "lg:order-2"}>
        <div className="flex items-center gap-4 mb-6">
          <motion.div
            className="p-4 rounded-2xl bg-red-600/10"
            whileHover={{ scale: 1.1 }}
          >
            <Icon size={32} className="text-red-500" />
          </motion.div>
          <span className="text-white/40 text-sm font-medium">
            0{index + 1}
          </span>
        </div>

        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          {service.name}
        </h2>

        <p className="text-lg text-white/60 leading-relaxed mb-8">
          {service.description}
        </p>

        {/* Features */}
        <ul className="space-y-3 mb-8">
          {service.features.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-3 text-white/80"
            >
              <Check size={18} className="text-red-500 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-4">
          <Link href="/booking">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button size="lg">
                Get Started
                <ArrowRight size={18} className="ml-2" />
              </Button>
            </motion.div>
          </Link>
          <Link href="/portfolio">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button variant="secondary" size="lg">
                View Projects
              </Button>
            </motion.div>
          </Link>
        </div>
      </div>

      {/* Visual */}
      <div className={isEven ? "lg:order-2" : ""}>
        <motion.div
          className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/10 group"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.3 }}
        >
          {/* Placeholder for service image/video */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Icon size={120} className="text-white/5" />
          </div>

          {/* Decorative elements */}
          <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-red-600/20 blur-2xl" />
          <div className="absolute bottom-4 left-4 w-32 h-32 rounded-full bg-red-600/10 blur-3xl" />

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-red-600/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function ServicesPage() {
  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-neutral-950 to-black relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute top-1/3 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[150px]"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="mx-auto px-6 md:px-8 lg:px-12 max-w-7xl relative z-10">
          <div className="max-w-3xl">
            <motion.span
              className="inline-block text-red-500 font-medium mb-4 tracking-wider uppercase text-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              What We Do
            </motion.span>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="text-red-500">O</span>
              <span className="text-white">ur Services</span>
            </h1>
            <motion.p
              className="text-xl text-white/60 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Comprehensive creative solutions tailored for today&apos;s
              fast-paced, digital-first world. From concept to delivery, we
              bring your vision to life.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Services List */}
      <Section className="bg-black">
        <div className="space-y-32">
          {services.map((service, index) => (
            <ServiceSection key={service.id} service={service} index={index} />
          ))}
        </div>
      </Section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-r from-red-600 to-red-700 relative overflow-hidden">
        {/* Animated background */}
        <motion.div
          className="absolute inset-0 opacity-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />
        <motion.div
          className="absolute w-96 h-96 bg-white/10 rounded-full blur-[100px]"
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          style={{ left: "10%", top: "20%" }}
        />
        <motion.div
          className="absolute w-80 h-80 bg-white/10 rounded-full blur-[80px]"
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          style={{ right: "15%", bottom: "10%" }}
        />

        <div className="mx-auto px-6 md:px-8 lg:px-12 max-w-7xl relative z-10">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <motion.h2
              className="text-4xl md:text-5xl font-bold text-white mb-6"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              Ready to Start Your Project?
            </motion.h2>
            <motion.p
              className="text-xl text-white/80 mb-10"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Let&apos;s discuss your needs and create something amazing
              together. Our team is ready to help bring your vision to life.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Link href="/booking">
                <motion.div
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="xl"
                    className="bg-white text-red-600 hover:bg-white/90"
                  >
                    Book a Consultation
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </motion.div>
              </Link>
              <Link href="/contact">
                <motion.div
                  whileHover={{ scale: 1.05, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="xl"
                    variant="secondary"
                    className="border-white/30 hover:bg-white/10"
                  >
                    Contact Us
                  </Button>
                </motion.div>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
