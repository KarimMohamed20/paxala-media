"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  Hand,
  LayoutGrid,
  Maximize2,
  MicOff,
  MoreVertical,
  Pin,
  PinOff,
  Rows3,
  ScreenShare,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { colourFor } from "../canvas/presence-cursors";
import type { CallControlCommand, CallMember } from "@/lib/playground/call/types";
import {
  DEFAULT_LAYOUT,
  carryPin,
  raisedHands,
  readLayoutPrefs,
  resolveStage,
  stripMembers,
  writeLayoutPrefs,
  type LayoutPrefs,
} from "./layout";

/**
 * The participant tiles, and how each viewer arranges them.
 *
 * Every arrangement here — pinning, grid, collapse, fullscreen — is local to
 * the viewer. Nothing is sent anywhere; your view never moves anyone else's.
 *
 * AUDIO IS NOT PLAYED BY THE TILES. Every <video> is muted, and a separate
 * always-mounted <audio> per peer carries sound (RemoteAudio below). That
 * separation is what makes the layout controls safe: collapsing the strip
 * unmounts the videos without silencing the call, and a participant moving
 * between stage and strip can never be heard twice.
 *
 * Tiles carry the SAME colour as that person's cursor on the board, so the
 * pointer and the face are visibly one human without reading a name.
 */

