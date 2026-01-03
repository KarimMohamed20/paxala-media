"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Save, Loader2, ArrowLeft, Plus, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { LocalizedInput } from "@/components/admin/localized-input";
import { LocalizedArrayInput } from "@/components/admin/localized-array-input";
import { type Locale } from "@/i18n/config";
import { useTranslations } from "next-intl";

interface TeamMemberData {
  nameEn: string;
  nameAr: string;
  nameHe: string;
  roleEn: string;
  roleAr: string;
  roleHe: string;
  bioEn: string;
  bioAr: string;
  bioHe: string;
  image: string | null;
  team: "PRODUCTION" | "IT_DEV" | "CREATIVE";
  order: number;
  skillsEn: string[];
  skillsAr: string[];
  skillsHe: string[];
  social: {
    instagram?: string;
    linkedin?: string;
  };
  isActive: boolean;
}

export default function AdminTeamMemberPage() {
  const params = useParams();
  const router = useRouter();
  const ta = useTranslations('adminUI');
  const tc = useTranslations('common');
  const id = params?.id as string;
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<TeamMemberData>({
    nameEn: "",
    nameAr: "",
    nameHe: "",
    roleEn: "",
    roleAr: "",
    roleHe: "",
    bioEn: "",
    bioAr: "",
    bioHe: "",
    image: null,
    team: "PRODUCTION",
    order: 0,
    skillsEn: [],
    skillsAr: [],
    skillsHe: [],
    social: {},
    isActive: true,
  });

  useEffect(() => {
    if (!isNew) {
      fetchTeamMember();
    }
  }, [id, isNew]);

  const fetchTeamMember = async () => {
    try {
      // Fetch with allLocales=true to get all language fields
      const response = await fetch(`/api/team/${id}?allLocales=true`);
      if (!response.ok) throw new Error("Failed to fetch");
      const member = await response.json();

      // Map the data directly - it already has all localized fields
      setData({
        nameEn: member.nameEn || "",
        nameAr: member.nameAr || "",
        nameHe: member.nameHe || "",
        roleEn: member.roleEn || "",
        roleAr: member.roleAr || "",
        roleHe: member.roleHe || "",
        bioEn: member.bioEn || "",
        bioAr: member.bioAr || "",
        bioHe: member.bioHe || "",
        image: member.image,
        team: member.team,
        order: member.order,
        skillsEn: member.skillsEn || [],
        skillsAr: member.skillsAr || [],
        skillsHe: member.skillsHe || [],
        social: member.social || {},
        isActive: member.isActive,
      });
    } catch (error) {
      console.error("Error fetching team member:", error);
      alert(ta('errorOccurred'));
      router.push("/admin/team");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!data.nameEn || !data.roleEn) {
      alert(tc('required'));
      return;
    }

    setSaving(true);
    try {
      const url = isNew ? "/api/team" : `/api/team/${id}`;
      const method = isNew ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to save");

      router.push("/admin/team");
    } catch (error) {
      console.error("Error saving team member:", error);
      alert(ta('errorOccurred'));
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
      setData({ ...data, image: result.url });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(ta('errorOccurred'));
    }
  };

  const removeImage = () => {
    setData({ ...data, image: null });
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
            onClick={() => router.push("/admin/team")}
            className="text-white/60 hover:text-white"
          >
            <ArrowLeft size={18} className="mr-2" />
            {tc('back')}
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-600/10">
              <Users className="text-red-500" size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {isNew ? ta('addTeamMember') : ta('team')}
              </h1>
              <p className="text-white/60 text-sm">
                {isNew ? "Create a new team member profile" : data.nameEn}
              </p>
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <Loader2 className="animate-spin mr-2" size={18} />
              {tc('saving')}
            </>
          ) : (
            <>
              <Save size={18} className="mr-2" />
              {tc('save')}
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            {ta('basicInfo')}
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LocalizedInput
                label={tc('name')}
                values={{
                  en: data.nameEn,
                  ar: data.nameAr,
                  he: data.nameHe,
                }}
                onChange={(locale, value) => {
                  const fieldName = `name${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof TeamMemberData;
                  setData({ ...data, [fieldName]: value });
                }}
                placeholder="Ahmed Hajuj"
                required
              />

              <LocalizedInput
                label={ta('role')}
                values={{
                  en: data.roleEn,
                  ar: data.roleAr,
                  he: data.roleHe,
                }}
                onChange={(locale, value) => {
                  const fieldName = `role${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof TeamMemberData;
                  setData({ ...data, [fieldName]: value });
                }}
                placeholder="Photographer"
                required
              />
            </div>

            <LocalizedInput
              label={tc('description')}
              type="textarea"
              values={{
                en: data.bioEn,
                ar: data.bioAr,
                he: data.bioHe,
              }}
              onChange={(locale, value) => {
                const fieldName = `bio${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof TeamMemberData;
                setData({ ...data, [fieldName]: value });
              }}
              placeholder="Brief description about the team member..."
              rows={4}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">{ta('team')}</label>
                <select
                  value={data.team}
                  onChange={(e) =>
                    setData({
                      ...data,
                      team: e.target.value as "PRODUCTION" | "IT_DEV" | "CREATIVE",
                    })
                  }
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="PRODUCTION">{ta('production')}</option>
                  <option value="IT_DEV">{ta('itDev')}</option>
                  <option value="CREATIVE">{ta('creative')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  {ta('order')}
                </label>
                <Input
                  type="number"
                  value={data.order}
                  onChange={(e) =>
                    setData({ ...data, order: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={data.isActive}
                onChange={(e) =>
                  setData({ ...data, isActive: e.target.checked })
                }
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-red-600 focus:ring-red-500"
              />
              <label htmlFor="isActive" className="text-white/70 text-sm">
                {tc('active')}
              </label>
            </div>
          </div>
        </motion.div>

        {/* Profile Image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            {ta('profileImage')}
          </h2>

          {data.image ? (
            <div className="relative inline-block">
              <img
                src={data.image}
                alt={data.nameEn}
                className="w-full h-64 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeImage}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              >
                {tc('remove')}
              </Button>
            </div>
          ) : (
            <FileUpload
              onChange={handleImageUpload}
              accept="image/*"
            />
          )}
        </motion.div>

        {/* Skills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            {ta('skills')}
          </h2>

          <LocalizedArrayInput
            label={ta('skills')}
            values={{
              en: data.skillsEn,
              ar: data.skillsAr,
              he: data.skillsHe,
            }}
            onChange={(locale, value) => {
              const fieldName = `skills${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof TeamMemberData;
              setData({ ...data, [fieldName]: value });
            }}
            placeholder="Add a skill (e.g., Photographer)"
          />
        </motion.div>

        {/* Social Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            {ta('socialMedia')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">
                Instagram URL
              </label>
              <Input
                value={data.social.instagram || ""}
                onChange={(e) =>
                  setData({
                    ...data,
                    social: { ...data.social, instagram: e.target.value },
                  })
                }
                placeholder="https://instagram.com/username"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">
                LinkedIn URL
              </label>
              <Input
                value={data.social.linkedin || ""}
                onChange={(e) =>
                  setData({
                    ...data,
                    social: { ...data.social, linkedin: e.target.value },
                  })
                }
                placeholder="https://linkedin.com/in/username"
              />
            </div>
          </div>
        </motion.div>

        {/* Save Button (Bottom) */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                {tc('saving')}
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                {isNew ? ta('addTeamMember') : ta('saveChanges')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
