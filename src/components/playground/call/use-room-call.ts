"use client";

import * as React from "react";
import { EMPTY_CALL, type CallSnapshot, type IceServerConfig } from "@/lib/playground/call/types";
import {
  CAMERA_CONSTRAINTS,
  diffPeers,
  isPolite,
  peersOf,
  selfMember,
  videoBitrateFor,
} from "./negotiation";

/**
 * A mesh WebRTC call in a playground room.
 *
 * One RTCPeerConnection per remote participant — no media server. That is the
 * right shape up to about five people: nothing to host, nothing to pay for,
 * and the media never touches PMP's servers unless a relay is needed. Past
 * five, upload cost per person grows past what a phone can carry and this
 * would need an SFU instead.
 *
 * SIGNALING RIDES THE ROOM'S EXISTING CHANNEL. Offers, answers and ICE
 * candidates POST to /api/playground/rooms/[roomId]/call and come back on the
 * room's SSE stream, because an App Router handler cannot accept a WebSocket
 * upgrade. Latency is a POST plus an SSE frame — fine for negotiation, which
 * happens a handful of times per peer.
 *
 * NEGOTIATION IS "PERFECT NEGOTIATION", the pattern from the WebRTC spec: both
 * sides may offer at any time, and when they collide the polite peer (decided
 * by connection id, see negotiation.ts) rolls back. Without it, two people
 * enabling their cameras simultaneously deadlock the connection.
 *
 * RECONNECTS ARE ROUTINE. The room stream is recycled every 15 minutes and
 * comes back with a new connectionId, so every long call re-addresses itself
 * at least once. A peer that changes id looks like one leaving and another
 * arriving, which this handles as an ordinary roster change.
 */

export type CallControls = {
  call: CallSnapshot;
  /** Local preview, null until the user joins. */
  localStream: MediaStream | null;
  /** Remote media keyed by the peer's connectionId. */
  remoteStreams: Map<string, MediaStream>;
  joined: boolean;
  joining: boolean;
  muted: boolean;
  cameraOn: boolean;
  sharing: boolean;
  handRaised: boolean;
  canScreenShare: boolean;
  join: () => Promise<void>;
  leave: () => void;
  toggleMute: () => void;
  toggleCamera: () => Promise<void>;
  toggleShare: () => Promise<void>;
  toggleHand: () => void;
};

type PeerEntry = {
  pc: RTCPeerConnection;
  /** Perfect-negotiation bookkeeping, per the spec's reference implementation. */
  makingOffer: boolean;
  ignoreOffer: boolean;
  polite: boolean;
  audioSender: RTCRtpSender;
  videoSender: RTCRtpSender;
};

export type UseRoomCallOptions = {
  roomId: string;
  connectionId: string | null;
  /** Errors worth showing a human: denied permissions, a full call. */
  onError?: (kind: "permission" | "device" | "full" | "staffOnly" | "failed") => void;
};

