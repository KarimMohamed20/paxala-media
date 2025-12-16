"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { projectCategories } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  images: string[];
  videoUrl?: string;
  category: string;
  tags: string[];
  clientName?: string;
  featured?: boolean;
}

interface PortfolioGridProps {
  projects: Project[];
}

export function PortfolioGrid({ projects }: PortfolioGridProps) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxProject, setLightboxProject] = useState<Project | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const filteredProjects =
    activeFilter === "all"
      ? projects
      : projects.filter((p) => p.category === activeFilter);

  const openLightbox = (project: Project, index: number = 0) => {
    setLightboxProject(project);
    setLightboxIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxProject(null);
    document.body.style.overflow = "auto";
  };

  const nextImage = () => {
    if (lightboxProject) {
      setLightboxIndex((prev) =>
        prev === lightboxProject.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (lightboxProject) {
      setLightboxIndex((prev) =>
        prev === 0 ? lightboxProject.images.length - 1 : prev - 1
      );
    }
  };

  return (
    <>
      {/* Filter Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {projectCategories.map((category) => (
          <button
            key={category.value}
            onClick={() => setActiveFilter(category.value)}
            className={cn(
              "px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300",
              activeFilter === category.value
                ? "bg-red-600 text-white"
                : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
            )}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Projects Grid */}
      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group cursor-pointer"
              onClick={() => openLightbox(project)}
            >
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-900">
                {/* Thumbnail */}
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900">
                  {project.thumbnail ? (
                    <Image
                      src={project.thumbnail}
                      alt={project.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl font-bold text-white/10">
                        {project.title.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />

                {/* Video indicator */}
                {project.videoUrl && (
                  <div className="absolute top-4 right-4 p-2 rounded-full bg-black/50 backdrop-blur-sm">
                    <Play size={16} className="text-white" />
                  </div>
                )}

                {/* Featured badge */}
                {project.featured && (
                  <div className="absolute top-4 left-4">
                    <Badge>Featured</Badge>
                  </div>
                )}

                {/* Content overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {project.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs text-white/70 bg-white/10 px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-1">
                    {project.title}
                  </h3>
                  {project.clientName && (
                    <p className="text-sm text-white/60">
                      Client: {project.clientName}
                    </p>
                  )}
                </div>

                {/* Red accent line */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <div className="text-center py-20">
          <p className="text-white/60 text-lg">
            No projects found in this category.
          </p>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && lightboxProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50"
            >
              <X size={24} className="text-white" />
            </button>

            {/* Navigation */}
            {lightboxProject.images.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50"
                >
                  <ChevronLeft size={24} className="text-white" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50"
                >
                  <ChevronRight size={24} className="text-white" />
                </button>
              </>
            )}

            {/* Content */}
            <div
              className="max-w-5xl w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Image/Video */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-900 mb-6">
                {lightboxProject.videoUrl && lightboxIndex === 0 ? (
                  <iframe
                    src={lightboxProject.videoUrl}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                  />
                ) : lightboxProject.images[lightboxIndex] ? (
                  <Image
                    src={lightboxProject.images[lightboxIndex]}
                    alt={lightboxProject.title}
                    fill
                    className="object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl font-bold text-white/10">
                      {lightboxProject.title.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">
                    {lightboxProject.title}
                  </h2>
                  <p className="text-white/60 max-w-xl">
                    {lightboxProject.description}
                  </p>
                </div>
                <Link href={`/portfolio/${lightboxProject.slug}`}>
                  <Button variant="secondary" className="whitespace-nowrap">
                    View Details
                    <ExternalLink size={16} className="ml-2" />
                  </Button>
                </Link>
              </div>

              {/* Thumbnails */}
              {lightboxProject.images.length > 1 && (
                <div className="flex gap-2 mt-6 overflow-x-auto pb-2">
                  {lightboxProject.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setLightboxIndex(idx)}
                      className={cn(
                        "relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all",
                        lightboxIndex === idx
                          ? "border-red-500"
                          : "border-transparent opacity-60 hover:opacity-100"
                      )}
                    >
                      <Image
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
