import { parseControlCommand } from "./moderation";
import type { CallControlCommand, CallMemberState } from "./types";

/**
 * Validation for call signaling payloads.
 *
 * Same hand-rolled style, and the same hostility assumption, as
 * node-schema.ts: this arrives from a browser and is forwarded verbatim to
 * another participant, so every field is bounded before it is relayed. An
 * unbounded SDP is a way to push megabytes through someone else's stream.
 *
 * The signal body itself is deliberately opaque. Browsers negotiate SDP and
 * ICE among themselves and the server has no business parsing either — it
 * checks the shape and the size, then gets out of the way.
 */

/** A full SDP with a few video codecs runs ~8KB; 64KB is generous. */
export const MAX_SIGNAL_BYTES = 64_000;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CallAction =
  | { action: "join"; state?: Partial<CallMemberState> }
  | { action: "leave" }
  | { action: "state"; state: Partial<CallMemberState> }
  | { action: "signal"; to: string; signal: unknown }
  | { action: "moderate"; target: string; command: CallControlCommand };

/** A connection id, which is a server-minted UUID (stream/route.ts). */
export function parseConnectionId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return UUID_RE.test(value) ? value : undefined;
}

function parseState(value: unknown): Partial<CallMemberState> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const source = value as Record<string, unknown>;
  const state: Partial<CallMemberState> = {};
  // Booleans only, and only these four keys: the roster is broadcast to every
  // participant, so an unknown field would be an arbitrary write into what
  // everyone else renders.
  for (const key of ["muted", "cameraOn", "sharing", "handRaised"] as const) {
    const flag = source[key];
    if (flag === undefined) continue;
    if (typeof flag !== "boolean") return undefined;
    state[key] = flag;
  }
  return Object.keys(state).length > 0 ? state : undefined;
}

/**
 * Parse one request body. Returns undefined for anything malformed — the route
 * answers 400 rather than guessing what was meant.
 */
export function parseCallAction(body: unknown): CallAction | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const source = body as Record<string, unknown>;

  switch (source.action) {
    case "join": {
      // The pre-join choice is optional. Absent means "use the defaults";
      // present but malformed is a broken client and gets a 400.
      if (source.state === undefined) return { action: "join" };
      const state = parseState(source.state);
      if (!state) return undefined;
      // Only mic and camera can be chosen before joining — sharing and a
      // raised hand need a live call to mean anything.
      const initial: Partial<CallMemberState> = {};
      if (state.muted !== undefined) initial.muted = state.muted;
      if (state.cameraOn !== undefined) initial.cameraOn = state.cameraOn;
      return { action: "join", state: initial };
    }
    case "leave":
      return { action: "leave" };
    case "moderate": {
      const target = parseConnectionId(source.target);
      const command = parseControlCommand(source.command);
      if (!target || !command) return undefined;
      return { action: "moderate", target, command };
    }
    case "state": {
      const state = parseState(source.state);
      return state ? { action: "state", state } : undefined;
    }
    case "signal": {
      const to = parseConnectionId(source.to);
      if (!to) return undefined;
      if (source.signal === undefined || source.signal === null) return undefined;
      if (!withinSignalBudget(source.signal)) return undefined;
      return { action: "signal", to, signal: source.signal };
    }
    default:
      return undefined;
  }
}

/** Size is checked on the SERIALISED form — that is what crosses the wire. */
export function withinSignalBudget(signal: unknown): boolean {
  try {
    return JSON.stringify(signal).length <= MAX_SIGNAL_BYTES;
  } catch {
    // Circular structures land here.
    return false;
  }
}
