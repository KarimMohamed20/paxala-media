"use client";

import * as React from "react";
import type { CanvasNodeData } from "./types";

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

  const isSticky = node.kind === "STICKY";
  const background =
    isSticky && typeof node.style.background === "string"
      ? node.style.background
      : undefined;

  return (
    <div
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
        onBlur={commit}
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
        className="h-full w-full resize-none rounded-xl outline-none"
        style={{
          background: background ?? "rgba(10,10,10,0.96)",
          color: isSticky ? "#171717" : "#ffffff",
          // World-unit sizing: scales with the canvas like the rendered body.
          fontSize: isSticky ? 13 : 15,
          lineHeight: 1.35,
          fontWeight: isSticky ? 500 : 400,
          padding: 12,
          border: "2px solid #E20C0C",
        }}
      />
    </div>
  );
}
