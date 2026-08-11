"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  UploadCloud,
  Image as ImageIcon,
  Film,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ASSET_CATEGORIES,
  DEFAULT_FOLDER_NAME,
  MAX_UPLOAD_BYTES,
  SUGGESTED_FOLDER_NAMES,
  UPLOAD_CONCURRENCY,
  formatBytes,
} from "@/lib/assets";

interface ProjectOption {
  id: string;
  title: string;
}

interface FolderOption {
  id?: string | null;
  name: string;
}

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectOption[];
  folders: FolderOption[];
  onFileUploaded: () => void;
  /** Encoded as `id:<folderId>` or `name:<folderName>` — see folderOptionValue. */
  defaultFolder?: string;
  /**
   * Files the page already collected — a drop onto the Asset Library opens this
   * modal with the queue prefilled. Read once, on mount.
   */
  initialFiles?: File[];
}

/** Same encoding as the edit modal so a folder row and a legacy name coexist. */
function folderOptionValue(folder: FolderOption): string {
  return folder.id ? `id:${folder.id}` : `name:${folder.name}`;
}

type QueueStatus = "pending" | "uploading" | "done" | "error";

interface QueuedUpload {
  /** Local key only — the server id is irrelevant until the upload lands. */
  key: string;
  file: File;
  status: QueueStatus;
  /** 0-100, from XHR upload progress events. */
  progress: number;
  error?: string;
}

/** Lets the same file be re-picked without silently queueing it twice. */
function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/**
 * Split an incoming selection into what can be queued and what cannot, skipping
 * anything already queued. Shared by the file picker, the modal's own drop zone
 * and the page-level drop that prefills the queue.
 */
function partitionFiles(
  files: File[],
  alreadyQueued: Set<string>
): { accepted: QueuedUpload[]; rejected: string[] } {
  const accepted: QueuedUpload[] = [];
  const rejected: string[] = [];
  const seen = new Set(alreadyQueued);

  for (const file of files) {
    const key = fileKey(file);
    if (seen.has(key)) continue;
    if (file.size > MAX_UPLOAD_BYTES) {
      rejected.push(file.name);
      continue;
    }
    seen.add(key);
    accepted.push({ key, file, status: "pending", progress: 0 });
  }

  return { accepted, rejected };
}

function oversizeMessage(rejected: string[]): string | null {
  if (rejected.length === 0) return null;
  return `Too large (max ${formatBytes(MAX_UPLOAD_BYTES)}): ${rejected.join(", ")}`;
}

/**
 * One upload, over XMLHttpRequest rather than fetch — fetch cannot report
 * request-body progress, and a 500 MB video master on a mobile connection needs
 * a progress bar, not a spinner.
 */
function uploadOne(
  file: File,
  fields: { projectId: string; folderValue: string; category: string },
  onProgress: (percent: number) => void,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    // The batch may have been cancelled while this item waited for a slot.
    if (signal.aborted) {
      reject(new Error("Upload cancelled"));
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", fields.projectId);
    // "auto" defers to the server's mime-type detection, which is what a mixed
    // batch of videos, stills and PDFs wants.
    if (fields.category !== "auto") {
      formData.append("category", fields.category);
    }
    if (fields.folderValue.startsWith("id:")) {
      formData.append("folderId", fields.folderValue.slice(3));
    } else {
      formData.append("folder", fields.folderValue.slice(5));
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/files");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      let message = `Upload failed (${xhr.status})`;
      try {
        message = JSON.parse(xhr.responseText)?.error || message;
      } catch {
        // Non-JSON error body (e.g. a proxy 413) — keep the status message.
      }
      reject(new Error(message));
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));

    signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(formData);
  });
}

