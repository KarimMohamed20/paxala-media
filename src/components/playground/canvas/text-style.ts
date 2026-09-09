import type { CanvasNodeData } from "./types";

/**
 * The one source of truth for how a TEXT node's style resolves.
 *
 * Both the rendered body and the inline editor read from here, which is what
 * makes editing WYSIWYG: if the two ever computed size or colour separately,
 * the text would visibly jump the moment the editor opened or closed.
 *
 * `style` arrives as hostile JSON (any room member can emit a NODE_STYLE op),
 * so every field is validated and clamped rather than trusted. An absurd font
 * size cannot escape the node's own box — bodies are overflow-hidden — but it
 * would still make the node unreadable for everyone in the room.
 */

export const TEXT_DEFAULT_SIZE = 15;
export const TEXT_MIN_SIZE = 8;
export const TEXT_MAX_SIZE = 200;
export const TEXT_DEFAULT_COLOUR = "#FFFFFF";

/**
 * The +/- stepper ladder. Free typing in between is allowed and clamped. The
 * top rung equals TEXT_MAX_SIZE so a typed 120 still has somewhere to step up
 * to — a permanently disabled + button reads as broken.
 */
export const TEXT_SIZE_STEPS = [12, 15, 18, 24, 32, 48, 64, 96, 128, 200] as const;

export type ResolvedTextStyle = {
  color: string;
  fontSize: number;
  fontWeight: 400 | 700;
  textAlign: "start" | "center" | "end";
};

export function clampFontSize(value: number): number {
  return Math.min(TEXT_MAX_SIZE, Math.max(TEXT_MIN_SIZE, Math.round(value)));
}

export function resolveTextStyle(node: CanvasNodeData): ResolvedTextStyle {
  const { color, fontSize, bold, align } = node.style;

  return {
    // A CSS colour string is inert — worst case an invalid one falls back to
    // the inherited colour — but it still must be a string.
    color: typeof color === "string" ? color : TEXT_DEFAULT_COLOUR,
    fontSize:
      typeof fontSize === "number" && Number.isFinite(fontSize)
        ? clampFontSize(fontSize)
        : TEXT_DEFAULT_SIZE,
    fontWeight: bold === true ? 700 : 400,
    textAlign: align === "center" || align === "end" ? align : "start",
  };
}
