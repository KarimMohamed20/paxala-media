import type { CallMember, CallSnapshot } from "@/lib/playground/call/types";

/**
 * The decisions a mesh call makes, separated from the browser APIs that act
 * on them.
 *
 * RTCPeerConnection does not exist in jsdom, so a hook that mixes policy with
 * media plumbing cannot be tested at all. Everything here is a pure function
 * over plain data and is unit-tested; use-room-call.ts holds the side effects.
 */

/**
 * Which side yields when both peers offer at once.
 *
 * "Perfect negotiation" (the WebRTC spec's own pattern): the polite peer
 * rolls back its offer and accepts the other's, the impolite one ignores the
 * incoming offer. Both sides must agree who is who WITHOUT talking about it,
 * so it is derived from the connection ids they already know — lower id is
 * polite. Any total order works as long as both compute the same one.
 */
export function isPolite(selfConnectionId: string, peerConnectionId: string): boolean {
  return selfConnectionId < peerConnectionId;
}

/**
 * Who this connection should hold a peer connection to.
 *
 * Everyone on the call except yourself. Members are keyed by connection, so a
 * reconnecting peer arrives as a NEW id and the old one disappears — which is
 * exactly the signal to tear down the stale RTCPeerConnection and build one to
 * the new address.
 */
export function peersOf(call: CallSnapshot, selfConnectionId: string): CallMember[] {
  return call.members.filter((member) => member.connectionId !== selfConnectionId);
}

export type PeerDiff = {
  added: CallMember[];
  removed: string[];
};

/** What changed between two rosters, from this connection's point of view. */
export function diffPeers(
  previous: readonly string[],
  call: CallSnapshot,
  selfConnectionId: string
): PeerDiff {
  const next = peersOf(call, selfConnectionId);
  const nextIds = new Set(next.map((member) => member.connectionId));
  const previousIds = new Set(previous);

  return {
    added: next.filter((member) => !previousIds.has(member.connectionId)),
    removed: previous.filter((id) => !nextIds.has(id)),
  };
}

/** Am I on this call right now? Drives the pill's join/leave state. */
export function selfMember(
  call: CallSnapshot,
  selfConnectionId: string | null
): CallMember | null {
  if (!selfConnectionId) return null;
  return (
    call.members.find((member) => member.connectionId === selfConnectionId) ?? null
  );
}

/**
 * Outbound video budget.
 *
 * In a mesh every participant uploads a separate copy of their video to every
 * other participant, so a five-way call means four uploads. Capping keeps the
 * total inside what a typical mobile uplink can carry; screen shares get more
 * because unreadable text defeats the purpose of sharing.
 */
export function videoBitrateFor(kind: "camera" | "screen", peerCount: number): number {
  const ceiling = kind === "screen" ? 1_200_000 : 500_000;
  // Below three peers there is no reason to be stingy; beyond that, divide.
  const share = Math.max(1, peerCount) <= 2 ? ceiling : Math.round(ceiling * 0.6);
  return share;
}

/** Camera constraints — modest on purpose, for the same bandwidth reason. */
export const CAMERA_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 640 },
  height: { ideal: 360 },
  frameRate: { ideal: 24, max: 30 },
};
