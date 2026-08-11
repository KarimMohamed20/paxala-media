"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ASSET_CATEGORIES,
  ASSET_STATUSES,
  DEFAULT_FOLDER_NAME,
  SUGGESTED_FOLDER_NAMES,
} from "@/lib/assets";
import type { AssetDetail } from "@/components/portal/asset-detail-drawer";

export interface FolderOption {
  id?: string | null;
  name: string;
}

interface EditAssetModalProps {
  asset: AssetDetail | null;
  isOpen: boolean;
  onClose: () => void;
  folders: FolderOption[];
  /** ADMIN/STAFF may also edit approval status and usage rights. */
  canManage: boolean;
  onSaved: (updated: AssetDetail) => void;
}

/** Encodes a folder choice so the same <select> can carry rows and legacy names. */
function folderOptionValue(folder: FolderOption): string {
  return folder.id ? `id:${folder.id}` : `name:${folder.name}`;
}

export function EditAssetModal({
  asset,
  isOpen,
  onClose,
  folders,
  canManage,
  onSaved,
}: EditAssetModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("Video");
  const [folderValue, setFolderValue] = useState<string>(`name:${DEFAULT_FOLDER_NAME}`);
  const [status, setStatus] = useState<string>("Approved");
  const [version, setVersion] = useState("");
  const [usageRights, setUsageRights] = useState("");
  const [isShared, setIsShared] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reload the form whenever a different asset is opened.
  useEffect(() => {
    if (!asset) return;
    setName(asset.name || "");
    setDescription(asset.description || "");
    setCategory(asset.category || "Video");
    setFolderValue(
      asset.folderId
        ? `id:${asset.folderId}`
        : `name:${asset.folder || DEFAULT_FOLDER_NAME}`
    );
    setStatus(asset.status || "Approved");
    setVersion(asset.version || "");
    setUsageRights(asset.usageRights || "");
    setIsShared(Boolean(asset.isShared));
    setError(null);
  }, [asset]);

  if (!isOpen || !asset) return null;

  // Folder rows first, then any shipped default that has no row yet.
  const folderOptions: FolderOption[] = [
    ...folders,
    ...SUGGESTED_FOLDER_NAMES.filter(
      (suggested) => !folders.some((f) => f.name === suggested)
    ).map((suggested) => ({ name: suggested })),
  ];

  // The asset's own folder may be missing from the list (e.g. a folder scoped
  // to another project). Keep it selectable so saving never silently moves it.
  if (!folderOptions.some((f) => folderOptionValue(f) === folderValue)) {
    folderOptions.unshift({
      id: asset.folderId ?? null,
      name: asset.folder || DEFAULT_FOLDER_NAME,
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Asset name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      id: asset.id,
      name: name.trim(),
      description: description.trim() || null,
      category,
      version: version.trim() || undefined,
      isShared,
    };

    if (folderValue.startsWith("id:")) {
      payload.folderId = folderValue.slice(3);
    } else {
      payload.folder = folderValue.slice(5);
    }

    if (canManage) {
      payload.status = status;
      payload.usageRights = usageRights.trim();
    }

    try {
      const res = await fetch("/api/files", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save changes");

      onSaved(json.file as AssetDetail);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const selectClass =
    "w-full bg-neutral-950 border border-white/10 text-white text-xs rounded-xl px-3 py-2.5 outline-none focus:border-red-500 cursor-pointer";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

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
                <Pencil size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-white">Edit Asset</h3>
                <p className="text-xs text-white/50 truncate max-w-[280px]">{asset.name}</p>
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
            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Asset Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl text-sm focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/70 mb-1.5">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="What is this asset for?"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl text-sm focus:border-red-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">
                  Folder
                </label>
                <select
                  value={folderValue}
                  onChange={(e) => setFolderValue(e.target.value)}
                  aria-label="Folder"
                  className={selectClass}
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
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  aria-label="Category"
                  className={selectClass}
                >
                  {ASSET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">
                  Version
                </label>
                <Input
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g. V2 Final"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl text-sm focus:border-red-500"
                />
              </div>

              {canManage && (
                <div>
                  <label className="block text-xs font-semibold text-white/70 mb-1.5">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    aria-label="Status"
                    className={selectClass}
                  >
                    {ASSET_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {canManage && (
              <div>
                <label className="block text-xs font-semibold text-white/70 mb-1.5">
                  Usage Rights
                </label>
                <Input
                  value={usageRights}
                  onChange={(e) => setUsageRights(e.target.value)}
                  placeholder="e.g. Approved for web and social."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl text-sm focus:border-red-500"
                />
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="w-4 h-4 rounded bg-white/10 border-white/20 text-red-600 focus:ring-red-500"
              />
              <span className="text-xs font-medium text-white/80">
                Mark as shared with the client & creative team
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saving}
                className="border-white/10 text-white/70 hover:text-white bg-transparent rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || !name.trim()}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold px-5 flex items-center gap-2 shadow-lg shadow-red-600/20"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
