import type { CallControlCommand } from "./types";

/**
 * Who may moderate whom in a call — decided in one pure place.
 *
 * Kept out of the route so every rule is unit-tested: host controls are an
 * authority feature, and an authority bug (a client muting the agency, a
 * participant removing themselves into a broken state) is the kind that
 * reaches production unnoticed because nobody tries it on purpose.
 */

/** Where the target is, from the call registry's point of view. */
export type TargetStatus = "live" | "pending" | "absent";

export type ModerationInput = {
  command: CallControlCommand;
  /** Staff in studio mode — clients never get host controls. */
  moderatorIsStaff: boolean;
  /** Hosts moderate from inside the call, not by lurking outside it. */
  moderatorOnCall: boolean;
  moderatorConnectionId: string;
  targetConnectionId: string;
  targetStatus: TargetStatus;
};

export type ModerationVerdict =
  | { ok: true }
  | {
      ok: false;
      reason: "notStaff" | "notOnCall" | "self" | "targetGone" | "targetUnreachable";
    };

export function checkModeration(input: ModerationInput): ModerationVerdict {
  if (!input.moderatorIsStaff) return { ok: false, reason: "notStaff" };
  if (!input.moderatorOnCall) return { ok: false, reason: "notOnCall" };

  // Your own mic has its own button. Routing self-moderation through the
  // host path would also let a "remove yourself" record you as removed and
  // lock you out of the call you are hosting.
  if (input.moderatorConnectionId === input.targetConnectionId) {
    return { ok: false, reason: "self" };
  }

  if (input.targetStatus === "absent") return { ok: false, reason: "targetGone" };

  // A member inside the reconnect grace window has no live stream, so a
  // mute request would be lost in transit. Removal is the exception: it is
  // enforced on the server's roster and does not need delivering at all.
  if (input.targetStatus === "pending" && input.command !== "remove") {
    return { ok: false, reason: "targetUnreachable" };
  }

  return { ok: true };
}

/** Parse an untrusted command name. */
export function parseControlCommand(value: unknown): CallControlCommand | undefined {
  switch (value) {
    case "mute":
    case "cameraOff":
    case "stopShare":
    case "lowerHand":
    case "remove":
      return value;
    default:
      return undefined;
  }
}
