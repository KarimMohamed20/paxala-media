"use client";

import { motion } from "framer-motion";
import { Section, SectionHeader } from "@/components/ui/section";
import { PortfolioGrid } from "@/components/sections/portfolio-grid";

// Sample projects data - in production, this would come from the database
const sampleProjects = [
  {
    id: "1",
    title: "Brand Campaign Video",
    slug: "brand-campaign-video",
    description:
      "A comprehensive brand campaign video showcasing the client's new product line with stunning visuals and compelling storytelling.",
    thumbnail: "",
    images: [],
    videoUrl: "",
    category: "VIDEO_PRODUCTION",
    tags: ["Commercial", "Brand", "Marketing"],
    clientName: "Tech Startup",
    featured: true,
  },
  {
    id: "2",
    title: "Product Photography",
    slug: "product-photography",
    description:
      "High-end product photography for an e-commerce fashion brand, featuring detailed shots and lifestyle imagery.",
    thumbnail: "",
    images: [],
    category: "PHOTOGRAPHY",
    tags: ["E-commerce", "Fashion", "Product"],
    clientName: "Fashion Brand",
  },
  {
    id: "3",
    title: "Corporate Website",
    slug: "corporate-website",
    description:
      "Modern, responsive corporate website with custom CMS integration and advanced animations.",
    thumbnail: "",
    images: [],
    category: "WEB_DEVELOPMENT",
    tags: ["Corporate", "React", "CMS"],
    clientName: "Financial Services",
    featured: true,
  },
  {
    id: "4",
    title: "3D Product Visualization",
    slug: "3d-product-visualization",
    description:
      "Photorealistic 3D renders of consumer electronics for marketing materials and web presence.",
    thumbnail: "",
    images: [],
    category: "THREE_D_MODELING",
    tags: ["3D", "Visualization", "Product"],
    clientName: "Electronics Company",
  },
  {
    id: "5",
    title: "Social Media Campaign",
    slug: "social-media-campaign",
    description:
      "Multi-platform social media campaign with custom graphics, animations, and video content.",
    thumbnail: "",
    images: [],
    category: "SOCIAL_MEDIA",
    tags: ["Social", "Campaign", "Digital"],
    clientName: "Restaurant Chain",
  },
  {
    id: "6",
    title: "Mobile App UI/UX",
    slug: "mobile-app-ui-ux",
    description:
      "Complete UI/UX design and development for a fitness tracking mobile application.",
    thumbnail: "",
    images: [],
    category: "APP_DEVELOPMENT",
    tags: ["Mobile", "UI/UX", "Fitness"],
    clientName: "Health Startup",
  },
  {
    id: "7",
    title: "Brand Identity Design",
    slug: "brand-identity-design",
    description:
      "Complete brand identity including logo, color palette, typography, and brand guidelines.",
    thumbnail: "",
    images: [],
    category: "GRAPHIC_DESIGN",
    tags: ["Branding", "Logo", "Identity"],
    clientName: "Consulting Firm",
  },
  {
    id: "8",
    title: "Event Coverage",
    slug: "event-coverage",
    description:
      "Full event photography and videography coverage for a major industry conference.",
    thumbnail: "",
    images: [],
    videoUrl: "",
    category: "VIDEO_PRODUCTION",
    tags: ["Event", "Conference", "Documentary"],
    clientName: "Tech Conference",
  },
  {
    id: "9",
    title: "Animated Explainer",
    slug: "animated-explainer",
    description:
      "2D animated explainer video explaining complex financial services in an engaging way.",
    thumbnail: "",
    images: [],
    videoUrl: "",
    category: "ANIMATION",
    tags: ["Animation", "Explainer", "2D"],
    clientName: "Fintech Company",
    featured: true,
  },
];

export default function PortfolioPage() {
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
        <PortfolioGrid projects={sampleProjects} />
      </Section>
    </div>
  );
}
