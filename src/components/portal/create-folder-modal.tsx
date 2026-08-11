"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FolderPlus, FolderPen, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface EditableFolder {
  id?: string | null;
  name: string;
  description?: string | null;
  color?: string | null;
  shared?: boolean;
}

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderCreated: () => void;
  /** When set, the modal renames that folder instead of creating a new one. */
  folder?: EditableFolder | null;
  /**
   * Agency-side only: the client whose library the new folder belongs to.
   * Undefined creates an agency-wide folder. A CLIENT session never sets this —
   * the server stamps their own id regardless of what is sent.
   */
  clientId?: string;
}

const colorOptions = [
  { name: "Red", value: "red", class: "bg-red-600 border-red-500" },
  { name: "Blue", value: "blue", class: "bg-blue-600 border-blue-500" },
  { name: "Emerald", value: "emerald", class: "bg-emerald-600 border-emerald-500" },
  { name: "Purple", value: "purple", class: "bg-purple-600 border-purple-500" },
  { name: "Amber", value: "amber", class: "bg-amber-600 border-amber-500" },
];

export function CreateFolderModal({
  isOpen,
  onClose,
  onFolderCreated,
  folder = null,
  clientId,
}: CreateFolderModalProps) {
  const isEditing = Boolean(folder?.id);
  const [folderName, setFolderName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("red");
  const [isShared, setIsShared] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preload when opened for an existing folder; reset when opened blank.
  useEffect(() => {
    if (!isOpen) return;
    setFolderName(folder?.name || "");
    setDescription(folder?.description || "");
    setColor(folder?.color || "red");
    setIsShared(Boolean(folder?.shared));
    setError(null);
  }, [isOpen, folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/folders", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEditing ? { id: folder!.id } : {}),
          ...(!isEditing && clientId ? { clientId } : {}),
          name: folderName.trim(),
          description: description.trim() || null,
          color,
          isShared,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          data.error || `Failed to ${isEditing ? "update" : "create"} folder`
        );
      }

      setFolderName("");
      setDescription("");
      setIsShared(false);
      onFolderCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center border border-red-500/30">
                {isEditing ? <FolderPen size={20} /> : <FolderPlus size={20} />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isEditing ? "Edit Folder" : "Create New Folder"}
                </h3>
                <p className="text-xs text-white/50">
                  {isEditing
                    ? "Rename or restyle this folder"
                    : "Organize your campaign & production assets"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Folder Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="e.g. Social Reels 2026"
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl text-sm focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Description (Optional)
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Master video exports & raw footage"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl text-sm focus:border-red-500"
              />
            </div>

            {/* Color Accent Picker */}
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-2">
                Folder Theme Color
              </label>
              <div className="flex items-center gap-3">
                {colorOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setColor(opt.value)}
                    className={`w-7 h-7 rounded-full ${opt.class} flex items-center justify-center border-2 transition-transform ${
                      color === opt.value ? "scale-110 border-white shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    {color === opt.value && <Check size={14} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Shared Access Checkbox */}
            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={(e) => setIsShared(e.target.checked)}
                  className="w-4 h-4 rounded bg-white/10 border-white/20 text-red-600 focus:ring-red-500"
                />
                <span className="text-xs font-medium text-white/80">
                  Shared Folder (Visible to client & creative team)
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-white/10 text-white/70 hover:text-white bg-transparent rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !folderName.trim()}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold px-5 flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isEditing ? (
                  "Save Folder"
                ) : (
                  "Create Folder"
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
