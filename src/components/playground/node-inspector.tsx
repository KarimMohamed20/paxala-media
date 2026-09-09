"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Circle,
  Minus,
  Plus,
  Square,
  Triangle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clampFontSize,
  resolveTextStyle,
  TEXT_SIZE_STEPS,
} from "./canvas/text-style";
import type { CanvasNodeData } from "./canvas/types";

/**
 * Properties for the selected node.
 *
 * Every canvas kind that has an appearance needs a way to change it, and until
 * this existed a sticky was permanently yellow, a shape was permanently a faint
 * grey rectangle, and a palette shipped with five colours nobody chose. The
 * renderers read `style` and `data`; this is what writes them.
 *
 * Only appears for a single selection with something to edit. A properties panel
 * that is always on screen and usually empty trains people to ignore it.
 */

/** Sticky colours: paper tones, legible with near-black text at any zoom. */
const STICKY_COLOURS = [
  "#F5E6A8",
  "#F7C8A0",
  "#F2A8A8",
  "#C9E4C5",
  "#B8D8E8",
  "#D9C7E8",
  "#FFFFFF",
];

/** Fills for shapes and drawing, tuned for a black board. */
const INK_COLOURS = [
  "#E20C0C",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#A855F7",
  "#FFFFFF",
];

const SHAPES = [
  { id: "rect", icon: Square },
  { id: "ellipse", icon: Circle },
  { id: "triangle", icon: Triangle },
] as const;

export function NodeInspector({
  node,
  onStyle,
  onData,
}: {
  node: CanvasNodeData;
  onStyle: (patch: Record<string, unknown>) => void;
  onData: (patch: Record<string, unknown>) => void;
}) {
  const t = useTranslations("playground");

  const isSticky = node.kind === "STICKY";
  const isShape = node.kind === "SHAPE";
  const isDrawing = node.kind === "DRAWING";
  const isPalette = node.kind === "PALETTE";
  const isText = node.kind === "TEXT";
  const isFrame = node.kind === "FRAME";
  const isImage = node.kind === "IMAGE";
  const isFile = node.kind === "FILE";

  if (
    !isSticky &&
    !isShape &&
    !isDrawing &&
    !isPalette &&
    !isText &&
    !isFrame &&
    !isImage &&
    !isFile
  ) {
    return null;
  }

  return (
    <div
      // DO NOT STEAL FOCUS. When a node is open for inline editing, the textarea
      // has focus; a mousedown here would blur it, which commits the edit, which
      // deletes an as-yet-untyped sticky and unmounts this panel mid-click. The
      // click then never lands and the colour appears not to work.
      //
      // preventDefault on mousedown is the canonical fix — the same one every
      // rich-text toolbar uses. The click still fires; focus simply stays put.
      onMouseDown={(event) => event.preventDefault()}
      // The inline editor's blur/outside-press handlers use this marker to
      // tell "focus moved into the inspector" apart from a real dismissal.
      data-node-inspector=""
      className="pointer-events-auto flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-sm"
    >
      {isShape && (
        <>
          <span className="flex items-center gap-0.5">
            {SHAPES.map((shape) => {
              const active = (node.style.shape ?? "rect") === shape.id;
              return (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => onStyle({ shape: shape.id })}
                  aria-pressed={active}
                  aria-label={t(`inspector.shapes.${shape.id}`)}
                  title={t(`inspector.shapes.${shape.id}`)}
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-lg transition-colors",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/45 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <shape.icon size={14} aria-hidden="true" />
                </button>
              );
            })}
          </span>
          <span aria-hidden="true" className="h-5 w-px bg-white/10" />
        </>
      )}

      {(isSticky || isShape || isDrawing) && (
        <span
          role="group"
          aria-label={t("inspector.colour")}
          className="flex items-center gap-1"
        >
          {(isSticky ? STICKY_COLOURS : INK_COLOURS).map((colour) => {
            const current = isSticky
              ? (node.style.background ?? STICKY_COLOURS[0])
              : isShape
                ? (node.style.fill ?? INK_COLOURS[0])
                : (node.style.stroke ?? INK_COLOURS[0]);
            const active = current === colour;

            return (
              <button
                key={colour}
                type="button"
                onClick={() =>
                  onStyle(
                    isSticky
                      ? { background: colour }
                      : isShape
                        ? // A shape gets a matching stroke so it reads as one
                          // object rather than an outline of a different colour.
                          { fill: `${colour}33`, stroke: colour }
                        : { stroke: colour }
                  )
                }
                aria-pressed={active}
                // Colour is never the only signal: the swatch carries its hex,
                // and the pressed state is exposed to assistive technology.
                aria-label={colour}
                title={colour}
                className={cn(
                  "h-6 w-6 rounded-md border transition-transform",
                  active
                    ? "scale-110 border-white ring-1 ring-white/40"
                    : "border-white/20 hover:scale-105"
                )}
                style={{ background: colour }}
              />
            );
          })}
        </span>
      )}

      {isDrawing && (
        <>
          <span aria-hidden="true" className="h-5 w-px bg-white/10" />
          <StrokeWidthControls node={node} onStyle={onStyle} />
        </>
      )}

      {/* Keyed so an uncommitted size draft dies with its node instead of
          showing up as the next selected node's size. */}
      {isText && <TextControls key={node.id} node={node} onStyle={onStyle} />}

      {/* FRAME and PALETTE label themselves through data.title — their `text`
          is shadowed the moment a template sets a title. Same key discipline
          as TextControls: a draft must die with its node. */}
      {(isFrame || isPalette) && (
        <DraftField
          key={`title-${node.id}`}
          id={`node-title-${node.id}`}
          label={t("inspector.title")}
          value={
            typeof node.data.title === "string"
              ? node.data.title
              : (node.text ?? "")
          }
          onCommit={(next) => onData({ title: next.trim() || null })}
        />
      )}

      {isImage && (
        <>
          <DraftField
            key={`name-${node.id}`}
            id={`node-name-${node.id}`}
            label={t("inspector.name")}
            value={typeof node.data.name === "string" ? node.data.name : ""}
            onCommit={(next) => onData({ name: next.trim() || null })}
          />
          <DraftField
            key={`alt-${node.id}`}
            id={`node-alt-${node.id}`}
            label={t("inspector.altText")}
            value={typeof node.data.alt === "string" ? node.data.alt : ""}
            onCommit={(next) => onData({ alt: next.trim() || null })}
          />
        </>
      )}

      {isFile && (
        <DraftField
          key={`name-${node.id}`}
          id={`node-name-${node.id}`}
          label={t("inspector.name")}
          value={
            typeof node.data.name === "string"
              ? node.data.name
              : (node.text ?? "")
          }
          onCommit={(next) => onData({ name: next.trim() || null })}
        />
      )}

      {isPalette && <PaletteEditor node={node} onData={onData} />}
    </div>
  );
}

