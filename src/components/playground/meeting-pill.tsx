"use client";

import { useTranslations } from "next-intl";
import {
  Check,
  Hand,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  ScreenShare,
  ScreenShareOff,
  Settings2,
  SmilePlus,
  Video,
  VideoOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { deviceLabel, pickDevice } from "./call/devices";
import { useMediaDevices } from "./call/use-media-devices";

/**
 * The floating meeting control pill.
 *
 * Two states in one component. Before joining it is a single "start / join"
 * button — a row of mute and camera toggles for a call you are not on is
 * noise. Once joined the full control set appears, each button reflecting
 * live state rather than merely being clickable.
 *
 * The emoji reaction stays disabled: reactions are a separate feature with
 * their own broadcast, and a button that looks live but does nothing is worse
 * than one that says it is not ready.
 */

export type MeetingPillProps = {
  /** False for a viewer who may not take part at all. */
  enabled?: boolean;
  joined: boolean;
  joining: boolean;
  /** True when nobody is on the call yet — changes the label to "start". */
  idle: boolean;
  /** Clients may join a running call but not start one. */
  canStart: boolean;
  muted: boolean;
  cameraOn: boolean;
  sharing: boolean;
  handRaised: boolean;
  canScreenShare: boolean;
  audioDeviceId: string | null;
  videoDeviceId: string | null;
  onSelectDevice: (kind: "audio" | "video", deviceId: string) => void;
  onJoin: () => void;
  onLeave: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleShare: () => void;
  onToggleHand: () => void;
};

export function MeetingPill({
  enabled = true,
  joined,
  joining,
  idle,
  canStart,
  muted,
  cameraOn,
  sharing,
  handRaised,
  canScreenShare,
  audioDeviceId,
  videoDeviceId,
  onSelectDevice,
  onJoin,
  onLeave,
  onToggleMute,
  onToggleCamera,
  onToggleShare,
  onToggleHand,
}: MeetingPillProps) {
  const t = useTranslations("playground");

  if (!joined) {
    // A client cannot ring an empty room: the agency starts the call. Showing
    // the button as blocked with a reason beats hiding it and leaving them
    // wondering whether calls exist at all.
    const blocked = !enabled || (idle && !canStart);
    const label = idle ? t("meeting.start") : t("meeting.join");

    return (
      <div
        className="pointer-events-auto flex items-center rounded-full border border-white/10 bg-neutral-900/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-sm"
      >
        <Tooltip
          label={blocked ? t("meeting.staffOnlyStart") : label}
          side="top"
        >
          <button
            type="button"
            disabled={blocked || joining}
            onClick={onJoin}
            aria-label={label}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900",
              blocked
                ? "cursor-not-allowed bg-white/5 text-white/30"
                : "bg-emerald-600 text-white hover:bg-emerald-500"
            )}
          >
            {joining ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Phone size={16} aria-hidden="true" />
            )}
            {label}
          </button>
        </Tooltip>
      </div>
    );
  }

  const controls = [
    {
      id: "mic",
      icon: muted ? MicOff : Mic,
      label: muted ? t("meeting.unmute") : t("meeting.mic"),
      active: !muted,
      danger: muted,
      onClick: onToggleMute,
      show: true,
    },
    {
      id: "camera",
      icon: cameraOn ? Video : VideoOff,
      label: t("meeting.camera"),
      active: cameraOn,
      danger: false,
      onClick: onToggleCamera,
      show: true,
    },
    {
      id: "share",
      icon: sharing ? ScreenShareOff : ScreenShare,
      label: t("meeting.share"),
      active: sharing,
      danger: false,
      onClick: onToggleShare,
      // Mobile browsers have no screen capture; a permanently failing button
      // is worse than an absent one.
      show: canScreenShare,
    },
    {
      id: "raise",
      icon: Hand,
      label: t("meeting.raise"),
      active: handRaised,
      danger: false,
      onClick: onToggleHand,
      show: true,
    },
  ] as const;

  return (
    <div
      role="group"
      aria-label={t("meeting.label")}
      className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-neutral-900/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-sm"
    >
      {controls
        .filter((control) => control.show)
        .map((control) => (
          <Tooltip key={control.id} label={control.label} side="top">
            <button
              type="button"
              onClick={control.onClick}
              aria-label={control.label}
              aria-pressed={control.active}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-full transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900",
                control.danger
                  ? "bg-red-600/20 text-red-400 hover:bg-red-600/30"
                  : control.active
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <control.icon size={17} aria-hidden="true" />
            </button>
          </Tooltip>
        ))}

      <DeviceMenu
        audioDeviceId={audioDeviceId}
        videoDeviceId={videoDeviceId}
        onSelect={onSelectDevice}
      />

      {/* Reactions are their own feature; the seat is kept, visibly inert.
          Its own reason string — "live video is not enabled" would now be a
          lie told next to a working camera button. */}
      <Tooltip label={t("meeting.reactSoon")} side="top">
        <button
          type="button"
          disabled
          aria-label={t("meeting.react")}
          className="grid h-10 w-10 cursor-not-allowed place-items-center rounded-full text-white/25"
        >
          <SmilePlus size={17} aria-hidden="true" />
        </button>
      </Tooltip>

      <span aria-hidden="true" className="mx-1 h-6 w-px bg-white/10" />

      <Tooltip label={t("meeting.leave")} side="top">
        <button
          type="button"
          onClick={onLeave}
          aria-label={t("meeting.leave")}
          className="grid h-10 w-12 place-items-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-500"
        >
          <PhoneOff size={17} aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  );
}

