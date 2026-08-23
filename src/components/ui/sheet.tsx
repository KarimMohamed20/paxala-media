"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useLocale } from "next-intl";
import { isRTL, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Slide-over panel.
 *
 * Extracted from the drawer pattern proven in
 * components/content/content-review-drawer.tsx and
 * components/portal/asset-detail-drawer.tsx, which were near-identical copies.
 *
 * It slides from the inline-end edge in both directions — framer-motion animates
 * a physical `x`, so the RTL direction has to be resolved explicitly rather than
 * left to a logical CSS property.
 *
 * Adds what both copies lacked and every accessible dialog needs: a focus trap,
 * Escape to close, focus restoration to the trigger, background scroll lock, and
 * reduced-motion support.
 */

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. Required — a nameless dialog is unusable. */
  title: string;
  /** Renders the built-in sticky header. Pass `false` to supply your own. */
  header?: React.ReactNode | false;
  side?: "end" | "start";
  className?: string;
  children: React.ReactNode;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Sheet({
  open,
  onClose,
  title,
  header,
  side = "end",
  className,
  children,
}: SheetProps) {
  const rtl = isRTL(useLocale() as Locale);
  // A full-height panel flying in across the viewport is exactly the kind of
  // large-area motion that triggers vestibular symptoms.
  const reduceMotion = useReducedMotion();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const restoreTo = React.useRef<HTMLElement | null>(null);

  // Which way "off screen" is, in physical px, for this side and direction.
  const offscreen =
    side === "end" ? (rtl ? "-100%" : "100%") : rtl ? "100%" : "-100%";

  React.useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;

    // Move focus into the panel so the next Tab lands inside it.
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      // Focus trap: cycle within the panel rather than escaping to the page
      // behind, which is still rendered and still focusable.
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;

      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && active === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreTo.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={reduceMotion ? { opacity: 0 } : { x: offscreen }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: offscreen }}
            transition={
              reduceMotion
                ? { duration: 0.12 }
                : { type: "spring", damping: 30, stiffness: 300 }
            }
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "fixed top-0 bottom-0 z-50 w-full overflow-y-auto bg-neutral-950 sm:w-[520px] focus:outline-none",
              side === "end" ? "end-0 border-s border-white/10" : "start-0 border-e border-white/10",
              className
            )}
          >
            {header !== false && (
              <div className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/95 px-5 py-4 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {header ?? (
                      <h2 className="text-lg font-bold leading-snug text-white">
                        {title}
                      </h2>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="shrink-0 rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