/** Pen weights offered for a DRAWING. 3 is the creation default. */
const STROKE_WIDTHS = [2, 3, 5, 8] as const;

function StrokeWidthControls({
  node,
  onStyle,
}: {
  node: CanvasNodeData;
  onStyle: (patch: Record<string, unknown>) => void;
}) {
  const t = useTranslations("playground");
  const current =
    typeof node.style.strokeWidth === "number" ? node.style.strokeWidth : 3;

  return (
    <span
      role="group"
      aria-label={t("inspector.strokeWidth")}
      className="flex items-center gap-0.5"
    >
      {STROKE_WIDTHS.map((width) => (
        <button
          key={width}
          type="button"
          onClick={() => onStyle({ strokeWidth: width })}
          aria-pressed={current === width}
          aria-label={`${t("inspector.strokeWidth")}: ${width}`}
          title={String(width)}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-lg transition-colors",
            current === width
              ? "bg-white/15 text-white"
              : "text-white/45 hover:bg-white/10 hover:text-white"
          )}
        >
          {/* The control shows the weight itself — a bar of that thickness —
              so no number has to be read (or localised). */}
          <span
            aria-hidden="true"
            className="block w-4 rounded-full bg-current"
            style={{ height: width }}
          />
        </button>
      ))}
    </span>
  );
}

/**
 * A small free-text property, edited as a local draft and committed on
 * blur/Enter — one op per interaction, not one per keystroke. Escape discards
 * the draft. Opts back INTO focus (the panel container suppresses it), which
 * closes any open inline editor; that editor's blur handler recognises the
 * inspector and skips its commit.
 */
function DraftField({
  id,
  label,
  value,
  onCommit,
}: {
  id: string;
  label: string;
  value: string;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = React.useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    setDraft(null);
    if (draft.trim() === value.trim()) return;
    onCommit(draft);
  };

  return (
    <span className="flex items-center">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        dir="auto"
        placeholder={label}
        value={draft ?? value}
        onMouseDown={(event) => event.stopPropagation()}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") commit();
          if (event.key === "Escape") setDraft(null);
        }}
        className="h-7 w-32 rounded-lg bg-white/5 px-2 text-xs text-white outline-none transition-colors placeholder:text-white/30 focus:bg-white/10"
      />
    </span>
  );
}

