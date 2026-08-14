"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Avatar with an initials fallback.
 *
 * Promoted out of components/plan/plan-avatar.tsx, which is now a thin
 * re-export. Still hand-rolled rather than lighting up @radix-ui/react-avatar
 * (a dependency that has sat installed and unused): Radix's value here is
 * image-load-state orchestration, and a plain <img> with an onError fallback
 * covers it in a quarter of the code.
 */

/** "Maya Patel" -> "MP", "Sam" -> "SA", null -> "?". */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface AvatarProps {
  name: string | null | undefined;
  image?: string | null;
  /** Rendered size in px. Font size scales with it. */
  size?: number;
  /**
   * Presence ring. `null` omits the dot entirely — an avatar in a static list
   * should not imply live status.
   */
  status?: "online" | "away" | "offline" | null;
  className?: string;
}

const STATUS_CLASS: Record<"online" | "away" | "offline", string> = {
  online: "bg-emerald-400",
  away: "bg-amber-400",
  offline: "bg-white/30",
};

export function Avatar({
  name,
  image,
  size = 28,
  status = null,
  className,
}: AvatarProps) {
  // A broken image URL would otherwise render the browser's alt-text box in a
  // circle; falling back to initials keeps the layout intact.
  const [failed, setFailed] = React.useState(false);
  const showImage = !!image && !failed;

  const dot = Math.max(6, Math.round(size * 0.3));

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className="inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-white/10 font-bold text-white/80"
        style={{ width: size, height: size, fontSize: Math.max(9, size * 0.36) }}
        title={name ?? undefined}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={name ?? ""}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span aria-hidden={!!name}>{initials(name)}</span>
        )}
      </span>

      {status && (
        <span
          // Status is conveyed by the title text too, never by colour alone.
          title={status}
          className={cn(
            "absolute -bottom-0.5 -end-0.5 rounded-full border-2 border-neutral-950",
            STATUS_CLASS[status]
          )}
          style={{ width: dot, height: dot }}
        >
          <span className="sr-only">{status}</span>
        </span>
      )}
    </span>
  );
}

/**
 * Overlapping avatar row, capped with a "+N" chip.
 * Used by the Playground room header and room cards.
 */
export function AvatarStack({
  people,
  max = 5,
  size = 28,
  className,
}: {
  people: Array<{ id: string; name: string | null; image?: string | null }>;
  max?: number;
  size?: number;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <div className={cn("flex items-center", className)}>
      {shown.map((p, i) => (
        <span
          key={p.id}
          className="rounded-full ring-2 ring-neutral-950"
          // Logical inset so the stack overlaps the correct way under RTL.
          style={{ marginInlineStart: i === 0 ? 0 : -size * 0.32 }}
        >
          <Avatar name={p.name} image={p.image} size={size} />
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="inline-grid place-items-center rounded-full border border-white/15 bg-white/10 font-bold text-white/60 ring-2 ring-neutral-950"
          style={{
            width: size,
            height: size,
            fontSize: Math.max(9, size * 0.32),
            marginInlineStart: -size * 0.32,
          }}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
