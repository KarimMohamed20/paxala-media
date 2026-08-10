"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UploadCloud, File, Image as ImageIcon, Film, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectOption {
  id: string;
  title: string;
}

interface FolderOption {
  id?: string;
  name: string;
}

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectOption[];
  folders: FolderOption[];
  onFileUploaded: () => void;
  defaultFolder?: string;
}

export function UploadFileModal({
  isOpen,
  onClose,
  projects,
  folders,
  onFileUploaded,
  defaultFolder,
}: UploadFileModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.id || "");
  const [selectedFolder, setSelectedFolder] = useState<string>(defaultFolder || "General");
  const [selectedCategory, setSelectedCategory] = useState<string>("Video");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setError(null);
      // Auto-detect category
      if (file.type.startsWith("image/")) setSelectedCategory("Photography");
      else if (file.type.startsWith("video/")) setSelectedCategory("Video");
      else if (file.type.includes("pdf")) setSelectedCategory("Documents");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setError(null);
      if (file.type.startsWith("image/")) setSelectedCategory("Photography");
      else if (file.type.startsWith("video/")) setSelectedCategory("Video");
      else if (file.type.includes("pdf")) setSelectedCategory("Documents");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a file to upload.");
      return;
    }
    const targetProjectId = selectedProject || projects[0]?.id;
    if (!targetProjectId) {
      setError("Please select a project.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("projectId", targetProjectId);
      formData.append("category", selectedCategory);
      formData.append("folder", selectedFolder);

      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Upload failed");
      }

      setSelectedFile(null);
      onFileUploaded();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <ImageIcon size={28} className="text-emerald-400" />;
    if (file.type.startsWith("video/")) return <Film size={28} className="text-red-400" />;
    return <FileText size={28} className="text-blue-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

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

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center border border-red-500/30">
                <UploadCloud size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Upload Asset</h3>
                <p className="text-xs text-white/50">Add videos, photos, design files, or brand documents</p>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Drag & Drop Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                isDragOver
                  ? "border-red-500 bg-red-600/10"
                  : selectedFile
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-white/15 bg-white/5 hover:border-white/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex items-center gap-4 text-left">
                  <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-white/10 flex items-center justify-center flex-shrink-0">
                    {getFileIcon(selectedFile)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{selectedFile.name}</p>
                    <p className="text-xs text-white/50 font-mono mt-0.5">{formatSize(selectedFile.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                    className="text-white/40 hover:text-white"
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 mx-auto">
                    <UploadCloud size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      Click to upload <span className="text-white/40 font-normal">or drag & drop</span>
                    </p>
                    <p className="text-[11px] text-white/40 mt-1">
                      MP4, MOV, JPG, PNG, PDF, ZIP, FIG (Max 500 MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Target Project Selection */}
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Target Project <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full bg-neutral-950 border border-white/10 text-white text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-red-500 cursor-pointer"
                required
              >
                {projects.length === 0 && <option value="">No active projects</option>}
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Folder & Category Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">
                  Target Folder
                </label>
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="General">General</option>
                  <option value="Video Masters">Video Masters</option>
                  <option value="Photography">Photography</option>
                  <option value="Brand Identity">Brand Identity</option>
                  <option value="Campaigns 2026">Campaigns 2026</option>
                  <option value="Website & Digital">Website & Digital</option>
                  <option value="Documents">Documents</option>
                  {folders.map((f, i) => (
                    <option key={f.id || i} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">
                  Asset Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 outline-none focus:border-red-500 cursor-pointer"
                >
                  <option value="Video">Video</option>
                  <option value="Photography">Photography</option>
                  <option value="Design">Design</option>
                  <option value="Brand Files">Brand Files</option>
                  <option value="Web & Digital">Web & Digital</option>
                  <option value="Documents">Documents</option>
                </select>
              </div>
            </div>

            {/* Action Footer */}
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
                disabled={isUploading || !selectedFile}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold px-5 flex items-center gap-2 shadow-lg shadow-red-600/20"
              >
                {isUploading ? <Loader2 size={16} className="animate-spin" /> : "Upload File"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
