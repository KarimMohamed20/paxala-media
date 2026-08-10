"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTimecode } from "@/lib/content-versions";
import type { ContentItemAsset } from "./types";

export interface TimelineMarker {
  id: string;
  index: number;
  timecodeSec: number;
  label: string;
}

const isVideo = (a?: ContentItemAsset | null) =>
  !!a?.file.type?.toLowerCase().includes("video");

/**
 * Review preview for the selected deliverable.
 *
 * Uses the browser's native video controls rather than a custom transport — the
 * annotation layer lives in a separate strip beneath, so we get correct
 * buffering/fullscreen/captions behaviour for free.
 */
export function ApprovalMediaPlayer({
  assets,
  activeAssetId,
  onActiveAssetChange,
  markers,
  onTimeChange,
  seekTo,
  onMarkerClick,
  className,
}: {
  assets: ContentItemAsset[];
  activeAssetId: string | null;
  onActiveAssetChange: (fileId: string) => void;
  markers: TimelineMarker[];
  /** Reports playhead position so the parent can pin a comment to it. */
  onTimeChange?: (seconds: number) => void;
  /** Bump `nonce` to seek; `seconds` is the target. */
  seekTo?: { seconds: number; nonce: number } | null;
  onMarkerClick?: (marker: TimelineMarker) => void;
  className?: string;
}) {
  const t = useTranslations("content");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  const active =
    assets.find((a) => a.file.id === activeAssetId) ?? assets[0] ?? null;
  const video = isVideo(active);

  // Seek on request from the parent (clicking a pinned comment).
  const lastNonce = useRef<number | null>(null);
  useEffect(() => {
    if (!seekTo || seekTo.nonce === lastNonce.current) return;
    lastNonce.current = seekTo.nonce;
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = seekTo.seconds;
    void el.play().catch(() => {
      /* autoplay may be blocked; the seek still landed */
    });
  }, [seekTo]);

  // A new asset means a fresh timeline.
  useEffect(() => {
    setDuration(0);
    setCurrent(0);
    onTimeChange?.(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.file.id]);

  if (!active) {
    return (
      <div
        className={cn(
          "grid place-items-center rounded-xl border border-dashed border-white/10 py-20",
          className
        )}
      >
        <p className="text-sm text-white/40">{t("review.noMedia")}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
        {video ? (
          <video
            ref={videoRef}
            key={active.file.id}
            src={active.file.url}
            poster={active.file.thumbnail ?? undefined}
            controls
            preload="metadata"
            playsInline
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            onTimeUpdate={(e) => {
              const v = e.currentTarget.currentTime;
              setCurrent(v);
              onTimeChange?.(v);
            }}
            className="aspect-video w-full"
          />
        ) : active.file.type?.toLowerCase().includes("image") ||
          active.file.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={active.file.thumbnail || active.file.url}
            alt={active.file.name}
            className="aspect-video w-full object-contain"
          />
        ) : (
          <div className="grid aspect-video w-full place-items-center gap-2">
            <FileText size={36} className="text-white/25" />
            <span className="text-xs text-white/40">{active.file.name}</span>
          </div>
        )}
      </div>

      {/* Annotation strip. Media time reads left-to-right in every locale, so
          this is pinned LTR even under dir="rtl". */}
      {video && (
        <div dir="ltr" className="select-none">
          <div className="relative h-8">
            <div className="absolute inset-x-0 top-4 h-px bg-white/15" />
            {duration > 0 && (
              <div
                className="absolute top-2.5 h-3 w-px bg-red-500"
                style={{
                  left: `${Math.min(100, (current / duration) * 100)}%`,
                }}
                aria-hidden
              />
            )}
            {duration > 0 &&
              markers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  title={m.label}
                  aria-label={`${formatTimecode(m.timecodeSec)} — ${m.label}`}
                  onClick={() => onMarkerClick?.(m)}
                  style={{
                    left: `${Math.min(100, (m.timecodeSec / duration) * 100)}%`,
                  }}
                  className="absolute top-1 grid h-6 w-6 -translate-x-1/2 place-items-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-neutral-950 transition hover:bg-red-500"
                >
                  {m.index}
                </button>
              ))}
          </div>
          <div className="flex justify-between text-[10px] text-white/35">
            <span>0:00</span>
            <span>{duration > 0 ? formatTimecode(duration) : "--:--"}</span>
          </div>
        </div>
      )}

      {/* Asset switcher when the deliverable has several files (carousels). */}
      {assets.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {assets.map((a, i) => {
            const selected = a.file.id === active.file.id;
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => onActiveAssetChange(a.file.id)}
                aria-pressed={selected}
                className={cn(
                  "relative h-12 w-16 overflow-hidden rounded-lg border transition",
                  selected
                    ? "border-red-500 ring-2 ring-red-500/40"
                    : "border-white/10 hover:border-white/30"
                )}
              >
                {a.file.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.file.thumbnail}
                    alt={a.file.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="grid h-full w-full place-items-center bg-white/5">
                    <ImageIcon size={14} className="text-white/40" />
                  </span>
                )}
                <span className="absolute bottom-0 end-0 bg-black/70 px-1 text-[9px] text-white/80">
                  {i + 1}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
