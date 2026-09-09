import { describe, expect, it } from "vitest";
import {
  TOOL_SHORTCUTS,
  matchToolShortcut,
  shortcutLabel,
  toolForKeyCode,
  type ToolId,
} from "./toolbar-shortcuts";

describe("toolbar shortcuts", () => {
  it("resolves every declared shortcut back to its tool", () => {
    for (const tool of TOOL_SHORTCUTS) {
      expect(toolForKeyCode(`Key${tool.shortcut}`)).toBe(tool.id);
    }
  });

  it("covers every tool exactly once, with unique letters (drift guard)", () => {
    const allTools: ToolId[] = [
      "select",
      "sticky",
      "draw",
      "text",
      "shape",
      "connect",
      "upload",
      "frame",
      "palette",
      "ai",
    ];
    expect(TOOL_SHORTCUTS.map((t) => t.id).sort()).toEqual([...allTools].sort());
    const letters = TOOL_SHORTCUTS.map((t) => t.shortcut);
    expect(new Set(letters).size).toBe(letters.length);
  });

  it("returns null for anything that is not a declared letter", () => {
    expect(toolForKeyCode("KeyX")).toBeNull();
    expect(toolForKeyCode("Digit1")).toBeNull();
    expect(toolForKeyCode("Escape")).toBeNull();
    // The raw letter is not a code — only the "KeyT" form counts.
    expect(toolForKeyCode("T")).toBeNull();
  });

  it("fires only on Ctrl+Alt, never on partial or Cmd-flavoured combos", () => {
    const keys = (overrides: Partial<Parameters<typeof matchToolShortcut>[0]>) => ({
      code: "KeyT",
      ctrlKey: true,
      altKey: true,
      metaKey: false,
      ...overrides,
    });

    expect(matchToolShortcut(keys({}))).toBe("text");
    // A bare letter is TYPING, not a tool.
    expect(matchToolShortcut(keys({ ctrlKey: false, altKey: false }))).toBeNull();
    expect(matchToolShortcut(keys({ altKey: false }))).toBeNull();
    expect(matchToolShortcut(keys({ ctrlKey: false }))).toBeNull();
    // Meta disqualifies: Cmd combos belong to the browser/OS.
    expect(matchToolShortcut(keys({ metaKey: true }))).toBeNull();
    expect(matchToolShortcut(keys({ code: "KeyX" }))).toBeNull();
  });

  it("labels tooltips with the full combo", () => {
    expect(shortcutLabel("T")).toBe("Ctrl+Alt+T");
  });
});
