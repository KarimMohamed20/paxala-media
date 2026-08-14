"use client";

import * as React from "react";
import { useReducedMotion } from "framer-motion";
import type { Participant } from "@/lib/playground/bus";
import { type Camera, worldToScreen } from "@/lib/playground/camera";
import { useLatest } from "./use-latest";

/**
 * Other people's cursors.
 *
 * Rendered in SCREEN space over the canvas, and animated ENTIRELY outside React:
 * positions are written straight to `style.transform` inside a rAF loop. Presence
 * arrives at ~10Hz, so a cursor that jumped between those frames would look
 * broken; interpolating toward the target every frame is what makes someone
 * else's pointer glide the way their own does.
 *
 * A `setState` per presence frame per participant would re-render the whole
 * canvas subtree six times a second for decoration. The DOM nodes are created
 * once, when the roster changes, and never re-rendered for movement.
 *
 * Cursors are decorative and `aria-hidden`: who is where is announced through
 * the People list, and narrating a moving pointer would be unusable.
 */

/** Fraction of the remaining distance covered per frame. Higher is snappier. */
const LERP = 0.28;
/** Stop animating below this distance, so idle cursors cost nothing. */
const SETTLE_PX = 0.15;

const COLOURS = [
  "#E20C0C",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#A855F7",
  "#EC4899",
];

/** Stable per-user colour: the same person keeps their colour across sessions. */
function colourFor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return COLOURS[Math.abs(hash) % COLOURS.length];
}

type Tracked = {
  element: HTMLDivElement;
  current: { x: number; y: number };
  target: { x: number; y: number };
};

export function PresenceCursors({
  participants,
  camera,
  selfConnectionId,
}: {
  participants: Participant[];
  camera: Camera;
  selfConnectionId: string | null;
}) {
  // Interpolating six cursors across the viewport is continuous decorative
  // motion. Under reduced motion they snap to each presence frame instead —
  // still accurate, just not animated.
  const reduceMotion = useReducedMotion();
  const layerRef = React.useRef<HTMLDivElement>(null);
  const trackedRef = React.useRef(new Map<string, Tracked>());
  const cameraRef = useLatest(camera);

  // Everyone except me, and only those actually pointing at something.
  const visible = React.useMemo(
    () =>
      participants.filter(
        (p) => p.connectionId !== selfConnectionId && p.presence.cursor !== null
      ),
    [participants, selfConnectionId]
  );

  // Create and destroy cursor elements only when the ROSTER changes — never for
  // movement.
  React.useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;

    const tracked = trackedRef.current;
    const present = new Set(visible.map((p) => p.connectionId));

    for (const [id, entry] of tracked) {
      if (!present.has(id)) {
        entry.element.remove();
        tracked.delete(id);
      }
    }

    for (const participant of visible) {
      if (tracked.has(participant.connectionId)) continue;

      const element = document.createElement("div");
      element.style.cssText =
        "position:absolute;top:0;left:0;pointer-events:none;will-change:transform;z-index:60";
      element.innerHTML = cursorMarkup(
        colourFor(participant.userId),
        participant.name ?? "Guest"
      );
      layer.appendChild(element);

      const screen = worldToScreen(cameraRef.current, participant.presence.cursor!);
      tracked.set(participant.connectionId, {
        element,
        // Start AT the target rather than at the origin, so a cursor appearing
        // mid-session does not fly in from the top-left corner.
        current: { ...screen },
        target: { ...screen },
      });
    }
  }, [cameraRef, visible]);

  // Retarget on every presence frame and on every camera change: a cursor is
  // stored in world coordinates, so panning moves everyone else's pointer too.
  React.useEffect(() => {
    const tracked = trackedRef.current;
    for (const participant of visible) {
      const entry = tracked.get(participant.connectionId);
      if (!entry || !participant.presence.cursor) continue;
      entry.target = worldToScreen(camera, participant.presence.cursor);
    }
  }, [visible, camera]);

  // One rAF loop for every cursor, running only while something is still moving.
  React.useEffect(() => {
    let frame = 0;

    const tick = () => {
      let moving = false;
      for (const entry of trackedRef.current.values()) {
        const dx = entry.target.x - entry.current.x;
        const dy = entry.target.y - entry.current.y;

        if (reduceMotion || (Math.abs(dx) < SETTLE_PX && Math.abs(dy) < SETTLE_PX)) {
          entry.current.x = entry.target.x;
          entry.current.y = entry.target.y;
        } else {
          entry.current.x += dx * LERP;
          entry.current.y += dy * LERP;
          moving = true;
        }

        entry.element.style.transform = `translate3d(${entry.current.x}px, ${entry.current.y}px, 0)`;
      }
      // Keep the loop alive regardless: the cost of an idle rAF is negligible
      // next to the complexity of restarting it correctly when a frame lands.
      void moving;
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduceMotion]);

  React.useEffect(() => {
    const tracked = trackedRef.current;
    return () => {
      for (const entry of tracked.values()) entry.element.remove();
      tracked.clear();
    };
  }, []);

  return (
    <div
      ref={layerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    />
  );
}

/**
 * Cursor arrow plus a name tag.
 *
 * Built as a string because these elements live outside React's tree — that is
 * the entire point. The name is escaped: it comes from a user record and would
 * otherwise be an HTML injection into every other participant's page.
 */
function cursorMarkup(colour: string, name: string): string {
  return `
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style="display:block">
      <path d="M2 2L7.5 15.5L9.8 9.8L15.5 7.5L2 2Z" fill="${colour}" stroke="black" stroke-width="1" stroke-linejoin="round"/>
    </svg>
    <span style="display:inline-block;margin-top:2px;margin-left:10px;padding:2px 6px;border-radius:6px;background:${colour};color:#fff;font-size:10px;font-weight:700;white-space:nowrap;line-height:1.4">${escapeHtml(name)}</span>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
