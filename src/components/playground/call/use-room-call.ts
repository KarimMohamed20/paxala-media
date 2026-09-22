"use client";

import * as React from "react";
import {
  EMPTY_CALL,
  type CallControlCommand,
  type CallSnapshot,
  type IceServerConfig,
} from "@/lib/playground/call/types";
import {
  audioConstraints,
  mediaErrorKind,
  readDevicePrefs,
  videoConstraints,
  writeDevicePrefs,
} from "./devices";
import {
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

/** What the pre-join screen hands over. */
export type JoinOptions = {
  /**
   * Media the pre-join screen already acquired. ADOPTED rather than
   * re-requested: releasing and re-opening a camera costs a visible flicker,
   * and on some phones a second permission prompt.
   */
  stream?: MediaStream;
  muted?: boolean;
  cameraOn?: boolean;
};

export type CallErrorKind =
  | "permission"
  | "device"
  | "full"
  | "staffOnly"
  | "removed"
  | "failed";

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
  /** Currently selected devices, for the in-call picker. */
  audioDeviceId: string | null;
  videoDeviceId: string | null;
  join: (options?: JoinOptions) => Promise<void>;
  leave: () => void;
  switchDevice: (kind: "audio" | "video", deviceId: string) => Promise<void>;
  /** Host action on another participant. Resolves false if refused. */
  moderate: (target: string, command: CallControlCommand) => Promise<boolean>;
  /** Carry out a host's command on THIS participant. */
  applyControl: (command: CallControlCommand) => void;
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
  onError?: (kind: CallErrorKind) => void;
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
  const [audioDeviceId, setAudioDeviceId] = React.useState<string | null>(null);
  const [videoDeviceId, setVideoDeviceId] = React.useState<string | null>(null);

  const peersRef = React.useRef(new Map<string, PeerEntry>());
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const screenTrackRef = React.useRef<MediaStreamTrack | null>(null);
  const cameraTrackRef = React.useRef<MediaStreamTrack | null>(null);
  const iceServersRef = React.useRef<IceServerConfig[]>([]);
  const joinedRef = React.useRef(false);
  const connectionIdRef = React.useRef(connectionId);
  const callRef = React.useRef(call);
  const onErrorRef = React.useRef(onError);
  // Read by handlers invoked from the SSE stream (a host muting you), which
  // must act on the CURRENT state rather than whatever a closure captured.
  const mutedRef = React.useRef(false);
  const cameraOnRef = React.useRef(false);
  const handRaisedRef = React.useRef(false);
  const devicePrefsRef = React.useRef<{ audio: string | null; video: string | null }>({
    audio: null,
    video: null,
  });

  React.useEffect(() => {
    connectionIdRef.current = connectionId;
    callRef.current = call;
    onErrorRef.current = onError;
    mutedRef.current = muted;
    cameraOnRef.current = cameraOn;
    handRaisedRef.current =
      selfMember(call, connectionId)?.handRaised ?? handRaised;
  });

  // Preferences load after mount: localStorage does not exist during server
  // rendering, and reading it in a state initialiser would also make the
  // first client render disagree with the server's.
  React.useEffect(() => {
    const prefs = readDevicePrefs();
    devicePrefsRef.current = prefs;
    setAudioDeviceId(prefs.audio);
    setVideoDeviceId(prefs.video);
  }, []);

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
        // The stream is assembled HERE from the individual tracks rather than
        // taken from `event.streams`. Transceivers are created up front with
        // no track attached (so later camera toggles are a replaceTrack), and
        // a transceiver with no associated stream produces no `a=msid` line —
        // which means `event.streams` arrives EMPTY. Reading it and bailing
        // out silently discarded every remote track: the call connected and
        // nobody could see or hear anyone.
        setRemoteStreams((previous) => {
          const existing = previous.get(peerId);
          const tracks = existing ? existing.getTracks() : [];
          if (tracks.includes(event.track)) return previous;
          const next = new Map(previous);
          // A fresh MediaStream per track arrival: mutating one in place does
          // not change its identity, so React would never re-render the tile.
          next.set(peerId, new MediaStream([...tracks, event.track]));
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

  // NOTE: nothing offers explicitly. Adding the transceivers in createPeer
  // already marks the connection negotiation-needed, so `onnegotiationneeded`
  // fires on its own. An explicit kick-off on top of it sent a SECOND offer
  // that raced the first — perfect negotiation then had to unwind a collision
  // that need never have happened.

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
        createPeer(member.connectionId);
      }
    },
    [closePeer, createPeer]
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
    cameraOnRef.current = false;
    mutedRef.current = false;
    joinedRef.current = false;
    setJoined(false);
  }, [closePeer]);

  const join = React.useCallback(async (options: JoinOptions = {}) => {
    if (joinedRef.current || joining || !connectionIdRef.current) {
      // Nothing is joined, so media handed over must not be leaked.
      options.stream?.getTracks().forEach((track) => track.stop());
      return;
    }
    setJoining(true);

    // Re-read device choices at join time. The pre-join screen writes them
    // to storage; a copy read only when this hook mounted would be stale, and
    // turning the camera on mid-call would open the previous device.
    const prefs = readDevicePrefs();
    devicePrefsRef.current = prefs;
    setAudioDeviceId(prefs.audio);
    setVideoDeviceId(prefs.video);

    // Microphone first: if it is refused there is no call to join, and
    // seating someone who cannot speak would leave a silent tile. The
    // pre-join screen normally supplies it already.
    let audio = options.stream?.getAudioTracks()[0] ?? null;
    if (!audio) {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints(devicePrefsRef.current.audio),
          video: false,
        });
        audio = media.getAudioTracks()[0] ?? null;
      } catch (error) {
        options.stream?.getTracks().forEach((track) => track.stop());
        setJoining(false);
        onErrorRef.current?.(mediaErrorKind(error));
        return;
      }
    }

    const wantsCamera = options.cameraOn === true;
    const video = wantsCamera ? (options.stream?.getVideoTracks()[0] ?? null) : null;
    // A preview camera the user turned off before joining is released now,
    // not carried silently into the call.
    options.stream?.getVideoTracks().forEach((track) => {
      if (track !== video) track.stop();
    });

    const startMuted = options.muted === true;
    if (audio) audio.enabled = !startMuted;

    const release = () => {
      audio?.stop();
      video?.stop();
    };

    const response = await post({
      action: "join",
      // Seated with the chosen state, so nobody sees a one-round-trip flash
      // of "unmuted" or "camera off" before a follow-up update lands.
      state: { muted: startMuted, cameraOn: video !== null },
    });
    if (!response?.ok) {
      release();
      setJoining(false);
      onErrorRef.current?.(await joinFailureKind(response));
      return;
    }

    const data = (await response.json()) as {
      call: CallSnapshot;
      iceServers: IceServerConfig[];
    };
    iceServersRef.current = data.iceServers ?? [];

    const stream = new MediaStream([audio, video].filter(isTrack));
    localStreamRef.current = stream;
    cameraTrackRef.current = video;
    setLocalStream(stream);
    setMuted(startMuted);
    mutedRef.current = startMuted;
    setCameraOn(video !== null);
    cameraOnRef.current = video !== null;
    joinedRef.current = true;
    setJoined(true);
    setJoining(false);

    // Connect to whoever is already here. The roster in the join response is
    // authoritative; later changes arrive as `call` frames.
    const selfId = connectionIdRef.current;
    if (selfId) {
      for (const member of peersOf(data.call, selfId)) {
        createPeer(member.connectionId);
      }
    }
    setCall(data.call);
    callRef.current = data.call;
  }, [createPeer, joining, post]);

  const leave = React.useCallback(() => {
    if (!joinedRef.current) return;
    void post({ action: "leave" });
    teardown();
  }, [post, teardown]);

  // ---- controls ------------------------------------------------------------

  const setMutedEverywhere = React.useCallback(
    (next: boolean) => {
      const stream = localStreamRef.current;
      if (!stream) return;
      // Disabling the track keeps the connection and its timing intact while
      // sending silence; removing it would renegotiate every peer.
      stream.getAudioTracks().forEach((track) => (track.enabled = !next));
      setMuted(next);
      mutedRef.current = next;
      pushState({ muted: next });
    },
    [pushState]
  );

  const toggleMute = React.useCallback(() => {
    setMutedEverywhere(!mutedRef.current);
  }, [setMutedEverywhere]);

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

  /** Camera off — shared by the toggle and by a host's "turn off camera". */
  const stopCamera = React.useCallback(() => {
    if (!cameraOnRef.current) return;
    cameraTrackRef.current?.stop();
    cameraTrackRef.current = null;
    // A live screen share owns the video sender and is left alone.
    if (!screenTrackRef.current) replaceVideoEverywhere(null, "camera");
    setCameraOn(false);
    cameraOnRef.current = false;
    pushState({ cameraOn: false });
  }, [pushState, replaceVideoEverywhere]);

  /** Share off — shared by the toggle, the browser's own bar, and a host. */
  const stopSharing = React.useCallback(() => {
    const track = screenTrackRef.current;
    if (!track) return;
    screenTrackRef.current = null;
    track.stop();
    setSharing(false);
    pushState({ sharing: false });
    // Hand the sender back to the camera if one is still running.
    replaceVideoEverywhere(cameraTrackRef.current, "camera");
  }, [pushState, replaceVideoEverywhere]);

  const toggleCamera = React.useCallback(async () => {
    if (!joinedRef.current) return;
    if (cameraOnRef.current) {
      stopCamera();
      return;
    }

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints(devicePrefsRef.current.video),
      });
      const track = media.getVideoTracks()[0] ?? null;
      if (!track) return;
      cameraTrackRef.current = track;
      // A live screen share owns the video sender; the camera waits its turn.
      if (!screenTrackRef.current) replaceVideoEverywhere(track, "camera");
      setCameraOn(true);
      cameraOnRef.current = true;
      pushState({ cameraOn: true });
    } catch (error) {
      onErrorRef.current?.(mediaErrorKind(error));
    }
  }, [pushState, replaceVideoEverywhere, stopCamera]);

  const toggleShare = React.useCallback(async () => {
    if (!joinedRef.current || !canScreenShare) return;
    if (screenTrackRef.current) {
      stopSharing();
      return;
    }

    try {
      const media = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = media.getVideoTracks()[0] ?? null;
      if (!track) return;
      screenTrackRef.current = track;
      // The browser's own "stop sharing" bar bypasses this UI entirely.
      track.addEventListener("ended", () => {
        if (screenTrackRef.current === track) stopSharing();
      });
      replaceVideoEverywhere(track, "screen");
      setSharing(true);
      pushState({ sharing: true });
    } catch {
      // Cancelling the picker throws; that is not an error worth reporting.
    }
  }, [canScreenShare, pushState, replaceVideoEverywhere, stopSharing]);

  const toggleHand = React.useCallback(() => {
    // Read from the ROSTER when it has us: a host can lower a hand
    // server-side, and a toggle computed from stale local state would then
    // need two clicks to raise it again.
    const current =
      selfMember(callRef.current, connectionIdRef.current)?.handRaised ?? handRaised;
    const next = !current;
    setHandRaised(next);
    pushState({ handRaised: next });
  }, [handRaised, pushState]);

  /**
   * Change microphone or camera mid-call.
   *
   * replaceTrack on every peer's sender — no renegotiation, so the switch is
   * seamless for everyone else. `exact` because this is an explicit choice:
   * if that device fails, saying so beats silently picking another.
   */
  const switchDevice = React.useCallback(
    async (kind: "audio" | "video", deviceId: string) => {
      const prefs = { ...devicePrefsRef.current, [kind]: deviceId };
      devicePrefsRef.current = prefs;
      writeDevicePrefs(prefs);
      if (kind === "audio") setAudioDeviceId(deviceId);
      else setVideoDeviceId(deviceId);

      if (!joinedRef.current) return;

      try {
        if (kind === "audio") {
          const media = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints(deviceId, true),
          });
          const track = media.getAudioTracks()[0];
          if (!track) return;
          // A new mic inherits the mute state; switching must never unmute.
          track.enabled = !mutedRef.current;
          for (const entry of peersRef.current.values()) {
            void entry.audioSender.replaceTrack(track);
          }
          const stream = localStreamRef.current;
          const previous = stream?.getAudioTracks() ?? [];
          const next = new MediaStream([
            track,
            ...(stream?.getVideoTracks() ?? []),
          ]);
          previous.forEach((old) => old.stop());
          localStreamRef.current = next;
          setLocalStream(next);
          return;
        }

        // Camera. Nothing to swap while it is off — the choice is simply
        // remembered for the next time it is turned on.
        if (!cameraOnRef.current) return;
        const media = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints(deviceId, true),
        });
        const track = media.getVideoTracks()[0];
        if (!track) return;
        cameraTrackRef.current?.stop();
        cameraTrackRef.current = track;
        // While sharing, the new camera waits behind the share.
        if (!screenTrackRef.current) replaceVideoEverywhere(track, "camera");
      } catch (error) {
        onErrorRef.current?.(mediaErrorKind(error));
      }
    },
    [replaceVideoEverywhere]
  );

  const moderate = React.useCallback(
    async (target: string, command: CallControlCommand) => {
      const response = await post({ action: "moderate", target, command });
      return response?.ok ?? false;
    },
    [post]
  );

  /**
   * A host's command, arriving on the stream. Only ever turns things OFF —
   * there is deliberately no command that turns a mic or camera on.
   *
   * Removal needs no request back: the server has already dropped the seat
   * and refuses signals from this connection. What remains is releasing the
   * camera and mic, which only this browser can do.
   */
  const applyControl = React.useCallback(
    (command: CallControlCommand) => {
      if (!joinedRef.current) return;
      switch (command) {
        case "mute":
          if (!mutedRef.current) setMutedEverywhere(true);
          return;
        case "cameraOff":
          stopCamera();
          return;
        case "stopShare":
          stopSharing();
          return;
        case "lowerHand":
          // Already lowered on the roster; this keeps local state in step.
          setHandRaised(false);
          return;
        case "remove":
          teardown();
          return;
      }
    },
    [setMutedEverywhere, stopCamera, stopSharing, teardown]
  );

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
    void post({
      action: "join",
      // Re-seat with the state this browser actually has. A bare join made
      // the server seat us with defaults, so after every 15-minute stream
      // recycle everyone else saw us as unmuted and camera-off while our
      // real media had not changed at all.
      state: { muted: mutedRef.current, cameraOn: cameraOnRef.current },
    }).then(async (response) => {
      if (!response?.ok) {
        const kind = await joinFailureKind(response);
        teardown();
        // Removed while reconnecting is worth saying; a transient failure
        // during a network blip is not.
        if (kind === "removed") onErrorRef.current?.("removed");
        return;
      }
      const data = (await response.json()) as {
        call: CallSnapshot;
        iceServers: IceServerConfig[];
      };
      iceServersRef.current = data.iceServers ?? iceServersRef.current;
      setCall(data.call);
      for (const member of peersOf(data.call, connectionId)) {
        createPeer(member.connectionId);
      }
      // Sharing and a raised hand cannot ride the join (they need a live
      // seat), so they are restored right after it.
      const restore: Record<string, boolean> = {};
      if (screenTrackRef.current) restore.sharing = true;
      if (handRaisedRef.current) restore.handRaised = true;
      if (Object.keys(restore).length > 0) pushState(restore);
    });
  }, [closePeer, connectionId, createPeer, post, pushState, teardown]);

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
    audioDeviceId,
    videoDeviceId,
    join,
    leave,
    switchDevice,
    moderate,
    applyControl,
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

function isTrack(track: MediaStreamTrack | null): track is MediaStreamTrack {
  return track !== null;
}

/**
 * Turn a refused join into something a person can act on. A 403 means two
 * different things — "only staff can start a call" and "you were removed from
 * this one" — and they need different words, so the code in the body decides.
 */
async function joinFailureKind(
  response: Response | null
): Promise<"full" | "staffOnly" | "removed" | "failed"> {
  if (!response) return "failed";
  if (response.status === 409) return "full";
  if (response.status === 403) {
    const body = (await response.json().catch(() => null)) as { code?: string } | null;
    return body?.code === "REMOVED_FROM_CALL" ? "removed" : "staffOnly";
  }
  return "failed";
}