/**
 * Switch microphone or camera without leaving the call.
 *
 * Rows are plain items with an inline check laid out by flexbox rather than
 * the shared RadioItem, whose indicator is absolutely positioned with a
 * physical `left-2` — in Arabic and Hebrew the check would sit on the wrong
 * side of the label.
 */
function DeviceMenu({
  audioDeviceId,
  videoDeviceId,
  onSelect,
}: {
  audioDeviceId: string | null;
  videoDeviceId: string | null;
  onSelect: (kind: "audio" | "video", deviceId: string) => void;
}) {
  const t = useTranslations("playground");
  // Mounted only while joined, so permission is already granted and the
  // device labels are real names rather than blanks.
  const devices = useMediaDevices();
  const selectedAudio = pickDevice(devices.audio, audioDeviceId);
  const selectedVideo = pickDevice(devices.video, videoDeviceId);

  const rows = (
    kind: "audio" | "video",
    list: MediaDeviceInfo[],
    selected: string | null,
    fallback: string
  ) =>
    list.length === 0 ? (
      <DropdownMenuItem disabled>{t("meeting.noDevices")}</DropdownMenuItem>
    ) : (
      list.map((device, index) => (
        <DropdownMenuItem
          key={device.deviceId}
          onSelect={() => onSelect(kind, device.deviceId)}
          className="gap-2"
        >
          <Check
            size={14}
            aria-hidden="true"
            className={cn("shrink-0", device.deviceId !== selected && "invisible")}
          />
          <span dir="auto" className="min-w-0 truncate">
            {deviceLabel(device, index, fallback)}
          </span>
        </DropdownMenuItem>
      ))
    );

  return (
    <DropdownMenu>
      <Tooltip label={t("meeting.settings")} side="top">
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("meeting.settings")}
            className={cn(
              "grid h-10 w-10 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
            )}
          >
            <Settings2 size={17} aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent side="top" align="center" className="w-72">
        <DropdownMenuLabel className="text-xs text-white/50">
          {t("meeting.microphone")}
        </DropdownMenuLabel>
        {rows("audio", devices.audio, selectedAudio, t("meeting.microphone"))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-white/50">
          {t("meeting.cameraDevice")}
        </DropdownMenuLabel>
        {rows("video", devices.video, selectedVideo, t("meeting.cameraDevice"))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
