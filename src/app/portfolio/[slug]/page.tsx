"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowLeft, X, ChevronLeft, ChevronRight, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PortfolioItem {
  id: string;
  title: string;
  slug: string;
  description: string;
  content: string | null;
  thumbnail: string | null;
  images: string[];
  videoUrl: string | null;
  category: string;
  tags: string[];
  clientName: string | null;
  featured: boolean;
  createdAt: string;
}

export default function PortfolioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [portfolio, setPortfolio] = useState<PortfolioItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    fetchPortfolio();
  }, [slug]);

  const fetchPortfolio = async () => {
    try {
      const response = await fetch(`/api/portfolio/slug/${slug}`);
      if (!response.ok) throw new Error("Portfolio not found");
      const data = await response.json();
      setPortfolio(data);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      router.push("/portfolio");
    } finally {
      setLoading(false);
    }
  };

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = () => {
    if (portfolio) {
      setCurrentImageIndex((prev) => (prev + 1) % portfolio.images.length);
    }
  };

  const prevImage = () => {
    if (portfolio) {
      setCurrentImageIndex(
        (prev) => (prev - 1 + portfolio.images.length) % portfolio.images.length
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pt-20">
        <Loader2 className="animate-spin text-white/40" size={48} />
      </div>
    );
  }

  if (!portfolio) {
    return null;
  }

  const allImages = [
    ...(portfolio.thumbnail ? [portfolio.thumbnail] : []),
    ...portfolio.images,
  ];

  return (
    <div className="min-h-screen bg-black pt-20">
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] overflow-hidden">
        {portfolio.thumbnail ? (
          <Image
            src={portfolio.thumbnail}
            alt={portfolio.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-b from-neutral-900 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12 pb-12 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/portfolio")}
              className="mb-6 text-white/70 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Portfolio
            </Button>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="secondary">
                  {portfolio.category.replace(/_/g, " ")}
                </Badge>
                {portfolio.featured && <Badge variant="warning">Featured</Badge>}
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                {portfolio.title}
              </h1>

              <p className="text-xl text-white/80 max-w-3xl mb-6">
                {portfolio.description}
              </p>

              {portfolio.clientName && (
                <p className="text-white/60">
                  Client: <span className="text-white">{portfolio.clientName}</span>
                </p>
              )}

              {portfolio.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {portfolio.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-white/10 rounded-full text-sm text-white/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      {portfolio.videoUrl && (
        <section className="py-16 bg-neutral-950">
          <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="aspect-video bg-black rounded-xl overflow-hidden"
            >
              <video
                src={portfolio.videoUrl}
                controls
                className="w-full h-full"
              />
            </motion.div>
          </div>
        </section>
      )}

      {/* Content Section */}
      {portfolio.content && (
        <section className="py-16 bg-black">
          <div className="max-w-4xl mx-auto px-6 md:px-8 lg:px-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="prose prose-lg prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: portfolio.content }}
            />
          </div>
        </section>
      )}

      {/* Gallery Section */}
      {portfolio.images.length > 0 && (
        <section className="py-16 bg-neutral-950">
          <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl font-bold text-white mb-8"
            >
              Gallery
            </motion.h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portfolio.images.map((image, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
                  onClick={() => openLightbox(index + (portfolio.thumbnail ? 1 : 0))}
                >
                  <Image
                    src={image}
                    alt={`${portfolio.title} - Image ${index + 1}`}
                    fill
                    className="object-cover transition-transform group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-12 h-12 text-white" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors"
          >
            <X className="w-8 h-8" />
          </button>

          <button
            onClick={prevImage}
            className="absolute left-4 text-white hover:text-red-500 transition-colors"
          >
            <ChevronLeft className="w-12 h-12" />
          </button>

          <button
            onClick={nextImage}
            className="absolute right-4 text-white hover:text-red-500 transition-colors"
          >
            <ChevronRight className="w-12 h-12" />
          </button>

          <div className="relative w-full h-full max-w-6xl max-h-[90vh] p-12">
            <Image
              src={allImages[currentImageIndex]}
              alt={`${portfolio.title} - Image ${currentImageIndex + 1}`}
              fill
              className="object-contain"
            />
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white">
            {currentImageIndex + 1} / {allImages.length}
          </div>
        </div>
      )}
    </div>
  );
}
