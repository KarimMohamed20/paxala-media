import { describe, expect, it } from "vitest";
import {
  MAX_ROOM_UPLOAD_BYTES,
  ROOM_UPLOAD_ACCEPT,
  ROOM_UPLOAD_ALLOWED_MIME,
} from "./room-files";

/**
 * Drift guards: the picker's accept string, the client pre-check and the
 * server route all read these — a mime present in one but not the others
 * recreates the "picker accepts it, server 415s it" trap.
 */
describe("room upload constants", () => {
  it("puts every allowed mime in the accept string", () => {
    for (const mime of ROOM_UPLOAD_ALLOWED_MIME) {
      expect(ROOM_UPLOAD_ACCEPT).toContain(mime);
    }
  });

  it("never uses wildcard accept patterns", () => {
    // image/* is exactly the bug this module exists to prevent.
    expect(ROOM_UPLOAD_ACCEPT).not.toContain("*");
  });

  it("caps room uploads at 50MB", () => {
    expect(MAX_ROOM_UPLOAD_BYTES).toBe(50 * 1024 * 1024);
  });
});
