"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, ArrowLeft, Eye, Loader2, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  category: string;
  tags: string[];
  publishedAt: string | null;
  views: number;
  createdAt: string;
}

const categoryLabels: Record<string, string> = {
  NEWS: "News",
  TUTORIALS: "Tutorials",
  BEHIND_THE_SCENES: "Behind the Scenes",
  CASE_STUDIES: "Case Studies",
  INDUSTRY_INSIGHTS: "Industry Insights",
};

export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchPost() {
      try {
        const response = await fetch(`/api/blog/slug/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setPost(data);
        } else if (response.status === 404) {
          setNotFound(true);
        }
      } catch (error) {
        console.error("Error fetching blog post:", error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchPost();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black pt-20">
        <Loader2 className="animate-spin text-white/40" size={48} />
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black pt-20">
        <div className="text-center">
          <FileText className="mx-auto mb-4 text-white/20" size={64} />
          <h1 className="text-3xl font-bold text-white mb-2">Post Not Found</h1>
          <p className="text-white/60 mb-6">
            The blog post you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.push("/blog")}>
            <ArrowLeft size={18} className="mr-2" />
            Back to Blog
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-20">
      {/* Back Button */}
      <div className="mx-auto px-6 md:px-8 lg:px-12 max-w-4xl pt-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft size={18} />
          Back to Blog
        </Link>
      </div>

      {/* Cover Image */}
      {post.coverImage && (
        <div className="relative w-full aspect-[21/9] max-h-[500px] mb-12 overflow-hidden">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
        </div>
      )}

      {/* Article Content */}
      <article className="mx-auto px-6 md:px-8 lg:px-12 max-w-4xl pb-20">
        {/* Meta Info */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Badge variant="secondary">
            {categoryLabels[post.category] || post.category}
          </Badge>
          {post.tags.map((tag) => (
            <Badge key={tag} className="bg-white/5 text-white/70 hover:bg-white/10">
              #{tag}
            </Badge>
          ))}
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          {post.title}
        </h1>

        {/* Excerpt */}
        <p className="text-xl text-white/70 mb-8 leading-relaxed">
          {post.excerpt}
        </p>

        {/* Post Meta */}
        <div className="flex items-center gap-6 pb-8 mb-8 border-b border-white/10">
          <div className="flex items-center gap-2 text-white/60">
            <Calendar size={16} />
            <span className="text-sm">
              {post.publishedAt
                ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : new Date(post.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-white/60">
            <Eye size={16} />
            <span className="text-sm">{post.views} views</span>
          </div>
        </div>

        {/* Content */}
        <div
          className="prose prose-lg prose-invert max-w-none
            prose-headings:text-white prose-headings:font-bold
            prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4
            prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-white/80 prose-p:leading-relaxed prose-p:mb-6
            prose-a:text-red-500 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-white prose-strong:font-semibold
            prose-ul:text-white/80 prose-ol:text-white/80
            prose-li:mb-2
            prose-blockquote:border-l-4 prose-blockquote:border-red-500 prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-white/70
            prose-code:text-red-400 prose-code:bg-white/5 prose-code:px-2 prose-code:py-1 prose-code:rounded
            prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10
            prose-img:rounded-xl prose-img:shadow-2xl"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>
    </div>
  );
}
