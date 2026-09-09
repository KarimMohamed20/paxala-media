import { describe, expect, it } from "vitest";
import {
  clampFontSize,
  resolveTextStyle,
  TEXT_DEFAULT_COLOUR,
  TEXT_DEFAULT_SIZE,
  TEXT_MAX_SIZE,
  TEXT_MIN_SIZE,
  TEXT_SIZE_STEPS,
} from "./text-style";
import type { CanvasNodeData } from "./types";

/**
 * resolveTextStyle is the trust boundary for TEXT styling: `style` is written
 * by other room members' browsers via NODE_STYLE ops, and the server-side
 * parseNodeJson only guarantees "a JSON object of bounded size" — every field
 * inside it is unvalidated. These tests feed it what a hostile or buggy
 * client could actually send.
 */

function textNode(style: Record<string, unknown>): CanvasNodeData {
  return {
    id: "6f0a2c9e-1b3d-4e5f-8a7b-9c0d1e2f3a4b",
    kind: "TEXT",
    x: 0,
    y: 0,
    w: 260,
    h: 80,
    z: 1,
    rotation: 0,
    frameId: null,
    text: "hello",
    data: {},
    style,
    visibility: "TEAM_ONLY",
    clientVisibleSince: null,
    createdByName: null,
  };
}

describe("resolveTextStyle", () => {
  it("returns the documented defaults for an empty style", () => {
    expect(resolveTextStyle(textNode({}))).toEqual({
      color: TEXT_DEFAULT_COLOUR,
      fontSize: TEXT_DEFAULT_SIZE,
      fontWeight: 400,
      textAlign: "start",
    });
  });

  it("passes through a well-formed style", () => {
    const resolved = resolveTextStyle(
      textNode({ color: "#3B82F6", fontSize: 32, bold: true, align: "center" })
    );
    expect(resolved).toEqual({
      color: "#3B82F6",
      fontSize: 32,
      fontWeight: 700,
      textAlign: "center",
    });
  });

  it("falls back to the default colour for non-string colours", () => {
    for (const color of [7, null, undefined, { hex: "#fff" }, ["#fff"], true]) {
      expect(resolveTextStyle(textNode({ color })).color).toBe(
        TEXT_DEFAULT_COLOUR
      );
    }
  });

  it("rejects non-finite and non-numeric font sizes", () => {
    for (const fontSize of [NaN, Infinity, -Infinity, "24", null, {}, true]) {
      expect(resolveTextStyle(textNode({ fontSize })).fontSize).toBe(
        TEXT_DEFAULT_SIZE
      );
    }
  });

  it("clamps out-of-range font sizes instead of trusting them", () => {
    expect(resolveTextStyle(textNode({ fontSize: 1e9 })).fontSize).toBe(
      TEXT_MAX_SIZE
    );
    expect(resolveTextStyle(textNode({ fontSize: -50 })).fontSize).toBe(
      TEXT_MIN_SIZE
    );
    expect(resolveTextStyle(textNode({ fontSize: 0.4 })).fontSize).toBe(
      TEXT_MIN_SIZE
    );
  });

  it("treats anything but literal true as regular weight", () => {
    for (const bold of ["true", 1, {}, null, undefined, false]) {
      expect(resolveTextStyle(textNode({ bold })).fontWeight).toBe(400);
    }
  });

  it("collapses unknown alignments to start", () => {
    for (const align of ["left", "justify", 3, null, {}, "END"]) {
      expect(resolveTextStyle(textNode({ align })).textAlign).toBe("start");
    }
    expect(resolveTextStyle(textNode({ align: "end" })).textAlign).toBe("end");
  });
});

describe("clampFontSize", () => {
  it("rounds and clamps to the documented range", () => {
    expect(clampFontSize(15.6)).toBe(16);
    expect(clampFontSize(TEXT_MIN_SIZE - 1)).toBe(TEXT_MIN_SIZE);
    expect(clampFontSize(TEXT_MAX_SIZE + 1)).toBe(TEXT_MAX_SIZE);
  });
});

describe("TEXT_SIZE_STEPS", () => {
  it("is ascending and stays inside the clamp range, ending at the max", () => {
    for (let i = 1; i < TEXT_SIZE_STEPS.length; i++) {
      expect(TEXT_SIZE_STEPS[i]).toBeGreaterThan(TEXT_SIZE_STEPS[i - 1]);
    }
    expect(TEXT_SIZE_STEPS[0]).toBeGreaterThanOrEqual(TEXT_MIN_SIZE);
    // If the ladder topped out below the max, a typed 150 would leave the +
    // button permanently disabled.
    expect(TEXT_SIZE_STEPS[TEXT_SIZE_STEPS.length - 1]).toBe(TEXT_MAX_SIZE);
  });
});