/** Text colour swatches: the ink set plus the tones text is actually set in. */
const TEXT_COLOURS = [
  "#FFFFFF",
  "#A3A3A3",
  "#E20C0C",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#A855F7",
];

const ALIGNMENTS = [
  { id: "start", icon: AlignLeft },
  { id: "center", icon: AlignCenter },
  { id: "end", icon: AlignRight },
] as const;

/**
 * Controls for a TEXT node: size, weight, alignment, colour.
 *
 * Everything except the two focus-needing inputs works while the node is open
 * for inline editing — the panel's mousedown preventDefault keeps the caret in
 * the textarea, so people restyle the words as they type them.
 */
function TextControls({
  node,
  onStyle,
}: {
  node: CanvasNodeData;
  onStyle: (patch: Record<string, unknown>) => void;
}) {
  const t = useTranslations("playground");
  const { color, fontSize, fontWeight, textAlign } = resolveTextStyle(node);

  // The size field edits a local draft and commits on blur/Enter. Committing
  // per keystroke would clamp mid-typing — "24" becomes 8 the moment the "2"
  // lands — and emit a NODE_STYLE op per digit.
  const [draft, setDraft] = React.useState<string | null>(null);

  const commitDraft = () => {
    if (draft === null) return;
    setDraft(null);
    // A cleared field is "never mind", not a number — Number("") is 0, which
    // would clamp to the minimum and silently shrink the text to 8px.
    const raw = draft.trim();
    if (!raw) return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    const next = clampFontSize(parsed);
    if (next !== fontSize) onStyle({ fontSize: next });
  };

  const smaller = [...TEXT_SIZE_STEPS].reverse().find((s) => s < fontSize);
  const larger = TEXT_SIZE_STEPS.find((s) => s > fontSize);

  return (
    <>
      <span
        role="group"
        aria-label={t("inspector.fontSize")}
        className="flex items-center gap-0.5"
      >
        <button
          type="button"
          disabled={!smaller}
          onClick={() => {
            // Focus never left the size field (the panel eats mousedown), so an
            // uncommitted draft would keep displaying over the stepped value.
            setDraft(null);
            if (smaller) onStyle({ fontSize: smaller });
          }}
          aria-label={t("inspector.smallerText")}
          title={t("inspector.smallerText")}
          className="grid h-7 w-7 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Minus size={13} aria-hidden="true" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          dir="ltr"
          value={draft ?? String(fontSize)}
          // Opts back IN to focus so the value can be typed over; the ± ladder
          // beside it works without stealing focus from an open editor.
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (event.key === "Enter") commitDraft();
            if (event.key === "Escape") setDraft(null);
          }}
          aria-label={t("inspector.fontSize")}
          className="h-7 w-9 rounded-lg bg-white/5 text-center text-xs font-medium tabular-nums text-white outline-none transition-colors focus:bg-white/10"
        />
        <button
          type="button"
          disabled={!larger}
          onClick={() => {
            setDraft(null);
            if (larger) onStyle({ fontSize: larger });
          }}
          aria-label={t("inspector.largerText")}
          title={t("inspector.largerText")}
          className="grid h-7 w-7 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Plus size={13} aria-hidden="true" />
        </button>
      </span>

      <span aria-hidden="true" className="h-5 w-px bg-white/10" />

      <button
        type="button"
        onClick={() => onStyle({ bold: fontWeight !== 700 })}
        aria-pressed={fontWeight === 700}
        aria-label={t("inspector.bold")}
        title={t("inspector.bold")}
        className={cn(
          "grid h-7 w-7 place-items-center rounded-lg transition-colors",
          fontWeight === 700
            ? "bg-white/15 text-white"
            : "text-white/45 hover:bg-white/10 hover:text-white"
        )}
      >
        <Bold size={14} aria-hidden="true" />
      </button>

      <span className="flex items-center gap-0.5">
        {ALIGNMENTS.map((alignment) => {
          const active = textAlign === alignment.id;
          return (
            <button
              key={alignment.id}
              type="button"
              onClick={() => onStyle({ align: alignment.id })}
              aria-pressed={active}
              aria-label={t(`inspector.align.${alignment.id}`)}
              title={t(`inspector.align.${alignment.id}`)}
              className={cn(
                "grid h-7 w-7 place-items-center rounded-lg transition-colors",
                active
                  ? "bg-white/15 text-white"
                  : "text-white/45 hover:bg-white/10 hover:text-white"
              )}
            >
              {/* start/end are logical; in an RTL locale the glyph must flip
                  to keep pointing at the start/end edge. Centre is symmetric. */}
              <alignment.icon
                size={14}
                aria-hidden="true"
                className={alignment.id !== "center" ? "rtl:-scale-x-100" : undefined}
              />
            </button>
          );
        })}
      </span>

      <span aria-hidden="true" className="h-5 w-px bg-white/10" />

      <span
        role="group"
        aria-label={t("inspector.textColour")}
        className="flex items-center gap-1"
      >
        {TEXT_COLOURS.map((colour) => {
          const active = color.toUpperCase() === colour;
          return (
            <button
              key={colour}
              type="button"
              onClick={() => onStyle({ color: colour })}
              aria-pressed={active}
              aria-label={colour}
              title={colour}
              className={cn(
                "h-6 w-6 rounded-md border transition-transform",
                active
                  ? "scale-110 border-white ring-1 ring-white/40"
                  : "border-white/20 hover:scale-105"
              )}
              style={{ background: colour }}
            />
          );
        })}
        <label className="sr-only" htmlFor={`text-colour-${node.id}`}>
          {t("inspector.customColour")}
        </label>
        <input
          id={`text-colour-${node.id}`}
          type="color"
          // The picker input needs a #rrggbb value; anything else falls back.
          value={/^#[0-9a-f]{6}$/i.test(color) ? color : "#ffffff"}
          title={t("inspector.customColour")}
          // Opts back IN to focus: the OS colour picker will not open without it.
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => onStyle({ color: event.target.value })}
          className="h-6 w-6 cursor-pointer appearance-none rounded-md border border-dashed border-white/30 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none"
        />
      </span>
    </>
  );
}

