"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Loader2,
  Trash2,
  Download,
  FileText,
  Film,
  Image as ImageIcon,
  Link as LinkIcon,
  File,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProjectFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number | null;
  description: string | null;
  createdAt: string;
}

export function ProjectFilesTab({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    type: "upload",
    description: "",
  });

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (selectedFile) {
        const preview = getFilePreview(selectedFile);
        if (preview) {
          URL.revokeObjectURL(preview);
        }
      }
    };
  }, [selectedFile]);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/files`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setFiles(data);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      const file = files[0];
      setSelectedFile(file);
      setFormData({ ...formData, name: file.name });
    }
  };

  const getFilePreview = (file: File) => {
    if (file.type.startsWith("image/")) {
      return URL.createObjectURL(file);
    } else if (file.type.startsWith("video/")) {
      return URL.createObjectURL(file);
    }
    return null;
  };

  const isPreviewable = (file: File) => {
    return file.type.startsWith("image/") || file.type.startsWith("video/");
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", selectedFile);
      uploadFormData.append("type", selectedFile.type.startsWith("image/") ? "gallery" : "document");

      const uploadResponse = await fetch("/api/projects/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) throw new Error("Upload failed");

      const uploadResult = await uploadResponse.json();

      // Create file record
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name || selectedFile.name,
          url: uploadResult.url,
          type: uploadResult.type,
          size: selectedFile.size,
          description: formData.description || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to create file record");

      setFormData({ name: "", url: "", type: "upload", description: "" });
      setSelectedFile(null);
      setShowUploadForm(false);
      fetchFiles();
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleAddLink = async () => {
    if (!formData.name || !formData.url) {
      alert("Please provide a name and URL");
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          url: formData.url,
          type: formData.type,
          description: formData.description || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to add link");

      setFormData({ name: "", url: "", type: "link", description: "" });
      setShowUploadForm(false);
      fetchFiles();
    } catch (error) {
      console.error("Error adding link:", error);
      alert("Failed to add link");
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      fetchFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file");
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return ImageIcon;
    if (type.startsWith("video/")) return Film;
    if (type === "link") return LinkIcon;
    return File;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-white/40" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Project Files</h3>
          <p className="text-white/60 text-sm">
            {files.length} file{files.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowUploadForm(!showUploadForm)}>
          <Plus size={18} className="mr-2" />
          Add File/Link
        </Button>
      </div>

      {/* Upload/Add Form */}
      {showUploadForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-white/5 rounded-xl border border-white/10 p-6"
        >
          <h4 className="text-lg font-semibold text-white mb-4">Add File or Link</h4>

          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upload">Upload File</SelectItem>
                  <SelectItem value="link">External Link</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === "upload" ? (
              <>
                <div>
                  <Label>Select File to Upload</Label>
                  <p className="text-xs text-white/40 mb-3">
                    Upload images, videos, or documents
                  </p>
                  {!selectedFile ? (
                    <FileUpload
                      onChange={handleFileSelect}
                      accept="image/*,video/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      disabled={uploading}
                    />
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-4">
                      {/* Preview */}
                      {isPreviewable(selectedFile) && (
                        <div className="relative w-full h-64 bg-black/20 rounded-lg overflow-hidden">
                          {selectedFile.type.startsWith("image/") ? (
                            <img
                              src={getFilePreview(selectedFile)!}
                              alt="Preview"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <video
                              src={getFilePreview(selectedFile)!}
                              controls
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                      )}

                      {/* File Info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {selectedFile.type.startsWith("image/") ? (
                            <ImageIcon className="text-red-500" size={24} />
                          ) : selectedFile.type.startsWith("video/") ? (
                            <Film className="text-red-500" size={24} />
                          ) : (
                            <FileText className="text-red-500" size={24} />
                          )}
                          <div>
                            <p className="text-white font-medium">{selectedFile.name}</p>
                            <p className="text-white/60 text-sm">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              {" • "}
                              {selectedFile.type || "Unknown type"}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedFile(null);
                            setFormData({ ...formData, name: "" });
                          }}
                          disabled={uploading}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                {selectedFile && (
                  <>
                    <div>
                      <Label>File Name (Optional)</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={selectedFile.name}
                      />
                    </div>
                    <div>
                      <Label>Description (Optional)</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Add a description for this file..."
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Project Brief Document"
                  />
                </div>
                <div>
                  <Label>URL *</Label>
                  <Input
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
                <div>
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Add a description for this link..."
                    rows={3}
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowUploadForm(false);
                  setFormData({ name: "", url: "", type: "upload", description: "" });
                  setSelectedFile(null);
                }}
                disabled={uploading}
              >
                Cancel
              </Button>
              {formData.type === "link" ? (
                <Button onClick={handleAddLink} disabled={!formData.name || !formData.url}>
                  <Plus size={16} className="mr-2" />
                  Add Link
                </Button>
              ) : (
                selectedFile && (
                  <Button onClick={handleFileUpload} disabled={uploading}>
                    {uploading ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={16} />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Plus size={16} className="mr-2" />
                        Upload File
                      </>
                    )}
                  </Button>
                )
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Files List */}
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        {files.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto text-white/20 mb-4" size={64} />
            <h4 className="text-lg font-semibold text-white mb-2">No files yet</h4>
            <p className="text-white/60 text-sm mb-6">
              Upload files or add links to project resources.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file, index) => {
              const FileIcon = getFileIcon(file.type);
              const isImage = file.type.startsWith("image/");
              const isVideo = file.type.startsWith("video/");

              return (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all group"
                >
                  {/* Preview or Icon */}
                  {isImage ? (
                    <div
                      className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-black/20 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setPreviewFile(file)}
                    >
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : isVideo ? (
                    <div
                      className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-black/20 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setPreviewFile(file)}
                    >
                      <video
                        src={file.url}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-red-600/20 flex-shrink-0">
                      <FileIcon className="text-red-500" size={24} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-white truncate">{file.name}</h5>
                    <div className="flex items-center gap-3 text-xs text-white/60 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {file.type}
                      </Badge>
                      {file.size && <span>{formatFileSize(file.size)}</span>}
                      <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                    </div>
                    {file.description && (
                      <p className="text-white/60 text-sm mt-2 line-clamp-2">
                        {file.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(file.url, "_blank")}
                      className="text-white hover:text-white"
                    >
                      <Download size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(file.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setPreviewFile(null)}
          >
            <div
              className="relative max-w-7xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-1">
                      {previewFile.name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-white/60">
                      <span>{previewFile.type}</span>
                      {previewFile.size && (
                        <>
                          <span>•</span>
                          <span>{formatFileSize(previewFile.size)}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{new Date(previewFile.createdAt).toLocaleDateString()}</span>
                    </div>
                    {previewFile.description && (
                      <p className="text-white/80 text-sm mt-2">
                        {previewFile.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewFile(null)}
                    className="text-white hover:text-white hover:bg-white/20"
                  >
                    <X size={20} />
                  </Button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex items-center justify-center w-full h-[90vh]">
                {previewFile.type.startsWith("image/") ? (
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : previewFile.type.startsWith("video/") ? (
                  <video
                    src={previewFile.url}
                    controls
                    autoPlay
                    className="max-w-full max-h-full rounded-lg"
                  />
                ) : null}
              </div>

              {/* Footer Actions */}
              <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => window.open(previewFile.url, "_blank")}
                  >
                    <Download size={18} className="mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setPreviewFile(null)}
                    className="text-white hover:text-white hover:bg-white/20"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
