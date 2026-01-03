"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    content: "",
    category: "VIDEO_PRODUCTION",
    thumbnail: "",
    images: [] as string[],
    videoUrl: "",
    featured: false,
    published: false,
    tags: "",
    clientName: "",
    order: 0,
  });

  useEffect(() => {
    if (!isNew) {
      fetchPortfolio();
    }
  }, [portfolioId]);

  const fetchPortfolio = async () => {
    try {
      const response = await fetch(`/api/portfolio/${portfolioId}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();

      setFormData({
        title: data.title,
        slug: data.slug,
        description: data.description,
        content: data.content || "",
        category: data.category,
        thumbnail: data.thumbnail || "",
        images: data.images || [],
        videoUrl: data.videoUrl || "",
        featured: data.featured,
        published: data.published,
        tags: data.tags.join(", "),
        clientName: data.clientName || "",
        order: data.order || 0,
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

      if (!response.ok) throw new Error("Upload failed");

      const result = await response.json();
      setFormData((prev) => ({ ...prev, thumbnail: result.url }));
    } catch (error) {
      console.error("Error uploading thumbnail:", error);
      alert(ta('errorOccurred'));
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

      if (!response.ok) throw new Error("Upload failed");

      const result = await response.json();
      setFormData((prev) => ({ ...prev, videoUrl: result.url }));
    } catch (error) {
      console.error("Error uploading video:", error);
      alert(ta('errorOccurred'));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug || !formData.description) {
      setError(ta('requiredFields'));
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const tags = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const payload = {
        ...formData,
        tags,
        videoUrl: formData.videoUrl || null,
        clientName: formData.clientName || null,
      };

      const url = isNew ? "/api/portfolio" : `/api/portfolio/${portfolioId}`;
      const method = isNew ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save");
      }

      const data = await response.json();
      setSuccess(true);

      if (isNew) {
        router.push(`/admin/portfolio/${data.id}`);
      } else {
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(ta('deleteConfirm'))
    ) {
      return;
    }

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
    <div className="max-w-5xl mx-auto">
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
              <p className="text-white/60 text-sm mt-1">{formData.title}</p>
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
          <p className="text-red-500">{error}</p>
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-6"
      >
        {/* Basic Information */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">
              {ta('basicInfo')}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-white/70 mb-2">
                  {tc('title')} *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      title: e.target.value,
                      slug: generateSlug(e.target.value),
                    })
                  }
                  placeholder={tc('title')}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-white/70 mb-2">
                  {ta('slug')} *
                </label>
                <Input
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder={ta('slug')}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-white/70 mb-2">
                  {tc('description')} *
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={tc('description')}
                  rows={3}
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
                  placeholder={ta('clientName')}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-white/70 mb-2">
                  {tc('tags')}
                </label>
                <Input
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder={tc('tags')}
                />
              </div>

              <div className="col-span-2 space-y-2">
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
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              {ta('detailedContent')}
            </h2>
            <RichTextEditor
              content={formData.content}
              onChange={(content) => setFormData({ ...formData, content })}
              placeholder={ta('detailedContent')}
            />
          </CardContent>
        </Card>

        {/* Media */}
        <Card>
          <CardContent className="p-6 space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">{ta('media')}</h2>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                {tc('image')} *
              </label>
              {formData.thumbnail ? (
                <div className="relative inline-block">
                  <img
                    src={formData.thumbnail}
                    alt="Thumbnail"
                    className="w-full h-48 object-cover rounded-lg"
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
                {ta('gallery')}
              </label>
              {formData.images.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {formData.images.map((img, index) => (
                    <div key={index} className="relative h-32 rounded-lg overflow-hidden group">
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
                        className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {formData.images.length < 10 && (
                <FileUpload
                  onChange={handleGalleryUpload}
                  accept="image/*"
                  disabled={uploading}
                  multiple
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                {tc('file')}
              </label>
              {formData.videoUrl ? (
                <div className="relative">
                  <video
                    src={formData.videoUrl}
                    controls
                    className="w-full h-48 rounded-lg bg-black"
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
              ) : (
                <FileUpload
                  onChange={handleVideoUpload}
                  accept="video/*"
                  disabled={uploading}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/portfolio")}
          >
            {tc('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
                {tc('saving')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isNew ? ta('newPortfolioItem') : ta('saveChanges')}
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