export function CallTiles({
  members,
  selfConnectionId,
  localStream,
  remoteStreams,
  cameraOn,
  isHost,
  onModerate,
}: {
  members: CallMember[];
  selfConnectionId: string | null;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  cameraOn: boolean;
  /** Staff on the call — sees per-participant host controls. */
  isHost: boolean;
  onModerate: (target: string, command: CallControlCommand) => void;
}) {
  const t = useTranslations("playground");

  const [prefs, setPrefs] = React.useState<LayoutPrefs>(DEFAULT_LAYOUT);
  const [pin, setPin] = React.useState<{ id: string; userId: string } | null>(null);
  const [canFullscreen, setCanFullscreen] = React.useState(false);

  // Read after mount: localStorage and the Fullscreen API do not exist
  // during server rendering, and reading them earlier would also make the
  // first client render disagree with the server's.
  React.useEffect(() => {
    setPrefs(readLayoutPrefs());
    setCanFullscreen(
      document.fullscreenEnabled ||
        "webkitEnterFullscreen" in HTMLVideoElement.prototype
    );
  }, []);

  const updatePrefs = (patch: Partial<LayoutPrefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      writeLayoutPrefs(next);
      return next;
    });
  };

  // A reconnecting participant comes back under a NEW connection id; follow
  // them there so a pin survives the 15-minute stream recycle.
  const pinnedId = carryPin(members, pin?.id ?? null, pin?.userId ?? null);
  React.useEffect(() => {
    if (!pin) return;
    if (pinnedId === null) setPin(null);
    else if (pinnedId !== pin.id) setPin({ id: pinnedId, userId: pin.userId });
  }, [pin, pinnedId]);

  const togglePin = (member: CallMember) => {
    setPin((current) =>
      current?.id === member.connectionId
        ? null
        : { id: member.connectionId, userId: member.userId }
    );
  };

  const stage = resolveStage(members, pinnedId);
  const strip = stripMembers(members, stage);
  const hands = raisedHands(members, selfConnectionId);
  const grid = prefs.layout === "grid";

  const streamFor = (member: CallMember) =>
    member.connectionId === selfConnectionId
      ? localStream
      : remoteStreams.get(member.connectionId) ?? null;

  const tileProps = (member: CallMember) => {
    const isSelf = member.connectionId === selfConnectionId;
    return {
      member,
      isSelf,
      stream: streamFor(member),
      // From the roster, not from whether a stream exists: a camera that is
      // off leaves its track in place but muted, which would otherwise show
      // as a frozen black rectangle instead of an avatar.
      showVideo: isSelf ? cameraOn || member.sharing : member.cameraOn || member.sharing,
      pinned: pinnedId === member.connectionId,
      onTogglePin: () => togglePin(member),
      hostMenu:
        isHost && !isSelf ? (
          <HostMenu member={member} onModerate={onModerate} />
        ) : null,
    };
  };

  if (members.length === 0) return null;

  return (
    <>
      {/* Outside everything collapsible: this keeps playing while the video
          is hidden, pinned, or rearranged. */}
      <RemoteAudio streams={remoteStreams} />

      {prefs.collapsed ? (
        <button
          type="button"
          onClick={() => updatePrefs({ collapsed: false })}
          aria-label={t("meeting.expand")}
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900/95 px-3 py-1.5 text-xs text-white/80 shadow-2xl shadow-black/60 backdrop-blur-sm transition-colors hover:text-white"
        >
          <Users size={14} aria-hidden="true" />
          {t("meeting.inCall", { count: members.length })}
          {hands.length > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <Hand size={12} aria-hidden="true" />
              {hands.length}
            </span>
          )}
        </button>
      ) : (
        <div
          role="group"
          aria-label={t("meeting.participants")}
          className="pointer-events-auto flex max-w-[min(56rem,calc(100vw-2rem))] flex-col gap-2 rounded-2xl border border-white/10 bg-neutral-900/90 p-2 shadow-2xl shadow-black/60 backdrop-blur-sm"
        >
          <Toolbar
            count={members.length}
            hands={hands.length}
            grid={grid}
            showLowerAll={isHost && hands.length > 0}
            onLowerAll={() => {
              for (const member of hands) onModerate(member.connectionId, "lowerHand");
            }}
            onLayout={() => updatePrefs({ layout: grid ? "strip" : "grid" })}
            onCollapse={() => updatePrefs({ collapsed: true })}
          />

          {stage && (
            <Tile {...tileProps(stage)} size="stage" canFullscreen={canFullscreen} />
          )}

          {strip.length > 0 && (
            <div
              className={cn(
                "flex items-end gap-2",
                grid ? "flex-wrap justify-center" : "overflow-x-auto"
              )}
            >
              {strip.map((member) => (
                <Tile
                  key={member.connectionId}
                  {...tileProps(member)}
                  size={grid ? "grid" : "strip"}
                  canFullscreen={false}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * One hidden <audio> per remote participant — the ONLY thing that plays
 * anyone's voice. Mounted for the whole call regardless of layout.
 */
function RemoteAudio({ streams }: { streams: Map<string, MediaStream> }) {
  return (
    <div aria-hidden="true" className="hidden">
      {[...streams].map(([connectionId, stream]) => (
        <AudioSink key={connectionId} stream={stream} />
      ))}
    </div>
  );
}

function AudioSink({ stream }: { stream: MediaStream }) {
  const ref = React.useRef<HTMLAudioElement>(null);
  React.useEffect(() => {
    const element = ref.current;
    if (element && element.srcObject !== stream) element.srcObject = stream;
  }, [stream]);
  return <audio ref={ref} autoPlay />;
}

function Toolbar({
  count,
  hands,
  grid,
  showLowerAll,
  onLowerAll,
  onLayout,
  onCollapse,
}: {
  count: number;
  hands: number;
  grid: boolean;
  showLowerAll: boolean;
  onLowerAll: () => void;
  onLayout: () => void;
  onCollapse: () => void;
}) {
  const t = useTranslations("playground");
  return (
    <div className="flex items-center gap-1 px-1 text-xs text-white/60">
      <span className="flex items-center gap-1.5">
        <Users size={13} aria-hidden="true" />
        {t("meeting.inCall", { count })}
      </span>
      {hands > 0 && (
        <span className="ms-2 flex items-center gap-1 text-amber-400">
          <Hand size={12} aria-hidden="true" />
          {hands}
        </span>
      )}
      {showLowerAll && (
        <button
          type="button"
          onClick={onLowerAll}
          className="ms-1 rounded-full px-2 py-0.5 text-amber-300 transition-colors hover:bg-amber-400/10"
        >
          {t("meeting.lowerAllHands")}
        </button>
      )}
      <span className="ms-auto flex items-center gap-0.5">
        <IconButton
          label={grid ? t("meeting.layoutStrip") : t("meeting.layoutGrid")}
          onClick={onLayout}
          icon={grid ? Rows3 : LayoutGrid}
        />
        <IconButton label={t("meeting.collapse")} onClick={onCollapse} icon={ChevronDown} />
      </span>
    </div>
  );
}

type TileSize = "stage" | "grid" | "strip";

function Tile({
  member,
  isSelf,
  stream,
  showVideo,
  size,
  pinned,
  onTogglePin,
  canFullscreen,
  hostMenu,
}: {
  member: CallMember;
  isSelf: boolean;
  stream: MediaStream | null;
  showVideo: boolean;
  size: TileSize;
  pinned: boolean;
  onTogglePin: () => void;
  canFullscreen: boolean;
  hostMenu: React.ReactNode;
}) {
  const t = useTranslations("playground");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const live = showVideo && stream !== null;

  // srcObject is a property, not an attribute — React cannot set it from JSX.
  React.useEffect(() => {
    const element = videoRef.current;
    if (element && element.srcObject !== stream) element.srcObject = stream;
  }, [stream, live]);

  const enterFullscreen = () => {
    const container = containerRef.current;
    if (container?.requestFullscreen) {
      void container.requestFullscreen().catch(() => {});
      return;
    }
    // iOS Safari has no element fullscreen; only the video element itself
    // can go fullscreen there.
    const video = videoRef.current as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
      | null;
    video?.webkitEnterFullscreen?.();
  };

  const colour = colourFor(member.userId);
  const name = isSelf ? t("meeting.you") : member.name ?? t("common.someone");

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative shrink-0 overflow-hidden rounded-xl bg-neutral-950",
        size === "stage" && "aspect-video max-h-[45vh] w-[min(48rem,calc(100vw-3rem))]",
        size === "grid" && "h-36 w-52",
        size === "strip" && "h-24 w-32"
      )}
      style={{ outline: `2px solid ${colour}`, outlineOffset: -2 }}
    >
      {live ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          // Always muted: sound comes from RemoteAudio, never from a tile.
          muted
          className={cn(
            "absolute inset-0 h-full w-full",
            // A shared screen is letterboxed, never cropped — cropping hides
            // exactly the edges of the slide people are trying to read.
            member.sharing ? "object-contain" : "object-cover",
            // A self-view that is not mirrored feels wrong; a shared screen
            // must never be mirrored, or its text reads backwards.
            isSelf && !member.sharing && "-scale-x-100"
          )}
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center">
          {member.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.image}
              alt=""
              className={cn(
                "rounded-full object-cover",
                size === "stage" ? "h-20 w-20" : "h-10 w-10"
              )}
            />
          ) : (
            <span
              aria-hidden="true"
              className={cn(
                "grid place-items-center rounded-full font-bold text-white",
                size === "stage" ? "h-20 w-20 text-2xl" : "h-10 w-10 text-sm"
              )}
              style={{ background: colour }}
            >
              {(member.name ?? "?").trim().charAt(0).toUpperCase()}
            </span>
          )}
        </span>
      )}

      {/* Tile actions. Revealed on hover or focus with a mouse; always
          visible on touch screens, which have no hover to reveal them. */}
      <span className="absolute start-1 top-1 flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
        <TileButton
          label={pinned ? t("meeting.unpin") : t("meeting.pin")}
          onClick={onTogglePin}
          pressed={pinned}
          icon={pinned ? PinOff : Pin}
        />
        {size === "stage" && canFullscreen && live && (
          <TileButton
            label={t("meeting.fullscreen")}
            onClick={enterFullscreen}
            icon={Maximize2}
          />
        )}
        {hostMenu}
      </span>

      {member.handRaised && (
        <span
          className="absolute end-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-amber-400 text-neutral-900"
          aria-label={t("meeting.handRaised")}
          title={t("meeting.handRaised")}
        >
          <Hand size={13} aria-hidden="true" />
        </span>
      )}

      <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1 pt-3">
        <span
          dir="auto"
          className={cn(
            "min-w-0 flex-1 truncate text-white/90",
            size === "stage" ? "text-sm" : "text-[11px]"
          )}
        >
          {name}
        </span>
        {member.muted && (
          <MicOff size={11} className="shrink-0 text-red-400" aria-label={t("meeting.muted")} />
        )}
        {member.sharing && (
          <ScreenShare
            size={11}
            className="shrink-0 text-emerald-400"
            aria-label={t("meeting.sharing")}
          />
        )}
      </span>
    </div>
  );
}

/**
 * Host controls for one participant. Every item turns something OFF — there
 * is intentionally no "unmute" or "camera on", which only the participant can
 * do. Items for things already off are disabled rather than hidden, so the
 * menu keeps its shape and nobody hunts for a missing row.
 */
function HostMenu({
  member,
  onModerate,
}: {
  member: CallMember;
  onModerate: (target: string, command: CallControlCommand) => void;
}) {
  const t = useTranslations("playground");
  const act = (command: CallControlCommand) => onModerate(member.connectionId, command);
  const name = member.name ?? t("common.someone");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("meeting.hostControls")}
          title={t("meeting.hostControls")}
          className="grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white/80 backdrop-blur-sm transition-colors hover:bg-black/80 hover:text-white"
        >
          <MoreVertical size={13} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[11rem]">
        <DropdownMenuItem disabled={member.muted} onSelect={() => act("mute")}>
          {t("meeting.hostMute")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!member.cameraOn} onSelect={() => act("cameraOff")}>
          {t("meeting.hostCameraOff")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!member.sharing} onSelect={() => act("stopShare")}>
          {t("meeting.hostStopShare")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!member.handRaised} onSelect={() => act("lowerHand")}>
          {t("meeting.hostLowerHand")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-400 focus:bg-red-600/15 focus:text-red-300"
          onSelect={() => {
            // Removal is the one irreversible control for the rest of this
            // meeting, so it is confirmed. window.confirm matches how the room
            // already asks for approval titles (room-shell requestApproval).
            if (window.confirm(t("meeting.confirmRemove", { name }))) act("remove");
          }}
        >
          {t("meeting.hostRemove")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TileButton({
  label,
  onClick,
  icon: Icon,
  pressed,
}: {
  label: string;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cn(
        "grid h-6 w-6 place-items-center rounded-full backdrop-blur-sm transition-colors",
        pressed
          ? "bg-white text-neutral-900"
          : "bg-black/60 text-white/80 hover:bg-black/80 hover:text-white"
      )}
    >
      <Icon size={12} aria-hidden={true} />
    </button>
  );
}

function IconButton({
  label,
  onClick,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid h-6 w-6 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
    >
      <Icon size={13} aria-hidden={true} />
    </button>
  );
}
