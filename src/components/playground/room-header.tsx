"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Check,
  CloudOff,
  Loader2,
  PanelRightOpen,
  Share2,
  TriangleAlert,
  UserPlus,
  Eye,
  FileText,
} from "lucide-react";
import { AvatarStack } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { OutboxStatus } from "./canvas/outbox";
import type { StreamStatus } from "./canvas/use-room-stream";
import { ModeIndicator } from "./mode-indicator";
import { PlaygroundStatusPill, type RoomPillStatus } from "./playground-status-pill";
import type { RoomDetailData, RoomViewer } from "./types";

/**
 * The room top bar, per the visual reference: PMP mark, the product lockup with
 * its positioning line, the room title with client and project beneath, then
 * participants, session state and actions on the inline-end side.
 *
 * Built from logical properties throughout (`ms-*`, `me-*`, `border-e`) — the
 * bar mirrors correctly in Arabic and Hebrew even though the canvas beneath it
 * deliberately does not.
 */
export function RoomHeader({
  room,
  viewer,
  onTogglePanel,
  panelOpen,
  liveSince,
  saveStatus = "idle",
  streamStatus = "connecting",
  onlineCount = 0,
  onTogglePreview,
  onInvite,
  onShare,
}: {
  room: RoomDetailData;
  viewer: RoomViewer;
  onTogglePanel: () => void;
  panelOpen: boolean;
  /** When set, the session timer runs from this instant. */
  liveSince?: Date | null;
  saveStatus?: OutboxStatus;
  streamStatus?: StreamStatus;
  /** Distinct people currently connected. */
  onlineCount?: number;
  /** Staff only: step into the client's view and back. */
  onTogglePreview?: () => void;
  onInvite?: () => void;
  onShare?: () => void;
}) {
  const t = useTranslations("playground");

  // More than one person connected IS the live session — no WebRTC required.
  // The brief's "LIVE" indicator is about people being in the room together,
  // which presence answers directly.
  const status: RoomPillStatus =
    liveSince || (streamStatus === "live" && onlineCount > 1)
      ? "LIVE"
      : room.awaitingClient
        ? "AWAITING_CLIENT"
        : room.status;

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-neutral-950 px-3 md:px-4">
      <Link
        // `isStaff` is the real role, unaffected by a staff member previewing as
        // client — so previewing does not bounce them into the portal.
        href={viewer.isStaff ? "/playground" : "/portal/playground"}
        aria-label={t("room.backToRooms")}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
      >
        <ArrowLeft size={16} aria-hidden="true" className="rtl:rotate-180" />
      </Link>

      <div className="hidden shrink-0 items-center gap-3 sm:flex">
        <span className="text-xl font-black leading-none tracking-tighter text-white">
          PMP
        </span>
        <Separator orientation="vertical" className="h-7" />
        <span className="leading-tight">
          <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-white">
            {t("productName")}
          </span>
          <span className="block text-[9px] font-medium uppercase tracking-[0.18em] text-white/35">
            {t("tagline")}
          </span>
        </span>
      </div>

      <Separator orientation="vertical" className="hidden h-7 lg:block" />

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-bold text-white">{room.title}</h1>
        <p className="truncate text-[11px] text-white/40">
          {[room.client?.name ?? room.client?.username, room.project?.title]
            .filter(Boolean)
            .join(" · ") || t("room.noClient")}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        {/* The mode chip doubles as the preview toggle for staff. Putting the
            control ON the indicator means the thing that tells you which mode
            you are in is also the thing that changes it — there is no second
            place to look. */}
        {viewer.isStaff && onTogglePreview ? (
          <Tooltip
            label={
              viewer.mode === "CLIENT"
                ? t("preview.exit")
                : t("preview.enter")
            }
            side="bottom"
          >
            <button
              type="button"
              onClick={onTogglePreview}
              className="hidden rounded-full md:inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
            >
              <ModeIndicator mode={viewer.mode} />
            </button>
          </Tooltip>
        ) : (
          <ModeIndicator mode={viewer.mode} className="hidden md:inline-flex" />
        )}

        {viewer.mode === "CLIENT" && viewer.isStaff && onTogglePreview && (
          <button
            type="button"
            onClick={onTogglePreview}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-500/40 px-2.5 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/10"
          >
            <Eye size={13} aria-hidden="true" />
            <span className="hidden md:inline">{t("preview.exit")}</span>
          </button>
        )}

        <PlaygroundStatusPill
          status={status}
          label={t(`status.${status}`)}
          size="xs"
          className="hidden sm:inline-flex"
        />

        {liveSince && <SessionTimer since={liveSince} />}

        <SaveIndicator status={saveStatus} />
        <ConnectionIndicator status={streamStatus} />

        <AvatarStack
          people={room.members.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            image: m.user.image,
          }))}
          size={26}
          max={4}
          className="hidden sm:flex"
        />

        {viewer.can.manage && (
          <Tooltip label={t("room.invite")} side="bottom">
            <button
              type="button"
              aria-label={t("room.invite")}
              onClick={onInvite ?? onTogglePanel}
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <UserPlus size={15} aria-hidden="true" />
            </button>
          </Tooltip>
        )}

        <Tooltip label={t("room.share")} side="bottom">
          <button
            type="button"
            aria-label={t("room.share")}
            onClick={onShare}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 px-2.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Share2 size={13} aria-hidden="true" />
            <span className="hidden md:inline">{t("room.share")}</span>
          </button>
        </Tooltip>

        {viewer.isStaff && viewer.mode === "STUDIO" && (
          <Tooltip label={t("summary.title")} side="bottom">
            <Link
              href={`/playground/${room.id}/summary`}
              aria-label={t("summary.title")}
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <FileText size={15} aria-hidden="true" />
            </Link>
          </Tooltip>
        )}

        <Tooltip label={panelOpen ? t("room.hidePanel") : t("room.showPanel")} side="bottom">
          <button
            type="button"
            onClick={onTogglePanel}
            aria-expanded={panelOpen}
            aria-label={panelOpen ? t("room.hidePanel") : t("room.showPanel")}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-lg border transition-colors",
              panelOpen
                ? "border-white/20 bg-white/10 text-white"
                : "border-white/15 text-white/60 hover:bg-white/10 hover:text-white"
            )}
          >
            <PanelRightOpen size={15} aria-hidden="true" className="rtl:rotate-180" />
          </button>
        </Tooltip>
      </div>
    </header>
  );
}

