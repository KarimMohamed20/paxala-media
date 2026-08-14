"use client";

import * as React from "react";
import {
  CheckCircle2,
  FileText,
  Film,
  ImageOff,
  Paperclip,
  Sparkles,
  Vote,
} from "lucide-react";
import { getStatusDotClass } from "@/components/content/content-meta";
import { strokeToPath } from "@/lib/playground/geometry";
import { kindLabel } from "@/lib/playground/a11y";
import { cn } from "@/lib/utils";
import type { CanvasNodeData } from "./types";

/**
 * Renderers for the canvas vocabulary.
 *
 * Split out of canvas-node.tsx once the kind count passed three: the wrapper is
 * about positioning, selection and memoisation, and mixing thirteen content
 * layouts into it made both harder to follow.
 *
 * House rules for every body here:
 *  - text carries `dir="auto"` so Arabic and Hebrew lay out correctly inside a
 *    canvas that is itself pinned LTR;
 *  - nothing is interactive. A node is selected and dragged by the wrapper, so a
 *    button inside one would swallow the pointer and make the card immovable.
 *    Editing happens in the inspector, not on the board.
 */

export function StickyBody({ node }: { node: CanvasNodeData }) {
  const background =
    typeof node.style.background === "string" ? node.style.background : "#F5E6A8";

  return (
    <div
      className="h-full w-full overflow-hidden rounded-xl p-3 shadow-lg shadow-black/40"
      style={{ background }}
    >
      <p
        dir="auto"
        className="h-full w-full overflow-hidden whitespace-pre-wrap break-words text-[13px] font-medium leading-snug text-neutral-900"
      >
        {node.text}
      </p>
    </div>
  );
}

export function TextBody({ node }: { node: CanvasNodeData }) {
  return (
    <p
      dir="auto"
      className="h-full w-full overflow-hidden whitespace-pre-wrap break-words text-[15px] leading-snug text-white"
    >
      {node.text}
    </p>
  );
}

export function ImageBody({ node }: { node: CanvasNodeData }) {
  // Prefer the generated thumbnail: a board opening forty references should pull
  // forty ~15KB WebP files, not forty masters.
  const thumb = typeof node.data.thumbUrl === "string" ? node.data.thumbUrl : null;
  const src = thumb ?? (typeof node.data.url === "string" ? node.data.url : null);
  const alt = typeof node.data.alt === "string" ? node.data.alt : (node.text ?? "");

  if (!src) {
    return (
      <div className="grid h-full w-full place-items-center rounded-xl border border-dashed border-white/15 bg-white/[0.03] text-white/25">
        <ImageOff size={22} aria-hidden="true" />
      </div>
    );
  }

  return (
    // Plain <img>, never next/image. The optimizer re-fetches the source
    // server-side without forwarding cookies, and its disk cache has no auth
    // dimension — both wrong for room media.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      draggable={false}
      loading="lazy"
      className="h-full w-full rounded-xl object-cover"
    />
  );
}

export function VideoBody({ node }: { node: CanvasNodeData }) {
  const poster = typeof node.data.thumbUrl === "string" ? node.data.thumbUrl : null;
  const name = typeof node.data.name === "string" ? node.data.name : node.text;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl bg-neutral-900">
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" draggable={false} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center text-white/20">
          <Film size={26} aria-hidden="true" />
        </div>
      )}
      {/* A still frame with a play badge, not a <video>: forty mounted video
          elements would each hold a decoder. Playback opens in the inspector. */}
      <span className="absolute inset-0 grid place-items-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-black/60 backdrop-blur-sm">
          <span className="ms-0.5 h-0 w-0 border-y-[7px] border-s-[11px] border-y-transparent border-s-white" />
        </span>
      </span>
      {name && (
        <span
          dir="auto"
          className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 text-[11px] text-white/90"
        >
          {name}
        </span>
      )}
    </div>
  );
}

export function FileBody({ node }: { node: CanvasNodeData }) {
  const name = typeof node.data.name === "string" ? node.data.name : (node.text ?? "File");
  const size = typeof node.data.sizeLabel === "string" ? node.data.sizeLabel : null;

  return (
    <div className="flex h-full w-full items-center gap-3 overflow-hidden rounded-xl border border-white/10 bg-neutral-900 p-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/5 text-white/50">
        <Paperclip size={17} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span dir="auto" className="block truncate text-xs font-semibold text-white">
          {name}
        </span>
        {size && <span className="block text-[11px] text-white/40">{size}</span>}
      </span>
    </div>
  );
}

