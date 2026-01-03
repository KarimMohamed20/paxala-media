"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Save, Loader2, Plus, X, Upload, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { LocalizedInput } from "@/components/admin/localized-input";
import { type Locale } from "@/i18n/config";

interface Stat {
  value: string;
  label: string;
}

interface HomePageData {
  // Hero Section
  heroBadgeEn: string;
  heroBadgeAr: string;
  heroBadgeHe: string;
  heroHeadingEn: string;
  heroHeadingAr: string;
  heroHeadingHe: string;
  heroSloganEn: string;
  heroSloganAr: string;
  heroSloganHe: string;
  heroSubtitle1En: string;
  heroSubtitle1Ar: string;
  heroSubtitle1He: string;
  heroSubtitle2En: string;
  heroSubtitle2Ar: string;
  heroSubtitle2He: string;
  heroStatsEn: Stat[];
  heroStatsAr: Stat[];
  heroStatsHe: Stat[];
  // About Section
  aboutBadgeEn: string;
  aboutBadgeAr: string;
  aboutBadgeHe: string;
  aboutHeadingEn: string;
  aboutHeadingAr: string;
  aboutHeadingHe: string;
  aboutImage: string | null;
  aboutParagraph1En: string;
  aboutParagraph1Ar: string;
  aboutParagraph1He: string;
  aboutParagraph2En: string;
  aboutParagraph2Ar: string;
  aboutParagraph2He: string;
  aboutParagraph3En: string;
  aboutParagraph3Ar: string;
  aboutParagraph3He: string;
  aboutParagraph4En: string;
  aboutParagraph4Ar: string;
  aboutParagraph4He: string;
  aboutParagraph5En: string;
  aboutParagraph5Ar: string;
  aboutParagraph5He: string;
  aboutHighlightsEn: string[];
  aboutHighlightsAr: string[];
  aboutHighlightsHe: string[];
  aboutYearsTextEn: string;
  aboutYearsTextAr: string;
  aboutYearsTextHe: string;
  aboutYearsLabelEn: string;
  aboutYearsLabelAr: string;
  aboutYearsLabelHe: string;
  // Team Section
  teamSubtitleEn: string;
  teamSubtitleAr: string;
  teamSubtitleHe: string;
  teamTitleEn: string;
  teamTitleAr: string;
  teamTitleHe: string;
  teamDescriptionEn: string;
  teamDescriptionAr: string;
  teamDescriptionHe: string;
  teamTab1LabelEn: string;
  teamTab1LabelAr: string;
  teamTab1LabelHe: string;
  teamTab2LabelEn: string;
  teamTab2LabelAr: string;
  teamTab2LabelHe: string;
  teamTab3LabelEn: string;
  teamTab3LabelAr: string;
  teamTab3LabelHe: string;
  // Clients Section
  clientsSubtitleEn: string;
  clientsSubtitleAr: string;
  clientsSubtitleHe: string;
  clientsTitleEn: string;
  clientsTitleAr: string;
  clientsTitleHe: string;
  clientsDescriptionEn: string;
  clientsDescriptionAr: string;
  clientsDescriptionHe: string;
  clientsWhatTheySayEn: string;
  clientsWhatTheySayAr: string;
  clientsWhatTheySayHe: string;
  // CTA Section
  ctaBadgeEn: string;
  ctaBadgeAr: string;
  ctaBadgeHe: string;
  ctaHeadingEn: string;
  ctaHeadingAr: string;
  ctaHeadingHe: string;
  ctaSubtitleEn: string;
  ctaSubtitleAr: string;
  ctaSubtitleHe: string;
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
      // Fetch with allLocales=true to get all language fields
      const response = await fetch("/api/homepage?allLocales=true");
      if (!response.ok) throw new Error("Failed to fetch");
      const content = await response.json();