/**
 * Live-connection state.
 *
 * Silent while healthy — a permanent "connected" badge is noise. It appears only
 * when the stream is degraded, because that is the only time the state changes
 * what the user should expect from the room.
 */
function ConnectionIndicator({ status }: { status: StreamStatus }) {
  const t = useTranslations("playground");
  if (status === "live") return null;

  const label =
    status === "offline" ? t("stream.offline") : t("stream.reconnecting");

  return (
    <span
      role="status"
      aria-live="polite"
      title={label}
      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-400"
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-amber-400 motion-safe:animate-pulse"
      />
      <span className="hidden lg:inline">{label}</span>
    </span>
  );
}

/**
 * Autosave state.
 *
 * "Saved" is deliberately quiet — a tick and nothing else — because the normal
 * case must not compete for attention. Offline and error are loud, and both say
 * that the work is KEPT: the outbox holds unsent ops in localStorage, so the
 * honest message is "we will finish this when you are back", not "failed".
 * Never colour alone: each state carries its own icon and label.
 */
function SaveIndicator({ status }: { status: OutboxStatus }) {
  const t = useTranslations("playground");

  if (status === "idle") return null;

  const map = {
    pending: { icon: Loader2, spin: false, className: "text-white/40", label: t("save.pending") },
    saving: { icon: Loader2, spin: true, className: "text-white/50", label: t("save.saving") },
    offline: { icon: CloudOff, spin: false, className: "text-amber-400", label: t("save.offline") },
    error: { icon: TriangleAlert, spin: false, className: "text-red-400", label: t("save.error") },
  } as const;

  const entry = status === "saved" ? undefined : map[status];
  // "Saved" has no map entry — it is the quiet tick.
  const Icon = entry?.icon ?? Check;

  return (
    <span
      role="status"
      aria-live="polite"
      title={entry?.label}
      className={cn(
        "hidden items-center gap-1.5 text-[11px] font-medium sm:inline-flex",
        entry?.className ?? "text-emerald-400/70"
      )}
    >
      <Icon
        size={12}
        aria-hidden="true"
        className={entry?.spin ? "animate-spin" : undefined}
      />
      <span className="hidden lg:inline">{entry?.label}</span>
    </span>
  );
}

/**
 * Elapsed session time.
 *
 * Rendered `dir="ltr"` and tabular: a duration is not bidirectional text, and
 * without the override "00:24:18" reorders in an RTL paragraph.
 */
function SessionTimer({ since }: { since: Date }) {
  const [elapsed, setElapsed] = React.useState(() => Date.now() - since.getTime());

  React.useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - since.getTime()), 1000);
    return () => clearInterval(id);
  }, [since]);

  const total = Math.max(0, Math.floor(elapsed / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  const label = `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;

  return (
    <span
      dir="ltr"
      className="hidden font-mono text-xs tabular-nums text-white/70 sm:inline"
    >
      {label}
    </span>
  );
}