export function ShapeBody({ node }: { node: CanvasNodeData }) {
  const shape = typeof node.style.shape === "string" ? node.style.shape : "rect";
  // Defaults are the PMP accent at low opacity with a solid stroke. The previous
  // near-transparent grey rendered as an empty outlined box that looked broken —
  // a newly placed shape has to be obviously present before it is styled.
  const fill = typeof node.style.fill === "string" ? node.style.fill : "#E20C0C33";
  const stroke = typeof node.style.stroke === "string" ? node.style.stroke : "#E20C0C";

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="h-full w-full overflow-visible"
      aria-hidden="true"
    >
      {shape === "ellipse" ? (
        <ellipse cx="50" cy="50" rx="49" ry="49" fill={fill} stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      ) : shape === "triangle" ? (
        <polygon points="50,2 98,98 2,98" fill={fill} stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      ) : (
        <rect x="1" y="1" width="98" height="98" rx="4" fill={fill} stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      )}
    </svg>
  );
}

/**
 * A freehand stroke.
 *
 * Points are stored in coordinates RELATIVE to the node's own box, so moving the
 * drawing is an ordinary node move and the path never has to be rewritten.
 * `vectorEffect="non-scaling-stroke"` keeps the line a constant weight as the
 * board zooms, matching how a pen behaves rather than how a vector shape does.
 */
