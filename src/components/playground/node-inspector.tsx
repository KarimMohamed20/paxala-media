"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Circle, Plus, Square, Triangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
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

  if (!isSticky && !isShape && !isDrawing && !isPalette) return null;

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

      {isPalette && <PaletteEditor node={node} onData={onData} />}
    </div>
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
