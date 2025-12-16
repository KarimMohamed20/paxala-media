import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowRight, User } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights, tutorials, and behind-the-scenes stories from Paxala Media Production.",
};

// Sample blog posts - would come from database
const blogPosts = [
  {
    id: "1",
    title: "The Art of Visual Storytelling in Commercial Video",
    slug: "art-of-visual-storytelling",
    excerpt:
      "Discover how compelling narratives can transform your brand message into an unforgettable visual experience that resonates with your audience.",
    coverImage: "",
    category: "TUTORIALS",
    author: "Ahmad Hajuj",
    publishedAt: "2024-12-01",
    readTime: "5 min read",
    featured: true,
  },
  {
    id: "2",
    title: "Behind the Scenes: Our Latest Product Shoot",
    slug: "behind-the-scenes-product-shoot",
    excerpt:
      "Take a peek into our studio as we showcase the equipment, techniques, and creativity that goes into a professional product photography session.",
    coverImage: "",
    category: "BEHIND_THE_SCENES",
    author: "Basel Hajuj",
    publishedAt: "2024-11-28",
    readTime: "4 min read",
  },
  {
    id: "3",
    title: "5 Web Design Trends Dominating 2024",
    slug: "web-design-trends-2024",
    excerpt:
      "From dark mode aesthetics to micro-interactions, explore the design trends that are shaping the digital landscape this year.",
    coverImage: "",
    category: "INDUSTRY_INSIGHTS",
    author: "Mustafa Khalil",
    publishedAt: "2024-11-25",
    readTime: "6 min read",
  },
  {
    id: "4",
    title: "How We Transformed a Local Brand's Digital Presence",
    slug: "case-study-local-brand-transformation",
    excerpt:
      "A detailed case study on how our integrated approach to video, photography, and web design helped a local business triple their online engagement.",
    coverImage: "",
    category: "CASE_STUDIES",
    author: "Ahmad Hajuj",
    publishedAt: "2024-11-20",
    readTime: "8 min read",
    featured: true,
  },
  {
    id: "5",
    title: "Drone Cinematography: Tips for Stunning Aerial Shots",
    slug: "drone-cinematography-tips",
    excerpt:
      "Learn the techniques and best practices for capturing breathtaking aerial footage that elevates your video production.",
    coverImage: "",
    category: "TUTORIALS",
    author: "Ali Hajuj",
    publishedAt: "2024-11-15",
    readTime: "7 min read",
  },
  {
    id: "6",
    title: "The Future of 3D Visualization in Marketing",
    slug: "future-of-3d-visualization",
    excerpt:
      "Explore how 3D modeling and visualization are revolutionizing product marketing and customer experience.",
    coverImage: "",
    category: "INDUSTRY_INSIGHTS",
    author: "Mahmoud Khalil",
    publishedAt: "2024-11-10",
    readTime: "5 min read",
  },
];

const categoryLabels: Record<string, string> = {
  NEWS: "News",
  TUTORIALS: "Tutorials",
  BEHIND_THE_SCENES: "Behind the Scenes",
  CASE_STUDIES: "Case Studies",
  INDUSTRY_INSIGHTS: "Industry Insights",
};

function BlogCard({ post, featured = false }: { post: typeof blogPosts[0]; featured?: boolean }) {
  return (
    <article className={`group ${featured ? "md:col-span-2" : ""}`}>
      <Link href={`/blog/${post.slug}`}>
        <div className={`relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/20 transition-all ${featured ? "md:flex" : ""}`}>
          {/* Image */}
          <div className={`relative ${featured ? "md:w-1/2" : ""} aspect-video bg-neutral-900`}>
            {post.coverImage ? (
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl font-bold text-white/10">
                  {post.title.charAt(0)}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Content */}
          <div className={`p-6 ${featured ? "md:w-1/2 md:flex md:flex-col md:justify-center" : ""}`}>
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="secondary">
                {categoryLabels[post.category] || post.category}
              </Badge>
              {post.featured && <Badge>Featured</Badge>}
            </div>

            <h3 className={`font-bold text-white mb-3 group-hover:text-red-500 transition-colors ${featured ? "text-2xl" : "text-xl"}`}>
              {post.title}
            </h3>

            <p className="text-white/60 text-sm mb-4 line-clamp-2">
              {post.excerpt}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-white/40">
                <span className="flex items-center gap-1">
                  <User size={14} />
                  {post.author}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(post.publishedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {post.readTime}
                </span>
              </div>
            </div>
          </div>

          {/* Red accent */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
        </div>
      </Link>
    </article>
  );
}

export default function BlogPage() {
  const featuredPosts = blogPosts.filter((p) => p.featured);
  const regularPosts = blogPosts.filter((p) => !p.featured);

  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-neutral-950 to-black">
        <div className="mx-auto px-6 md:px-8 lg:px-12 max-w-7xl">
          <div className="max-w-3xl">
            <span className="inline-block text-red-500 font-medium mb-4 tracking-wider uppercase text-sm">
              Our Blog
            </span>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="text-red-500">I</span>
              <span className="text-white">nsights & Stories</span>
            </h1>
            <p className="text-xl text-white/60 leading-relaxed">
              Discover tutorials, behind-the-scenes content, case studies, and
              industry insights from our creative team.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      <Section className="bg-black">
        <SectionHeader
          subtitle="Featured"
          title="Featured Articles"
          align="left"
        />
        <div className="grid md:grid-cols-2 gap-6">
          {featuredPosts.map((post) => (
            <BlogCard key={post.id} post={post} featured />
          ))}
        </div>
      </Section>

      {/* All Posts */}
      <Section className="bg-gradient-to-b from-black to-neutral-950">
        <SectionHeader
          subtitle="Latest"
          title="Recent Articles"
          align="left"
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regularPosts.map((post) => (
            <BlogCard key={post.id} post={post} />
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <Button variant="secondary" size="lg">
            Load More Articles
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>
      </Section>
    </div>
  );
}