export function useRoomCall({
  roomId,
  connectionId,
  onError,
}: UseRoomCallOptions): CallControls & {
  applyCallEvent: (call: CallSnapshot) => void;
  applyRtcSignal: (from: string, signal: unknown) => void;
} {
  const [call, setCall] = React.useState<CallSnapshot>(EMPTY_CALL);
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = React.useState<Map<string, MediaStream>>(
    () => new Map()
  );
  const [joined, setJoined] = React.useState(false);
  const [joining, setJoining] = React.useState(false);
  const [muted, setMuted] = React.useState(false);
  const [cameraOn, setCameraOn] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);
  const [handRaised, setHandRaised] = React.useState(false);

  const peersRef = React.useRef(new Map<string, PeerEntry>());
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const screenTrackRef = React.useRef<MediaStreamTrack | null>(null);
  const cameraTrackRef = React.useRef<MediaStreamTrack | null>(null);
  const iceServersRef = React.useRef<IceServerConfig[]>([]);
  const joinedRef = React.useRef(false);
  const connectionIdRef = React.useRef(connectionId);
  const callRef = React.useRef(call);
  const onErrorRef = React.useRef(onError);

  React.useEffect(() => {
    connectionIdRef.current = connectionId;
    callRef.current = call;
    onErrorRef.current = onError;
  });

  const canScreenShare =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getDisplayMedia === "function";

  // ---- transport -----------------------------------------------------------

  const post = React.useCallback(
    async (body: Record<string, unknown>): Promise<Response | null> => {
      const id = connectionIdRef.current;
      if (!id) return null;
      try {
        return await fetch(`/api/playground/rooms/${roomId}/call`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, connectionId: id }),
          keepalive: body.action === "leave",
        });
      } catch {
        // The SSE stream reports the roster independently; a dropped state
        // post is not worth surfacing.
        return null;
      }
    },
    [roomId]
  );

  const signal = React.useCallback(
    (to: string, payload: unknown) => {
      void post({ action: "signal", to, signal: payload });
    },
    [post]
  );

  const pushState = React.useCallback(
    (patch: Record<string, boolean>) => {
      void post({ action: "state", state: patch });
    },
    [post]
  );

  // ---- peer plumbing -------------------------------------------------------

  // Read inside long-lived peer callbacks that must not be rebuilt per render.
  const sharingRef = React.useRef(false);
  React.useEffect(() => {
    sharingRef.current = sharing;
  }, [sharing]);

  const attachLocalTracks = React.useCallback((entry: PeerEntry) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audio = stream.getAudioTracks()[0] ?? null;
    const video = stream.getVideoTracks()[0] ?? null;
    void entry.audioSender.replaceTrack(audio);
    void entry.videoSender.replaceTrack(video);
  }, []);

  const createPeer = React.useCallback(
    (peerId: string): PeerEntry => {
      const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });

      // Transceivers are created UP FRONT, in a fixed order, so that turning a
      // camera on later is a replaceTrack rather than a renegotiation. Adding
      // a track mid-call would renegotiate with every peer at once — the
      // moment a call is most likely to already be busy negotiating.
      const audioSender = pc.addTransceiver("audio", { direction: "sendrecv" }).sender;
      const videoSender = pc.addTransceiver("video", { direction: "sendrecv" }).sender;

      const entry: PeerEntry = {
        pc,
        makingOffer: false,
        ignoreOffer: false,
        polite: isPolite(connectionIdRef.current ?? "", peerId),
        audioSender,
        videoSender,
      };

      pc.onnegotiationneeded = async () => {
        try {
          entry.makingOffer = true;
          await pc.setLocalDescription();
          if (pc.localDescription) signal(peerId, { description: pc.localDescription });
        } catch {
          // A failed offer is recoverable: ICE failure below restarts it.
        } finally {
          entry.makingOffer = false;
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) signal(peerId, { candidate: event.candidate });
      };

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (!stream) return;
        setRemoteStreams((previous) => {
          if (previous.get(peerId) === stream) return previous;
          const next = new Map(previous);
          next.set(peerId, stream);
          return next;
        });
      };

      pc.oniceconnectionstatechange = () => {
        // A mobile network switching from wifi to data invalidates every
        // candidate pair. Restarting ICE recovers without rebuilding the call.
        if (pc.iceConnectionState === "failed") pc.restartIce();
      };

      peersRef.current.set(peerId, entry);
      attachLocalTracks(entry);
      applyBitrate(entry, sharingRef.current ? "screen" : "camera");
      return entry;
    },
    [attachLocalTracks, signal]
  );

  /**
   * Open the negotiation with a peer.
   *
   * Only the impolite side calls this on join: if both offered, every new
   * participant would start with a collision that perfect negotiation then has
   * to unwind.
   */
  const kickOff = React.useCallback(
    async (entry: PeerEntry, peerId: string) => {
      try {
        entry.makingOffer = true;
        await entry.pc.setLocalDescription();
        if (entry.pc.localDescription) {
          signal(peerId, { description: entry.pc.localDescription });
        }
      } catch {
        // Handled by the ICE restart on failure.
      } finally {
        entry.makingOffer = false;
      }
    },
    [signal]
  );

  const closePeer = React.useCallback((peerId: string) => {
    const entry = peersRef.current.get(peerId);
    if (!entry) return;
    entry.pc.onnegotiationneeded = null;
    entry.pc.onicecandidate = null;
    entry.pc.ontrack = null;
    entry.pc.oniceconnectionstatechange = null;
    entry.pc.close();
    peersRef.current.delete(peerId);
    setRemoteStreams((previous) => {
      if (!previous.has(peerId)) return previous;
      const next = new Map(previous);
      next.delete(peerId);
      return next;
    });
  }, []);

  // ---- inbound events ------------------------------------------------------

  /** A roster frame: open connections to newcomers, drop the departed. */
  const applyCallEvent = React.useCallback(
    (next: CallSnapshot) => {
      setCall(next);
      callRef.current = next;

      const selfId = connectionIdRef.current;
      if (!joinedRef.current || !selfId) return;

      const { added, removed } = diffPeers(
        [...peersRef.current.keys()],
        next,
        selfId
      );
      for (const peerId of removed) closePeer(peerId);
      for (const member of added) {
        if (peersRef.current.has(member.connectionId)) continue;
        const entry = createPeer(member.connectionId);
        // Only one side opens, or both offer into a collision on every join.
        // The impolite peer offers; the polite one waits and answers.
        if (!entry.polite) void kickOff(entry, member.connectionId);
      }
    },
    [closePeer, createPeer, kickOff]
  );

  /** An offer, answer or candidate from one peer. */
  const applyRtcSignal = React.useCallback(
    async (from: string, payload: unknown) => {
      if (!joinedRef.current) return;
      const message = payload as {
        description?: RTCSessionDescriptionInit;
        candidate?: RTCIceCandidateInit;
      } | null;
      if (!message) return;

      let entry = peersRef.current.get(from);
      if (!entry) {
        // A peer we have not seen a roster for yet — the offer beat the
        // broadcast. Build the connection now rather than dropping it.
        entry = createPeer(from);
      }

      const { pc } = entry;
      try {
        if (message.description) {
          const offerCollision =
            message.description.type === "offer" &&
            (entry.makingOffer || pc.signalingState !== "stable");

          entry.ignoreOffer = !entry.polite && offerCollision;
          if (entry.ignoreOffer) return;

          // The polite peer rolls its own offer back implicitly here.
          await pc.setRemoteDescription(message.description);
          if (message.description.type === "offer") {
            await pc.setLocalDescription();
            if (pc.localDescription) {
              signal(from, { description: pc.localDescription });
            }
          }
        } else if (message.candidate) {
          try {
            await pc.addIceCandidate(message.candidate);
          } catch {
            // Candidates that arrive after a rolled-back offer are expected.
            if (!entry.ignoreOffer) throw new Error("candidate rejected");
          }
        }
      } catch {
        // Negotiation is self-healing: ICE failure triggers a restart.
      }
    },
    [createPeer, signal]
  );

  // ---- lifecycle -----------------------------------------------------------

  const teardown = React.useCallback(() => {
    for (const peerId of [...peersRef.current.keys()]) closePeer(peerId);
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    screenTrackRef.current?.stop();
    cameraTrackRef.current?.stop();
    localStreamRef.current = null;
    screenTrackRef.current = null;
    cameraTrackRef.current = null;
    setLocalStream(null);
    setRemoteStreams(new Map());
    setCameraOn(false);
    setSharing(false);
    setMuted(false);
    setHandRaised(false);
    joinedRef.current = false;
    setJoined(false);
  }, [closePeer]);

  const join = React.useCallback(async () => {
    if (joinedRef.current || joining || !connectionIdRef.current) return;
    setJoining(true);

    // Microphone first: if it is refused there is no call to join, and asking
    // the server to seat someone who cannot speak would leave a silent tile.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (error) {
      setJoining(false);
      const denied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "SecurityError");
      onErrorRef.current?.(denied ? "permission" : "device");
      return;
    }

    const response = await post({ action: "join" });
    if (!response?.ok) {
      stream.getTracks().forEach((track) => track.stop());
      setJoining(false);
      if (response?.status === 409) onErrorRef.current?.("full");
      else if (response?.status === 403) onErrorRef.current?.("staffOnly");
      else onErrorRef.current?.("failed");
      return;
    }

    const data = (await response.json()) as {
      call: CallSnapshot;
      iceServers: IceServerConfig[];
    };
    iceServersRef.current = data.iceServers ?? [];
    localStreamRef.current = stream;
    setLocalStream(stream);
    joinedRef.current = true;
    setJoined(true);
    setJoining(false);

    // Connect to whoever is already here. The roster in the join response is
    // authoritative; later changes arrive as `call` frames.
    const selfId = connectionIdRef.current;
    if (selfId) {
      for (const member of peersOf(data.call, selfId)) {
        const entry = createPeer(member.connectionId);
        if (!entry.polite) void kickOff(entry, member.connectionId);
      }
    }
    setCall(data.call);
    callRef.current = data.call;
  }, [createPeer, joining, kickOff, post]);

  const leave = React.useCallback(() => {
    if (!joinedRef.current) return;
    void post({ action: "leave" });
    teardown();
  }, [post, teardown]);

  // ---- controls ------------------------------------------------------------

  const toggleMute = React.useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    // Disabling the track keeps the connection and its timing intact while
    // sending silence; removing it would renegotiate every peer.
    stream.getAudioTracks().forEach((track) => (track.enabled = !next));
    setMuted(next);
    pushState({ muted: next });
  }, [muted, pushState]);

  const replaceVideoEverywhere = React.useCallback(
    (track: MediaStreamTrack | null, kind: "camera" | "screen") => {
      const peerCount = peersRef.current.size;
      for (const entry of peersRef.current.values()) {
        void entry.videoSender.replaceTrack(track);
        applyBitrate(entry, kind, peerCount);
      }
      const stream = localStreamRef.current;
      if (stream) {
        stream.getVideoTracks().forEach((existing) => stream.removeTrack(existing));
        if (track) stream.addTrack(track);
        // A new MediaStream identity is what tells React to re-render the
        // local tile; mutating tracks in place does not.
        const refreshed = new MediaStream(stream.getTracks());
        localStreamRef.current = refreshed;
        setLocalStream(refreshed);
      }
    },
    []
  );

  const toggleCamera = React.useCallback(async () => {
    if (!joinedRef.current) return;

    if (cameraOn) {
      cameraTrackRef.current?.stop();
      cameraTrackRef.current = null;
      if (!sharing) replaceVideoEverywhere(null, "camera");
      setCameraOn(false);
      pushState({ cameraOn: false });
      return;
    }

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: CAMERA_CONSTRAINTS,
      });
      const track = media.getVideoTracks()[0] ?? null;
      cameraTrackRef.current = track;
      // A live screen share owns the video sender; the camera waits its turn.
      if (!sharing && track) replaceVideoEverywhere(track, "camera");
      setCameraOn(true);
      pushState({ cameraOn: true });
    } catch (error) {
      const denied =
        error instanceof DOMException && error.name === "NotAllowedError";
      onErrorRef.current?.(denied ? "permission" : "device");
    }
  }, [cameraOn, pushState, replaceVideoEverywhere, sharing]);

  const toggleShare = React.useCallback(async () => {
    if (!joinedRef.current || !canScreenShare) return;

    if (sharing) {
      screenTrackRef.current?.stop();
      screenTrackRef.current = null;
      setSharing(false);
      pushState({ sharing: false });
      // Hand the sender back to the camera if one was already running.
      replaceVideoEverywhere(cameraOn ? cameraTrackRef.current : null, "camera");
      return;
    }

    try {
      const media = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = media.getVideoTracks()[0] ?? null;
      if (!track) return;
      screenTrackRef.current = track;
      // The browser's own "stop sharing" bar bypasses this UI entirely.
      track.addEventListener("ended", () => {
        screenTrackRef.current = null;
        setSharing(false);
        pushState({ sharing: false });
        replaceVideoEverywhere(cameraTrackRef.current, "camera");
      });
      replaceVideoEverywhere(track, "screen");
      setSharing(true);
      pushState({ sharing: true });
    } catch {
      // Cancelling the picker throws; that is not an error worth reporting.
    }
  }, [cameraOn, canScreenShare, pushState, replaceVideoEverywhere, sharing]);

  const toggleHand = React.useCallback(() => {
    const next = !handRaised;
    setHandRaised(next);
    pushState({ handRaised: next });
  }, [handRaised, pushState]);

  // ---- reconnect + unload --------------------------------------------------

  // The stream reconnects with a new connectionId roughly every 15 minutes.
  // Re-joining under the new address keeps the seat; the old one is already
  // held for a grace period server-side, so nobody sees a gap.
  const wasConnectedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    const previous = wasConnectedRef.current;
    wasConnectedRef.current = connectionId;
    if (!joinedRef.current || !connectionId || previous === connectionId) return;

    for (const peerId of [...peersRef.current.keys()]) closePeer(peerId);
    void post({ action: "join" }).then(async (response) => {
      if (!response?.ok) {
        teardown();
        return;
      }
      const data = (await response.json()) as {
        call: CallSnapshot;
        iceServers: IceServerConfig[];
      };
      iceServersRef.current = data.iceServers ?? iceServersRef.current;
      setCall(data.call);
      for (const member of peersOf(data.call, connectionId)) {
        const entry = createPeer(member.connectionId);
        if (!entry.polite) void kickOff(entry, member.connectionId);
      }
    });
  }, [closePeer, connectionId, createPeer, kickOff, post, teardown]);

  React.useEffect(() => {
    const onPageHide = () => {
      if (joinedRef.current) void post({ action: "leave" });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      if (joinedRef.current) void post({ action: "leave" });
      teardown();
    };
  }, [post, teardown]);

  const self = selfMember(call, connectionId);

  return {
    call,
    localStream,
    remoteStreams,
    joined,
    joining,
    muted,
    cameraOn,
    sharing,
    handRaised: self?.handRaised ?? handRaised,
    canScreenShare,
    join,
    leave,
    toggleMute,
    toggleCamera,
    toggleShare,
    toggleHand,
    applyCallEvent,
    applyRtcSignal: (from, payload) => void applyRtcSignal(from, payload),
  };
}

/**
 * Cap what one sender pushes.
 *
 * Encoding parameters have to be read, mutated and written back — the object
 * is not a plain setter — and browsers reject the write if the encodings array
 * is empty, which it is until the first negotiation completes.
 */
function applyBitrate(
  entry: PeerEntry,
  kind: "camera" | "screen",
  peerCount = 1
): void {
  try {
    const parameters = entry.videoSender.getParameters();
    if (!parameters.encodings || parameters.encodings.length === 0) return;
    parameters.encodings[0].maxBitrate = videoBitrateFor(kind, peerCount);
    void entry.videoSender.setParameters(parameters);
  } catch {
    // Unsupported on some browsers; the call still works, just less politely.
  }
}