export function UploadFileModal({
  isOpen,
  onClose,
  projects,
  folders,
  onFileUploaded,
  defaultFolder,
  initialFiles,
}: UploadFileModalProps) {
  // Lazy initializers: the parent mounts this only while open, so files dropped
  // onto the page land in the queue without a synchronising effect.
  const [seeded] = useState(() =>
    partitionFiles(initialFiles ?? [], new Set<string>())
  );
  const [queue, setQueue] = useState<QueuedUpload[]>(seeded.accepted);
  const [selectedProject, setSelectedProject] = useState<string>(projects[0]?.id || "");
  const [selectedFolder, setSelectedFolder] = useState<string>(
    defaultFolder || `name:${DEFAULT_FOLDER_NAME}`
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("auto");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(() =>
    oversizeMessage(seeded.rejected)
  );
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // The parent mounts this only while open, so every open starts from the
  // useState initializers above — no reset effect, and the queue never carries
  // over from a previous batch.
  //
  // Abandoning a batch mid-flight must not leave requests running.
  useEffect(() => {
    const controller = abortRef;
    return () => controller.current?.abort();
  }, []);

  if (!isOpen) return null;

  // Real folder rows first, then any shipped default that has no row yet.
  const folderOptions: FolderOption[] = [
    ...folders,
    ...SUGGESTED_FOLDER_NAMES.filter(
      (suggested) => !folders.some((f) => f.name === suggested)
    ).map((suggested) => ({ name: suggested })),
  ];

  const addFiles = (incoming: FileList | File[]) => {
    const files = Array.from(incoming);
    if (files.length === 0) return;

    const { accepted, rejected } = partitionFiles(
      files,
      new Set(queue.map((q) => q.key))
    );

    if (accepted.length > 0) setQueue((current) => [...current, ...accepted]);
    setError(oversizeMessage(rejected));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
    // Reset so picking the same file again still fires onChange.
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // The Asset Library page also listens for file drops on window; this drop
    // belongs to the modal, so stop it before it reaches there.
    e.stopPropagation();
    setIsDragOver(false);
    // Mid-batch drops would not join the run already in flight.
    if (isUploading) return;
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeFromQueue = (key: string) => {
    setQueue((current) => current.filter((q) => q.key !== key));
  };

  const updateItem = (key: string, patch: Partial<QueuedUpload>) => {
    setQueue((current) =>
      current.map((q) => (q.key === key ? { ...q, ...patch } : q))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetProjectId = selectedProject || projects[0]?.id;
    if (!targetProjectId) {
      setError("Please select a project.");
      return;
    }

    // A retry after a partial failure re-sends only what has not landed.
    const toUpload = queue.filter((q) => q.status === "pending" || q.status === "error");
    if (toUpload.length === 0) {
      setError("Please select at least one file to upload.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const fields = {
      projectId: targetProjectId,
      folderValue: selectedFolder,
      category: selectedCategory,
    };

    let succeeded = 0;
    let failed = 0;

    // Bounded concurrency: several small stills upload in parallel without a
    // batch of large videos opening a dozen simultaneous connections.
    const cursor = { index: 0 };
    const worker = async () => {
      while (cursor.index < toUpload.length && !controller.signal.aborted) {
        const item = toUpload[cursor.index++];
        updateItem(item.key, { status: "uploading", progress: 0, error: undefined });
        try {
          await uploadOne(
            item.file,
            fields,
            (percent) => updateItem(item.key, { progress: percent }),
            controller.signal
          );
          updateItem(item.key, { status: "done", progress: 100 });
          succeeded += 1;
        } catch (err) {
          updateItem(item.key, {
            status: "error",
            error: err instanceof Error ? err.message : "Upload failed",
          });
          failed += 1;
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(UPLOAD_CONCURRENCY, toUpload.length) }, worker)
    );

    abortRef.current = null;
    setIsUploading(false);

    if (succeeded > 0) onFileUploaded();

    // Close only on a clean run; otherwise keep the failures on screen so they
    // can be retried or removed.
    if (failed === 0) {
      onClose();
    } else {
      setError(
        `${failed} of ${toUpload.length} file${toUpload.length === 1 ? "" : "s"} failed. Fix or remove them, then retry.`
      );
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) return <ImageIcon size={20} className="text-emerald-400" />;
    if (file.type.startsWith("video/")) return <Film size={20} className="text-red-400" />;
    return <FileText size={20} className="text-blue-400" />;
  };

  const pendingCount = queue.filter(
    (q) => q.status === "pending" || q.status === "error"
  ).length;
  const doneCount = queue.filter((q) => q.status === "done").length;
  const totalBytes = queue.reduce((sum, q) => sum + q.file.size, 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={isUploading ? undefined : onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-neutral-900 border border-white/10 rounded-2xl p-6 shadow-2xl z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center border border-red-500/30">
                <UploadCloud size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Upload Assets</h3>
                <p className="text-xs text-white/50">
                  Add videos, photos, design files, or brand documents
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isUploading}
              className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-40"
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
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                isUploading ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              } ${
                isDragOver
                  ? "border-red-500 bg-red-600/10"
                  : queue.length > 0
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-white/15 bg-white/5 hover:border-white/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />

              <div className="space-y-2">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 mx-auto">
                  <UploadCloud size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">
                    {queue.length > 0 ? "Add more files" : "Click to upload"}{" "}
                    <span className="text-white/40 font-normal">or drag &amp; drop</span>
                  </p>
                  <p className="text-[11px] text-white/40 mt-1">
                    Multiple files supported • MP4, MOV, JPG, PNG, PDF, ZIP (max{" "}
                    {formatBytes(MAX_UPLOAD_BYTES)} each)
                  </p>
                </div>
              </div>
            </div>

            {/* Queue */}
            {queue.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-white/70">
                    {queue.length} file{queue.length === 1 ? "" : "s"} •{" "}
                    {formatBytes(totalBytes)}
                    {doneCount > 0 && (
                      <span className="text-emerald-400"> • {doneCount} uploaded</span>
                    )}
                  </p>
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => setQueue([])}
                      className="text-[11px] text-white/40 hover:text-white font-semibold"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                  {queue.map((item) => (
                    <div
                      key={item.key}
                      className={`bg-neutral-950 border rounded-xl p-3 flex items-center gap-3 ${
                        item.status === "error"
                          ? "border-red-500/40"
                          : item.status === "done"
                          ? "border-emerald-500/30"
                          : "border-white/10"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                        {getFileIcon(item.file)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {item.file.name}
                        </p>
                        <p className="text-[10px] text-white/40 font-mono mt-0.5">
                          {formatBytes(item.file.size)}
                          {item.status === "uploading" && ` • ${item.progress}%`}
                        </p>

                        {item.status === "uploading" && (
                          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1.5">
                            <div
                              className="h-full bg-red-600 rounded-full transition-all duration-200"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        )}

                        {item.status === "error" && item.error && (
                          <p className="text-[10px] text-red-400 mt-1">{item.error}</p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        {item.status === "done" ? (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        ) : item.status === "uploading" ? (
                          <Loader2 size={16} className="animate-spin text-red-500" />
                        ) : item.status === "error" ? (
                          <AlertCircle size={16} className="text-red-400" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => removeFromQueue(item.key)}
                            className="text-white/30 hover:text-red-400 transition-colors"
                            aria-label={`Remove ${item.file.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Target Project Selection */}
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Target Project <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                disabled={isUploading}
                className="w-full bg-neutral-950 border border-white/10 text-white text-xs rounded-xl px-3.5 py-2.5 outline-none focus:border-red-500 cursor-pointer disabled:opacity-60"
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
                  disabled={isUploading}
                  aria-label="Target Folder"
                  className="w-full bg-neutral-950 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 outline-none focus:border-red-500 cursor-pointer disabled:opacity-60"
                >
                  {folderOptions.map((f) => (
                    <option key={folderOptionValue(f)} value={folderOptionValue(f)}>
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
                  disabled={isUploading}
                  aria-label="Asset Category"
                  className="w-full bg-neutral-950 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 outline-none focus:border-red-500 cursor-pointer disabled:opacity-60"
                >
                  <option value="auto">Auto (detect per file)</option>
                  {ASSET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isUploading}
                className="border-white/10 text-white/70 hover:text-white bg-transparent rounded-xl text-xs"
              >
                {doneCount > 0 && pendingCount > 0 ? "Done" : "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={isUploading || pendingCount === 0}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold px-5 flex items-center gap-2 shadow-lg shadow-red-600/20"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Uploading…</span>
                  </>
                ) : (
                  <span>
                    {pendingCount > 1 ? `Upload ${pendingCount} Files` : "Upload File"}
                  </span>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
