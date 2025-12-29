"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Save, Loader2, Plus, X, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { Switch } from "@/components/ui/switch";

interface ServiceData {
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  image: string | null;
  features: string[];
  order: number;
  isActive: boolean;
}

export default function AdminServiceEditPage() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState("");
  const [data, setData] = useState<ServiceData>({
    name: "",
    slug: "",
    description: "",
    icon: null,
    image: null,
    features: [],
    order: 0,
    isActive: true,
  });

  useEffect(() => {
    if (!isNew) {
      fetchService();
    }
  }, []);

  const fetchService = async () => {
    try {
      const response = await fetch(`/api/services/${params.id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const service = await response.json();
      setData(service);
    } catch (error) {
      console.error("Error fetching service:", error);
      alert("Failed to load service");
      router.push("/admin/services");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (files: File[], type: "icon" | "image") => {
    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("type", "thumbnail");

      const response = await fetch("/api/projects/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const result = await response.json();
      setData({ ...data, [type]: result.url });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
    }
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setData({ ...data, features: [...data.features, newFeature.trim()] });
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setData({
      ...data,
      features: data.features.filter((_, i) => i !== index),
    });
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (name: string) => {
    setData({
      ...data,
      name,
      slug: isNew ? generateSlug(name) : data.slug,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = isNew ? "/api/services" : `/api/services/${params.id}`;
      const method = isNew ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to save");

      router.push("/admin/services");
    } catch (error) {
      console.error("Error saving service:", error);
      alert("Failed to save service");
    } finally {
      setSaving(false);
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
    <div className="p-4 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/services")}
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          <div className="p-3 rounded-xl bg-red-600/10">
            <Briefcase className="text-red-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {isNew ? "Add Service" : "Edit Service"}
            </h1>
            <p className="text-white/60 text-sm">
              {isNew
                ? "Create a new service offering"
                : "Update service details"}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-xl border border-white/10 p-6"
        >
          <h2 className="text-xl font-semibold text-white mb-6">
            Basic Information
          </h2>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                value={data.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Video Production"
                required
              />
            </div>

            <div>
              <Label htmlFor="slug">URL Slug *</Label>
              <Input
                id="slug"
                value={data.slug}
                onChange={(e) => setData({ ...data, slug: e.target.value })}
                placeholder="e.g., video-production"
                required
              />
              <p className="text-xs text-white/40 mt-1">
                Used in URLs - lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={data.description}
                onChange={(e) =>
                  setData({ ...data, description: e.target.value })
                }
                placeholder="Brief description of the service"
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="order">Display Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={data.order}
                  onChange={(e) =>
                    setData({ ...data, order: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
                <p className="text-xs text-white/40 mt-1">
                  Lower numbers appear first
                </p>
              </div>

              <div className="flex items-center justify-between pt-6">
                <Label htmlFor="isActive">Active Status</Label>
                <Switch
                  id="isActive"
                  checked={data.isActive}
                  onCheckedChange={(checked) =>
                    setData({ ...data, isActive: checked })
                  }
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 rounded-xl border border-white/10 p-6"
        >
          <h2 className="text-xl font-semibold text-white mb-6">Features</h2>

          <div className="space-y-4">
            {/* Add Feature */}
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Add a feature..."
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addFeature();
                  }
                }}
              />
              <Button
                type="button"
                onClick={addFeature}
                variant="secondary"
                size="sm"
              >
                <Plus size={18} />
              </Button>
            </div>

            {/* Features List */}
            {data.features.length > 0 && (
              <div className="space-y-2">
                {data.features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-2 bg-white/5 rounded-lg p-3"
                  >
                    <span className="flex-1 text-white/80">{feature}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFeature(index)}
                      className="text-red-500 hover:text-red-400"
                    >
                      <X size={16} />
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}

            {data.features.length === 0 && (
              <p className="text-white/40 text-sm text-center py-4">
                No features added yet
              </p>
            )}
          </div>
        </motion.div>

        {/* Images */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 rounded-xl border border-white/10 p-6"
        >
          <h2 className="text-xl font-semibold text-white mb-6">Images</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Service Icon</Label>
              <p className="text-xs text-white/40 mb-3">
                Small icon for service cards
              </p>
              <FileUpload
                onChange={(files) => handleImageUpload(files, "icon")}
                accept="image/*"
              />
              {data.icon && (
                <div className="mt-3">
                  <img
                    src={data.icon}
                    alt="Service icon"
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setData({ ...data, icon: null })}
                    className="text-red-500 hover:text-red-400 mt-2"
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label>Service Image</Label>
              <p className="text-xs text-white/40 mb-3">
                Large image for service page
              </p>
              <FileUpload
                onChange={(files) => handleImageUpload(files, "image")}
                accept="image/*"
              />
              {data.image && (
                <div className="mt-3">
                  <img
                    src={data.image}
                    alt="Service image"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setData({ ...data, image: null })}
                    className="text-red-500 hover:text-red-400 mt-2"
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/admin/services")}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2" size={18} />
                Save Service
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
