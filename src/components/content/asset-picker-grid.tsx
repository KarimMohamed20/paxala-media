"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Check, Film, ImageIcon, Play, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentAssetFile } from "./types";

const isVideo = (file: ContentAssetFile) =>
  file.type?.toLowerCase().includes("video");

export function AssetPickerGrid({
  assets,
  selectedIds,
  onChange,
  projectFilterId,
  projectFilterOn = false,
  onProjectFilterToggle,
  searchQuery = "",
  onSearchChange,
  max,
  className,
}: {
  assets: ContentAssetFile[];
  /** Selection order is preserved — it becomes ContentItemAsset.order. */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  projectFilterId?: string | null;
  projectFilterOn?: boolean;
  onProjectFilterToggle?: (on: boolean) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  max?: number;
  className?: string;
}) {
  const t = useTranslations("content");

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assets.filter((a) => {
      if (projectFilterOn && projectFilterId && a.project?.id !== projectFilterId)
        return false;
      if (q && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [assets, searchQuery, projectFilterOn, projectFilterId]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
      return;
    }
    if (max && selectedIds.length >= max) return;
    onChange([...selectedIds, id]);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-semibold text-white/70">
          {t("form.linkAssets")}
        </label>
        <span className="text-[11px] font-normal text-red-400">
          {t("form.selectedCount", { count: selectedIds.length })}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onSearchChange && (
          <div className="relative flex-1 min-w-[180px]">
            <Search
              size={14}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t("form.searchAssets")}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 ps-9 pe-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50"
            />
          </div>
        )}
        {projectFilterId && onProjectFilterToggle && (
          <label className="flex items-center gap-2 text-[11px] text-white/60 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={projectFilterOn}
              onChange={(e) => onProjectFilterToggle(e.target.checked)}
              className="accent-red-500"
            />
            {t("form.assetsFromProject")}
          </label>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="text-xs text-white/40 py-6 text-center border border-dashed border-white/10 rounded-xl">
          {t("form.noAssets")}
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-0.5">
          {visible.map((asset) => {
            const selected = selectedIds.includes(asset.id);
            const order = selectedIds.indexOf(asset.id);
            const video = isVideo(asset);
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => toggle(asset.id)}
                aria-pressed={selected}
                className={cn(
                  "group relative aspect-video rounded-lg overflow-hidden border text-start transition",
                  selected
                    ? "border-red-500 ring-2 ring-red-500/40"
                    : "border-white/10 hover:border-white/30"
                )}
              >
                {asset.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.thumbnail}
                    alt={asset.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : video ? (
                  // A video URL in an <img> renders as a broken image, so show a
                  // placeholder instead of the raw file.
                  <div className="absolute inset-0 grid place-items-center bg-white/5">
                    <Play size={20} className="text-white/50" />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.url}
                    alt={asset.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                <span className="absolute bottom-1 start-1.5 end-1.5 truncate text-[10px] text-white/90">
                  {asset.name}
                </span>

                <span className="absolute top-1.5 start-1.5">
                  {video ? (
                    <Film size={12} className="text-white/70" />
                  ) : (
                    <ImageIcon size={12} className="text-white/70" />
                  )}
                </span>

                {selected && (
                  <span className="absolute top-1.5 end-1.5 w-5 h-5 rounded-full bg-red-500 grid place-items-center text-[10px] font-bold text-white">
                    {order >= 0 ? order + 1 : <Check size={12} />}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
