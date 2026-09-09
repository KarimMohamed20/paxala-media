/**
 * Shapes shared by the call state machine, the signaling route, the bus and
 * the browser.
 *
 * Deliberately dependency-free so `bus.ts` can import the snapshot type
 * without creating a cycle back through the registry that broadcasts it.
 */

/** What a participant is doing right now. All four are user-toggled. */
export type CallMemberState = {
  muted: boolean;
  cameraOn: boolean;
  sharing: boolean;
  handRaised: boolean;
};

export type CallMember = CallMemberState & {
  /**
   * The SSE connection this member is reachable at — also the peer address
   * for signaling. It CHANGES whenever the stream reconnects (every 15
   * minutes at minimum), which is why nothing durable is keyed on it.
   */
  connectionId: string;
  userId: string;
  name: string | null;
  image: string | null;
  joinedAt: number;
};

/** The whole call, as every participant sees it. */
export type CallSnapshot = {
  active: boolean;
  /** Epoch ms the call started, for the room header's session timer. */
  startedAt: number | null;
  startedByUserId: string | null;
  members: CallMember[];
};

export const EMPTY_CALL: CallSnapshot = {
  active: false,
  startedAt: null,
  startedByUserId: null,
  members: [],
};

/**
 * Mesh ceiling. Every participant sends their video to every other one, so
 * upload cost grows linearly per person and the total grows with the square.
 * Five is where a typical connection stops coping.
 */
export const MAX_CALL_PARTICIPANTS = 5;

/** ICE servers are minted server-side per join; TURN creds are short-lived. */
export type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};
