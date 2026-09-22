import { describe, expect, it } from "vitest";
import {
  audioConstraints,
  deviceLabel,
  mediaErrorKind,
  pickDevice,
  videoConstraints,
} from "./devices";
import { rmsLevel } from "./use-audio-meter";

const DEVICES = [{ deviceId: "mic-a" }, { deviceId: "mic-b" }];

describe("pickDevice", () => {
  it("uses the remembered device while it is still plugged in", () => {
    expect(pickDevice(DEVICES, "mic-b")).toBe("mic-b");
  });

  it("falls back to the first device when the remembered one is gone", () => {
    // An unplugged headset must not make joining fail.
    expect(pickDevice(DEVICES, "unplugged-headset")).toBe("mic-a");
    expect(pickDevice(DEVICES, null)).toBe("mic-a");
  });

  it("is null when there are no devices at all", () => {
    expect(pickDevice([], "mic-a")).toBeNull();
  });
});

describe("deviceLabel", () => {
  it("uses the browser's label when it has one", () => {
    expect(deviceLabel({ label: "Jabra Evolve 20" }, 0, "Microphone")).toBe(
      "Jabra Evolve 20"
    );
  });

  it("numbers devices whose labels are blank before permission", () => {
    expect(deviceLabel({ label: "" }, 1, "Microphone")).toBe("Microphone 2");
    expect(deviceLabel({ label: "   " }, 0, "Camera")).toBe("Camera 1");
  });
});

describe("constraints", () => {
  it("treats a remembered device as a preference, not a requirement", () => {
    // `ideal` falls back quietly; `exact` would throw OverconstrainedError at
    // someone whose remembered webcam is no longer attached.
    expect(audioConstraints("mic-a").deviceId).toEqual({ ideal: "mic-a" });
    expect(videoConstraints("cam-a").deviceId).toEqual({ ideal: "cam-a" });
  });

  it("insists on an explicitly chosen device", () => {
    expect(audioConstraints("mic-a", true).deviceId).toEqual({ exact: "mic-a" });
    expect(videoConstraints("cam-a", true).deviceId).toEqual({ exact: "cam-a" });
  });

  it("always asks for echo cancellation and noise suppression", () => {
    const constraints = audioConstraints(null);
    expect(constraints.echoCancellation).toBe(true);
    expect(constraints.noiseSuppression).toBe(true);
  });

  it("keeps the bandwidth-conscious camera size when a device is chosen", () => {
    expect(videoConstraints("cam-a").width).toEqual({ ideal: 640 });
  });
});

describe("mediaErrorKind", () => {
  it("separates a refused permission from a missing device", () => {
    expect(mediaErrorKind(new DOMException("denied", "NotAllowedError"))).toBe(
      "permission"
    );
    expect(mediaErrorKind(new DOMException("none", "NotFoundError"))).toBe("device");
    expect(mediaErrorKind(new Error("boom"))).toBe("device");
  });
});

describe("rmsLevel", () => {
  it("reads silence as zero", () => {
    expect(rmsLevel(new Uint8Array(512).fill(128))).toBe(0);
  });

  it("rises with loudness and is clamped to 1", () => {
    const quiet = new Uint8Array(512).map((_, i) => (i % 2 ? 132 : 124));
    const loud = new Uint8Array(512).map((_, i) => (i % 2 ? 250 : 6));
    expect(rmsLevel(quiet)).toBeGreaterThan(0);
    expect(rmsLevel(loud)).toBeGreaterThan(rmsLevel(quiet));
    expect(rmsLevel(loud)).toBeLessThanOrEqual(1);
  });

  it("copes with an empty buffer", () => {
    expect(rmsLevel(new Uint8Array(0))).toBe(0);
  });
});
