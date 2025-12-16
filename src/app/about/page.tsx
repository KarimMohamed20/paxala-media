"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Users,
  Award,
  Target,
  Heart,
  Instagram,
  Linkedin,
} from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { team } from "@/lib/constants";

const values = [
  {
    icon: Target,
    title: "Excellence",
    description:
      "We strive for excellence in every project, paying attention to the smallest details to deliver outstanding results.",
  },
  {
    icon: Users,
    title: "Collaboration",
    description:
      "We believe in the power of teamwork, both within our crew and with our clients, to create something truly remarkable.",
  },
  {
    icon: Heart,
    title: "Passion",
    description:
      "Our passion for visual storytelling drives us to push creative boundaries and explore new possibilities.",
  },
  {
    icon: Award,
    title: "Innovation",
    description:
      "We embrace new technologies and techniques to stay at the forefront of the creative industry.",
  },
];

const milestones = [
  { year: "2014", title: "Founded", description: "Paxala Media was born from a passion for visual storytelling" },
  { year: "2016", title: "First Major Client", description: "Completed our first major commercial project" },
  { year: "2018", title: "Team Expansion", description: "Grew our team of creative professionals" },
  { year: "2020", title: "Studio Launch", description: "Opened our dedicated production studio" },
  { year: "2022", title: "Digital Services", description: "Expanded into web and app development" },
  { year: "2024", title: "1000+ Projects", description: "Celebrated completing over 1000 client projects" },
];