/**
 * Palette editing.
 *
 * Uses a native `<input type="color">` per swatch. The OS picker is better than
 * anything hand-rolled here — it remembers recent colours, supports eyedropper
 * on most platforms, and is already accessible.
 */
function PaletteEditor({
  node,
  onData,
}: {
  node: CanvasNodeData;
  onData: (patch: Record<string, unknown>) => void;
}) {
  const t = useTranslations("playground");

  const colours = React.useMemo(
    () =>
      Array.isArray(node.data.colors)
        ? (node.data.colors as unknown[]).filter(
            (c): c is string => typeof c === "string"
          )
        : [],
    [node.data.colors]
  );

  const set = (index: number, value: string) => {
    const next = [...colours];
    next[index] = value;
    onData({ colors: next });
  };

  return (
    <span className="flex items-center gap-1">
      {colours.map((colour, index) => (
        <span key={index} className="relative">
          <label className="sr-only" htmlFor={`swatch-${node.id}-${index}`}>
            {t("inspector.swatch", { index: index + 1 })}
          </label>
          <input
            id={`swatch-${node.id}-${index}`}
            type="color"
            value={colour}
            // Opts back IN to focus: the OS colour picker will not open without
            // it, and a palette swatch is not something you edit mid-sentence.
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) => set(index, event.target.value)}
            // The native swatch chrome is hidden; the button itself is the swatch.
            className="h-6 w-6 cursor-pointer appearance-none rounded-md border border-white/20 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-none"
          />
          {colours.length > 1 && (
            <button
              type="button"
              onClick={() =>
                onData({ colors: colours.filter((_, i) => i !== index) })
              }
              aria-label={t("inspector.removeSwatch")}
              className="absolute -end-1 -top-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-neutral-800 text-white/60 opacity-0 transition-opacity hover:text-white focus:opacity-100 group-hover:opacity-100 [span:hover>&]:opacity-100"
            >
              <X size={8} aria-hidden="true" />
            </button>
          )}
        </span>
      ))}

      {colours.length < 8 && (
        <button
          type="button"
          onClick={() => onData({ colors: [...colours, "#888888"] })}
          aria-label={t("inspector.addSwatch")}
          title={t("inspector.addSwatch")}
          className="grid h-6 w-6 place-items-center rounded-md border border-dashed border-white/25 text-white/40 transition-colors hover:border-white/40 hover:text-white"
        >
          <Plus size={11} aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
