"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { FileUpload } from "@/components/ui/file-upload";
import { useTranslations } from 'next-intl';

const categories = [
  "VIDEO_PRODUCTION",
  "PHOTOGRAPHY",
  "GRAPHIC_DESIGN",
  "WEB_DEVELOPMENT",
  "APP_DEVELOPMENT",
  "THREE_D_MODELING",
  "ANIMATION",
  "SOCIAL_MEDIA",
];

export default function PortfolioManagePage() {
  const router = useRouter();
  const params = useParams();
  const ta = useTranslations('adminUI');
  const tc = useTranslations('common');
  const portfolioId = params?.id as string;
  const isNew = portfolioId === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState("english");

  const [formData, setFormData] = useState({
    slug: "",
    category: "VIDEO_PRODUCTION",
    clientName: "",
    order: 0,
    thumbnail: "",
    images: [] as string[],
    videoUrl: "",
    featured: false,
    published: false,

    // English
    titleEn: "",
    descriptionEn: "",
    contentEn: "",
    tagsEn: "",

    // Arabic
    titleAr: "",
    descriptionAr: "",
    contentAr: "",
    tagsAr: "",

    // Hebrew
    titleHe: "",
    descriptionHe: "",
    contentHe: "",
    tagsHe: "",
  });

  useEffect(() => {
    if (!isNew) {
      fetchPortfolio();
    }
  }, [portfolioId]);

  const fetchPortfolio = async () => {
    try {
      // Fetch with allLocales=true
      const response = await fetch(`/api/portfolio/${portfolioId}?allLocales=true`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();

      setFormData({
        slug: data.slug,
        category: data.category,
        clientName: data.clientName || "",
        order: data.order || 0,
        thumbnail: data.thumbnail || "",
        images: data.images || [],
        videoUrl: data.videoUrl || "",
        featured: data.featured,
        published: data.published,

        titleEn: data.titleEn || "",
        descriptionEn: data.descriptionEn || "",
        contentEn: data.contentEn || "",
        tagsEn: Array.isArray(data.tagsEn) ? data.tagsEn.join(", ") : "",

        titleAr: data.titleAr || "",
        descriptionAr: data.descriptionAr || "",
        contentAr: data.contentAr || "",
        tagsAr: Array.isArray(data.tagsAr) ? data.tagsAr.join(", ") : "",

        titleHe: data.titleHe || "",
        descriptionHe: data.descriptionHe || "",
        contentHe: data.contentHe || "",
        tagsHe: Array.isArray(data.tagsHe) ? data.tagsHe.join(", ") : "",
      });
    } catch (err) {
      setError(ta('errorOccurred'));
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleThumbnailUpload = async (files: File[]) => {
    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append("file", files[0]);
    uploadFormData.append("type", "thumbnail");

    try {
      const response = await fetch("/api/projects/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Upload failed (${response.status})`);

      setFormData((prev) => ({ ...prev, thumbnail: result.url }));
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      const msg = error instanceof Error ? error.message : "Upload failed";
      setError(`Thumbnail upload failed: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (files: File[]) => {
    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        uploadFormData.append("type", "gallery");

        const response = await fetch("/api/projects/upload", {
          method: "POST",
          body: uploadFormData,
        });

        if (!response.ok) throw new Error("Upload failed");

        const result = await response.json();
        return result.url;
      });

      const urls = await Promise.all(uploadPromises);
      setFormData((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
    } catch (error) {
      console.error("Error uploading gallery images:", error);
      alert(ta('errorOccurred'));
    } finally {
      setUploading(false);
    }
  };

  const handleVideoUpload = async (files: File[]) => {
    setUploading(true);
    const uploadFormData = new FormData();
    uploadFormData.append("file", files[0]);
    uploadFormData.append("type", "video");

    try {
      const response = await fetch("/api/projects/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.details || result.error || `Upload failed (${response.status})`);
      }

      setFormData((prev) => ({ ...prev, videoUrl: result.url }));
    } catch (error) {
      console.error("Error uploading video:", error);
      const msg = error instanceof Error ? error.message : "Upload failed";
      setError(`Video upload failed: ${msg}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    // Basic validation
    if (!formData.titleEn || !formData.slug) {
      setError(ta('requiredFields') + " (English Title & Slug)");
      // Switch to English tab if validation fails there
      if (!formData.titleEn) setActiveTab("english");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // Process tags
      const processTags = (tagsStr: string) =>
        tagsStr.split(",").map(t => t.trim()).filter(t => t.length > 0);

      // Fallback Logic: Use English content if localized fields are empty
      const titleAr = formData.titleAr || formData.titleEn;
      const descriptionAr = formData.descriptionAr || formData.descriptionEn;
      const contentAr = formData.contentAr || formData.contentEn;
      const tagsAr = formData.tagsAr ? processTags(formData.tagsAr) : processTags(formData.tagsEn);

      const titleHe = formData.titleHe || formData.titleEn;
      const descriptionHe = formData.descriptionHe || formData.descriptionEn;
      const contentHe = formData.contentHe || formData.contentEn;
      const tagsHe = formData.tagsHe ? processTags(formData.tagsHe) : processTags(formData.tagsEn);

      const payload = {
        ...formData,
        tagsEn: processTags(formData.tagsEn),
        // Use processed fallback values
        titleAr,
        descriptionAr,
        contentAr,
        tagsAr,
        titleHe,
        descriptionHe,
        contentHe,
        tagsHe,
        videoUrl: formData.videoUrl || null,
        clientName: formData.clientName || null,
        contentEn: formData.contentEn || null,
      };

      const url = isNew ? "/api/portfolio" : `/api/portfolio/${portfolioId}`;
      const method = isNew ? "POST" : "PUT";

      console.log('Sending payload:', JSON.stringify(payload, null, 2));

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.details || data.error || "Failed to save");
      }

      const data = await response.json();
      setSuccess(true);

      if (isNew) {
        // Redirect to edit page
        router.push(`/admin/portfolio/${data.id}`);
      } else {
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(ta('deleteConfirm'))) return;

    try {
      const response = await fetch(`/api/portfolio/${portfolioId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");
      router.push("/admin/portfolio");
    } catch (err) {
      alert(ta('errorOccurred'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-white/40" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/portfolio")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {tc('back')}
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {isNew ? ta('newPortfolioItem') : ta('editPortfolioItem')}
            </h1>
            {!isNew && (
              <p className="text-white/60 text-sm mt-1">{formData.titleEn}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!isNew && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              {tc('delete')}
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
                {tc('saving')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isNew ? tc('create') : ta('saveChanges')}
              </>
            )}
          </Button>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-600/10 border border-red-600/20 rounded-lg p-4 mb-6"
        >
          <p className="text-red-500 font-medium">Error: {error}</p>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-600/10 border border-green-600/20 rounded-lg p-4 mb-6"
        >
          <p className="text-green-500">
            {isNew ? ta('createSuccess') : ta('updateSuccess')}
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-4">
              <TabsTrigger value="english">English (Default)</TabsTrigger>
              <TabsTrigger value="arabic">Arabic</TabsTrigger>
              <TabsTrigger value="hebrew">Hebrew</TabsTrigger>
            </TabsList>

            {/* English Content */}
            <TabsContent value="english" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>English Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      Title (En) *
                    </label>
                    <Input
                      value={formData.titleEn}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          titleEn: e.target.value,
                          slug: isNew ? generateSlug(e.target.value) : formData.slug,
                        })
                      }
                      placeholder="Project Title in English"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      Description (En)
                    </label>
                    <Textarea
                      value={formData.descriptionEn}
                      onChange={(e) =>
                        setFormData({ ...formData, descriptionEn: e.target.value })
                      }
                      placeholder="Short description for cards and SEO"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      Tags (En, comma separated)
                    </label>
                    <Input
                      value={formData.tagsEn}
                      onChange={(e) =>
                        setFormData({ ...formData, tagsEn: e.target.value })
                      }
                      placeholder="branding, web design, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      Detailed Content (En)
                    </label>
                    <RichTextEditor
                      content={formData.contentEn}
                      onChange={(content) => setFormData({ ...formData, contentEn: content })}
                      placeholder="Detailed project case study..."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Arabic Content */}
            <TabsContent value="arabic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Arabic Content (العربية)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4" dir="rtl">
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      العنوان (Ar)
                    </label>
                    <Input
                      value={formData.titleAr}
                      onChange={(e) =>
                        setFormData({ ...formData, titleAr: e.target.value })
                      }
                      placeholder="اسم المشروع بالعربية"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      الوصف (Ar)
                    </label>
                    <Textarea
                      value={formData.descriptionAr}
                      onChange={(e) =>
                        setFormData({ ...formData, descriptionAr: e.target.value })
                      }
                      placeholder="وصف قصير للمشروع..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      الوسوم (Ar, مفصولة بفاصلة)
                    </label>
                    <Input
                      value={formData.tagsAr}
                      onChange={(e) =>
                        setFormData({ ...formData, tagsAr: e.target.value })
                      }
                      placeholder="تصميم, برمجة, تسويق..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      المحتوى التفصيلي (Ar)
                    </label>
                    <RichTextEditor
                      content={formData.contentAr}
                      onChange={(content) => setFormData({ ...formData, contentAr: content })}
                      placeholder="تفاصيل المشروع..."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Hebrew Content */}
            <TabsContent value="hebrew" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Hebrew Content (עִברִית)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4" dir="rtl">
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      כותרת (He)
                    </label>
                    <Input
                      value={formData.titleHe}
                      onChange={(e) =>
                        setFormData({ ...formData, titleHe: e.target.value })
                      }
                      placeholder="שם הפרויקט בעברית"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      תיאור (He)
                    </label>
                    <Textarea
                      value={formData.descriptionHe}
                      onChange={(e) =>
                        setFormData({ ...formData, descriptionHe: e.target.value })
                      }
                      placeholder="תיאור קצר..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      תגיות (He, מופרד בפסיקים)
                    </label>
                    <Input
                      value={formData.tagsHe}
                      onChange={(e) =>
                        setFormData({ ...formData, tagsHe: e.target.value })
                      }
                      placeholder="עיצוב, פיתוח, שיווק..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      תוכן מפורט (He)
                    </label>
                    <RichTextEditor
                      content={formData.contentHe}
                      onChange={(content) => setFormData({ ...formData, contentHe: content })}
                      placeholder="פרטי הפרויקט..."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  {ta('slug')} *
                </label>
                <Input
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="project-slug"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  {tc('category')} *
                </label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  {ta('clientName')}
                </label>
                <Input
                  value={formData.clientName}
                  onChange={(e) =>
                    setFormData({ ...formData, clientName: e.target.value })
                  }
                  placeholder="Client Name"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Display Order
                </label>
                <Input
                  type="number"
                  value={formData.order}
                  onChange={(e) =>
                    setFormData({ ...formData, order: parseInt(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) =>
                      setFormData({ ...formData, featured: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  {tc('featured')}
                </label>
                <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) =>
                      setFormData({ ...formData, published: e.target.checked })
                    }
                    className="w-4 h-4 rounded"
                  />
                  {tc('published')}
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{ta('media')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Thumbnail
                </label>
                {formData.thumbnail ? (
                  <div className="relative inline-block w-full">
                    <img
                      src={formData.thumbnail}
                      alt="Thumbnail"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, thumbnail: "" })}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ) : (
                  <FileUpload
                    onChange={handleThumbnailUpload}
                    accept="image/*"
                    disabled={uploading}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Video Upload
                </label>
                {formData.videoUrl ? (
                  <div className="relative w-full">
                    <video
                      src={formData.videoUrl}
                      controls
                      className="w-full h-32 rounded-lg bg-black"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, videoUrl: "" })}
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ) : uploading ? (
                  <div className="w-full h-32 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center gap-2 text-white/60">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-sm">Uploading video… this may take a minute</span>
                  </div>
                ) : (
                  <FileUpload
                    onChange={handleVideoUpload}
                    accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/*"
                    disabled={uploading}
                  />
                )}
                <p className="mt-1 text-[11px] text-white/30">MP4, MOV, WebM supported · Large files may take a few minutes</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gallery</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {formData.images.map((img, index) => (
                  <div key={index} className="relative h-20 rounded-lg overflow-hidden group">
                    <img src={img} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          images: formData.images.filter((_, i) => i !== index),
                        })
                      }
                      className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                ))}
              </div>
              {formData.images.length < 10 && (
                <FileUpload
                  onChange={handleGalleryUpload}
                  accept="image/*"
                  disabled={uploading}
                  multiple
                />
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
