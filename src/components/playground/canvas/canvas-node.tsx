"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { describeNode } from "@/lib/playground/a11y";
import {
  AiCardBody,
  CampaignRouteBody,
  DecisionBody,
  DrawingBody,
  FileBody,
  FrameBody,
  ImageBody,
  PaletteBody,
  PollBody,
  ScriptBody,
  ShapeBody,
  StickyBody,
  TextBody,
  VideoBody,
} from "./node-bodies";
import type { CanvasNodeData } from "./types";

/**
 * One object on the canvas.
 *
 * Memoised on identity: during a pan or a drag the parent re-renders, and these
 * must not. The comparator is explicit rather than a shallow default because
 * `data` and `style` are fresh object literals on every store update — a shallow
 * compare would report every node as changed and defeat the memo entirely.
 *
 * Position is applied by the PARENT via a wrapper element, not here, so a drag
 * can move the wrapper's transform imperatively without touching React at all.
 */

export const CanvasNode = React.memo(
  function CanvasNode({
    node,
    selected,
    lod,
    tabIndex,
    onPointerDown,
    onFocus,
  }: {
    node: CanvasNodeData;
    selected: boolean;
    /** True when zoomed out far enough that content is illegible. */
    lod: boolean;
    tabIndex: number;
    onPointerDown: (e: React.PointerEvent, node: CanvasNodeData) => void;
    onFocus: (id: string) => void;
  }) {
    const label = describeNode(node, { includeVisibility: node.visibility !== undefined });

    return (
      <div
        data-node-id={node.id}
        role="button"
        tabIndex={tabIndex}
        aria-label={label}
        aria-pressed={selected}
        onPointerDown={(e) => onPointerDown(e, node)}
        onFocus={() => onFocus(node.id)}
        className={cn(
          "absolute select-none outline-none",
          // The ring is drawn here rather than on the overlay so it scales with
          // the node and reads as "this object is selected" at any zoom.
          selected && "ring-2 ring-red-500 ring-offset-2 ring-offset-black",
          "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        )}
        style={{
          left: node.x,
          top: node.y,
          width: node.w,
          height: node.h,
          zIndex: node.z,
          borderRadius: 12,
        }}
      >
        {lod ? <LodBlock node={node} /> : <NodeBody node={node} />}
      </div>
    );
  },
  (prev, next) =>
    prev.node === next.node &&
    prev.selected === next.selected &&
    prev.lod === next.lod &&
    prev.tabIndex === next.tabIndex
);

/**
 * The zoomed-out representation.
 *
 * A single filled rectangle with no text and no image decode. At 35% a sticky's
 * body type is about four pixels tall — unreadable, but still costing layout and
 * paint on every one of several hundred nodes, which is precisely the moment the
 * board is at its densest.
 */
function LodBlock({ node }: { node: CanvasNodeData }) {
  return (
    <div
      aria-hidden="true"
      className="h-full w-full rounded-xl border border-white/10"
      style={{ background: lodColour(node) }}
    />
  );
}

function lodColour(node: CanvasNodeData): string {
  if (node.kind === "STICKY") {
    return typeof node.style.background === "string"
      ? node.style.background
      : "#F5E6A8";
  }
  if (node.kind === "IMAGE") return "rgba(255,255,255,0.22)";
  if (node.kind === "FRAME") return "rgba(255,255,255,0.04)";
  return "rgba(255,255,255,0.12)";
}

function NodeBody({ node }: { node: CanvasNodeData }) {
  switch (node.kind) {
    case "STICKY":
      return <StickyBody node={node} />;
    case "TEXT":
      return <TextBody node={node} />;
    case "IMAGE":
      return <ImageBody node={node} />;
    case "FILE":
      // A FILE node carrying a video mime gets the poster treatment; everything
      // else reads as an attachment chip.
      return typeof node.data.mime === "string" &&
        node.data.mime.startsWith("video/") ? (
        <VideoBody node={node} />
      ) : (
        <FileBody node={node} />
      );
    case "DRAWING":
      return <DrawingBody node={node} />;
    case "SHAPE":
      return <ShapeBody node={node} />;
    case "FRAME":
      return <FrameBody node={node} />;
    case "PALETTE":
      return <PaletteBody node={node} />;
    case "CAMPAIGN_ROUTE":
      return <CampaignRouteBody node={node} />;
    case "SCRIPT":
      return <ScriptBody node={node} />;
    case "POLL":
      return <PollBody node={node} />;
    case "DECISION":
      return <DecisionBody node={node} />;
    case "AI_CARD":
      return <AiCardBody node={node} />;
  }
}
