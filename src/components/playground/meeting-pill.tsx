"use client";

import { useTranslations } from "next-intl";
import { Hand, Mic, PhoneOff, ScreenShare, SmilePlus, Video } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * The floating meeting control pill.
 *
 * Live video is NOT built — it is absent from the brief's own MVP list, and the
 * plan ships a `VideoProvider` seam with a NullVideoProvider instead. The
 * controls render DISABLED with a tooltip that says why, rather than being
 * hidden: the room shell is visually complete from day one, and nobody clicks a
 * button that silently does nothing.
 *
 * When a provider is configured this component takes `configured` and the same
 * controls become live; no layout changes.
 */
export function MeetingPill({ configured = false }: { configured?: boolean }) {
  const t = useTranslations("playground");
  const reason = t("meeting.notConfigured");

  const controls = [
    { id: "mic", icon: Mic, label: t("meeting.mic") },
    { id: "camera", icon: Video, label: t("meeting.camera") },
    { id: "share", icon: ScreenShare, label: t("meeting.share") },
    { id: "react", icon: SmilePlus, label: t("meeting.react") },
    { id: "raise", icon: Hand, label: t("meeting.raise") },
  ] as const;

  return (
    <div
      role="group"
      aria-label={t("meeting.label")}
      className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-neutral-900/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-sm"
    >
      {controls.map((control) => (
        <Tooltip
          key={control.id}
          label={configured ? control.label : reason}
          side="top"
        >
          <button
            type="button"
            disabled={!configured}
            aria-label={control.label}
            className={cn(
              "grid h-10 w-10 place-items-center rounded-full transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900",
              configured
                ? "text-white/70 hover:bg-white/10 hover:text-white"
                : "cursor-not-allowed text-white/25"
            )}
          >
            <control.icon size={17} aria-hidden="true" />
          </button>
        </Tooltip>
      ))}

      <span aria-hidden="true" className="mx-1 h-6 w-px bg-white/10" />

      <Tooltip label={configured ? t("meeting.leave") : reason} side="top">
        <button
          type="button"
          disabled={!configured}
          aria-label={t("meeting.leave")}
          className={cn(
            "grid h-10 w-12 place-items-center rounded-full transition-colors",
            configured
              ? "bg-red-600 text-white hover:bg-red-500"
              : "cursor-not-allowed bg-red-600/25 text-white/40"
          )}
        >
          <PhoneOff size={17} aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  );
}
