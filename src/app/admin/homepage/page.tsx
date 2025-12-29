"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Save, Loader2, Plus, X, Upload, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";

interface Stat {
  value: string;
  label: string;
}

interface HomePageData {
  // Hero Section
  heroBadge: string;
  heroHeading: string;
  heroSlogan: string;
  heroSubtitle1: string;
  heroSubtitle2: string;
  heroStats: Stat[];
  // About Section
  aboutBadge: string;
  aboutHeading: string;
  aboutImage: string | null;
  aboutParagraph1: string;
  aboutParagraph2: string;
  aboutParagraph3: string;
  aboutParagraph4: string;
  aboutParagraph5: string;
  aboutHighlights: string[];
  aboutYearsText: string;
  aboutYearsLabel: string;
  // Team Section
  teamSubtitle: string;
  teamTitle: string;
  teamDescription: string;
  teamTab1Label: string;
  teamTab2Label: string;
  teamTab3Label: string;
  // Clients Section
  clientsSubtitle: string;
  clientsTitle: string;
  clientsDescription: string;
  clientsWhatTheySay: string;
  // CTA Section
  ctaBadge: string;
  ctaHeading: string;
  ctaSubtitle: string;
}

export default function AdminHomepage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<HomePageData | null>(null);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const response = await fetch("/api/homepage");
      if (!response.ok) throw new Error("Failed to fetch");
      const content = await response.json();

      // Parse JSON fields
      setData({
        ...content,
        heroStats: typeof content.heroStats === 'string'
          ? JSON.parse(content.heroStats)
          : content.heroStats,
        aboutHighlights: typeof content.aboutHighlights === 'string'
          ? JSON.parse(content.aboutHighlights)
          : content.aboutHighlights,
      });
    } catch (error) {
      console.error("Error fetching content:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!data) return;

    setSaving(true);
    try {
      const response = await fetch("/api/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          heroStats: JSON.stringify(data.heroStats),
          aboutHighlights: JSON.stringify(data.aboutHighlights),
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      alert("Homepage content saved successfully!");
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save homepage content");
    } finally {
      setSaving(false);
    }
  };

  const addStat = () => {
    if (!data) return;
    setData({
      ...data,
      heroStats: [...data.heroStats, { value: "", label: "" }],
    });
  };

  const removeStat = (index: number) => {
    if (!data) return;
    setData({
      ...data,
      heroStats: data.heroStats.filter((_, i) => i !== index),
    });
  };

  const updateStat = (index: number, field: 'value' | 'label', value: string) => {
    if (!data) return;
    const newStats = [...data.heroStats];
    newStats[index][field] = value;
    setData({ ...data, heroStats: newStats });
  };

  const addHighlight = () => {
    if (!data) return;
    setData({
      ...data,
      aboutHighlights: [...data.aboutHighlights, ""],
    });
  };

  const removeHighlight = (index: number) => {
    if (!data) return;
    setData({
      ...data,
      aboutHighlights: data.aboutHighlights.filter((_, i) => i !== index),
    });
  };

  const updateHighlight = (index: number, value: string) => {
    if (!data) return;
    const newHighlights = [...data.aboutHighlights];
    newHighlights[index] = value;
    setData({ ...data, aboutHighlights: newHighlights });
  };

  const handleImageUpload = async (files: File[]) => {
    if (files.length === 0 || !data) return;

    const formData = new FormData();
    formData.append("file", files[0]);
    formData.append("type", "thumbnail");

    try {
      const response = await fetch("/api/projects/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const result = await response.json();
      setData({ ...data, aboutImage: result.url });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(error instanceof Error ? error.message : "Failed to upload image");
    }
  };

  const removeImage = () => {
    if (!data) return;
    setData({ ...data, aboutImage: null });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-white/40" size={48} />
      </div>
    );
  }

  if (!data) {
    return <div className="p-8 text-white">Failed to load homepage content</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-600/10">
            <Home className="text-red-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Homepage Content</h1>
            <p className="text-white/60 text-sm">Edit all homepage sections in one place</p>
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
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="space-y-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Hero Section
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Badge Text</label>
              <Input
                value={data.heroBadge}
                onChange={(e) => setData({ ...data, heroBadge: e.target.value })}
                placeholder="Creative Production Studio"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Main Heading</label>
              <Input
                value={data.heroHeading}
                onChange={(e) => setData({ ...data, heroHeading: e.target.value })}
                placeholder="Paxala Media Production"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Slogan</label>
              <Input
                value={data.heroSlogan}
                onChange={(e) => setData({ ...data, heroSlogan: e.target.value })}
                placeholder="From Vision to Visual"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Subtitle Line 1</label>
              <Textarea
                value={data.heroSubtitle1}
                onChange={(e) => setData({ ...data, heroSubtitle1: e.target.value })}
                placeholder="Bringing brands to life..."
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Subtitle Line 2</label>
              <Textarea
                value={data.heroSubtitle2}
                onChange={(e) => setData({ ...data, heroSubtitle2: e.target.value })}
                placeholder="Video production, photography..."
                rows={2}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-white/70">Statistics</label>
                <Button variant="secondary" size="sm" onClick={addStat}>
                  <Plus size={16} className="mr-1" />
                  Add Stat
                </Button>
              </div>
              <div className="space-y-3">
                {data.heroStats.map((stat, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <Input
                      value={stat.value}
                      onChange={(e) => updateStat(index, 'value', e.target.value)}
                      placeholder="1000+"
                      className="flex-1"
                    />
                    <Input
                      value={stat.label}
                      onChange={(e) => updateStat(index, 'label', e.target.value)}
                      placeholder="Projects Completed"
                      className="flex-[2]"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStat(index)}
                      className="text-red-500 hover:text-red-400"
                    >
                      <X size={18} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* About Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            About Section
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Badge Text</label>
              <Input
                value={data.aboutBadge}
                onChange={(e) => setData({ ...data, aboutBadge: e.target.value })}
                placeholder="About Us"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Heading</label>
              <Input
                value={data.aboutHeading}
                onChange={(e) => setData({ ...data, aboutHeading: e.target.value })}
                placeholder="About Paxala Media"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Background Image</label>
              {data.aboutImage ? (
                <div className="relative inline-block">
                  <img
                    src={data.aboutImage}
                    alt="About background"
                    className="w-full h-48 object-cover rounded-lg"
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
            </div>

            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num}>
                <label className="block text-sm text-white/70 mb-2">Paragraph {num}</label>
                <Textarea
                  value={data[`aboutParagraph${num}` as keyof HomePageData] as string}
                  onChange={(e) => setData({ ...data, [`aboutParagraph${num}`]: e.target.value })}
                  rows={3}
                />
              </div>
            ))}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-white/70">Highlights</label>
                <Button variant="secondary" size="sm" onClick={addHighlight}>
                  <Plus size={16} className="mr-1" />
                  Add Highlight
                </Button>
              </div>
              <div className="space-y-2">
                {data.aboutHighlights.map((highlight, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={highlight}
                      onChange={(e) => updateHighlight(index, e.target.value)}
                      placeholder="Full-service creative agency"
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHighlight(index)}
                      className="text-red-500 hover:text-red-400"
                    >
                      <X size={18} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Years Text</label>
                <Input
                  value={data.aboutYearsText}
                  onChange={(e) => setData({ ...data, aboutYearsText: e.target.value })}
                  placeholder="10+"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">Years Label</label>
                <Input
                  value={data.aboutYearsLabel}
                  onChange={(e) => setData({ ...data, aboutYearsLabel: e.target.value })}
                  placeholder="Years of Excellence"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Team Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Team Section
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Subtitle</label>
              <Input
                value={data.teamSubtitle}
                onChange={(e) => setData({ ...data, teamSubtitle: e.target.value })}
                placeholder="Our Team"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Title</label>
              <Input
                value={data.teamTitle}
                onChange={(e) => setData({ ...data, teamTitle: e.target.value })}
                placeholder="PMP Crew"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Description</label>
              <Textarea
                value={data.teamDescription}
                onChange={(e) => setData({ ...data, teamDescription: e.target.value })}
                placeholder="Meet the talented professionals..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Tab 1 Label</label>
                <Input
                  value={data.teamTab1Label}
                  onChange={(e) => setData({ ...data, teamTab1Label: e.target.value })}
                  placeholder="Production Team"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">Tab 2 Label</label>
                <Input
                  value={data.teamTab2Label}
                  onChange={(e) => setData({ ...data, teamTab2Label: e.target.value })}
                  placeholder="IT & Dev Team"
                />
              </div>
              <div>
                <label className="block text-sm text-white/70 mb-2">Tab 3 Label</label>
                <Input
                  value={data.teamTab3Label}
                  onChange={(e) => setData({ ...data, teamTab3Label: e.target.value })}
                  placeholder="Creative Team"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Clients Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Clients Section
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Subtitle</label>
              <Input
                value={data.clientsSubtitle}
                onChange={(e) => setData({ ...data, clientsSubtitle: e.target.value })}
                placeholder="Trusted By"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Title</label>
              <Input
                value={data.clientsTitle}
                onChange={(e) => setData({ ...data, clientsTitle: e.target.value })}
                placeholder="Our Clients"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Description</label>
              <Textarea
                value={data.clientsDescription}
                onChange={(e) => setData({ ...data, clientsDescription: e.target.value })}
                placeholder="We've had the privilege..."
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Testimonials Heading</label>
              <Input
                value={data.clientsWhatTheySay}
                onChange={(e) => setData({ ...data, clientsWhatTheySay: e.target.value })}
                placeholder="What They Say"
              />
            </div>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 rounded-xl p-6 border border-white/10"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            CTA Section
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-2">Badge Text</label>
              <Input
                value={data.ctaBadge}
                onChange={(e) => setData({ ...data, ctaBadge: e.target.value })}
                placeholder="Let's Create Together"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Heading</label>
              <Input
                value={data.ctaHeading}
                onChange={(e) => setData({ ...data, ctaHeading: e.target.value })}
                placeholder="Ready to Bring Your Vision to Life?"
              />
            </div>

            <div>
              <label className="block text-sm text-white/70 mb-2">Subtitle</label>
              <Textarea
                value={data.ctaSubtitle}
                onChange={(e) => setData({ ...data, ctaSubtitle: e.target.value })}
                placeholder="Let's create something amazing together..."
                rows={2}
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
                Save All Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
