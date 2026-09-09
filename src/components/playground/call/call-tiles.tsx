"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Hand, MicOff, ScreenShare } from "lucide-react";
import { cn } from "@/lib/utils";
import { colourFor } from "../canvas/presence-cursors";
import type { CallMember } from "@/lib/playground/call/types";

/**
 * The strip of participant tiles above the meeting controls.
 *
 * Deliberately small and out of the way: the canvas is the work, and a call
 * about the canvas should not cover it. Anyone sharing their screen gets a
 * wider tile, because that is the one people are actually looking at.
 *
 * Tiles carry the SAME per-user colour as that person's cursor, so the
 * pointer moving across the board and the face in the strip are visibly the
 * same human without anyone reading a name.
 */

export function CallTiles({
  members,
  selfConnectionId,
  localStream,
  remoteStreams,
  cameraOn,
}: {
  members: CallMember[];
  selfConnectionId: string | null;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  cameraOn: boolean;
}) {
  const t = useTranslations("playground");

  if (members.length === 0) return null;

  return (
    <div
      role="group"
      aria-label={t("meeting.participants")}
      className="pointer-events-auto flex max-w-full items-end gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-neutral-900/90 p-2 shadow-2xl shadow-black/60 backdrop-blur-sm"
    >
      {members.map((member) => {
        const isSelf = member.connectionId === selfConnectionId;
        const stream = isSelf ? localStream : remoteStreams.get(member.connectionId) ?? null;
        // Driven by the roster, not by whether a stream exists: a camera that
        // is off leaves its track in place but muted, so the element would
        // otherwise show a frozen black rectangle instead of an avatar.
        const showVideo = isSelf
          ? cameraOn || member.sharing
          : member.cameraOn || member.sharing;

        return (
          <Tile
            key={member.connectionId}
            member={member}
            isSelf={isSelf}
            stream={stream}
            showVideo={showVideo}
            label={isSelf ? t("meeting.you") : member.name ?? t("common.someone")}
            mutedLabel={t("meeting.muted")}
            handLabel={t("meeting.handRaised")}
            sharingLabel={t("meeting.sharing")}
          />
        );
      })}
    </div>
  );
}

function Tile({
  member,
  isSelf,
  stream,
  showVideo,
  label,
  mutedLabel,
  handLabel,
  sharingLabel,
}: {
  member: CallMember;
  isSelf: boolean;
  stream: MediaStream | null;
  showVideo: boolean;
  label: string;
  mutedLabel: string;
  handLabel: string;
  sharingLabel: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // srcObject is a property, not an attribute — React cannot set it from JSX.
  React.useEffect(() => {
    const element = videoRef.current;
    if (!element) return;
    if (element.srcObject !== stream) element.srcObject = stream;
  }, [stream]);

  const colour = colourFor(member.userId);
  const live = showVideo && stream !== null;

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl bg-neutral-950",
        // A screen share is the thing everyone is looking at; give it room.
        member.sharing ? "h-28 w-48" : "h-24 w-32"
      )}
      style={{ outline: `2px solid ${colour}`, outlineOffset: -2 }}
    >
      {/* ALWAYS mounted, even with the camera off — this element plays the
          remote AUDIO too. Rendering the avatar instead of it (rather than
          over it) meant a camera-off participant, which is how everyone
          joins, could not be heard at all. */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        // Never play your own microphone back into the room.
        muted={isSelf}
        className={cn(
          "absolute inset-0 h-full w-full",
          member.sharing ? "object-contain" : "object-cover",
          // A self-view that is not mirrored feels wrong to everyone; a
          // shared screen must never be mirrored, or text reads backwards.
          isSelf && !member.sharing && "-scale-x-100"
        )}
      />

      {!live && (
        <span className="absolute inset-0 grid place-items-center bg-neutral-950">
          {member.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.image}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white"
              style={{ background: colour }}
            >
              {(member.name ?? "?").trim().charAt(0).toUpperCase()}
            </span>
          )}
        </span>
      )}

      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1 pt-3">
        <span dir="auto" className="min-w-0 flex-1 truncate text-[11px] text-white/90">
          {label}
        </span>
        {member.muted && (
          <MicOff
            size={11}
            className="shrink-0 text-red-400"
            aria-label={mutedLabel}
          />
        )}
        {member.sharing && (
          <ScreenShare
            size={11}
            className="shrink-0 text-emerald-400"
            aria-label={sharingLabel}
          />
        )}
      </span>

      {member.handRaised && (
        <span
          className="absolute end-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-amber-400 text-neutral-900"
          aria-label={handLabel}
          title={handLabel}
        >
          <Hand size={13} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
