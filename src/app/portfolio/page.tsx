"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Section, SectionHeader } from "@/components/ui/section";
import { PortfolioGrid } from "@/components/sections/portfolio-grid";
import { Loader2 } from "lucide-react";

export default function PortfolioPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      // Fetch published portfolio items for public display
      const response = await fetch('/api/portfolio?published=true');
      if (!response.ok) throw new Error('Failed to fetch portfolio');

      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-neutral-950 to-black relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            className="absolute top-1/3 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[150px]"
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
              Our Work
            </motion.span>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="text-red-500">P</span>
              <span className="text-white">ortfolio</span>
            </h1>
            <motion.p
              className="text-xl text-white/60 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Explore our collection of creative projects spanning video
              production, photography, design, and development. Each project
              tells a unique story of collaboration and creativity.
            </motion.p>
          </div>
        </div>
      </section>

      {/* Portfolio Grid */}
      <Section className="bg-black">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-white/40" size={48} />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/60 text-lg">
              No portfolio projects available yet.
            </p>
          </div>
        ) : (
          <PortfolioGrid projects={projects} />
        )}
      </Section>
    </div>
  );
}
