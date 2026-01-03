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
import { LocalizedInput } from "@/components/admin/localized-input";
import { LocalizedArrayInput } from "@/components/admin/localized-array-input";
import { type Locale } from "@/i18n/config";
import { useTranslations } from "next-intl";

interface ServiceData {
  nameEn: string;
  nameAr: string;
  nameHe: string;
  slug: string;
  descriptionEn: string;
  descriptionAr: string;
  descriptionHe: string;
  icon: string | null;
  image: string | null;
  featuresEn: string[];
  featuresAr: string[];
  featuresHe: string[];
  order: number;
  isActive: boolean;
}

export default function AdminServiceEditPage() {
  const ta = useTranslations("adminUI");
  const tc = useTranslations("common");
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<ServiceData>({
    nameEn: "",
    nameAr: "",
    nameHe: "",
    slug: "",
    descriptionEn: "",
    descriptionAr: "",
    descriptionHe: "",
    icon: null,
    image: null,
    featuresEn: [],
    featuresAr: [],
    featuresHe: [],
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
      // Fetch with allLocales=true to get all language fields
      const response = await fetch(`/api/services/${params.id}?allLocales=true`);
      if (!response.ok) throw new Error("Failed to fetch");
      const service = await response.json();

      // Map the data directly - it already has all localized fields
      setData({
        nameEn: service.nameEn || "",
        nameAr: service.nameAr || "",
        nameHe: service.nameHe || "",
        slug: service.slug || "",
        descriptionEn: service.descriptionEn || "",
        descriptionAr: service.descriptionAr || "",
        descriptionHe: service.descriptionHe || "",
        icon: service.icon,
        image: service.image,
        featuresEn: service.featuresEn || [],
        featuresAr: service.featuresAr || [],
        featuresHe: service.featuresHe || [],
        order: service.order || 0,
        isActive: service.isActive,
      });
    } catch (error) {
      console.error("Error fetching service:", error);
      alert(ta("errorOccurred"));
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
      alert(ta("errorOccurred"));
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (locale: Locale, value: string) => {
    const fieldName = `name${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof ServiceData;
    setData({
      ...data,
      [fieldName]: value,
      // Auto-generate slug from English name for new services
      slug: isNew && locale === "en" ? generateSlug(value) : data.slug,
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
      alert(ta("errorOccurred"));
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
              {isNew ? ta("addService") : tc("edit")}
            </h1>
            <p className="text-white/60 text-sm">
              {isNew
                ? ta("basicInfo")
                : ta("detailedContent")}
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
            {ta("basicInfo")}
          </h2>

          <div className="space-y-4">
            <LocalizedInput
              label={tc("name")}
              values={{
                en: data.nameEn,
                ar: data.nameAr,
                he: data.nameHe,
              }}
              onChange={handleNameChange}
              placeholder="e.g., Video Production"
              required
            />

            <div>
              <Label htmlFor="slug">{ta("slug")} *</Label>
              <Input
                id="slug"
                value={data.slug}
                onChange={(e) => setData({ ...data, slug: e.target.value })}
                placeholder="e.g., video-production"
                required
              />
              <p className="text-xs text-white/40 mt-1">
                {ta("generateSlug")}
              </p>
            </div>

            <LocalizedInput
              label={tc("description")}
              type="textarea"
              values={{
                en: data.descriptionEn,
                ar: data.descriptionAr,
                he: data.descriptionHe,
              }}
              onChange={(locale, value) => {
                const fieldName = `description${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof ServiceData;
                setData({ ...data, [fieldName]: value });
              }}
              placeholder={tc("description")}
              rows={4}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="order">{ta("order")}</Label>
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
                  {ta("order")}
                </p>
              </div>

              <div className="flex items-center justify-between pt-6">
                <Label htmlFor="isActive">{tc("status")}</Label>
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
          <h2 className="text-xl font-semibold text-white mb-6">{ta("features")}</h2>

          <LocalizedArrayInput
            label={ta("features")}
            values={{
              en: data.featuresEn,
              ar: data.featuresAr,
              he: data.featuresHe,
            }}
            onChange={(locale, value) => {
              const fieldName = `features${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof ServiceData;
              setData({ ...data, [fieldName]: value });
            }}
            placeholder={ta("features")}
          />
        </motion.div>

        {/* Images */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 rounded-xl border border-white/10 p-6"
        >
          <h2 className="text-xl font-semibold text-white mb-6">{ta("media")}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>{tc("image")}</Label>
              <p className="text-xs text-white/40 mb-3">
                {ta("profileImage")}
              </p>
              <FileUpload
                onChange={(files) => handleImageUpload(files, "icon")}
                accept="image/*"
              />
              {data.icon && (
                <div className="mt-3">
                  <img
                    src={data.icon}
                    alt={tc("image")}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setData({ ...data, icon: null })}
                    className="text-red-500 hover:text-red-400 mt-2"
                  >
                    {tc("remove")}
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label>{ta("coverImage")}</Label>
              <p className="text-xs text-white/40 mb-3">
                {ta("coverImage")}
              </p>
              <FileUpload
                onChange={(files) => handleImageUpload(files, "image")}
                accept="image/*"
              />
              {data.image && (
                <div className="mt-3">
                  <img
                    src={data.image}
                    alt={tc("image")}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setData({ ...data, image: null })}
                    className="text-red-500 hover:text-red-400 mt-2"
                  >
                    {tc("remove")}
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
            {tc("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                {tc("saving")}
              </>
            ) : (
              <>
                <Save className="mr-2" size={18} />
                {ta("saveChanges")}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
