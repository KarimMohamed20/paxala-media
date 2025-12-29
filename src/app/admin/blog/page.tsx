"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus,
  FileText,
  Edit,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Calendar,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  category: string;
  tags: string[];
  published: boolean;
  publishedAt: string | null;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminBlogPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [filter, setFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT">("ALL");

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch("/api/blog");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const response = await fetch(`/api/blog/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      fetchPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post");
    }
  };

  const togglePublished = async (post: BlogPost) => {
    try {
      const response = await fetch(`/api/blog/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...post,
          published: !post.published,
        }),
      });

      if (!response.ok) throw new Error("Failed to update");

      fetchPosts();
    } catch (error) {
      console.error("Error updating post:", error);
      alert("Failed to update post");
    }
  };

  const filteredPosts =
    filter === "ALL"
      ? posts
      : posts.filter((p) =>
          filter === "PUBLISHED" ? p.published : !p.published
        );

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "NEWS":
        return "bg-blue-600";
      case "TUTORIALS":
        return "bg-green-600";
      case "BEHIND_THE_SCENES":
        return "bg-purple-600";
      case "CASE_STUDIES":
        return "bg-orange-600";
      case "INDUSTRY_INSIGHTS":
        return "bg-pink-600";
      default:
        return "bg-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-white/40" size={48} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-600/10">
            <FileText className="text-red-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Blog Posts
            </h1>
            <p className="text-white/60 text-sm">
              Manage your blog content
            </p>
          </div>
        </div>
        <Button onClick={() => router.push("/admin/blog/new")} size="lg">
          <Plus size={18} className="mr-2" />
          New Post
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {["ALL", "PUBLISHED", "DRAFT"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-red-600 text-white"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Posts Grid */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="mx-auto mb-4 text-white/20" size={64} />
          <h3 className="text-xl font-semibold text-white mb-2">
            No posts found
          </h3>
          <p className="text-white/60 mb-6">
            {filter === "DRAFT"
              ? "No draft posts yet"
              : filter === "PUBLISHED"
              ? "No published posts yet"
              : "Create your first blog post to get started"}
          </p>
          <Button onClick={() => router.push("/admin/blog/new")}>
            <Plus size={18} className="mr-2" />
            Create Post
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/5 rounded-xl border border-white/10 overflow-hidden hover:border-red-500/50 transition-colors group"
            >
              {/* Cover Image */}
              <div className="relative aspect-video bg-neutral-900">
                {post.coverImage ? (
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FileText className="text-white/10" size={64} />
                  </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                  <Badge className={getCategoryColor(post.category)}>
                    {post.category.replace("_", " ")}
                  </Badge>
                  {post.published ? (
                    <Badge className="bg-green-600">Published</Badge>
                  ) : (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-white/60 text-sm mb-4 line-clamp-2">
                  {post.excerpt}
                </p>

                {/* Tags */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded"
                      >
                        #{tag}
                      </span>
                    ))}
                    {post.tags.length > 3 && (
                      <span className="text-xs text-white/50">
                        +{post.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-white/60 mb-4">
                  <div className="flex items-center gap-1">
                    <Eye size={12} />
                    {post.views}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePublished(post)}
                    className={
                      post.published
                        ? "text-green-500 hover:text-green-400"
                        : "text-white/40 hover:text-white/60"
                    }
                    title={
                      post.published ? "Unpublish post" : "Publish post"
                    }
                  >
                    {post.published ? <Eye size={16} /> : <EyeOff size={16} />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/admin/blog/${post.id}`)}
                    className="text-blue-500 hover:text-blue-400"
                  >
                    <Edit size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(post.id, post.title)}
                    className="text-red-500 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
