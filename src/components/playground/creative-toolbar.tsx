"use client";

import { useTranslations } from "next-intl";
import {
  Frame,
  Spline,
  Image as ImageIcon,
  MousePointer2,
  Palette,
  Pencil,
  Sparkles,
  Square,
  StickyNote,
  Type,
} from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * The left creative toolbar.
 *
 * Every tool acts on the canvas, so the whole bar is disabled until a canvas
 * exists (Stage 3). The controls are rendered rather than hidden, and each one
 * says why it is unavailable on hover — a toolbar that grows buttons later is
 * more disorienting than one that shows what is coming, and a disabled control
 * with an explanation is not a disconnected button.
 *
 * Icon + label stacked, matching the reference. Keyboard shortcuts are declared
 * here so the tooltip and the eventual key handler cannot drift apart.
 */

export type ToolId =
  | "select"
  | "sticky"
  | "draw"
  | "text"
  | "shape"
  | "connect"
  | "upload"
  | "frame"
  | "palette"
  | "ai";

export const TOOLS: ReadonlyArray<{
  id: ToolId;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  shortcut: string;
  /** Draws the red dot the reference puts on AI Spark. */
  accent?: boolean;
}> = [
  { id: "select", icon: MousePointer2, shortcut: "V" },
  { id: "sticky", icon: StickyNote, shortcut: "S" },
  { id: "draw", icon: Pencil, shortcut: "D" },
  { id: "text", icon: Type, shortcut: "T" },
  { id: "shape", icon: Square, shortcut: "R" },
  // Without this the whole connector subsystem — edge ops, the SVG layer, the
  // bezier routing — is unreachable from the UI.
  { id: "connect", icon: Spline, shortcut: "C" },
  { id: "upload", icon: ImageIcon, shortcut: "U" },
  { id: "frame", icon: Frame, shortcut: "F" },
  { id: "palette", icon: Palette, shortcut: "P" },
  { id: "ai", icon: Sparkles, shortcut: "K", accent: true },
];

export function CreativeToolbar({
  active = "select",
  onSelect,
  disabled = false,
  disabledReason,
}: {
  active?: ToolId;
  onSelect?: (tool: ToolId) => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const t = useTranslations("playground");

  return (
    <nav
      aria-label={t("toolbar.label")}
      className="flex w-[68px] shrink-0 flex-col items-center gap-1 border-e border-white/10 bg-neutral-950 py-3"
    >
      {TOOLS.map((tool) => {
        const isActive = !disabled && active === tool.id;
        const label = t(`toolbar.${tool.id}`);

        return (
          <Tooltip
            key={tool.id}
            label={disabled ? (disabledReason ?? label) : label}
            shortcut={disabled ? undefined : tool.shortcut}
            side="end"
          >
            <button
              type="button"
              disabled={disabled}
              aria-label={label}
              aria-pressed={isActive}
              onClick={() => onSelect?.(tool.id)}
              className={cn(
                "relative flex w-[58px] flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/45 hover:bg-white/5 hover:text-white/80",
                disabled && "cursor-not-allowed opacity-35 hover:bg-transparent"
              )}
            >
              <tool.icon size={18} aria-hidden="true" />
              <span className="text-[9px] font-medium leading-none">{label}</span>
              {tool.accent && !disabled && (
                <span
                  aria-hidden="true"
                  className="absolute end-2 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500"
                />
              )}
            </button>
          </Tooltip>
        );
      })}
    </nav>
  );
}
