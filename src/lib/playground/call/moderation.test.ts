import { describe, expect, it } from "vitest";
import {
  checkModeration,
  parseControlCommand,
  type ModerationInput,
} from "./moderation";

const HOST = "host-conn";
const GUEST = "guest-conn";

function input(overrides: Partial<ModerationInput> = {}): ModerationInput {
  return {
    command: "mute",
    moderatorIsStaff: true,
    moderatorOnCall: true,
    moderatorConnectionId: HOST,
    targetConnectionId: GUEST,
    targetStatus: "live",
    ...overrides,
  };
}

describe("checkModeration", () => {
  it("lets staff on the call act on another live participant", () => {
    expect(checkModeration(input())).toEqual({ ok: true });
  });

  it("never gives host controls to a client", () => {
    // A client muting the agency is the failure this exists to prevent.
    expect(checkModeration(input({ moderatorIsStaff: false }))).toEqual({
      ok: false,
      reason: "notStaff",
    });
  });

  it("requires the host to be in the call, not lurking outside it", () => {
    expect(checkModeration(input({ moderatorOnCall: false }))).toEqual({
      ok: false,
      reason: "notOnCall",
    });
  });

  it("refuses self-moderation — removing yourself would lock you out", () => {
    expect(
      checkModeration(input({ command: "remove", targetConnectionId: HOST }))
    ).toEqual({ ok: false, reason: "self" });
  });

  it("reports a target who is no longer on the call", () => {
    expect(checkModeration(input({ targetStatus: "absent" }))).toEqual({
      ok: false,
      reason: "targetGone",
    });
  });

  it("will not send a soft command to someone mid-reconnect", () => {
    // Their stream is down; a mute request would be lost in transit.
    for (const command of ["mute", "cameraOff", "stopShare", "lowerHand"] as const) {
      expect(checkModeration(input({ command, targetStatus: "pending" }))).toEqual({
        ok: false,
        reason: "targetUnreachable",
      });
    }
  });

  it("can still remove someone mid-reconnect, because removal is server-side", () => {
    expect(
      checkModeration(input({ command: "remove", targetStatus: "pending" }))
    ).toEqual({ ok: true });
  });

  it("checks staff before anything else, so a client learns nothing", () => {
    // A non-staff caller must not be able to probe who is on the call via
    // the difference between targetGone and notStaff.
    expect(
      checkModeration(
        input({ moderatorIsStaff: false, targetStatus: "absent", moderatorOnCall: false })
      )
    ).toEqual({ ok: false, reason: "notStaff" });
  });
});

describe("parseControlCommand", () => {
  it("accepts exactly the five commands", () => {
    for (const command of ["mute", "cameraOff", "stopShare", "lowerHand", "remove"]) {
      expect(parseControlCommand(command)).toBe(command);
    }
  });

  it("rejects anything that would turn something ON", () => {
    // Hosts can silence; only the owner can unmute. There is no command for it.
    expect(parseControlCommand("unmute")).toBeUndefined();
    expect(parseControlCommand("cameraOn")).toBeUndefined();
    expect(parseControlCommand("")).toBeUndefined();
    expect(parseControlCommand(null)).toBeUndefined();
  });
});