export function DrawingBody({ node }: { node: CanvasNodeData }) {
  const colour = typeof node.style.stroke === "string" ? node.style.stroke : "#E20C0C";
  const width = typeof node.style.strokeWidth === "number" ? node.style.strokeWidth : 3;

  // The array literal is built INSIDE the memo: hoisting it would create a new
  // array on every render and defeat the memo entirely — which matters here
  // because strokeToPath walks every point in the stroke.
  const path = React.useMemo(() => {
    const points = Array.isArray(node.data.points)
      ? (node.data.points as Array<{ x: number; y: number }>)
      : [];
    return strokeToPath(points);
  }, [node.data.points]);

  if (!path) return null;

  return (
    <svg
      viewBox={`0 0 ${Math.max(1, node.w)} ${Math.max(1, node.h)}`}
      className="h-full w-full overflow-visible"
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke={colour}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function FrameBody({ node }: { node: CanvasNodeData }) {
  const title = typeof node.data.title === "string" ? node.data.title : node.text;

  return (
    <div className="relative h-full w-full rounded-xl border border-white/15 bg-white/[0.02]">
      {title && (
        <span
          dir="auto"
          // Sits above the frame, like a label on a section of a physical board.
          className="absolute -top-6 start-0 truncate text-[11px] font-bold uppercase tracking-[0.12em] text-white/50"
        >
          {title}
        </span>
      )}
    </div>
  );
}

export function PaletteBody({ node }: { node: CanvasNodeData }) {
  const colours = Array.isArray(node.data.colors)
    ? (node.data.colors as unknown[]).filter(
        (c): c is string => typeof c === "string"
      )
    : [];
  const title = typeof node.data.title === "string" ? node.data.title : node.text;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-neutral-900">
      {title && (
        <span
          dir="auto"
          className="shrink-0 truncate px-3 pb-1.5 pt-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/50"
        >
          {title}
        </span>
      )}
      <div className="flex min-h-0 flex-1">
        {colours.length === 0 ? (
          <span className="grid h-full w-full place-items-center text-[11px] text-white/25">
            —
          </span>
        ) : (
          colours.map((colour, i) => (
            // Swatches carry their hex as a title so the value is recoverable
            // without an inspector, and so colour is not the only signal.
            <span
              key={`${colour}-${i}`}
              title={colour}
              className="h-full flex-1"
              style={{ background: colour }}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * A campaign direction — the card the whole room is usually arguing about.
 *
 * Its status pill reuses `getStatusDotClass` from the content calendar verbatim,
 * so a direction under review looks the same here as the content item it will
 * become.
 */
export function CampaignRouteBody({ node }: { node: CanvasNodeData }) {
  const title = typeof node.data.title === "string" ? node.data.title : null;
  const status = typeof node.data.status === "string" ? node.data.status : null;

  return (
    <div className="flex h-full w-full flex-col gap-2 overflow-hidden rounded-xl border border-white/12 bg-neutral-900 p-3.5">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-red-500">
        {status && (
          <span
            aria-hidden="true"
            className={cn("h-1.5 w-1.5 rounded-full", getStatusDotClass(status as never))}
          />
        )}
        {kindLabel("CAMPAIGN_ROUTE")}
      </span>
      {title && (
        <p dir="auto" className="text-sm font-bold leading-snug text-white">
          {title}
        </p>
      )}
      {node.text && (
        <p
          dir="auto"
          className="overflow-hidden whitespace-pre-wrap break-words text-xs leading-relaxed text-white/60"
        >
          {node.text}
        </p>
      )}
    </div>
  );
}

export function ScriptBody({ node }: { node: CanvasNodeData }) {
  const title = typeof node.data.title === "string" ? node.data.title : null;

  return (
    <div className="flex h-full w-full flex-col gap-2 overflow-hidden rounded-xl border border-white/12 bg-neutral-900 p-3.5">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
        <FileText size={11} aria-hidden="true" />
        {title ?? kindLabel("SCRIPT")}
      </span>
      {/* Script bodies are authored in tiptap, so the stored text may contain
          markup. It is rendered as PLAIN TEXT here rather than with
          dangerouslySetInnerHTML: a canvas card is a preview, and there is no
          reason to open an HTML injection surface for one. */}
      <p
        dir="auto"
        className="overflow-hidden whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-white/70"
      >
        {node.text}
      </p>
    </div>
  );
}

export function PollBody({ node }: { node: CanvasNodeData }) {
  const question =
    typeof node.data.question === "string" ? node.data.question : node.text;
  const options = Array.isArray(node.data.options)
    ? (node.data.options as Array<{ label?: unknown; votes?: unknown }>)
    : [];

  const total = options.reduce(
    (sum, option) => sum + (typeof option.votes === "number" ? option.votes : 0),
    0
  );

  return (
    <div className="flex h-full w-full flex-col gap-2 overflow-hidden rounded-xl border border-white/12 bg-neutral-900 p-3.5">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
        <Vote size={11} aria-hidden="true" />
        {kindLabel("POLL")}
      </span>
      {question && (
        <p dir="auto" className="text-xs font-semibold leading-snug text-white">
          {question}
        </p>
      )}
      <div className="flex min-h-0 flex-col gap-1.5 overflow-hidden">
        {options.slice(0, 5).map((option, i) => {
          const votes = typeof option.votes === "number" ? option.votes : 0;
          const share = total > 0 ? Math.round((votes / total) * 100) : 0;
          return (
            <span key={i} className="block">
              <span className="mb-0.5 flex items-baseline justify-between gap-2">
                <span dir="auto" className="truncate text-[11px] text-white/70">
                  {typeof option.label === "string" ? option.label : "—"}
                </span>
                {/* dir=ltr: a percentage is not bidirectional text. */}
                <span dir="ltr" className="shrink-0 text-[10px] tabular-nums text-white/40">
                  {share}%
                </span>
              </span>
              <span className="block h-1 w-full overflow-hidden rounded-full bg-white/8">
                <span
                  className="block h-full rounded-full bg-red-600"
                  style={{ width: `${share}%` }}
                />
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function DecisionBody({ node }: { node: CanvasNodeData }) {
  const title = typeof node.data.title === "string" ? node.data.title : node.text;
  const outcome = typeof node.data.outcome === "string" ? node.data.outcome : null;

  return (
    <div className="flex h-full w-full flex-col gap-2 overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3.5">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-400">
        <CheckCircle2 size={11} aria-hidden="true" />
        {kindLabel("DECISION")}
      </span>
      {title && (
        <p dir="auto" className="text-xs font-bold leading-snug text-white">
          {title}
        </p>
      )}
      {outcome && (
        <p dir="auto" className="text-[11px] leading-relaxed text-white/60">
          {outcome}
        </p>
      )}
    </div>
  );
}

/**
 * A raw PAX AI generation.
 *
 * Visually distinct on purpose — this is a draft nobody has endorsed. It is
 * created TEAM_ONLY at its creation site and can never be published to a client
 * (see isPublishableKind), so a client will not see one even by mistake.
 */
export function AiCardBody({ node }: { node: CanvasNodeData }) {
  return (
    <div className="flex h-full w-full flex-col gap-2 overflow-hidden rounded-xl border border-dashed border-red-500/40 bg-neutral-900 p-3.5">
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-red-500">
        <Sparkles size={11} aria-hidden="true" />
        {kindLabel("AI_CARD")}
      </span>
      <p
        dir="auto"
        className="overflow-hidden whitespace-pre-wrap break-words text-xs leading-relaxed text-white/75"
      >
        {node.text}
      </p>
    </div>
  );
}
