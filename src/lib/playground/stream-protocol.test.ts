import { describe, expect, it } from "vitest";
import { shouldResync } from "./stream-protocol";

/**
 * The decision that used to live inline in use-room-stream and resynced on
 * every multi-op batch: a 3-op frame stamps its id 3 past the previous frame,
 * which is not a gap. These pin the distinction.
 */
describe("shouldResync", () => {
  it("applies a contiguous multi-op batch (the false-positive this fixes)", () => {
    // Last applied 4; a batch carrying seqs 5..7 arrives stamped 7.
    expect(shouldResync(4, 7, 5)).toBe(false);
  });

  it("resyncs on a true gap even when the frame carries firstSeq", () => {
    // Last applied 4; the next batch starts at 6 — seq 5 was lost.
    expect(shouldResync(4, 8, 6)).toBe(true);
  });

  it("keeps the conservative stamp-only check for legacy frames", () => {
    // Old server, no firstSeq: a stamped jump still forces a resync.
    expect(shouldResync(4, 7, null)).toBe(true);
    expect(shouldResync(4, 5, null)).toBe(false);
  });

  it("never resyncs before a baseline exists", () => {
    expect(shouldResync(0, 100, 90)).toBe(false);
  });

  it("never resyncs off a frame with no usable stamp", () => {
    expect(shouldResync(4, null, null)).toBe(false);
    expect(shouldResync(4, Number.NaN, 9)).toBe(false);
  });

  it("applies an exactly-next frame", () => {
    expect(shouldResync(4, 5, 5)).toBe(false);
  });
});
