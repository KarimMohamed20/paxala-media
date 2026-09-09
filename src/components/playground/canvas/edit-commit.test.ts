import { describe, expect, it } from "vitest";
import { planEditCommit } from "./edit-commit";

/**
 * The commit rules users actually feel: which empty commits delete, which
 * kinds write data.title instead of text, and what counts as "no change".
 */

function node(
  kind: string,
  text: string | null = null,
  data: Record<string, unknown> = {}
) {
  return { kind, text, data } as Parameters<typeof planEditCommit>[0];
}

describe("planEditCommit", () => {
  it("deletes only a TEXT block that never had words", () => {
    expect(planEditCommit(node("TEXT", ""), "  ")).toEqual({ action: "delete" });
    expect(planEditCommit(node("TEXT", null), "")).toEqual({ action: "delete" });
  });

  it("lets an empty sticky survive — it is a visible card, not litter", () => {
    expect(planEditCommit(node("STICKY", ""), "")).toEqual({ action: "none" });
    expect(planEditCommit(node("STICKY", null), "   ")).toEqual({ action: "none" });
  });

  it("clears rather than deletes a TEXT block that had words before", () => {
    expect(planEditCommit(node("TEXT", "hello"), "")).toEqual({
      action: "text",
      text: null,
    });
  });

  it("writes text when it changed, trimmed", () => {
    expect(planEditCommit(node("STICKY", "old"), "  new  ")).toEqual({
      action: "text",
      text: "new",
    });
  });

  it("does nothing when the text is unchanged", () => {
    expect(planEditCommit(node("STICKY", "same"), "same")).toEqual({
      action: "none",
    });
    expect(planEditCommit(node("SHAPE", null), "")).toEqual({ action: "none" });
  });

  it("routes FRAME commits to data.title, preserving sibling keys", () => {
    const frame = node("FRAME", null, { title: "Moodboard", grid: true });
    expect(planEditCommit(frame, "Hero section")).toEqual({
      action: "data",
      data: { title: "Hero section", grid: true },
    });
  });

  it("treats a FRAME's legacy text as the current title for change detection", () => {
    // Older frames carried their label in `text`; retyping the same words must
    // not emit an op.
    expect(planEditCommit(node("FRAME", "Ideas"), "Ideas")).toEqual({
      action: "none",
    });
  });

  it("clears a PALETTE title to null, keeping the colours", () => {
    const palette = node("PALETTE", null, { title: "Brand", colors: ["#111"] });
    expect(planEditCommit(palette, "  ")).toEqual({
      action: "data",
      data: { title: null, colors: ["#111"] },
    });
  });
});
