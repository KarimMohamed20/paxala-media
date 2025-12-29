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
      setError("Failed to load portfolio item");
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
      alert("Failed to upload thumbnail");
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
      alert("Failed to upload gallery images");
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
      alert("Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug || !formData.description) {
      setError("Please fill in all required fields");
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
      !confirm(
        "Are you sure you want to delete this portfolio item? This action cannot be undone."
      )
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
      alert("Failed to delete portfolio item");
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
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">
              {isNew ? "New Portfolio Item" : "Edit Portfolio Item"}
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
              Delete
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isNew ? "Create" : "Save Changes"}
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
            Portfolio item {isNew ? "created" : "updated"} successfully!
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
              Basic Information
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-white/70 mb-2">
                  Title *
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
                  placeholder="Portfolio item title"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-white/70 mb-2">
                  Slug *
                </label>
                <Input
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="portfolio-item-slug"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-white/70 mb-2">
                  Description *
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Category *
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
                  Client Name
                </label>
                <Input
                  value={formData.clientName}
                  onChange={(e) =>
                    setFormData({ ...formData, clientName: e.target.value })
                  }
                  placeholder="Optional client name"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-white/70 mb-2">
                  Tags (comma-separated)
                </label>
                <Input
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="e.g., branding, commercial, corporate"
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
                  Featured (show on homepage)
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
                  Published (visible to public)
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              Detailed Content
            </h2>
            <RichTextEditor
              content={formData.content}
              onChange={(content) => setFormData({ ...formData, content })}
              placeholder="Write detailed content about this portfolio item..."
            />
          </CardContent>
        </Card>

        {/* Media */}
        <Card>
          <CardContent className="p-6 space-y-6">
            <h2 className="text-xl font-semibold text-white mb-4">Media</h2>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Thumbnail Image *
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
                Gallery Images (max 10)
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
                Video File (optional)
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
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="animate-spin w-4 h-4 mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isNew ? "Create Portfolio Item" : "Save Changes"}
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
