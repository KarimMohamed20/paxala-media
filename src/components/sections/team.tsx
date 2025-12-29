"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Instagram, Linkedin } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";
import { cn } from "@/lib/utils";

type TeamTab = "production" | "itDev" | "creative";

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

// Team member card with cinematic hover effects
function TeamMemberCard({
  member,
  index,
}: {
  member: TeamMember;
  index: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 60, scale: 0.9 }}
      animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
      transition={{
        duration: 0.7,
        delay: index * 0.15,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group"
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden mb-4 md:mb-6">
        {/* Image container with mask reveal effect */}
        <motion.div
          className="absolute inset-0"
          initial={{ clipPath: "circle(0% at 50% 50%)" }}
          animate={isInView ? { clipPath: "circle(100% at 50% 50%)" } : {}}
          transition={{ duration: 1, delay: index * 0.15 + 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Background with grayscale to color effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900"
            animate={{
              filter: isHovered ? "grayscale(0%)" : "grayscale(100%)",
            }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="absolute inset-0"
              animate={{
                scale: isHovered ? 1.1 : 1,
              }}
              transition={{ duration: 0.6, ease: "easeOut" }}
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
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Animated border glow */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{
            opacity: isHovered ? 1 : 0,
            boxShadow: isHovered
              ? "inset 0 0 30px rgba(239, 68, 68, 0.3), 0 0 30px rgba(239, 68, 68, 0.2)"
              : "inset 0 0 0px transparent, 0 0 0px transparent",
          }}
          transition={{ duration: 0.4 }}
        />

        {/* Overlay with gradient */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        />

        {/* Social Links with stagger animation */}
        {(member.social?.instagram || member.social?.linkedin) && (
          <motion.div
            className="absolute bottom-4 left-4 right-4 flex justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: isHovered ? 1 : 0,
              y: isHovered ? 0 : 20,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {member.social?.instagram && (
              <motion.a
                href={member.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/10 backdrop-blur-sm"
                whileHover={{ scale: 1.2, backgroundColor: "rgb(239 68 68)" }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Instagram size={18} className="text-white" />
              </motion.a>
            )}
            {member.social?.linkedin && (
              <motion.a
                href={member.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/10 backdrop-blur-sm"
                whileHover={{ scale: 1.2, backgroundColor: "rgb(239 68 68)" }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Linkedin size={18} className="text-white" />
              </motion.a>
            )}
          </motion.div>
        )}

        {/* Animated red accent line */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-1 bg-red-600"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHovered ? 1 : 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ originX: 0 }}
        />

        {/* Shine effect */}
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: "-100%" }}
            animate={isHovered ? { x: "100%" } : { x: "-100%" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </motion.div>
      </div>

      {/* Info with animations */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: index * 0.15 + 0.4 }}
      >
        <motion.h3
          className="text-lg md:text-xl font-semibold text-white mb-1"
          whileHover={{ scale: 1.05 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          {member.name}
        </motion.h3>
        <motion.p
          className="text-red-500 text-xs md:text-sm font-medium mb-2 md:mb-3"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: index * 0.15 + 0.5 }}
        >
          {member.role}
        </motion.p>

        {/* Skills with stagger animation */}
        <motion.div
          className="flex flex-wrap justify-center gap-1.5 md:gap-2"
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.08,
                delayChildren: index * 0.15 + 0.6,
              },
            },
          }}
        >
          {member.skills.map((skill, skillIndex) => (
            <motion.span
              key={skill}
              className="text-xs text-white/50 bg-white/5 px-3 py-1 rounded-full cursor-default"
              variants={{
                hidden: { opacity: 0, scale: 0.8, y: 10 },
                visible: { opacity: 1, scale: 1, y: 0 },
              }}
              whileHover={{
                scale: 1.1,
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                color: "rgba(255, 255, 255, 0.9)",
              }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              {skill}
            </motion.span>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

interface TeamContent {
  teamSubtitle?: string;
  teamTitle?: string;
  teamDescription?: string;
  teamTab1Label?: string;
  teamTab2Label?: string;
  teamTab3Label?: string;
}

interface TeamMembers {
  production: TeamMember[];
  itDev: TeamMember[];
  creative: TeamMember[];
}

export function TeamSection({ content, teamMembers }: { content?: TeamContent | null; teamMembers?: TeamMembers }) {
  const [activeTab, setActiveTab] = useState<TeamTab>("production");
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.1 });

  // Default values
  const subtitle = content?.teamSubtitle || "Our Team";
  const title = content?.teamTitle || "PMP Crew";
  const description = content?.teamDescription || "Meet the talented professionals behind our creative productions.";
  const tab1Label = content?.teamTab1Label || "Production Team";
  const tab2Label = content?.teamTab2Label || "IT & Dev Team";
  const tab3Label = content?.teamTab3Label || "Creative Team";

  const tabs = [
    { id: "production" as TeamTab, label: tab1Label },
    { id: "itDev" as TeamTab, label: tab2Label },
    { id: "creative" as TeamTab, label: tab3Label },
  ];

  const currentTeam = activeTab === "production"
    ? (teamMembers?.production || [])
    : activeTab === "itDev"
    ? (teamMembers?.itDev || [])
    : (teamMembers?.creative || []);

  return (
    <Section className="bg-black relative overflow-hidden">
      {/* Background animated elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          className="absolute top-1/3 left-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-[150px]"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-red-600/5 rounded-full blur-[120px]"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.2, 0.4],
            y: [0, -30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div ref={sectionRef}>
        {/* Animated Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <SectionHeader
            subtitle={subtitle}
            title={title}
            description={description}
          />
        </motion.div>

        {/* Tabs with enhanced animations */}
        <motion.div
          className="flex justify-center gap-3 md:gap-4 mb-10 md:mb-12 lg:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {tabs.map((tab, index) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "relative px-6 py-3 rounded-full text-sm font-medium transition-colors duration-300",
                activeTab === tab.id ? "text-white" : "text-white/60 hover:text-white"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: index === 0 ? -20 : 20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="team-tab-indicator"
                  className="absolute inset-0 bg-red-600 rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* Team Grid with AnimatePresence for tab switching */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8"
          >
            {currentTeam.map((member, index) => (
              <TeamMemberCard key={member.id} member={member} index={index} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </Section>
  );
}
