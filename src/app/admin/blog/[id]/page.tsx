"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Save,
  Loader2,
  ArrowLeft,
  FileText,
  Eye,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { FileUpload } from "@/components/ui/file-upload";
import Image from "next/image";

interface BlogPostData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  category: string;
  tags: string[];
  published: boolean;
}

export default function AdminBlogEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [data, setData] = useState<BlogPostData>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    coverImage: null,
    category: "NEWS",
    tags: [],
    published: false,
  });

  useEffect(() => {
    if (!isNew) {
      fetchPost();
    }
  }, [id, isNew]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/blog/${id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const post = await response.json();

      setData({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.coverImage,
        category: post.category,
        tags: post.tags || [],
        published: post.published,
      });
    } catch (error) {
      console.error("Error fetching post:", error);
      alert("Failed to load post");
      router.push("/admin/blog");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (publish?: boolean) => {
    if (!data.title || !data.excerpt || !data.content) {
      alert("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const url = isNew ? "/api/blog" : `/api/blog/${id}`;
      const method = isNew ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          published: publish !== undefined ? publish : data.published,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      router.push("/admin/blog");
    } catch (error) {
      console.error("Error saving post:", error);
      alert("Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("type", "thumbnail");

      const response = await fetch("/api/projects/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload");

      const result = await response.json();
      setData({ ...data, coverImage: result.url });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const generateSlug = () => {
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setData({ ...data, slug });
  };

  const addTag = () => {
    if (tagInput.trim() && !data.tags.includes(tagInput.trim())) {
      setData({ ...data, tags: [...data.tags, tagInput.trim()] });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setData({ ...data, tags: data.tags.filter((t) => t !== tag) });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-white/40" size={48} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/blog")}
          >
            <ArrowLeft size={18} />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-600/10">
              <FileText className="text-red-500" size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {isNew ? "New Blog Post" : "Edit Blog Post"}
              </h1>
              <p className="text-white/60 text-sm">
                {isNew ? "Create a new blog post" : "Edit your blog post"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            {saving ? (
              <Loader2 size={18} className="mr-2 animate-spin" />
            ) : (
              <Save size={18} className="mr-2" />
            )}
            Save Draft
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            {saving ? (
              <Loader2 size={18} className="mr-2 animate-spin" />
            ) : (
              <Eye size={18} className="mr-2" />
            )}
            Publish
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <Label className="mb-2">Title *</Label>
            <Input
              value={data.title}
              onChange={(e) => setData({ ...data, title: e.target.value })}
              placeholder="Enter post title"
              className="text-lg"
            />
          </div>

          {/* Slug */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <div className="flex items-center justify-between mb-2">
              <Label>URL Slug</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={generateSlug}
                className="text-xs"
              >
                Generate from title
              </Button>
            </div>
            <Input
              value={data.slug}
              onChange={(e) => setData({ ...data, slug: e.target.value })}
              placeholder="post-url-slug"
            />
            <p className="text-xs text-white/40 mt-2">
              URL: /blog/{data.slug || "post-url-slug"}
            </p>
          </div>

          {/* Excerpt */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <Label className="mb-2">Excerpt *</Label>
            <Textarea
              value={data.excerpt}
              onChange={(e) => setData({ ...data, excerpt: e.target.value })}
              placeholder="Brief summary of the post (shown in listings)"
              rows={3}
            />
          </div>

          {/* Content */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <Label className="mb-4 block">Content *</Label>
            <RichTextEditor
              content={data.content}
              onChange={(value) => setData({ ...data, content: value })}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Cover Image */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <Label className="mb-4 block">Cover Image</Label>
            {data.coverImage ? (
              <div className="relative aspect-video rounded-lg overflow-hidden mb-4 group">
                <Image
                  src={data.coverImage}
                  alt="Cover"
                  fill
                  className="object-cover"
                />
                <button
                  onClick={() => setData({ ...data, coverImage: null })}
                  className="absolute top-2 right-2 p-2 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            ) : (
              <FileUpload
                onChange={handleImageUpload}
                accept="image/*"
                disabled={uploading}
              />
            )}
          </div>

          {/* Category */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <Label className="mb-2 block">Category</Label>
            <Select
              value={data.category}
              onValueChange={(value) => setData({ ...data, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEWS">News</SelectItem>
                <SelectItem value="TUTORIALS">Tutorials</SelectItem>
                <SelectItem value="BEHIND_THE_SCENES">
                  Behind the Scenes
                </SelectItem>
                <SelectItem value="CASE_STUDIES">Case Studies</SelectItem>
                <SelectItem value="INDUSTRY_INSIGHTS">
                  Industry Insights
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <Label className="mb-2 block">Tags</Label>
            <div className="flex gap-2 mb-3">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Add a tag"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button size="sm" onClick={addTag}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs bg-white/10 px-2 py-1 rounded flex items-center gap-1"
                >
                  #{tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-red-500"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
