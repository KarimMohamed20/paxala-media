"use client";

import * as React from "react";
import { resolveTextStyle } from "./text-style";
import { useLatest } from "./use-latest";
import { STICKY_FALLBACK_BACKGROUND, type CanvasNodeData } from "./types";

/**
 * Inline text editing.
 *
 * A textarea positioned over the node INSIDE the world layer, so it inherits the
 * canvas transform and stays exactly on top of the card at any zoom or pan. A
 * screen-space editor would drift the moment the board moved underneath it.
 *
 * Font size is set in world units for the same reason: the browser scales it
 * along with everything else, so what you type looks like what you will see.
 *
 * Commit rules, chosen to match what people already have in their fingers:
 *   Escape        cancel, restore the original text
 *   Cmd/Ctrl+Enter commit
 *   blur          commit
 *   Enter         newline — a sticky note is multi-line by nature
 */

/** Kinds whose body is plain text a user can type directly. */
export const EDITABLE_KINDS = new Set([
  "STICKY",
  "TEXT",
  "SHAPE",
  "SCRIPT",
  "CAMPAIGN_ROUTE",
  "DECISION",
  "AI_CARD",
]);

export function isEditable(node: CanvasNodeData): boolean {
  return EDITABLE_KINDS.has(node.kind);
}

export function NodeEditor({
  node,
  onCommit,
  onCancel,
}: {
  node: CanvasNodeData;
  onCommit: (text: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = React.useState(node.text ?? "");
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  // Guards against blur firing after Escape and re-committing the cancelled text.
  const settled = React.useRef(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.focus();
    // Caret to the end rather than selecting everything: double-clicking to
    // append is far more common than double-clicking to replace.
    element.setSelectionRange(element.value.length, element.value.length);
  }, []);

  const commit = () => {
    if (settled.current) return;
    settled.current = true;
    onCommit(value);
  };

  const cancel = () => {
    if (settled.current) return;
    settled.current = true;
    onCancel();
  };

  /**
   * The inspector restyles the node WHILE it is open for editing, and two of
   * its controls (the size field, the colour picker) genuinely take focus.
   * Losing focus to them must not commit: on a just-created empty note the
   * commit path deletes the node, which would unmount the inspector under the
   * user's click.
   *
   * Skipping that blur means the textarea can end up unfocused with the editor
   * still open, so blur alone is no longer a reliable commit trigger. The
   * document listener below restores the invariant: a press anywhere outside
   * the editor and the inspector commits, focused or not. `settled` keeps the
   * two paths from committing twice.
   */
  const commitLatest = useLatest(commit);
  React.useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (containerRef.current?.contains(target)) return;
      if (target.closest("[data-node-inspector]")) return;
      commitLatest.current();
    };
    // Capture phase: a handler further down stopping propagation must not be
    // able to strand an open editor.
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [commitLatest]);

  const isSticky = node.kind === "STICKY";
  const isText = node.kind === "TEXT";
  const isShape = node.kind === "SHAPE";
  // A sticky with no chosen colour edits on its DEFAULT paper colour — the
  // same one StickyBody renders. Falling through to the dark card background
  // used to flip a fresh yellow sticky black mid-edit and put its near-black
  // text on a near-black field: typing produced invisible words, which read
  // as "I can't write into stickies at all".
  const background = isSticky
    ? typeof node.style.background === "string"
      ? node.style.background
      : STICKY_FALLBACK_BACKGROUND
    : undefined;

  const textStyle = resolveTextStyle(node);

  // TEXT edits in place with no chrome at all — no background, border or
  // padding — so what is on screen while typing IS the final node. The card
  // treatment below stays for stickies and cards, where the box is the point.
  // Metrics must mirror TextBody exactly (leading-snug = 1.375) or the words
  // shift the moment the editor closes.
  const style: React.CSSProperties = isText
    ? {
        background: "transparent",
        color: textStyle.color,
        caretColor: textStyle.color,
        fontSize: textStyle.fontSize,
        fontWeight: textStyle.fontWeight,
        textAlign: textStyle.textAlign,
        lineHeight: 1.375,
        padding: 0,
        border: "none",
        // No scrollbar: it would eat horizontal space and re-wrap the words
        // differently from the TextBody that renders after commit. The caret
        // is still scrolled into view by the browser.
        overflow: "hidden",
      }
    : isShape
      ? {
          // A shape's label edits over the still-visible shape. Metrics mirror
          // ShapeBody's overlay (text-xs font-medium, px-3). The textarea is
          // top-aligned while the rendered label is vertically centred — a
          // small accepted jump; centring a textarea's content is not a thing.
          background: "transparent",
          color: "#ffffff",
          caretColor: "#ffffff",
          fontSize: 12,
          fontWeight: 500,
          textAlign: "center",
          lineHeight: 1.375,
          padding: "12px 12px",
          border: "none",
          overflow: "hidden",
        }
      : {
          background: background ?? "rgba(10,10,10,0.96)",
          color: isSticky ? "#171717" : "#ffffff",
          // World-unit sizing: scales with the canvas like the rendered body.
          fontSize: isSticky ? 13 : 15,
          lineHeight: 1.35,
          fontWeight: isSticky ? 500 : 400,
          padding: 12,
          border: "2px solid #E20C0C",
        };

  return (
    <div
      ref={containerRef}
      // Pointer events are captured here so a drag inside the textarea selects
      // text instead of moving the node.
      onPointerDown={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      className="absolute"
      style={{
        left: node.x,
        top: node.y,
        width: node.w,
        height: node.h,
        zIndex: node.z + 1000,
      }}
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={(event) => {
          // Focus moving INTO the inspector is a restyle, not a dismissal.
          if (
            event.relatedTarget instanceof Element &&
            event.relatedTarget.closest("[data-node-inspector]")
          ) {
            return;
          }
          commit();
        }}
        onKeyDown={(event) => {
          // Stop the canvas keyboard handler seeing Delete, Escape, arrows and
          // the digit shortcuts while someone is typing.
          event.stopPropagation();

          if (event.key === "Escape") {
            event.preventDefault();
            cancel();
            return;
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            commit();
          }
        }}
        dir="auto"
        aria-label={`Edit ${node.kind.toLowerCase().replace("_", " ")}`}
        // rounded-xl is only meaningful on the card treatment; TEXT and SHAPE
        // edit transparently with no border, so there is nothing to round.
        className={
          isText || isShape
            ? "h-full w-full resize-none outline-none"
            : "h-full w-full resize-none rounded-xl outline-none"
        }
        style={style}
      />
    </div>
  );
}
