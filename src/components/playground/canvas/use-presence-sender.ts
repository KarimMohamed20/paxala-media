"use client";

import * as React from "react";

/**
 * Broadcast this participant's cursor, viewport and selection.
 *
 * Sent to the OPS endpoint with an empty `ops` array rather than to a presence
 * route of its own. One endpoint means one rate-limit bucket and one nginx
 * location, and — the reason that matters — requests end up budgeted per user
 * rather than per feature. nginx's `limit_req` is keyed on client IP, so six
 * people in one PMP office share a budget; splitting presence into its own
 * route would double their request rate for no benefit.
 *
 * Throttled to 10Hz and skipped entirely when nothing has moved. An idle
 * participant sends nothing at all.
 */

const SEND_INTERVAL_MS = 100;
/** Sub-pixel jitter is not worth a request. */
const MIN_DELTA = 0.5;

export type PresencePayload = {
  cursor: { x: number; y: number } | null;
  viewport: { x: number; y: number; z: number } | null;
  selection: string[];
};

export function usePresenceSender({
  roomId,
  connectionId,
  enabled = true,
}: {
  roomId: string;
  connectionId: string | null;
  enabled?: boolean;
}) {
  const pending = React.useRef<PresencePayload>({
    cursor: null,
    viewport: null,
    selection: [],
  });
  const lastSent = React.useRef<PresencePayload | null>(null);
  const dirty = React.useRef(false);

  const setCursor = React.useCallback((cursor: { x: number; y: number }) => {
    const previous = pending.current.cursor;
    if (
      previous &&
      Math.abs(previous.x - cursor.x) < MIN_DELTA &&
      Math.abs(previous.y - cursor.y) < MIN_DELTA
    ) {
      return;
    }
    pending.current.cursor = cursor;
    dirty.current = true;
  }, []);

  const setViewport = React.useCallback(
    (viewport: { x: number; y: number; z: number }) => {
      pending.current.viewport = viewport;
      dirty.current = true;
    },
    []
  );

  const setSelection = React.useCallback((selection: readonly string[]) => {
    const next = [...selection];
    const previous = pending.current.selection;
    if (
      previous.length === next.length &&
      previous.every((id, i) => id === next[i])
    ) {
      return;
    }
    pending.current.selection = next;
    dirty.current = true;
  }, []);

  React.useEffect(() => {
    if (!enabled || !connectionId) return;

    const id = setInterval(() => {
      if (!dirty.current) return;
      dirty.current = false;

      const payload = {
        cursor: pending.current.cursor,
        viewport: pending.current.viewport,
        selection: pending.current.selection,
      };
      lastSent.current = payload;

      // Fire and forget: a dropped presence frame is replaced by the next one
      // 100ms later, so there is nothing worth retrying and nothing to await.
      void fetch(`/api/playground/rooms/${roomId}/ops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ops: [], connectionId, presence: payload }),
        keepalive: true,
      }).catch(() => {
        // Offline. The stream is reconnecting anyway and will re-announce
        // presence when it does.
      });
    }, SEND_INTERVAL_MS);

    return () => clearInterval(id);
  }, [connectionId, enabled, roomId]);

  return { setCursor, setViewport, setSelection };
}
