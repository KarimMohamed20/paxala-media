"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Save, Loader2, ArrowLeft, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileUpload } from "@/components/ui/file-upload";
import { LocalizedInput } from "@/components/admin/localized-input";

interface TestimonialData {
  quoteEn: string;
  quoteAr: string;
  quoteHe: string;
  authorEn: string;
  authorAr: string;
  authorHe: string;
  roleEn: string;
  roleAr: string;
  roleHe: string;
  companyEn: string;
  companyAr: string;
  companyHe: string;
  image: string | null;
  order: number;
  isActive: boolean;
}

const EMPTY: TestimonialData = {
  quoteEn: "",
  quoteAr: "",
  quoteHe: "",
  authorEn: "",
  authorAr: "",
  authorHe: "",
  roleEn: "",
  roleAr: "",
  roleHe: "",
  companyEn: "",
  companyAr: "",
  companyHe: "",
  image: null,
  order: 0,
  isActive: true,
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function AdminTestimonialEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<TestimonialData>(EMPTY);

  useEffect(() => {
    if (isNew) return;
    const fetchTestimonial = async () => {
      try {
        const response = await fetch(`/api/testimonials/${id}`);
        if (!response.ok) throw new Error("Failed to fetch");
        const t = await response.json();
        setData({
          quoteEn: t.quoteEn || "",
          quoteAr: t.quoteAr || "",
          quoteHe: t.quoteHe || "",
          authorEn: t.authorEn || "",
          authorAr: t.authorAr || "",
          authorHe: t.authorHe || "",
          roleEn: t.roleEn || "",
          roleAr: t.roleAr || "",
          roleHe: t.roleHe || "",
          companyEn: t.companyEn || "",
          companyAr: t.companyAr || "",
          companyHe: t.companyHe || "",
          image: t.image,
          order: t.order ?? 0,
          isActive: t.isActive,
        });
      } catch (error) {
        console.error("Error fetching testimonial:", error);
        alert("Could not load this testimonial.");
        router.push("/admin/testimonials");
      } finally {
        setLoading(false);
      }
    };
    fetchTestimonial();
  }, [id, isNew, router]);

  const setField = <K extends keyof TestimonialData>(field: K, value: TestimonialData[K]) =>
    setData((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!data.quoteEn || !data.authorEn) {
      alert("English quote and author are required.");
      return;
    }
    setSaving(true);
    try {
      const url = isNew ? "/api/testimonials" : `/api/testimonials/${id}`;
      const method = isNew ? "POST" : "PUT";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to save");
      router.push("/admin/testimonials");
    } catch (error) {
      console.error("Error saving testimonial:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (files: File[]) => {
    if (files.length === 0) return;
    const formData = new FormData();
    formData.append("file", files[0]);
    formData.append("type", "thumbnail");
    try {
      const response = await fetch("/api/projects/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const result = await response.json();
      setField("image", result.url);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Image upload failed. Please try again.");
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
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/testimonials")}
            className="text-white/60 hover:text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-600/10">
              <MessageSquareQuote className="text-red-500" size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {isNew ? "Add Testimonial" : "Edit Testimonial"}
              </h1>
              <p className="text-white/60 text-sm">
                {isNew ? "Add a new client testimonial" : data.authorEn}
              </p>
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="animate-spin mr-2" size={18} />
              Saving...
            </>
          ) : (
            <>
              <Save size={18} className="mr-2" />
              Save
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10 space-y-4"
        >
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Testimonial
          </h2>

          <LocalizedInput
            label="Quote"
            type="textarea"
            rows={4}
            values={{ en: data.quoteEn, ar: data.quoteAr, he: data.quoteHe }}
            onChange={(locale, value) =>
              setField(`quote${cap(locale)}` as keyof TestimonialData, value)
            }
            placeholder="What the client said about working with Paxala…"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LocalizedInput
              label="Author"
              values={{ en: data.authorEn, ar: data.authorAr, he: data.authorHe }}
              onChange={(locale, value) =>
                setField(`author${cap(locale)}` as keyof TestimonialData, value)
              }
              placeholder="Client name"
              required
            />
            <LocalizedInput
              label="Role"
              values={{ en: data.roleEn, ar: data.roleAr, he: data.roleHe }}
              onChange={(locale, value) =>
                setField(`role${cap(locale)}` as keyof TestimonialData, value)
              }
              placeholder="Owner / Marketing Manager"
            />
          </div>

          <LocalizedInput
            label="Company"
            values={{ en: data.companyEn, ar: data.companyAr, he: data.companyHe }}
            onChange={(locale, value) =>
              setField(`company${cap(locale)}` as keyof TestimonialData, value)
            }
            placeholder="Business name (e.g., La Flamingo)"
          />
        </motion.div>

        {/* Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10 space-y-4"
        >
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Order</label>
              <Input
                type="number"
                value={data.order}
                onChange={(e) => setField("order", parseInt(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="flex items-end">
              <div className="flex items-center gap-3 pb-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={data.isActive}
                  onChange={(e) => setField("isActive", e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="isActive" className="text-white/70 text-sm">
                  Active (shown on the homepage)
                </label>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Photo (optional) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Photo (optional)
          </h2>

          {data.image ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.image}
                alt={data.authorEn}
                className="w-32 h-32 object-cover rounded-full"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setField("image", null)}
                className="absolute top-0 end-0 bg-black/50 hover:bg-black/70 text-white"
              >
                Remove
              </Button>
            </div>
          ) : (
            <FileUpload onChange={handleImageUpload} accept="image/*" />
          )}
        </motion.div>

        {/* Save (bottom) */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                {isNew ? "Add Testimonial" : "Save Changes"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
