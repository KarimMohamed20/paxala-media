"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Save, Loader2, ArrowLeft, Plus, X, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";

interface TeamMemberData {
  name: string;
  role: string;
  bio: string;
  image: string | null;
  team: "PRODUCTION" | "IT_DEV" | "CREATIVE";
  order: number;
  skills: string[];
  social: {
    instagram?: string;
    linkedin?: string;
  };
  isActive: boolean;
}

export default function AdminTeamMemberPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const isNew = id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<TeamMemberData>({
    name: "",
    role: "",
    bio: "",
    image: null,
    team: "PRODUCTION",
    order: 0,
    skills: [],
    social: {},
    isActive: true,
  });
  const [newSkill, setNewSkill] = useState("");

  useEffect(() => {
    if (!isNew) {
      fetchTeamMember();
    }
  }, [id, isNew]);

  const fetchTeamMember = async () => {
    try {
      const response = await fetch(`/api/team/${id}`);
      if (!response.ok) throw new Error("Failed to fetch");
      const member = await response.json();

      setData({
        name: member.name,
        role: member.role,
        bio: member.bio || "",
        image: member.image,
        team: member.team,
        order: member.order,
        skills: member.skills || [],
        social: member.social || {},
        isActive: member.isActive,
      });
    } catch (error) {
      console.error("Error fetching team member:", error);
      alert("Failed to load team member");
      router.push("/admin/team");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!data.name || !data.role) {
      alert("Name and role are required");
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
      alert("Failed to save team member");
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
      alert("Failed to upload image");
    }
  };

  const removeImage = () => {
    setData({ ...data, image: null });
  };

  const addSkill = () => {
    if (!newSkill.trim()) return;
    setData({ ...data, skills: [...data.skills, newSkill.trim()] });
    setNewSkill("");
  };

  const removeSkill = (index: number) => {
    setData({ ...data, skills: data.skills.filter((_, i) => i !== index) });
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
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-red-600/10">
              <Users className="text-red-500" size={24} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                {isNew ? "Add Team Member" : "Edit Team Member"}
              </h1>
              <p className="text-white/60 text-sm">
                {isNew ? "Create a new team member profile" : data.name}
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
        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Basic Information
          </h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Full Name *
                </label>
                <Input
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  placeholder="Ahmed Hajuj"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Role/Title *
                </label>
                <Input
                  value={data.role}
                  onChange={(e) => setData({ ...data, role: e.target.value })}
                  placeholder="Photographer"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Bio</label>
              <Textarea
                value={data.bio}
                onChange={(e) => setData({ ...data, bio: e.target.value })}
                placeholder="Brief description about the team member..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Team</label>
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
                  <option value="PRODUCTION">Production Team</option>
                  <option value="IT_DEV">IT & Dev Team</option>
                  <option value="CREATIVE">Creative Team</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Order (Display Priority)
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
                Active (Show on website)
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
            Profile Image
          </h2>

          {data.image ? (
            <div className="relative inline-block">
              <img
                src={data.image}
                alt={data.name}
                className="w-full h-64 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeImage}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white"
              >
                Remove
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
            Skills & Expertise
          </h2>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addSkill()}
                placeholder="Add a skill (e.g., Photographer)"
                className="flex-1"
              />
              <Button onClick={addSkill} variant="secondary">
                <Plus size={18} />
              </Button>
            </div>

            {data.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.skills.map((skill, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full"
                  >
                    <span className="text-white text-sm">{skill}</span>
                    <button
                      onClick={() => removeSkill(index)}
                      className="text-white/60 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
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
            Social Media Links
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
                Saving...
              </>
            ) : (
              <>
                <Save size={18} className="mr-2" />
                {isNew ? "Create Team Member" : "Save Changes"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
