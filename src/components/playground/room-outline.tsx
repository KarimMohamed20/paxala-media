"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { List } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { describeNode, nodeSpokenText } from "@/lib/playground/a11y";
import { cn } from "@/lib/utils";
import type { CanvasNodeData } from "./canvas/types";
import { readingOrder } from "./canvas/types";

/**
 * The board as a document.
 *
 * A whiteboard is spatial and there is no honest way to make "drag this note
 * 200px left" meaningful to a screen reader. So rather than bolting ARIA onto
 * the canvas and calling it accessible, the same content is offered as a real
 * semantic list, in reading order, with the same selection behaviour: sighted
 * users get a board, screen-reader and keyboard users get a document.
 *
 * This is not a fallback shown only to assistive technology — it is a normal
 * panel tab anyone can use, which is what keeps it working. A hidden-only
 * accessibility surface rots because nobody looks at it.
 */
export function RoomOutline({
  nodes,
  selection,
  onSelect,
  onFocusNode,
  showVisibility,
}: {
  nodes: CanvasNodeData[];
  selection: ReadonlySet<string>;
  onSelect: (id: string, additive: boolean) => void;
  /** Centre the canvas on this node. */
  onFocusNode: (id: string) => void;
  /** Studio mode only — a client is never told about team-only state. */
  showVisibility: boolean;
}) {
  const t = useTranslations("playground");

  const ordered = React.useMemo(() => [...nodes].sort(readingOrder), [nodes]);

  if (ordered.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon={List}
          size="compact"
          title={t("outline.emptyTitle")}
          description={t("outline.emptyBody")}
        />
      </div>
    );
  }

  return (
    <ul className="divide-y divide-white/5">
      {ordered.map((node, index) => {
        const selected = selection.has(node.id);
        const preview = nodeSpokenText(node);

        return (
          <li key={node.id}>
            <button
              type="button"
              onClick={(e) => {
                onSelect(node.id, e.shiftKey || e.metaKey);
                onFocusNode(node.id);
              }}
              aria-pressed={selected}
              aria-label={describeNode(node, {
                kindName: t(`nodeKinds.${node.kind}`),
                index: index + 1,
                total: ordered.length,
                includeVisibility: showVisibility,
              })}
              className={cn(
                "flex w-full items-start gap-2.5 px-4 py-2.5 text-start transition-colors",
                selected ? "bg-white/10" : "hover:bg-white/5"
              )}
            >
              <span className="mt-0.5 shrink-0 text-[10px] font-bold uppercase tracking-wider text-white/30">
                {t(`nodeKinds.${node.kind}`)}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  dir="auto"
                  className="block truncate text-xs text-white/80"
                >
                  {preview || t("outline.noContent")}
                </span>
                {showVisibility && (
                  <span
                    className={cn(
                      "mt-0.5 block text-[10px] font-medium",
                      node.clientVisibleSince ? "text-emerald-400/70" : "text-white/30"
                    )}
                  >
                    {node.clientVisibleSince
                      ? t("visibility.published")
                      : t("visibility.teamOnly")}
                  </span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
