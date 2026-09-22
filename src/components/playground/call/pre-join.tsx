"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Loader2, Mic, MicOff, Video, VideoOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  audioConstraints,
  deviceLabel,
  mediaErrorKind,
  pickDevice,
  readDevicePrefs,
  videoConstraints,
  writeDevicePrefs,
  type DevicePrefs,
} from "./devices";
import { useAudioMeter } from "./use-audio-meter";
import { useMediaDevices } from "./use-media-devices";
import type { JoinOptions } from "./use-room-call";

/**
 * The screen between "Join call" and actually being in it.
 *
 * It exists to catch the mistakes people otherwise discover out loud: the
 * wrong microphone, a camera pointed at the ceiling, a mic that is not
 * picking anything up. It is one extra click, and the media it opens is
 * handed straight to the call rather than closed and re-opened.
 *
 * Camera starts OFF even in the preview. Turning a camera on unasked is the
 * single most intrusive thing a meeting tool can do.
 */

export function PreJoin({
  idle,
  joining,
  onJoin,
  onCancel,
}: {
  /** No call running yet — the button reads "Start" instead of "Join". */
  idle: boolean;
  joining: boolean;
  onJoin: (options: JoinOptions) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("playground");

  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [micOn, setMicOn] = React.useState(true);
  const [cameraOn, setCameraOn] = React.useState(false);
  const [error, setError] = React.useState<"permission" | "device" | null>(null);
  const [prefs, setPrefs] = React.useState<DevicePrefs>({ audio: null, video: null });
  // Bumped after a successful permission grant: device LABELS are empty until
  // then, so the pickers would otherwise show "Microphone 1".
  const [grantKey, setGrantKey] = React.useState(0);

  const devices = useMediaDevices(grantKey);
  const meterRef = useAudioMeter(micOn ? stream : null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Owned media, and whether it has been handed to the call. Once handed off
  // the call owns those tracks — stopping them here on unmount would cut
  // the call's microphone the instant it started.
  const streamRef = React.useRef<MediaStream | null>(null);
  const handedOffRef = React.useRef(false);
  // getUserMedia can resolve AFTER the card is gone — someone clicks Cancel
  // before answering the permission prompt, then grants it. The late track
  // must be stopped on arrival, or the mic keeps recording (and the browser's
  // red indicator stays lit) with nothing on screen to turn it off.
  const mountedRef = React.useRef(true);

  /** Adopt freshly opened media, or stop it at once if the card has gone. */
  const accept = React.useCallback((media: MediaStream): boolean => {
    if (mountedRef.current && !handedOffRef.current) return true;
    media.getTracks().forEach((track) => track.stop());
    return false;
  }, []);

  const replaceTrack = React.useCallback(
    (kind: "audio" | "video", track: MediaStreamTrack | null) => {
      const current = streamRef.current;
      const keep = current
        ? kind === "audio"
          ? current.getVideoTracks()
          : current.getAudioTracks()
        : [];
      const replaced = current
        ? kind === "audio"
          ? current.getAudioTracks()
          : current.getVideoTracks()
        : [];
      replaced.forEach((old) => {
        if (old !== track) old.stop();
      });
      const next = new MediaStream([...keep, ...(track ? [track] : [])]);
      streamRef.current = next;
      setStream(next);
    },
    []
  );

  const openMic = React.useCallback(
    async (deviceId: string | null, exact: boolean) => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints(deviceId, exact),
        });
        if (!accept(media)) return;
        replaceTrack("audio", media.getAudioTracks()[0] ?? null);
        setError(null);
        setGrantKey((n) => n + 1);
      } catch (cause) {
        setError(mediaErrorKind(cause));
      }
    },
    [accept, replaceTrack]
  );

  const openCamera = React.useCallback(
    async (deviceId: string | null, exact: boolean) => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints(deviceId, exact),
        });
        if (!accept(media)) return false;
        replaceTrack("video", media.getVideoTracks()[0] ?? null);
        setGrantKey((n) => n + 1);
        return true;
      } catch (cause) {
        setError(mediaErrorKind(cause));
        return false;
      }
    },
    [accept, replaceTrack]
  );

  // Open the microphone as soon as the card appears: the permission prompt
  // belongs HERE, next to an explanation, not mid-join.
  React.useEffect(() => {
    const remembered = readDevicePrefs();
    setPrefs(remembered);
    void openMic(remembered.audio, false);
  }, [openMic]);

  // Release everything on close — unless the call now owns it.
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (!handedOffRef.current) {
        streamRef.current?.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // srcObject is a property, not an attribute; React cannot set it in JSX.
  React.useEffect(() => {
    const element = videoRef.current;
    if (element && element.srcObject !== stream) element.srcObject = stream;
  }, [stream, cameraOn]);

  const toggleCamera = async () => {
    if (cameraOn) {
      replaceTrack("video", null);
      setCameraOn(false);
      return;
    }
    if (await openCamera(prefs.video, false)) setCameraOn(true);
  };

  const choose = async (kind: "audio" | "video", deviceId: string) => {
    const next = { ...prefs, [kind]: deviceId };
    setPrefs(next);
    writeDevicePrefs(next);
    if (kind === "audio") await openMic(deviceId, true);
    else if (cameraOn) await openCamera(deviceId, true);
  };

  const join = () => {
    const current = streamRef.current;
    if (!current || current.getAudioTracks().length === 0) return;
    handedOffRef.current = true;
    onJoin({ stream: current, muted: !micOn, cameraOn });
  };

  const selectedAudio = pickDevice(devices.audio, prefs.audio);
  const selectedVideo = pickDevice(devices.video, prefs.video);
  const hasMic = (stream?.getAudioTracks().length ?? 0) > 0;
  const label = idle ? t("meeting.start") : t("meeting.join");

  return (
    <div
      role="dialog"
      aria-label={t("meeting.previewTitle")}
      className="pointer-events-auto w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/95 shadow-2xl shadow-black/60 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3">
        <p className="text-sm font-semibold text-white">{t("meeting.previewTitle")}</p>
        <button
          type="button"
          onClick={onCancel}
          aria-label={t("meeting.cancel")}
          className="grid h-7 w-7 place-items-center rounded-full text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="relative mx-4 aspect-video overflow-hidden rounded-xl bg-neutral-950">
        {/* Always mounted so switching the camera on never remounts it. The
            preview is muted: hearing yourself through your own speakers is
            feedback, not a test. */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn(
            "absolute inset-0 h-full w-full -scale-x-100 object-cover",
            !cameraOn && "invisible"
          )}
        />
        {!cameraOn && (
          <span className="absolute inset-0 grid place-items-center text-xs text-white/40">
            {t("meeting.previewCameraOff")}
          </span>
        )}
      </div>

      <div className="space-y-3 px-4 py-3">
        {error ? (
          <p role="alert" className="rounded-lg bg-red-600/15 px-3 py-2 text-xs leading-relaxed text-red-300">
            {error === "permission" ? t("meeting.permissionDenied") : t("meeting.deviceError")}
          </p>
        ) : (
          <div className="space-y-1">
            <span className="text-[11px] text-white/50">{t("meeting.micLevel")}</span>
            {/* The fill grows from the reading-start edge. transform-origin
                has no logical keyword, so the physical origin is flipped
                explicitly for RTL — without it an Arabic meter would fill
                from the wrong side. */}
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                ref={meterRef}
                className="h-full w-full origin-left rounded-full bg-emerald-500 transition-none rtl:origin-right"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
          </div>
        )}

        <DevicePicker
          label={t("meeting.microphone")}
          empty={t("meeting.noDevices")}
          fallback={t("meeting.microphone")}
          devices={devices.audio}
          value={selectedAudio}
          onChange={(id) => void choose("audio", id)}
        />
        <DevicePicker
          label={t("meeting.cameraDevice")}
          empty={t("meeting.noDevices")}
          fallback={t("meeting.cameraDevice")}
          devices={devices.video}
          value={selectedVideo}
          onChange={(id) => void choose("video", id)}
        />

        <div className="flex items-center gap-2 pt-1">
          <ToggleButton
            active={micOn}
            onClick={() => setMicOn((on) => !on)}
            label={micOn ? t("meeting.mic") : t("meeting.unmute")}
            icon={micOn ? Mic : MicOff}
          />
          <ToggleButton
            active={cameraOn}
            onClick={() => void toggleCamera()}
            label={t("meeting.camera")}
            icon={cameraOn ? Video : VideoOff}
          />
          <button
            type="button"
            onClick={join}
            disabled={!hasMic || joining}
            className="ms-auto flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-white/5 disabled:text-white/30"
          >
            {joining && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {label}
          </button>
        </div>
      </div>
    </div>
  );
}

function DevicePicker({
  label,
  empty,
  fallback,
  devices,
  value,
  onChange,
}: {
  label: string;
  empty: string;
  fallback: string;
  devices: MediaDeviceInfo[];
  value: string | null;
  onChange: (deviceId: string) => void;
}) {
  const id = React.useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-[11px] text-white/50">
        {label}
      </label>
      {/* A native select on purpose: on a phone it opens the OS picker, which
          is faster and more usable than any custom dropdown. */}
      <select
        id={id}
        value={value ?? ""}
        disabled={devices.length === 0}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-lg border border-white/10 bg-neutral-950 px-2 text-xs text-white outline-none focus:border-white/30 disabled:text-white/30"
      >
        {devices.length === 0 ? (
          <option value="">{empty}</option>
        ) : (
          devices.map((device, index) => (
            <option key={device.deviceId} value={device.deviceId}>
              {deviceLabel(device, index, fallback)}
            </option>
          ))
        )}
      </select>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full transition-colors",
        active
          ? "bg-white/15 text-white hover:bg-white/20"
          : "bg-red-600/20 text-red-400 hover:bg-red-600/30"
      )}
    >
      <Icon size={16} aria-hidden={true} />
    </button>
  );
}
