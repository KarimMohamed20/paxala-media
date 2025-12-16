"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { Section, SectionHeader } from "@/components/ui/section";
import { Quote } from "lucide-react";

// Client logos from /public/images/clients
const clients = [
  { id: 1, name: "Abu Elhof", logo: "/images/clients/Abu elhof LOGO.png" },
  { id: 2, name: "DNA", logo: "/images/clients/DNA_logo.png" },
  { id: 3, name: "El-Mass", logo: "/images/clients/El-Mass logo.png" },
  { id: 4, name: "Hija", logo: "/images/clients/gold logo hija.png" },
  { id: 5, name: "La Flamingo", logo: "/images/clients/LA FLAMINGO INSIDE LOGO COLOR-01.png" },
  { id: 6, name: "Academy Lev", logo: "/images/clients/logo_academylev.png" },
  { id: 7, name: "Hian", logo: "/images/clients/Logo-Hian-01.png" },
  { id: 8, name: "Walid", logo: "/images/clients/LOGONEW WALID-01.png" },
  { id: 9, name: "Logo", logo: "/images/clients/logo.png" },
  { id: 10, name: "Mohammad Mashevot", logo: "/images/clients/mohammad logo mashevot kaukab.png" },
  { id: 11, name: "Munches", logo: "/images/clients/MUNCHES.png" },
  { id: 12, name: "Olympic", logo: "/images/clients/olympic png.png" },
  { id: 13, name: "Rai", logo: "/images/clients/Rai logo.png" },
  { id: 14, name: "Sultan", logo: "/images/clients/sultan logo -01.png" },
  { id: 15, name: "Walid Group", logo: "/images/clients/WALID-GROUP-LOGO.png" },
  { id: 16, name: "White Logo", logo: "/images/clients/WHITE LOGO PNG2-01.png" },
];

// Testimonials data
const testimonials = [
  {
    id: 1,
    quote: "Paxala Media transformed our brand's visual identity. Their attention to detail and creative vision exceeded our expectations.",
    author: "Sarah Johnson",
    role: "Marketing Director",
    company: "Tech Innovations",
  },
  {
    id: 2,
    quote: "Working with PMP was a game-changer. Their video production quality is unmatched, and they truly understand storytelling.",
    author: "Michael Chen",
    role: "CEO",
    company: "StartUp Hub",
  },
  {
    id: 3,
    quote: "The team's professionalism and creativity made our project a success. Highly recommend for any media production needs.",
    author: "Emily Davis",
    role: "Brand Manager",
    company: "Creative Co",
  },
];

// Infinite Marquee Component
function InfiniteMarquee({
  children,
  direction = "left",
  speed = 25,
  pauseOnHover = true,
}: {
  children: React.ReactNode;
  direction?: "left" | "right";
  speed?: number;
  pauseOnHover?: boolean;
}) {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div
      className="relative overflow-hidden"
      style={{
        maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
      }}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      <motion.div
        className="flex gap-8"
        animate={{
          x: direction === "left" ? [0, -1920] : [-1920, 0],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: speed,
            ease: "linear",
          },
        }}
        style={{
          animationPlayState: isPaused ? "paused" : "running",
        }}
      >
        {children}
        {children}
        {children}
      </motion.div>
    </div>
  );
}

// Client Logo Card
function ClientLogoCard({ client, index }: { client: (typeof clients)[0]; index: number }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="flex-shrink-0 w-40 md:w-48 lg:w-56"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400 }}
    >
      <motion.div
        className="aspect-[3/2] rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-3 md:p-4 lg:p-6 relative overflow-hidden"
        animate={{
          borderColor: isHovered ? "rgba(239, 68, 68, 0.5)" : "rgba(255, 255, 255, 0.1)",
          backgroundColor: isHovered ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.05)",
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 bg-red-600/10 blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />

        {/* Client Logo */}
        <div className="relative w-full h-full z-10">
          <Image
            src={client.logo}
            alt={client.name}
            fill
            className="object-contain"
          />
        </div>

        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          initial={{ x: "-100%" }}
          animate={isHovered ? { x: "100%" } : { x: "-100%" }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  );
}

// Testimonial Card
function TestimonialCard({
  testimonial,
  index,
  isActive,
}: {
  testimonial: (typeof testimonials)[0];
  index: number;
  isActive: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: isActive ? 1 : 0.3,
        scale: isActive ? 1 : 0.9,
        y: isActive ? 0 : 20,
      }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 relative overflow-hidden"
    >
      {/* Quote icon */}
      <motion.div
        className="absolute top-4 right-4 text-red-600/20"
        animate={{ rotate: isActive ? 0 : -10, scale: isActive ? 1 : 0.8 }}
        transition={{ duration: 0.5 }}
      >
        <Quote size={48} />
      </motion.div>

      {/* Quote text */}
      <motion.p
        className="text-white/80 text-sm md:text-base lg:text-lg leading-relaxed mb-6 relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isActive ? 1 : 0.5, y: isActive ? 0 : 10 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        "{testimonial.quote}"
      </motion.p>

      {/* Author info */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: isActive ? 1 : 0.5, x: isActive ? 0 : -10 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <p className="text-white font-semibold">{testimonial.author}</p>
        <p className="text-red-500 text-sm">
          {testimonial.role}, {testimonial.company}
        </p>
      </motion.div>

      {/* Active indicator line */}
      <motion.div
        className="absolute bottom-0 left-0 h-1 bg-red-600"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isActive ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        style={{ originX: 0 }}
      />
    </motion.div>
  );
}

export function ClientsSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  // Auto-rotate testimonials
  useState(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  });

  return (
    <Section className="bg-gradient-to-b from-black to-neutral-950 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/5 rounded-full blur-[200px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div ref={sectionRef}>
        {/* Animated Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <SectionHeader
            subtitle="Trusted By"
            title="Our Clients"
            description="We've had the privilege of working with amazing brands and businesses."
          />
        </motion.div>

        {/* Infinite Marquee - First Row (Left) */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-8"
        >
          <InfiniteMarquee direction="left" speed={30}>
            {clients.map((client, index) => (
              <ClientLogoCard key={`row1-${client.id}`} client={client} index={index} />
            ))}
          </InfiniteMarquee>
        </motion.div>

        {/* Infinite Marquee - Second Row (Right) - Shuffled order */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={isInView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-12 md:mb-16"
        >
          <InfiniteMarquee direction="right" speed={35}>
            {[...clients].sort(() => 0.5 - Math.random()).map((client, index) => (
              <ClientLogoCard key={`row2-${client.id}`} client={client} index={index} />
            ))}
          </InfiniteMarquee>
        </motion.div>

        {/* Testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-8 md:mt-12"
        >
          <motion.h3
            className="text-center text-white/40 text-sm uppercase tracking-wider mb-8"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            What They Say
          </motion.h3>

          {/* Testimonial Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={testimonial.id}
                onClick={() => setActiveTestimonial(index)}
                className="cursor-pointer"
              >
                <TestimonialCard
                  testimonial={testimonial}
                  index={index}
                  isActive={activeTestimonial === index}
                />
              </div>
            ))}
          </div>

          {/* Testimonial navigation dots */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <motion.button
                key={index}
                onClick={() => setActiveTestimonial(index)}
                className="w-2 h-2 rounded-full transition-colors"
                animate={{
                  backgroundColor:
                    activeTestimonial === index ? "rgb(239 68 68)" : "rgba(255, 255, 255, 0.2)",
                  scale: activeTestimonial === index ? 1.2 : 1,
                }}
                whileHover={{ scale: 1.3 }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </Section>
  );
}
