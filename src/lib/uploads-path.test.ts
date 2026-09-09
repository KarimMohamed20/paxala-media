import path from "path";
import { describe, expect, it } from "vitest";
import { resolveUploadPath } from "./uploads-path";

const ROOT = path.join("/srv", "app", "public", "uploads");

describe("resolveUploadPath", () => {
  it("resolves a legitimate nested path", () => {
    expect(resolveUploadPath(ROOT, ["playground", "room-1", "a.webp"])).toBe(
      path.join(ROOT, "playground", "room-1", "a.webp")
    );
  });

  it("rejects traversal out of the root", () => {
    expect(resolveUploadPath(ROOT, ["..", "..", "etc", "passwd"])).toBeNull();
    expect(resolveUploadPath(ROOT, ["playground", "..", "..", "x"])).toBeNull();
  });

  it("rejects an absolute segment", () => {
    expect(resolveUploadPath(ROOT, ["/etc/passwd"])).toBeNull();
  });

  it("rejects sibling-prefix escapes", () => {
    // "/uploads-evil" starts with "/uploads" as a STRING but is outside it.
    expect(resolveUploadPath(ROOT, ["..", "uploads-evil", "f.png"])).toBeNull();
  });

  it("rejects empty input and NUL bytes", () => {
    expect(resolveUploadPath(ROOT, [])).toBeNull();
    expect(resolveUploadPath(ROOT, [""])).toBeNull();
    expect(resolveUploadPath(ROOT, ["a\0.png"])).toBeNull();
  });

  it("rejects the root itself — a file is always at least one level deep", () => {
    expect(resolveUploadPath(ROOT, ["."])).toBeNull();
  });
});
