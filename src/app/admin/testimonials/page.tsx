"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Plus, MessageSquareQuote, Edit, Trash2, Loader2, Eye, EyeOff, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Testimonial {
  id: string;
  quoteEn: string;
  authorEn: string;
  roleEn: string;
  companyEn: string;
  image: string | null;
  order: number;
  isActive: boolean;
}

export default function AdminTestimonialsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const response = await fetch("/api/testimonials?allLocales=true");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setTestimonials(data);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this testimonial? This cannot be undone.")) return;
    try {
      const response = await fetch(`/api/testimonials/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      fetchTestimonials();
    } catch (error) {
      console.error("Error deleting testimonial:", error);
      alert("Something went wrong. Please try again.");
    }
  };

  const toggleActive = async (testimonial: Testimonial) => {
    try {
      const response = await fetch(`/api/testimonials/${testimonial.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...testimonial, isActive: !testimonial.isActive }),
      });
      if (!response.ok) throw new Error("Failed to update");
      fetchTestimonials();
    } catch (error) {
      console.error("Error updating testimonial:", error);
      alert("Something went wrong. Please try again.");
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
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-600/10">
            <MessageSquareQuote className="text-red-500" size={24} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Testimonials</h1>
            <p className="text-white/60 text-sm">
              Manage the client testimonials shown on the homepage.
            </p>
          </div>
        </div>
        <Button onClick={() => router.push("/admin/testimonials/new")} size="lg">
          <Plus size={18} className="mr-2" />
          Add Testimonial
        </Button>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {testimonials.map((testimonial, index) => (
          <motion.div
            key={testimonial.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white/5 rounded-xl border border-white/10 p-6 flex flex-col"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex gap-1" aria-hidden="true">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className="fill-red-500 text-red-500" />
                ))}
              </div>
              {testimonial.isActive ? (
                <Badge className="bg-green-600">Active</Badge>
              ) : (
                <Badge variant="secondary">Inactive</Badge>
              )}
            </div>

            <p className="text-white/80 text-sm leading-relaxed mb-4 line-clamp-4 flex-1">
              &ldquo;{testimonial.quoteEn}&rdquo;
            </p>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10">
              <div className="min-w-0">
                <p className="text-white font-semibold truncate">
                  {testimonial.authorEn || "Untitled"}
                </p>
                <p className="text-red-500 text-xs truncate">
                  {[testimonial.roleEn, testimonial.companyEn].filter(Boolean).join(", ")}
                </p>
                <p className="text-white/30 text-xs mt-1">Order: {testimonial.order}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/admin/testimonials/${testimonial.id}`)}
                  className="text-white/70 hover:text-white"
                  aria-label="Edit"
                >
                  <Edit size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleActive(testimonial)}
                  className="text-white/70 hover:text-white"
                  aria-label={testimonial.isActive ? "Hide" : "Show"}
                >
                  {testimonial.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(testimonial.id)}
                  className="text-red-500 hover:text-red-400"
                  aria-label="Delete"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {testimonials.length === 0 && (
        <div className="text-center py-20">
          <MessageSquareQuote className="mx-auto text-white/20 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-white mb-2">No testimonials yet</h3>
          <p className="text-white/60 mb-6">
            Add your first client testimonial — it will appear on the homepage.
          </p>
          <Button onClick={() => router.push("/admin/testimonials/new")}>
            <Plus size={18} className="mr-2" />
            Add Testimonial
          </Button>
        </div>
      )}
    </div>
  );
}
