"use client";

import { cn } from "@/lib/utils";

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Avatar with an initials fallback. Hand-rolled rather than introducing the
 * first usage of @radix-ui/react-avatar (installed but unused everywhere), and
 * it matches the initials treatment the portal dashboard already uses.
 */
export function PlanAvatar({
  name,
  image,
  size = 28,
  className,
}: {
  name: string | null | undefined;
  image?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-white/10 font-bold text-white/80",
        className
      )}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.36) }}
      title={name ?? undefined}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={name ?? ""}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
