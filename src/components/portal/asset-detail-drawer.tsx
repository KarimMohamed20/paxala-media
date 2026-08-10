"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  Share2,
  CheckCircle2,
  Play,
  FileText,
  Clock,
  Layers,
  ShieldCheck,
  ArrowDownToLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AssetDetail {
  id: string;
  name: string;
  url: string;
  type: string;
  category?: string;
  sizeFormatted?: string;
  projectId?: string;
  projectTitle?: string;
  formattedDate?: string;
  version?: string;
  status?: string;
  duration?: string | null;
  thumbnail?: string;
  uploader?: string;
  resolution?: string;
  usageRights?: string;
  availableFormats?: Array<{
    name: string;
    resolution: string;
    size: string;
  }>;
  versionHistory?: Array<{
    version: string;
    date: string;
    status: string;
  }>;
}

interface AssetDetailDrawerProps {
  asset: AssetDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AssetDetailDrawer({ asset, isOpen, onClose }: AssetDetailDrawerProps) {
  if (!asset) return null;

  const isVideo = asset.type === "video" || asset.name.endsWith(".mp4");

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:bg-transparent lg:backdrop-blur-none"
          />

          {/* Slide-over panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-neutral-950 border-s border-white/10 shadow-2xl z-50 overflow-y-auto flex flex-col justify-between"
          >
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-sm font-bold text-white truncate max-w-[280px]">
                  {asset.name}
                </h3>
                <button
                  onClick={onClose}
                  className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Media Preview Box */}
              <div className="relative rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 group aspect-video flex items-center justify-center">
                <img
                  src={asset.thumbnail || asset.url}
                  alt={asset.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  {isVideo && (
                    <div className="w-14 h-14 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg shadow-red-600/50 cursor-pointer hover:scale-105 transition-transform">
                      <Play size={24} className="ml-1 fill-white" />
                    </div>
                  )}
                </div>
                {asset.duration && (
                  <span className="absolute bottom-2.5 right-2.5 bg-black/80 text-white text-[10px] font-mono px-2 py-0.5 rounded-md border border-white/10">
                    {asset.duration}
                  </span>
                )}
              </div>

              {/* Status Badge */}
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 size={13} />
                  {asset.status || "Approved Final"}
                </span>
              </div>

              {/* Metadata List */}
              <div className="bg-neutral-900/60 rounded-xl border border-white/5 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/40">Project</span>
                  <span className="text-white font-medium">{asset.projectTitle || "New Collection Launch"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Type</span>
                  <span className="text-white font-medium">{asset.resolution || "4K MP4"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Size</span>
                  <span className="text-white font-medium">{asset.sizeFormatted || "2.8 GB"}</span>
                </div>
                {asset.duration && (
                  <div className="flex justify-between">
                    <span className="text-white/40">Duration</span>
                    <span className="text-white font-medium">{asset.duration}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-white/40">Uploaded</span>
                  <span className="text-white font-medium">{asset.formattedDate || "20 Aug 2026"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Uploaded by</span>
                  <span className="text-white font-medium">{asset.uploader || "PMP Creative Team"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Version</span>
                  <span className="text-white font-medium">{asset.version || "V4 Final"}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <a href={asset.url} download target="_blank" className="flex-1">
                  <Button className="w-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-red-600/20">
                    <Download size={16} />
                    <span>Download</span>
                  </Button>
                </a>
                <Button
                  variant="outline"
                  className="flex-1 border-white/20 hover:border-white text-white bg-transparent text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
                  onClick={() => navigator.clipboard?.writeText(asset.url)}
                >
                  <Share2 size={16} />
                  <span>Share</span>
                </Button>
              </div>

              {/* Available Formats */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Available Formats
                </h4>
                <div className="space-y-2">
                  {(asset.availableFormats || [
                    { name: "4K Master", resolution: "3840 x 2160 • MP4", size: "2.8 GB" },
                    { name: "1080p", resolution: "1920 x 1080 • MP4", size: "650 MB" },
                    { name: "9:16 Social", resolution: "1080 x 1920 • MP4", size: "420 MB" },
                  ]).map((fmt, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-neutral-900 rounded-xl border border-white/5 flex items-center justify-between hover:border-white/20 transition-colors"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{fmt.name}</p>
                        <p className="text-[10px] text-white/40 font-mono mt-0.5">
                          {fmt.resolution}
                        </p>
                      </div>
                      <a href={asset.url} download target="_blank">
                        <button className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors">
                          <ArrowDownToLine size={14} />
                        </button>
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Usage Rights */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  Usage Rights
                </h4>
                <p className="text-xs text-white/60 font-medium pl-5">
                  {asset.usageRights || "Approved for web and social."}
                </p>
              </div>

              {/* Version History */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-red-500" />
                  Version History
                </h4>
                <div className="space-y-2 pl-2 border-s border-white/10">
                  {(asset.versionHistory || [
                    { version: "V4 Final", date: "20 Aug 2026", status: "Current" },
                    { version: "V3 Approved", date: "18 Aug 2026", status: "Approved" },
                    { version: "V2 Archived", date: "15 Aug 2026", status: "Archived" },
                  ]).map((vh, i) => (
                    <div key={i} className="flex items-center justify-between text-xs pl-3 relative">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-600 absolute -left-[4px] top-1/2 -translate-y-1/2" />
                      <div>
                        <span className="font-semibold text-white">{vh.version}</span>
                        <span className="text-white/40 text-[10px] ml-2">{vh.date}</span>
                      </div>
                      {vh.status === "Current" && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Current
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
