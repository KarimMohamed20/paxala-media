"use client";

import { useState } from "react";
import { Loader2, Plus, Calendar, Folder } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const projectCategories = [
  { value: "VIDEO_PRODUCTION", label: "Video Production" },
  { value: "PHOTOGRAPHY", label: "Photography" },
  { value: "GRAPHIC_DESIGN", label: "Graphic Design" },
  { value: "WEB_DEVELOPMENT", label: "Web Development" },
  { value: "APP_DEVELOPMENT", label: "App Development" },
  { value: "THREE_D_MODELING", label: "3D Modeling" },
  { value: "ANIMATION", label: "Animation" },
  { value: "SOCIAL_MEDIA", label: "Social Media Campaign" },
];

interface ProjectRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProjectRequestModal({
  isOpen,
  onClose,
  onSuccess,
}: ProjectRequestModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("VIDEO_PRODUCTION");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/portal/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          deadline: deadline || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create project request");
      }

      // Reset form
      setTitle("");
      setDescription("");
      setCategory("VIDEO_PRODUCTION");
      setDeadline("");
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-neutral-900 border border-white/10 text-white max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-600/20 flex items-center justify-center text-red-500">
              <Folder size={20} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">
                New Project Request
              </DialogTitle>
              <DialogDescription className="text-white/60 text-sm">
                Submit a new creative, digital or technology project brief.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs text-white/60 mb-1.5 uppercase font-medium">
              Project Title *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Autumn Brand Film Campaign"
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1.5 uppercase font-medium">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 rounded-md bg-neutral-800 border border-white/10 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              {projectCategories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1.5 uppercase font-medium">
              Target Deadline (Optional)
            </label>
            <div className="relative">
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="bg-white/5 border-white/10 text-white dark:[color-scheme:dark]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1.5 uppercase font-medium">
              Project Brief & Description *
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your goals, requirements, deliverables, or creative direction..."
              rows={4}
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="bg-white/5 hover:bg-white/10 text-white border-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white font-medium gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Submitting...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
