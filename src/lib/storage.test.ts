import { describe, expect, it } from "vitest";
import { classifyResource, pickStorageTarget } from "./storage";

/**
 * The free-plan gate: which uploads go to Cloudinary and which stay on local
 * disk. The caps mirror Cloudinary's free-plan per-file limits (10MB image,
 * 100MB video) — if those change, the constants in storage.ts and these
 * boundaries change together.
 */

const MB = 1024 * 1024;

describe("classifyResource", () => {
  it("maps mime families to Cloudinary resource types", () => {
    expect(classifyResource("image/png")).toBe("image");
    expect(classifyResource("video/mp4")).toBe("video");
    expect(classifyResource("audio/mpeg")).toBe("video");
    expect(classifyResource("application/pdf")).toBe("raw");
    expect(classifyResource("application/zip")).toBe("raw");
  });
});

describe("pickStorageTarget", () => {
  it("sends images at or under 10MB to Cloudinary", () => {
    expect(pickStorageTarget("image/jpeg", 10 * MB)).toEqual({
      provider: "cloudinary",
      resourceType: "image",
    });
  });

  it("keeps images over 10MB local", () => {
    expect(pickStorageTarget("image/jpeg", 10 * MB + 1)).toEqual({
      provider: "local",
      resourceType: "image",
    });
  });

  it("sends videos at or under 100MB to Cloudinary", () => {
    expect(pickStorageTarget("video/mp4", 100 * MB)).toEqual({
      provider: "cloudinary",
      resourceType: "video",
    });
  });

  it("keeps videos over 100MB local", () => {
    expect(pickStorageTarget("video/mp4", 100 * MB + 1)).toEqual({
      provider: "local",
      resourceType: "video",
    });
  });

  it("treats audio like video (Cloudinary stores audio under video)", () => {
    expect(pickStorageTarget("audio/mpeg", 5 * MB).provider).toBe("cloudinary");
  });

  it("always keeps documents local, regardless of size", () => {
    expect(pickStorageTarget("application/pdf", 1 * MB)).toEqual({
      provider: "local",
      resourceType: "raw",
    });
    expect(pickStorageTarget("application/zip", 400 * MB).provider).toBe("local");
  });
});
