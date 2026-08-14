"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Hover/focus tooltip.
 *
 * Hand-rolled rather than adding @radix-ui/react-tooltip: the Playground's
 * creative toolbar needs a label plus a keyboard shortcut on ~15 controls, and
 * that is the whole requirement. Deliberately NOT a general popover — it has no
 * interactive content and no focus management, because a tooltip that traps
 * focus is a bug.
 *
 * Accessibility notes:
 *  - The trigger is described by the tooltip via `aria-describedby`, so the
 *    accessible name still comes from the control's own label. A tooltip is
 *    supplementary, never the only way to know what a button does — every
 *    consumer must still give its control an aria-label.
 *  - Opens on focus-visible as well as hover, so it is reachable by keyboard.
 *  - Escape closes it while the trigger keeps focus (WCAG 1.4.13 Dismissible).
 */

type Side = "top" | "bottom" | "start" | "end";

const SIDE_CLASS: Record<Side, string> = {
  top: "bottom-full start-1/2 -translate-x-1/2 mb-2 rtl:translate-x-1/2",
  bottom: "top-full start-1/2 -translate-x-1/2 mt-2 rtl:translate-x-1/2",
  start: "end-full top-1/2 -translate-y-1/2 me-2",
  end: "start-full top-1/2 -translate-y-1/2 ms-2",
};

export interface TooltipProps {
  /** Tooltip body. Keep it short — this is a label, not documentation. */
  label: React.ReactNode;
  /** Optional keyboard shortcut, rendered as a dim monospace chip. */
  shortcut?: string;
  side?: Side;
  /** Hover dwell before showing, in ms. Focus always shows immediately. */
  delay?: number;
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
  className?: string;
}

export function Tooltip({
  label,
  shortcut,
  side = "bottom",
  delay = 350,
  children,
  className,
}: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const show = React.useCallback(
    (immediate: boolean) => {
      cancel();
      if (immediate || delay <= 0) {
        setOpen(true);
        return;
      }
      timer.current = setTimeout(() => setOpen(true), delay);
    },
    [cancel, delay]
  );

  const hide = React.useCallback(() => {
    cancel();
    setOpen(false);
  }, [cancel]);

  React.useEffect(() => cancel, [cancel]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, hide]);

  return (
    <span
      className={cn("relative inline-flex", className)}
      onPointerEnter={(e) => {
        // Touch fires pointerenter on tap and never leaves — that would pin the
        // tooltip open over the control the user just pressed.
        if (e.pointerType === "touch") return;
        show(false);
      }}
      onPointerLeave={hide}
      onFocus={() => show(true)}
      onBlur={hide}
    >
      {React.cloneElement(children, {
        "aria-describedby": open ? id : undefined,
      })}

      {open && (
        <span
          id={id}
          role="tooltip"
          // No animate-in/fade-in-0 here: tailwindcss-animate is not installed
          // in this project, so those utilities are dead CSS.
          className={cn(
            "pointer-events-none absolute z-50 flex items-center gap-2 whitespace-nowrap rounded-lg border border-white/10 bg-neutral-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-xl shadow-black/50",
            SIDE_CLASS[side]
          )}
        >
          {label}
          {shortcut && (
            <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/50">
              {shortcut}
            </kbd>
          )}
        </span>
      )}
    </span>
  );
}