// Animated word reveal for hero heading
function AnimatedHeading() {
  return (
    <motion.h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
      <motion.span
        className="inline-block overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.span
          className="inline-block"
          initial={{ y: 100, rotateX: -80 }}
          animate={{ y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
        >
          <span className="text-red-500">A</span>
          <span className="text-white">bout Us</span>
        </motion.span>
      </motion.span>
    </motion.h1>
  );
}

// Value card with hover effects
function ValueCard({ value, index }: { value: (typeof values)[0]; index: number }) {
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50, rotateY: -15 }}
      animate={isInView ? { opacity: 1, y: 0, rotateY: 0 } : {}}
      transition={{
        duration: 0.7,
        delay: index * 0.15,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={{ scale: 1.03, y: -5 }}
      className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-red-500/50 transition-colors relative overflow-hidden group"
    >
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 bg-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity"
        initial={{ scale: 0.8 }}
        whileHover={{ scale: 1.2 }}
      />

      {/* Icon with animation */}
      <motion.div
        className="w-14 h-14 rounded-xl bg-red-600/10 flex items-center justify-center mb-6 relative z-10"
        whileHover={{ rotate: [0, -10, 10, 0] }}
        transition={{ duration: 0.5 }}
      >
        <value.icon size={28} className="text-red-500" />
      </motion.div>

      <h3 className="text-xl font-semibold text-white mb-3 relative z-10">
        {value.title}
      </h3>
      <p className="text-white/60 leading-relaxed relative z-10">
        {value.description}
      </p>

      {/* Shine effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100"
        initial={{ x: "-100%" }}
        whileHover={{ x: "100%" }}
        transition={{ duration: 0.8 }}
      />
    </motion.div>
  );
}

// Timeline milestone with draw-in animation
function TimelineMilestone({
  milestone,
  index,
  isLast,
}: {
  milestone: (typeof milestones)[0];
  index: number;
  isLast: boolean;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const isEven = index % 2 === 0;

  return (
    <motion.div
      ref={ref}
      className="relative grid md:grid-cols-2 gap-8 items-center"
    >
      {/* Content */}
      <motion.div
        initial={{ opacity: 0, x: isEven ? -50 : 50 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className={`${isEven ? "md:text-right" : "md:order-2"}`}
      >
        <motion.div
          className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-red-500/30 transition-colors"
          whileHover={{ scale: 1.02 }}
        >
          <motion.span
            className="text-red-500 font-bold text-2xl"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {milestone.year}
          </motion.span>
          <h3 className="text-xl font-semibold text-white mt-2">
            {milestone.title}
          </h3>
          <p className="text-white/60 mt-2">{milestone.description}</p>
        </motion.div>
      </motion.div>

      {/* Center dot with pulse */}
      <motion.div
        className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-600 border-4 border-black z-10"
        initial={{ scale: 0 }}
        animate={isInView ? { scale: 1 } : {}}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <motion.div
          className="absolute inset-0 rounded-full bg-red-600"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      {/* Line draw animation */}
      {!isLast && (
        <motion.div
          className="hidden md:block absolute left-1/2 top-full w-px bg-white/10"
          initial={{ height: 0 }}
          animate={isInView ? { height: "3rem" } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          style={{ transform: "translateX(-50%)" }}
        />
      )}

      <div className={isEven ? "md:order-2" : ""} />
    </motion.div>
  );
}

// Team member card with hover effects
function TeamMemberCard({
  member,
  index,
}: {
  member: (typeof team.production)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className="group"
    >
      <motion.div
        className="relative aspect-square rounded-2xl overflow-hidden mb-6 bg-neutral-900"
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.3 }}
      >
        <Image
          src={member.image}
          alt={member.name}
          fill
          className="object-cover"
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
        <motion.div
          className="absolute bottom-4 left-4 right-4 flex justify-center gap-3"
          initial={{ opacity: 0, y: 20 }}
          whileHover={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.a
            href="#"
            className="p-2 rounded-full bg-white/10 hover:bg-red-600 transition-colors"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          >
            <Instagram size={18} className="text-white" />
          </motion.a>
          <motion.a
            href="#"
            className="p-2 rounded-full bg-white/10 hover:bg-red-600 transition-colors"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
          >
            <Linkedin size={18} className="text-white" />
          </motion.a>
        </motion.div>
      </motion.div>
      <div className="text-center">
        <motion.h4
          className="text-xl font-semibold text-white"
          whileHover={{ scale: 1.05 }}
        >
          {member.name}
        </motion.h4>
        <p className="text-red-500 text-sm font-medium mb-3">{member.role}</p>
        <motion.div
          className="flex flex-wrap justify-center gap-2"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.05, delayChildren: 0.3 },
            },
          }}
        >
          {member.skills.map((skill) => (
            <motion.span
              key={skill}
              className="text-xs text-white/50 bg-white/5 px-3 py-1 rounded-full"
              variants={{
                hidden: { opacity: 0, scale: 0.8 },
                visible: { opacity: 1, scale: 1 },
              }}
              whileHover={{
                scale: 1.1,
                backgroundColor: "rgba(239, 68, 68, 0.2)",
              }}
            >
              {skill}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function AboutPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div className="pt-20">
      {/* Hero */}
      <section
        ref={heroRef}
        className="py-20 md:py-32 bg-gradient-to-b from-neutral-950 to-black relative overflow-hidden"
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[150px]"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-600/5 rounded-full blur-[120px]"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.4, 0.2, 0.4],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="mx-auto px-6 md:px-8 lg:px-12 max-w-7xl relative z-10"
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <motion.span
                className="inline-block text-red-500 font-medium mb-4 tracking-wider uppercase text-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                Our Story
              </motion.span>
              <AnimatedHeading />
              <motion.p
                className="text-xl text-white/60 leading-relaxed mb-8"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                Paxala Media Production has grown into a creative home for
                visual professionals dedicated to bringing brands to life
                through impactful storytelling.
              </motion.p>
              <motion.p
                className="text-lg text-white/50 leading-relaxed"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                What began as a small, passion-driven studio has evolved into a
                full-service creative agency where filmmakers, designers,
                editors, drone specialists, and developers collaborate
                seamlessly under one roof.
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotateY: -20 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative"
            >
              <motion.div
                className="aspect-square rounded-2xl bg-gradient-to-br from-neutral-900 to-neutral-950 border border-white/10 flex items-center justify-center overflow-hidden"
                whileHover={{ scale: 1.02 }}
              >
                <motion.span
                  className="text-[200px] font-bold text-white/5"
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                >
                  PMP
                </motion.span>
              </motion.div>
              <motion.div
                className="absolute -bottom-6 -right-6 bg-red-600 rounded-xl p-6"
                initial={{ opacity: 0, scale: 0, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                whileHover={{ scale: 1.05 }}
              >
                <motion.div
                  className="text-4xl font-bold text-white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  10+
                </motion.div>
                <div className="text-white/80 text-sm">Years of Excellence</div>
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Values */}
      <Section className="bg-black">
        <SectionHeader
          subtitle="What Drives Us"
          title="Our Values"
          description="The principles that guide everything we do at Paxala Media."
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <ValueCard key={value.title} value={value} index={index} />
          ))}
        </div>
      </Section>

      {/* Timeline */}
      <Section className="bg-gradient-to-b from-black to-neutral-950">
        <SectionHeader
          subtitle="Our Journey"
          title="Milestones"
          description="Key moments in our growth as a creative studio."
        />

        <div className="relative">
          {/* Timeline line with draw animation */}
          <motion.div
            className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 hidden md:block origin-top"
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />

          <div className="space-y-12">
            {milestones.map((milestone, index) => (
              <TimelineMilestone
                key={milestone.year}
                milestone={milestone}
                index={index}
                isLast={index === milestones.length - 1}
              />
            ))}
          </div>
        </div>
      </Section>

      {/* Team */}
      <Section className="bg-neutral-950">
        <SectionHeader
          subtitle="Our Crew"
          title="Meet the Team"
          description="The talented professionals behind our creative productions."
        />

        {/* Production Team */}
        <div className="mb-16">
          <motion.h3
            className="text-2xl font-semibold text-white mb-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-red-500">P</span>roduction Team
          </motion.h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.production.map((member, index) => (
              <TeamMemberCard key={member.id} member={member} index={index} />
            ))}
          </div>
        </div>

        {/* IT & Dev Team */}
        <div>
          <motion.h3
            className="text-2xl font-semibold text-white mb-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-red-500">I</span>T & Dev Team
          </motion.h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-2xl mx-auto lg:max-w-none lg:px-32">
            {team.itDev.map((member, index) => (
              <TeamMemberCard key={member.id} member={member} index={index} />
            ))}
          </div>
        </div>
      </Section>

      {/* CTA */}
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

        <div className="mx-auto px-6 md:px-8 lg:px-12 max-w-7xl relative z-10">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Work with Us?
            </h2>
            <p className="text-xl text-white/80 mb-10">
              Let&apos;s collaborate and create something extraordinary
              together. Our team is excited to hear about your project.
            </p>
            <motion.div
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
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
                    Start a Project
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
                    Get in Touch
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
