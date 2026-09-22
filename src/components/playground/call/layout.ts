import type { CallMember } from "@/lib/playground/call/types";

/**
 * How a viewer arranges the call — pure decisions, kept apart from the tile
 * components so they are testable.
 *
 * Everything here is per VIEWER. Pinning someone or switching to grid
 * changes only your screen; nobody else's view moves, and nothing reaches the
 * server. That is deliberate: a host dragging everyone's attention around is
 * a different feature ("spotlight for all"), and a per-person view is what
 * people expect by default from every meeting tool.
 */

/** Strip keeps the canvas clear; grid gives the faces room. */
export type CallLayout = "strip" | "grid";

export type LayoutPrefs = {
  layout: CallLayout;
  /** Collapsed down to a small "N in call" chip. */
  collapsed: boolean;
};

export const DEFAULT_LAYOUT: LayoutPrefs = { layout: "strip", collapsed: false };

/**
 * Who gets the big stage tile, if anyone.
 *
 * An explicit pin wins. Otherwise a screen share takes the stage on its own —
 * a shared screen is the thing everyone in the call is trying to read, and a
 * 192px tile makes it illegible. With neither, there is no stage and every
 * tile is the same size.
 */
export function resolveStage(
  members: readonly CallMember[],
  pinnedId: string | null
): CallMember | null {
  if (pinnedId) {
    const pinned = members.find((member) => member.connectionId === pinnedId);
    if (pinned) return pinned;
  }
  return members.find((member) => member.sharing) ?? null;
}

/**
 * Drop a pin whose person has left.
 *
 * A reconnect gives a participant a NEW connection id, so a pin keyed on the
 * old one would silently stop matching. Following the same user to their new
 * connection keeps the pin through a 15-minute stream recycle.
 */
export function carryPin(
  members: readonly CallMember[],
  pinnedId: string | null,
  pinnedUserId: string | null
): string | null {
  if (!pinnedId) return null;
  if (members.some((member) => member.connectionId === pinnedId)) return pinnedId;
  if (!pinnedUserId) return null;
  return members.find((member) => member.userId === pinnedUserId)?.connectionId ?? null;
}

/**
 * The tiles below the stage. The stage member is EXCLUDED, not duplicated:
 * every tile mounts a media element that plays that person's audio, so a
 * member rendered twice would be heard twice, half a frame apart.
 */
export function stripMembers(
  members: readonly CallMember[],
  stage: CallMember | null
): CallMember[] {
  return stage
    ? members.filter((member) => member.connectionId !== stage.connectionId)
    : [...members];
}

/** Raised hands other than your own — what "lower all hands" acts on. */
export function raisedHands(
  members: readonly CallMember[],
  selfConnectionId: string | null
): CallMember[] {
  return members.filter(
    (member) => member.handRaised && member.connectionId !== selfConnectionId
  );
}

const LAYOUT_KEY = "pmp.playground.call.layout";

/**
 * Per-browser preference. localStorage is right here: it is a convenience for
 * one viewer, not state anyone else needs, and every access is guarded because
 * private windows and locked-down browsers throw on it.
 */
export function readLayoutPrefs(): LayoutPrefs {
  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<LayoutPrefs>;
    return {
      layout: parsed.layout === "grid" ? "grid" : "strip",
      collapsed: parsed.collapsed === true,
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function writeLayoutPrefs(prefs: LayoutPrefs): void {
  try {
    window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(prefs));
  } catch {
    // Storage unavailable — the layout still works, it just is not remembered.
  }
}
