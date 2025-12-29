"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Calendar, Clock, ArrowRight, User, FileText, Loader2 } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  category: string;
  publishedAt: string | null;
  views: number;
}

const categoryLabels: Record<string, string> = {
  NEWS: "News",
  TUTORIALS: "Tutorials",
  BEHIND_THE_SCENES: "Behind the Scenes",
  CASE_STUDIES: "Case Studies",
  INDUSTRY_INSIGHTS: "Industry Insights",
};

function BlogCard({ post, featured = false }: { post: BlogPost; featured?: boolean }) {
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
              {featured && <Badge>Featured</Badge>}
            </div>

            <h3 className={`font-bold text-white mb-3 group-hover:text-red-500 transition-colors ${featured ? "text-2xl" : "text-xl"}`}>
              {post.title}
            </h3>

            <p className="text-white/60 text-sm mb-4 line-clamp-2">
              {post.excerpt}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-white/40">
                {post.publishedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {new Date(post.publishedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {post.views} views
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
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const response = await fetch("/api/blog?published=true");
        if (response.ok) {
          const data = await response.json();
          setPosts(data);
        }
      } catch (error) {
        console.error("Error fetching blog posts:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, []);

  if (loading) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-white/40" size={48} />
      </div>
    );
  }

  // For now, consider the first 2 posts as featured
  const featuredPosts = posts.slice(0, 2);
  const regularPosts = posts.slice(2);

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

      {posts.length === 0 ? (
        <Section className="bg-black text-center">
          <FileText className="mx-auto mb-4 text-white/20" size={64} />
          <h3 className="text-xl font-semibold text-white mb-2">
            No blog posts yet
          </h3>
          <p className="text-white/60">
            Check back soon for new content from our creative team.
          </p>
        </Section>
      ) : (
        <>
          {/* Featured Posts */}
          {featuredPosts.length > 0 && (
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
          )}

          {/* All Posts */}
          {regularPosts.length > 0 && (
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
            </Section>
          )}
        </>
      )}
    </div>
  );
}