      // Map the data directly - it already has all localized fields
      // Ensure arrays are properly initialized to prevent undefined errors
      setData({
        heroBadgeEn: content.heroBadgeEn || "",
        heroBadgeAr: content.heroBadgeAr || "",
        heroBadgeHe: content.heroBadgeHe || "",
        heroHeadingEn: content.heroHeadingEn || "",
        heroHeadingAr: content.heroHeadingAr || "",
        heroHeadingHe: content.heroHeadingHe || "",
        heroSloganEn: content.heroSloganEn || "",
        heroSloganAr: content.heroSloganAr || "",
        heroSloganHe: content.heroSloganHe || "",
        heroSubtitle1En: content.heroSubtitle1En || "",
        heroSubtitle1Ar: content.heroSubtitle1Ar || "",
        heroSubtitle1He: content.heroSubtitle1He || "",
        heroSubtitle2En: content.heroSubtitle2En || "",
        heroSubtitle2Ar: content.heroSubtitle2Ar || "",
        heroSubtitle2He: content.heroSubtitle2He || "",
        heroStatsEn: Array.isArray(content.heroStatsEn) ? content.heroStatsEn : [],
        heroStatsAr: Array.isArray(content.heroStatsAr) ? content.heroStatsAr : [],
        heroStatsHe: Array.isArray(content.heroStatsHe) ? content.heroStatsHe : [],
        aboutBadgeEn: content.aboutBadgeEn || "",
        aboutBadgeAr: content.aboutBadgeAr || "",
        aboutBadgeHe: content.aboutBadgeHe || "",
        aboutHeadingEn: content.aboutHeadingEn || "",
        aboutHeadingAr: content.aboutHeadingAr || "",
        aboutHeadingHe: content.aboutHeadingHe || "",
        aboutImage: content.aboutImage,
        aboutParagraph1En: content.aboutParagraph1En || "",
        aboutParagraph1Ar: content.aboutParagraph1Ar || "",
        aboutParagraph1He: content.aboutParagraph1He || "",
        aboutParagraph2En: content.aboutParagraph2En || "",
        aboutParagraph2Ar: content.aboutParagraph2Ar || "",
        aboutParagraph2He: content.aboutParagraph2He || "",
        aboutParagraph3En: content.aboutParagraph3En || "",
        aboutParagraph3Ar: content.aboutParagraph3Ar || "",
        aboutParagraph3He: content.aboutParagraph3He || "",
        aboutParagraph4En: content.aboutParagraph4En || "",
        aboutParagraph4Ar: content.aboutParagraph4Ar || "",
        aboutParagraph4He: content.aboutParagraph4He || "",
        aboutParagraph5En: content.aboutParagraph5En || "",
        aboutParagraph5Ar: content.aboutParagraph5Ar || "",
        aboutParagraph5He: content.aboutParagraph5He || "",
        aboutHighlightsEn: Array.isArray(content.aboutHighlightsEn) ? content.aboutHighlightsEn : [],
        aboutHighlightsAr: Array.isArray(content.aboutHighlightsAr) ? content.aboutHighlightsAr : [],
        aboutHighlightsHe: Array.isArray(content.aboutHighlightsHe) ? content.aboutHighlightsHe : [],
        aboutYearsTextEn: content.aboutYearsTextEn || "",
        aboutYearsTextAr: content.aboutYearsTextAr || "",
        aboutYearsTextHe: content.aboutYearsTextHe || "",
        aboutYearsLabelEn: content.aboutYearsLabelEn || "",
        aboutYearsLabelAr: content.aboutYearsLabelAr || "",
        aboutYearsLabelHe: content.aboutYearsLabelHe || "",
        teamSubtitleEn: content.teamSubtitleEn || "",
        teamSubtitleAr: content.teamSubtitleAr || "",
        teamSubtitleHe: content.teamSubtitleHe || "",
        teamTitleEn: content.teamTitleEn || "",
        teamTitleAr: content.teamTitleAr || "",
        teamTitleHe: content.teamTitleHe || "",
        teamDescriptionEn: content.teamDescriptionEn || "",
        teamDescriptionAr: content.teamDescriptionAr || "",
        teamDescriptionHe: content.teamDescriptionHe || "",
        teamTab1LabelEn: content.teamTab1LabelEn || "",
        teamTab1LabelAr: content.teamTab1LabelAr || "",
        teamTab1LabelHe: content.teamTab1LabelHe || "",
        teamTab2LabelEn: content.teamTab2LabelEn || "",
        teamTab2LabelAr: content.teamTab2LabelAr || "",
        teamTab2LabelHe: content.teamTab2LabelHe || "",
        teamTab3LabelEn: content.teamTab3LabelEn || "",
        teamTab3LabelAr: content.teamTab3LabelAr || "",
        teamTab3LabelHe: content.teamTab3LabelHe || "",
        clientsSubtitleEn: content.clientsSubtitleEn || "",
        clientsSubtitleAr: content.clientsSubtitleAr || "",
        clientsSubtitleHe: content.clientsSubtitleHe || "",
        clientsTitleEn: content.clientsTitleEn || "",
        clientsTitleAr: content.clientsTitleAr || "",
        clientsTitleHe: content.clientsTitleHe || "",
        clientsDescriptionEn: content.clientsDescriptionEn || "",
        clientsDescriptionAr: content.clientsDescriptionAr || "",
        clientsDescriptionHe: content.clientsDescriptionHe || "",
        clientsWhatTheySayEn: content.clientsWhatTheySayEn || "",
        clientsWhatTheySayAr: content.clientsWhatTheySayAr || "",
        clientsWhatTheySayHe: content.clientsWhatTheySayHe || "",
        ctaBadgeEn: content.ctaBadgeEn || "",
        ctaBadgeAr: content.ctaBadgeAr || "",
        ctaBadgeHe: content.ctaBadgeHe || "",
        ctaHeadingEn: content.ctaHeadingEn || "",
        ctaHeadingAr: content.ctaHeadingAr || "",
        ctaHeadingHe: content.ctaHeadingHe || "",
        ctaSubtitleEn: content.ctaSubtitleEn || "",
        ctaSubtitleAr: content.ctaSubtitleAr || "",
        ctaSubtitleHe: content.ctaSubtitleHe || "",
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
        body: JSON.stringify(data),
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

  // Hero Stats helpers
  const addStat = (locale: Locale) => {
    if (!data) return;
    const statsField = `heroStats${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
    const currentStats = data[statsField] as Stat[];
    setData({
      ...data,
      [statsField]: [...currentStats, { value: "", label: "" }],
    });
  };

  const removeStat = (locale: Locale, index: number) => {
    if (!data) return;
    const statsField = `heroStats${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
    const currentStats = data[statsField] as Stat[];
    setData({
      ...data,
      [statsField]: currentStats.filter((_, i) => i !== index),
    });
  };

  const updateStat = (locale: Locale, index: number, field: 'value' | 'label', value: string) => {
    if (!data) return;
    const statsField = `heroStats${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
    const currentStats = [...(data[statsField] as Stat[])];
    currentStats[index][field] = value;
    setData({ ...data, [statsField]: currentStats });
  };

  // About Highlights helpers
  const addHighlight = (locale: Locale) => {
    if (!data) return;
    const highlightsField = `aboutHighlights${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
    const currentHighlights = data[highlightsField] as string[];
    setData({
      ...data,
      [highlightsField]: [...currentHighlights, ""],
    });
  };

  const removeHighlight = (locale: Locale, index: number) => {
    if (!data) return;
    const highlightsField = `aboutHighlights${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
    const currentHighlights = data[highlightsField] as string[];
    setData({
      ...data,
      [highlightsField]: currentHighlights.filter((_, i) => i !== index),
    });
  };

  const updateHighlight = (locale: Locale, index: number, value: string) => {
    if (!data) return;
    const highlightsField = `aboutHighlights${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
    const currentHighlights = [...(data[highlightsField] as string[])];
    currentHighlights[index] = value;
    setData({ ...data, [highlightsField]: currentHighlights });
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
            <LocalizedInput
              label="Badge Text"
              values={{
                en: data.heroBadgeEn,
                ar: data.heroBadgeAr,
                he: data.heroBadgeHe,
              }}
              onChange={(locale, value) => {
                const field = `heroBadge${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                setData({ ...data, [field]: value });
              }}
              placeholder="Creative Production Studio"
            />

            <LocalizedInput
              label="Main Heading"
              values={{
                en: data.heroHeadingEn,
                ar: data.heroHeadingAr,
                he: data.heroHeadingHe,
              }}
              onChange={(locale, value) => {
                const field = `heroHeading${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                setData({ ...data, [field]: value });
              }}
              placeholder="Paxala Media Production"
            />

            <LocalizedInput
              label="Slogan"
              values={{
                en: data.heroSloganEn,
                ar: data.heroSloganAr,
                he: data.heroSloganHe,
              }}
              onChange={(locale, value) => {
                const field = `heroSlogan${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                setData({ ...data, [field]: value });
              }}
              placeholder="From Vision to Visual"
            />

            <LocalizedInput
              label="Subtitle Line 1"
              type="textarea"
              values={{
                en: data.heroSubtitle1En,
                ar: data.heroSubtitle1Ar,
                he: data.heroSubtitle1He,
              }}
              onChange={(locale, value) => {
                const field = `heroSubtitle1${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                setData({ ...data, [field]: value });
              }}
              placeholder="Bringing brands to life..."
              rows={2}
            />

            <LocalizedInput
              label="Subtitle Line 2"
              type="textarea"
              values={{
                en: data.heroSubtitle2En,
                ar: data.heroSubtitle2Ar,
                he: data.heroSubtitle2He,
              }}
              onChange={(locale, value) => {
                const field = `heroSubtitle2${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                setData({ ...data, [field]: value });
              }}
              placeholder="Video production, photography..."
              rows={2}
            />

            {/* Statistics - Multi-Language with Tabs */}
            <div>
              <label className="block text-sm text-white/70 mb-3">Hero Statistics (all languages)</label>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                {/* Language Tabs for Stats */}
                <div className="flex gap-2 mb-4">
                  {(['en', 'ar', 'he'] as Locale[]).map((locale) => (
                    <div key={locale} className="flex-1">
                      <div className="text-xs font-semibold text-white/60 uppercase mb-2">
                        {locale === 'en' ? 'English' : locale === 'ar' ? 'العربية' : 'עברית'}
                      </div>
                      <div className="space-y-2">
                        {((data[`heroStats${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData] as Stat[]) || []).map((stat, index) => (
                          <div key={index} className="flex gap-2 items-start">
                            <Input
                              value={stat.value}
                              onChange={(e) => updateStat(locale, index, 'value', e.target.value)}
                              placeholder="1000+"
                              className="flex-1"
                            />
                            <Input
                              value={stat.label}
                              onChange={(e) => updateStat(locale, index, 'label', e.target.value)}
                              placeholder="Projects"
                              className="flex-[2]"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeStat(locale, index)}
                              className="text-red-500 hover:text-red-400"
                            >
                              <X size={18} />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => addStat(locale)}
                          className="w-full"
                        >
                          <Plus size={16} className="mr-1" />
                          Add {locale.toUpperCase()} Stat
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
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
            <LocalizedInput
              label="Badge Text"
              values={{
                en: data.aboutBadgeEn,
                ar: data.aboutBadgeAr,
                he: data.aboutBadgeHe,
              }}
              onChange={(locale, value) => {
                const field = `aboutBadge${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                setData({ ...data, [field]: value });
              }}
              placeholder="About Us"
            />

            <LocalizedInput
              label="Heading"
              values={{
                en: data.aboutHeadingEn,
                ar: data.aboutHeadingAr,
                he: data.aboutHeadingHe,
              }}
              onChange={(locale, value) => {
                const field = `aboutHeading${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                setData({ ...data, [field]: value });
              }}
              placeholder="About Paxala Media"
            />

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
                <FileUpload onChange={handleImageUpload} accept="image/*" />
              )}
            </div>

            {[1, 2, 3, 4, 5].map((num) => (
              <LocalizedInput
                key={num}
                label={`Paragraph ${num}`}
                type="textarea"
                values={{
                  en: data[`aboutParagraph${num}En` as keyof HomePageData] as string,
                  ar: data[`aboutParagraph${num}Ar` as keyof HomePageData] as string,
                  he: data[`aboutParagraph${num}He` as keyof HomePageData] as string,
                }}
                onChange={(locale, value) => {
                  const field = `aboutParagraph${num}${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                  setData({ ...data, [field]: value });
                }}
                rows={3}
              />
            ))}

            {/* Highlights - Multi-Language */}
            <div>
              <label className="block text-sm text-white/70 mb-3">Highlights (all languages)</label>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex gap-2">
                  {(['en', 'ar', 'he'] as Locale[]).map((locale) => (
                    <div key={locale} className="flex-1">
                      <div className="text-xs font-semibold text-white/60 uppercase mb-2">
                        {locale === 'en' ? 'English' : locale === 'ar' ? 'العربية' : 'עברית'}
                      </div>
                      <div className="space-y-2">
                        {((data[`aboutHighlights${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData] as string[]) || []).map((highlight, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={highlight}
                              onChange={(e) => updateHighlight(locale, index, e.target.value)}
                              placeholder="Highlight"
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeHighlight(locale, index)}
                              className="text-red-500 hover:text-red-400"
                            >
                              <X size={18} />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => addHighlight(locale)}
                          className="w-full"
                        >
                          <Plus size={16} className="mr-1" />
                          Add {locale.toUpperCase()} Highlight
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <LocalizedInput
                label="Years Text"
                values={{
                  en: data.aboutYearsTextEn,
                  ar: data.aboutYearsTextAr,
                  he: data.aboutYearsTextHe,
                }}
                onChange={(locale, value) => {
                  const field = `aboutYearsText${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                  setData({ ...data, [field]: value });
                }}
                placeholder="10+"
              />

              <LocalizedInput
                label="Years Label"
                values={{
                  en: data.aboutYearsLabelEn,
                  ar: data.aboutYearsLabelAr,
                  he: data.aboutYearsLabelHe,
                }}
                onChange={(locale, value) => {
                  const field = `aboutYearsLabel${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                  setData({ ...data, [field]: value });
                }}
                placeholder="Years of Excellence"
              />
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
            <LocalizedInput
              label="Subtitle"
              values={{
                en: data.teamSubtitleEn,
                ar: data.teamSubtitleAr,
                he: data.teamSubtitleHe,
              }}
              onChange={(locale, value) => {
                const field = `teamSubtitle${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                setData({ ...data, [field]: value });
              }}
              placeholder="Our Team"
            />

            <LocalizedInput
              label="Title"
              values={{
                en: data.teamTitleEn,
                ar: data.teamTitleAr,
                he: data.teamTitleHe,
              }}
              onChange={(locale, value) => {
                const field = `teamTitle${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                setData({ ...data, [field]: value });
              }}
              placeholder="PMP Crew"
            />

            <LocalizedInput
              label="Description"
              type="textarea"
              values={{
                en: data.teamDescriptionEn,
                ar: data.teamDescriptionAr,
                he: data.teamDescriptionHe,
              }}
              onChange={(locale, value) => {
                const field = `teamDescription${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                setData({ ...data, [field]: value });
              }}
              placeholder="Meet the talented professionals..."
              rows={2}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <LocalizedInput
                label="Tab 1 Label"
                values={{
                  en: data.teamTab1LabelEn,
                  ar: data.teamTab1LabelAr,
                  he: data.teamTab1LabelHe,
                }}
                onChange={(locale, value) => {
                  const field = `teamTab1Label${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                  setData({ ...data, [field]: value });
                }}
                placeholder="Production Team"
              />

              <LocalizedInput
                label="Tab 2 Label"
                values={{
                  en: data.teamTab2LabelEn,
                  ar: data.teamTab2LabelAr,
                  he: data.teamTab2LabelHe,
                }}
                onChange={(locale, value) => {
                  const field = `teamTab2Label${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                  setData({ ...data, [field]: value });
                }}
                placeholder="IT & Dev Team"
              />

              <LocalizedInput
                label="Tab 3 Label"
                values={{
                  en: data.teamTab3LabelEn,
                  ar: data.teamTab3LabelAr,
                  he: data.teamTab3LabelHe,
                }}
                onChange={(locale, value) => {
                  const field = `teamTab3Label${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                  setData({ ...data, [field]: value });
                }}
                placeholder="Creative Team"
              />
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
            <LocalizedInput
              label="Subtitle"
              values={{
                en: data.clientsSubtitleEn,
                ar: data.clientsSubtitleAr,
                he: data.clientsSubtitleHe,
              }}
              onChange={(locale, value) => {
                const field = `clientsSubtitle${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                setData({ ...data, [field]: value });
              }}
              placeholder="Trusted By"
            />

            <LocalizedInput
              label="Title"
              values={{
                en: data.clientsTitleEn,
                ar: data.clientsTitleAr,
                he: data.clientsTitleHe,
              }}
              onChange={(locale, value) => {
                const field = `clientsTitle${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                setData({ ...data, [field]: value });
              }}
              placeholder="Our Clients"
            />

            <LocalizedInput
              label="Description"
              type="textarea"
              values={{
                en: data.clientsDescriptionEn,
                ar: data.clientsDescriptionAr,
                he: data.clientsDescriptionHe,
              }}
              onChange={(locale, value) => {
                const field = `clientsDescription${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                setData({ ...data, [field]: value });
              }}
              placeholder="We've had the privilege..."
              rows={2}
            />

            <LocalizedInput
              label="Testimonials Heading"
              values={{
                en: data.clientsWhatTheySayEn,
                ar: data.clientsWhatTheySayAr,
                he: data.clientsWhatTheySayHe,
              }}
              onChange={(locale, value) => {
                const field = `clientsWhatTheySay${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                setData({ ...data, [field]: value });
              }}
              placeholder="What They Say"
            />
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
            <LocalizedInput
              label="Badge Text"
              values={{
                en: data.ctaBadgeEn,
                ar: data.ctaBadgeAr,
                he: data.ctaBadgeHe,
              }}
              onChange={(locale, value) => {
                const field = `ctaBadge${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                setData({ ...data, [field]: value });
              }}
              placeholder="Let's Create Together"
            />

            <LocalizedInput
              label="Heading"
              values={{
                en: data.ctaHeadingEn,
                ar: data.ctaHeadingAr,
                he: data.ctaHeadingHe,
              }}
              onChange={(locale, value) => {
                const field = `ctaHeading${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                setData({ ...data, [field]: value });
              }}
              placeholder="Ready to Bring Your Vision to Life?"
            />

            <LocalizedInput
              label="Subtitle"
              type="textarea"
              values={{
                en: data.ctaSubtitleEn,
                ar: data.ctaSubtitleAr,
                he: data.ctaSubtitleHe,
              }}
              onChange={(locale, value) => {
                const field = `ctaSubtitle${locale.charAt(0).toUpperCase() + locale.slice(1)}` as keyof HomePageData;
                setData({ ...data, [field]: value });
              }}
              placeholder="Let's create something amazing together..."
              rows={2}
            />
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
