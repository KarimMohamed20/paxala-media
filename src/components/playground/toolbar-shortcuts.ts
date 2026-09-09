/**
 * The creative tools and their keyboard shortcuts — the single source both
 * the toolbar tooltips and the key handler read, so the two cannot drift.
 *
 * Pure and React-free so the mapping is unit-testable. Shortcuts are
 * Ctrl+Alt+letter (owner's decision, 2026-09-08): deliberate enough that a
 * letter typed with a node merely selected can never fire a tool, and free of
 * browser conflicts — plain Ctrl+letter was rejected because Ctrl+T is the
 * browser's new-tab shortcut, which pages never even receive.
 *
 * Windows note: AltGr reports as Ctrl+Alt, so AltGr characters typed into a
 * FIELD would match — the key handler's input/contentEditable guards are what
 * keep that from firing tools mid-word.
 */

export type ToolId =
  | "select"
  | "sticky"
  | "draw"
  | "text"
  | "shape"
  | "connect"
  | "upload"
  | "frame"
  | "palette"
  | "ai";

export const TOOL_SHORTCUTS: ReadonlyArray<{ id: ToolId; shortcut: string }> = [
  { id: "select", shortcut: "V" },
  { id: "sticky", shortcut: "S" },
  { id: "draw", shortcut: "D" },
  { id: "text", shortcut: "T" },
  { id: "shape", shortcut: "R" },
  { id: "connect", shortcut: "C" },
  { id: "upload", shortcut: "U" },
  { id: "frame", shortcut: "F" },
  { id: "palette", shortcut: "P" },
  { id: "ai", shortcut: "K" },
];

/**
 * Map a KeyboardEvent.code ("KeyT") to its tool.
 *
 * Matched on `code`, never `key`: this product ships Arabic and Hebrew
 * layouts, where `key` is a non-Latin character and every letter shortcut
 * would silently die. `code` names the physical key regardless of layout.
 */
export function toolForKeyCode(code: string): ToolId | null {
  for (const tool of TOOL_SHORTCUTS) {
    if (code === `Key${tool.shortcut}`) return tool.id;
  }
  return null;
}

/** The modifier fields the matcher reads — a structural KeyboardEvent slice. */
export type ShortcutKeys = {
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
};

/**
 * The one place that decides whether a keydown IS a tool shortcut:
 * Ctrl+Alt+letter, and nothing else. Meta disqualifies so Cmd-based browser
 * combos on macOS can never double as tools.
 */
export function matchToolShortcut(event: ShortcutKeys): ToolId | null {
  if (!event.ctrlKey || !event.altKey || event.metaKey) return null;
  return toolForKeyCode(event.code);
}

/** Tooltip text for a tool's letter, e.g. "Ctrl+Alt+T". */
export function shortcutLabel(shortcut: string): string {
  return `Ctrl+Alt+${shortcut}`;
}
