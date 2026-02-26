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
  Globe,
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
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BlogPostData {
  titleEn: string;
  titleAr: string;
  titleHe: string;
  slug: string;
  excerptEn: string;
  excerptAr: string;
  excerptHe: string;
  contentEn: string;
  contentAr: string;
  contentHe: string;
  coverImage: string | null;
  category: string;
  tagsEn: string[];
  tagsAr: string[];
  tagsHe: string[];
  published: boolean;
}

export default function AdminBlogEditPage() {
  const ta = useTranslations("adminUI");
  const tc = useTranslations("common");
  const tb = useTranslations("blogCategories");
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("english");

  // Tag inputs for each language
  const [tagInputEn, setTagInputEn] = useState("");
  const [tagInputAr, setTagInputAr] = useState("");
  const [tagInputHe, setTagInputHe] = useState("");

  const [data, setData] = useState<BlogPostData>({
    titleEn: "",
    titleAr: "",
    titleHe: "",
    slug: "",
    excerptEn: "",
    excerptAr: "",
    excerptHe: "",
    contentEn: "",
    contentAr: "",
    contentHe: "",
    coverImage: null,
    category: "NEWS",
    tagsEn: [],
    tagsAr: [],
    tagsHe: [],
    published: false,
  });

  useEffect(() => {
    if (!isNew) {
      fetchPost();
    }
  }, [id, isNew]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/blog/${id}?allLocales=true`);
      if (!response.ok) throw new Error("Failed to fetch");
      const post = await response.json();

      setData({
        titleEn: post.titleEn || "",
        titleAr: post.titleAr || "",
        titleHe: post.titleHe || "",
        slug: post.slug || "",
        excerptEn: post.excerptEn || "",
        excerptAr: post.excerptAr || "",
        excerptHe: post.excerptHe || "",
        contentEn: post.contentEn || "",
        contentAr: post.contentAr || "",
        contentHe: post.contentHe || "",
        coverImage: post.coverImage,
        category: post.category,
        tagsEn: post.tagsEn || [],
        tagsAr: post.tagsAr || [],
        tagsHe: post.tagsHe || [],
        published: post.published,
      });
    } catch (error) {
      console.error("Error fetching post:", error);
      alert(ta("errorOccurred"));
      router.push("/admin/blog");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (publish?: boolean) => {
    // English title is required as base
    if (!data.titleEn || !data.excerptEn || !data.contentEn) {
      setActiveTab("english");
      alert(ta("errorOccurred") + " (Missing English Content)");
      return;
    }

    setSaving(true);
    try {
      // Fallback Logic: Use English content if localized fields are empty
      const titleAr = data.titleAr || data.titleEn;
      const titleHe = data.titleHe || data.titleEn;

      const excerptAr = data.excerptAr || data.excerptEn;
      const excerptHe = data.excerptHe || data.excerptEn;

      const contentAr = data.contentAr || data.contentEn;
      const contentHe = data.contentHe || data.contentEn;

      const tagsAr = data.tagsAr.length > 0 ? data.tagsAr : data.tagsEn;
      const tagsHe = data.tagsHe.length > 0 ? data.tagsHe : data.tagsEn;

      const payload = {
        ...data,
        titleAr,
        titleHe,
        excerptAr,
        excerptHe,
        contentAr,
        contentHe,
        tagsAr,
        tagsHe,
        published: publish !== undefined ? publish : data.published,
      };

      const url = isNew ? "/api/blog" : `/api/blog/${id}`;
      const method = isNew ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save");

      router.push("/admin/blog");
    } catch (error) {
      console.error("Error saving post:", error);
      alert(ta("errorOccurred"));
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
      alert(ta("errorOccurred"));
    } finally {
      setUploading(false);
    }
  };

  const generateSlug = () => {
    const slug = data.titleEn
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setData({ ...data, slug });
  };

  const addTag = (lang: "En" | "Ar" | "He") => {
    const input = lang === "En" ? tagInputEn : lang === "Ar" ? tagInputAr : tagInputHe;
    const setInput = lang === "En" ? setTagInputEn : lang === "Ar" ? setTagInputAr : setTagInputHe;
    const tagsKey = `tags${lang}` as keyof BlogPostData;
    const currentTags = data[tagsKey] as string[];

    if (input.trim() && !currentTags.includes(input.trim())) {
      setData({ ...data, [tagsKey]: [...currentTags, input.trim()] });
      setInput("");
    }
  };

  const removeTag = (tag: string, lang: "En" | "Ar" | "He") => {
    const tagsKey = `tags${lang}` as keyof BlogPostData;
    const currentTags = data[tagsKey] as string[];
    setData({ ...data, [tagsKey]: currentTags.filter((t) => t !== tag) });
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
                {isNew ? ta("newPost") : tc("edit")}
              </h1>
              <p className="text-white/60 text-sm">
                {isNew ? ta("basicInfo") : ta("detailedContent")}
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
            {ta("saveDraft")}
          </Button>
          <Button onClick={() => handleSave(true)} disabled={saving}>
            {saving ? (
              <Loader2 size={18} className="mr-2 animate-spin" />
            ) : (
              <Eye size={18} className="mr-2" />
            )}
            {ta("publish")}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="english" className="data-[state=active]:bg-red-600">
            English
          </TabsTrigger>
          <TabsTrigger value="arabic" className="data-[state=active]:bg-red-600">
            Arabic
          </TabsTrigger>
          <TabsTrigger value="hebrew" className="data-[state=active]:bg-red-600">
            Hebrew
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* English Fields */}
          <div className={activeTab === "english" ? "block" : "hidden"}>
            <div className="space-y-6">
              {/* Title En */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <Label className="mb-2">{tc("title")} (English) *</Label>
                <Input
                  value={data.titleEn}
                  onChange={(e) => setData({ ...data, titleEn: e.target.value })}
                  placeholder={tc("title")}
                  className="text-lg"
                />
              </div>

              {/* Slug (Only needed in English tab) */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <div className="flex items-center justify-between mb-2">
                  <Label>{ta("slug")}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generateSlug}
                    className="text-xs"
                  >
                    {ta("generateSlug")}
                  </Button>
                </div>
                <Input
                  value={data.slug}
                  onChange={(e) => setData({ ...data, slug: e.target.value })}
                  placeholder={ta("slug")}
                />
                <p className="text-xs text-white/40 mt-2">
                  URL: /blog/{data.slug || ta("slug")}
                </p>
              </div>

              {/* Excerpt En */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <Label className="mb-2">{ta("excerpt")} (English) *</Label>
                <Textarea
                  value={data.excerptEn}
                  onChange={(e) => setData({ ...data, excerptEn: e.target.value })}
                  placeholder={ta("excerpt")}
                  rows={3}
                />
              </div>

              {/* Content En */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <Label className="mb-4 block">{ta("content")} (English) *</Label>
                <RichTextEditor
                  content={data.contentEn}
                  onChange={(value) => setData({ ...data, contentEn: value })}
                />
              </div>

              {/* Tags En */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <Label className="mb-2 block">{tc("tags")} (English)</Label>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={tagInputEn}
                    onChange={(e) => setTagInputEn(e.target.value)}
                    placeholder={ta("addTag")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag("En");
                      }
                    }}
                  />
                  <Button size="sm" onClick={() => addTag("En")}>
                    {tc("add")}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.tagsEn.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-white/10 px-2 py-1 rounded flex items-center gap-1"
                    >
                      #{tag}
                      <button
                        onClick={() => removeTag(tag, "En")}
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

          {/* Arabic Fields */}
          <div className={activeTab === "arabic" ? "block" : "hidden"}>
            <div className="space-y-6">
              {/* Title Ar */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <Label className="mb-2">{tc("title")} (Arabic)</Label>
                <Input
                  value={data.titleAr}
                  onChange={(e) => setData({ ...data, titleAr: e.target.value })}
                  placeholder={tc("title")}
                  className="text-lg text-right"
                  dir="rtl"
                />
              </div>

              {/* Excerpt Ar */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <Label className="mb-2">{ta("excerpt")} (Arabic)</Label>
                <Textarea
                  value={data.excerptAr}
                  onChange={(e) => setData({ ...data, excerptAr: e.target.value })}
                  placeholder={ta("excerpt")}
                  rows={3}
                  className="text-right"
                  dir="rtl"
                />
              </div>

              {/* Content Ar */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <Label className="mb-4 block">{ta("content")} (Arabic)</Label>
                <RichTextEditor
                  content={data.contentAr}
                  onChange={(value) => setData({ ...data, contentAr: value })}
                />
              </div>

              {/* Tags Ar */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <Label className="mb-2 block">{tc("tags")} (Arabic)</Label>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={tagInputAr}
                    onChange={(e) => setTagInputAr(e.target.value)}
                    placeholder={ta("addTag")}
                    className="text-right"
                    dir="rtl"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag("Ar");
                      }
                    }}
                  />
                  <Button size="sm" onClick={() => addTag("Ar")}>
                    {tc("add")}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.tagsAr.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-white/10 px-2 py-1 rounded flex items-center gap-1"
                    >
                      #{tag}
                      <button
                        onClick={() => removeTag(tag, "Ar")}
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

          {/* Hebrew Fields */}
          <div className={activeTab === "hebrew" ? "block" : "hidden"}>
            <div className="space-y-6">
              {/* Title He */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <Label className="mb-2">{tc("title")} (Hebrew)</Label>
                <Input
                  value={data.titleHe}
                  onChange={(e) => setData({ ...data, titleHe: e.target.value })}
                  placeholder={tc("title")}
                  className="text-lg text-right"
                  dir="rtl"
                />
              </div>

              {/* Excerpt He */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <Label className="mb-2">{ta("excerpt")} (Hebrew)</Label>
                <Textarea
                  value={data.excerptHe}
                  onChange={(e) => setData({ ...data, excerptHe: e.target.value })}
                  placeholder={ta("excerpt")}
                  rows={3}
                  className="text-right"
                  dir="rtl"
                />
              </div>

              {/* Content He */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <Label className="mb-4 block">{ta("content")} (Hebrew)</Label>
                <RichTextEditor
                  content={data.contentHe}
                  onChange={(value) => setData({ ...data, contentHe: value })}
                />
              </div>

              {/* Tags He */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <Label className="mb-2 block">{tc("tags")} (Hebrew)</Label>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={tagInputHe}
                    onChange={(e) => setTagInputHe(e.target.value)}
                    placeholder={ta("addTag")}
                    className="text-right"
                    dir="rtl"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag("He");
                      }
                    }}
                  />
                  <Button size="sm" onClick={() => addTag("He")}>
                    {tc("add")}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.tagsHe.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-white/10 px-2 py-1 rounded flex items-center gap-1"
                    >
                      #{tag}
                      <button
                        onClick={() => removeTag(tag, "He")}
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

        {/* Sidebar - Common Fields */}
        <div className="space-y-6">
          {/* Cover Image */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <Label className="mb-4 block">{ta("coverImage")}</Label>
            {data.coverImage ? (
              <div className="relative aspect-video rounded-lg overflow-hidden mb-4 group">
                <Image
                  src={data.coverImage}
                  alt={ta("coverImage")}
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
            <Label className="mb-2 block">{tc("category")}</Label>
            <Select
              value={data.category}
              onValueChange={(value) => setData({ ...data, category: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEWS">{tb("NEWS")}</SelectItem>
                <SelectItem value="TUTORIALS">{tb("TUTORIALS")}</SelectItem>
                <SelectItem value="BEHIND_THE_SCENES">
                  {tb("BEHIND_THE_SCENES")}
                </SelectItem>
                <SelectItem value="CASE_STUDIES">{tb("CASE_STUDIES")}</SelectItem>
                <SelectItem value="INDUSTRY_INSIGHTS">
                  {tb("INDUSTRY_INSIGHTS")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
