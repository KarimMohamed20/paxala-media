"use client";

import { useRef, useEffect, useState } from "react";
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

const iconMap: Record<string, React.ElementType> = {
  Target,
  Users,
  Heart,
  Award,
};

// Value card with hover effects
interface ValueType {
  icon: string;
  title: string;
  description: string;
}

function ValueCard({ value, index }: { value: ValueType; index: number }) {
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { once: true, amount: 0.3 });
  const Icon = iconMap[value.icon] || Target;

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
        <Icon size={28} className="text-red-500" />
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
interface MilestoneType {
  year: string;
  title: string;
  description: string;
}

function TimelineMilestone({
  milestone,
  index,
  isLast,
}: {
  milestone: MilestoneType;
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
interface TeamMember {
  id: string;
  name: string;
  role: string;
  image: string | null;
  skills: string[];
  social?: {
    instagram?: string;
    linkedin?: string;
  };
}

function TeamMemberCard({
  member,
  index,
}: {
  member: TeamMember;
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
        {member.image ? (
          <Image
            src={member.image}
            alt={member.name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-8xl font-bold text-white/20">
              {member.name.charAt(0)}
            </span>
          </div>
        )}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
        {(member.social?.instagram || member.social?.linkedin) && (
          <motion.div
            className="absolute bottom-4 left-4 right-4 flex justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            whileHover={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {member.social?.instagram && (
              <motion.a
                href={member.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/10 hover:bg-red-600 transition-colors"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                <Instagram size={18} className="text-white" />
              </motion.a>
            )}
            {member.social?.linkedin && (
              <motion.a
                href={member.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/10 hover:bg-red-600 transition-colors"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                <Linkedin size={18} className="text-white" />
              </motion.a>
            )}
          </motion.div>
        )}
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
  const [content, setContent] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<{
    production: any[];
    itDev: any[];
    creative: any[];
  }>({
    production: [],
    itDev: [],
    creative: [],
  });
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  useEffect(() => {
    async function fetchContent() {
      try {
        const response = await fetch('/api/homepage');
        if (response.ok) {
          const data = await response.json();
          setContent({
            ...data,
            aboutHighlights: typeof data.aboutHighlights === 'string'
              ? JSON.parse(data.aboutHighlights)
              : data.aboutHighlights,
            aboutValues: typeof data.aboutValues === 'string'
              ? JSON.parse(data.aboutValues)
              : data.aboutValues,
            aboutMilestones: typeof data.aboutMilestones === 'string'
              ? JSON.parse(data.aboutMilestones)
              : data.aboutMilestones,
          });
        }
      } catch (error) {
        console.error('Error fetching content:', error);
      }
    }
    fetchContent();
  }, []);

  useEffect(() => {
    async function fetchTeamMembers() {
      try {
        const response = await fetch('/api/team?activeOnly=true');
        if (response.ok) {
          const data = await response.json();
          setTeamMembers({
            production: data.filter((m: any) => m.team === 'PRODUCTION'),
            itDev: data.filter((m: any) => m.team === 'IT_DEV'),
            creative: data.filter((m: any) => m.team === 'CREATIVE'),
          });
        }
      } catch (error) {
        console.error('Error fetching team members:', error);
      }
    }
    fetchTeamMembers();
  }, []);

  // Use content from API or fallback to defaults
  const aboutImage = content?.aboutImage || null;
  const paragraph1 = content?.aboutParagraph1 || "Paxala Media Production is a full-service creative agency with in-house production, built to shape, scale, and elevate brands through strategic visual storytelling.";
  const paragraph2 = content?.aboutParagraph2 || "What began as a passion-driven studio has evolved into a multidisciplinary creative house that leads with strategy and creative direction, while executing everything under one roof — from branding and content to film, digital, and growth.";
  const paragraph3 = content?.aboutParagraph3 || "Every project is led under a single creative direction and executed through a fully integrated in-house system — ensuring clarity, consistency, and control from strategy to final delivery.";
  const paragraph4 = content?.aboutParagraph4 || "We partner with ambitious brands, institutions, and companies that understand visuals are not decoration — they are a business asset.";
  const paragraph5 = content?.aboutParagraph5 || "At PMP, we don't just produce content. We build visual systems that tell stories, build trust, and drive results.";

  // About page specific content
  const heroBadge = content?.aboutPageHeroBadge || "About Us";
  const heroHeading = content?.aboutPageHeroHeading || "About Paxala Media";

  // Values section
  const valuesSubtitle = content?.aboutValuesSubtitle || "What Drives Us";
  const valuesTitle = content?.aboutValuesTitle || "Our Values";
  const valuesDescription = content?.aboutValuesDescription || "The principles that guide everything we do at Paxala Media.";
  const values = content?.aboutValues || [
    { icon: "Target", title: "Excellence", description: "We strive for excellence in every project, paying attention to the smallest details to deliver outstanding results." },
    { icon: "Users", title: "Collaboration", description: "We believe in the power of teamwork, both within our crew and with our clients, to create something truly remarkable." },
    { icon: "Heart", title: "Passion", description: "Our passion for visual storytelling drives us to push creative boundaries and explore new possibilities." },
    { icon: "Award", title: "Innovation", description: "We embrace new technologies and techniques to stay at the forefront of the creative industry." },
  ];

  // Milestones section
  const milestonesSubtitle = content?.aboutMilestonesSubtitle || "Our Journey";
  const milestonesTitle = content?.aboutMilestonesTitle || "Milestones";
  const milestonesDescription = content?.aboutMilestonesDescription || "Key moments in our growth as a creative studio.";
  const milestones = content?.aboutMilestones || [
    { year: "2014", title: "Founded", description: "Paxala Media was born from a passion for visual storytelling" },
    { year: "2016", title: "First Major Client", description: "Completed our first major commercial project" },
    { year: "2018", title: "Team Expansion", description: "Grew our team of creative professionals" },
    { year: "2020", title: "Studio Launch", description: "Opened our dedicated production studio" },
    { year: "2022", title: "Digital Services", description: "Expanded into web and app development" },
    { year: "2024", title: "1000+ Projects", description: "Celebrated completing over 1000 client projects" },
  ];

  // Team section
  const teamSubtitle = content?.aboutTeamSubtitle || "Our Crew";
  const teamTitle = content?.aboutTeamTitle || "Meet the Team";
  const teamDescription = content?.aboutTeamDescription || "The talented professionals behind our creative productions.";

  // CTA section
  const ctaHeading = content?.aboutCtaHeading || "Ready to Start Your Project?";
  const ctaSubtitle = content?.aboutCtaSubtitle || "Let's collaborate and create something extraordinary together. Our team is excited to hear about your project.";

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
                {heroBadge}
              </motion.span>
              <motion.h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
                <motion.span
                  className="inline-block text-red-500"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  {heroHeading.charAt(0)}
                </motion.span>
                <motion.span
                  className="inline-block text-white"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  {heroHeading.slice(1)}
                </motion.span>
              </motion.h1>
              <motion.p
                className="text-xl text-white/60 leading-relaxed mb-8"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                {paragraph1}
              </motion.p>
              <motion.p
                className="text-lg text-white/50 leading-relaxed mb-6"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                {paragraph2}
              </motion.p>
              <motion.p
                className="text-lg text-white/50 leading-relaxed mb-6"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                {paragraph3}
              </motion.p>
              <motion.p
                className="text-lg text-white/50 leading-relaxed mb-6"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                {paragraph4}
              </motion.p>
              <motion.p
                className="text-lg text-white/50 leading-relaxed"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                {paragraph5}
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
                {aboutImage ? (
                  <div className="absolute inset-x-4 inset-y-0">
                    <Image
                      src={aboutImage}
                      alt="About Paxala Media"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                ) : (
                  <motion.span
                    className="text-[200px] font-bold text-white/5"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                  >
                    PMP
                  </motion.span>
                )}
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
          subtitle={valuesSubtitle}
          title={valuesTitle}
          description={valuesDescription}
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value: ValueType, index: number) => (
            <ValueCard key={value.title} value={value} index={index} />
          ))}
        </div>
      </Section>

      {/* Timeline */}
      <Section className="bg-gradient-to-b from-black to-neutral-950">
        <SectionHeader
          subtitle={milestonesSubtitle}
          title={milestonesTitle}
          description={milestonesDescription}
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
            {milestones.map((milestone: MilestoneType, index: number) => (
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
          subtitle={teamSubtitle}
          title={teamTitle}
          description={teamDescription}
        />

        {/* Production Team */}
        {teamMembers.production.length > 0 && (
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
              {teamMembers.production.map((member, index) => (
                <TeamMemberCard key={member.id} member={member} index={index} />
              ))}
            </div>
          </div>
        )}

        {/* IT & Dev Team */}
        {teamMembers.itDev.length > 0 && (
          <div className="mb-16">
            <motion.h3
              className="text-2xl font-semibold text-white mb-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-red-500">I</span>T & Dev Team
            </motion.h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {teamMembers.itDev.map((member, index) => (
                <TeamMemberCard key={member.id} member={member} index={index} />
              ))}
            </div>
          </div>
        )}

        {/* Creative Team */}
        {teamMembers.creative.length > 0 && (
          <div>
            <motion.h3
              className="text-2xl font-semibold text-white mb-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-red-500">C</span>reative Team
            </motion.h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {teamMembers.creative.map((member, index) => (
                <TeamMemberCard key={member.id} member={member} index={index} />
              ))}
            </div>
          </div>
        )}
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
              {ctaHeading}
            </h2>
            <p className="text-xl text-white/80 mb-10">
              {ctaSubtitle}
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
