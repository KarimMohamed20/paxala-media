"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Transient feedback.
 *
 * The app previously had no notification primitive at all — every async outcome
 * was either an inline error paragraph or a `success` string threaded back up
 * through an `onSuccess` callback. Surfaces with many async outcomes (uploads,
 * autosave, approvals, reconnects) need something ambient instead.
 *
 * Dependency-free on purpose: framer-motion and lucide-react are already here,
 * so this adds nothing to the bundle beyond its own source.
 *
 * Status is never communicated by colour alone — every variant carries an icon
 * and the title text, per WCAG 1.4.1.
 */

export type ToastVariant = "success" | "error" | "warning" | "info" | "loading";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Milliseconds before auto-dismiss. `null` pins it until dismissed. */
  duration?: number | null;
  action?: { label: string; onClick: () => void };
}

interface ToastRecord extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  /** Show a toast. Returns its id so it can be updated or dismissed. */
  toast: (options: ToastOptions) => string;
  /** Replace an existing toast in place — used for "Saving…" -> "Saved". */
  update: (id: string, options: Partial<ToastOptions>) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

/**
 * Throws when used outside the provider rather than silently no-opping, so a
 * missing provider surfaces in development instead of swallowing user feedback.
 */
export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}

const DEFAULT_DURATION: Record<ToastVariant, number | null> = {
  success: 4000,
  info: 5000,
  warning: 7000,
  error: 9000,
  // A loading toast is resolved by the caller via update(), never by a timer.
  loading: null,
};

const VARIANT_ICON: Record<ToastVariant, React.ComponentType<{ size?: number; className?: string }>> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
};

/** Matches getStatusBadgeStyle() in components/content/content-meta.tsx. */
const VARIANT_ACCENT: Record<ToastVariant, string> = {
  success: "text-emerald-400",
  error: "text-red-400",
  warning: "text-amber-400",
  info: "text-white/70",
  loading: "text-white/70",
};

/** Cap: beyond this the oldest is dropped, so a retry loop cannot fill the screen. */
const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);
  const timers = React.useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const clearTimer = React.useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const dismiss = React.useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    },
    [clearTimer]
  );

  const schedule = React.useCallback(
    (id: string, duration: number | null | undefined, variant: ToastVariant) => {
      clearTimer(id);
      const ms = duration === undefined ? DEFAULT_DURATION[variant] : duration;
      if (ms === null) return;
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), ms)
      );
    },
    [clearTimer, dismiss]
  );

  const toast = React.useCallback(
    (options: ToastOptions) => {
      const id = crypto.randomUUID();
      const variant = options.variant ?? "info";
      setToasts((prev) => [...prev, { ...options, variant, id }].slice(-MAX_VISIBLE));
      schedule(id, options.duration, variant);
      return id;
    },
    [schedule]
  );

  const update = React.useCallback(
    (id: string, options: Partial<ToastOptions>) => {
      setToasts((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, ...options } : t));
        const found = next.find((t) => t.id === id);
        if (found) schedule(id, options.duration, found.variant ?? "info");
        return next;
      });
    },
    [schedule]
  );

  // Copy the ref into a local before the cleanup closure captures it, so the
  // teardown clears the map that actually existed at mount.
  React.useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = React.useMemo(
    () => ({ toast, update, dismiss }),
    [toast, update, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      // `polite`, not `assertive`: these narrate outcomes, they never interrupt.
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-4 end-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  const variant = toast.variant ?? "info";
  const Icon = VARIANT_ICON[variant];
  // Movement and scale are decorative here; a fade still shows something
  // arrived. framer-motion does not consult the media query on its own.
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      layout={!reduceMotion}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0.1 } }
          : { opacity: 0, scale: 0.97, transition: { duration: 0.15 } }
      }
      transition={
        reduceMotion
          ? { duration: 0.12 }
          : { duration: 0.28, ease: [0.16, 1, 0.3, 1] }
      }
      className="pointer-events-auto flex items-start gap-3 rounded-xl border border-white/10 bg-neutral-950/95 p-3.5 shadow-2xl shadow-black/50 backdrop-blur-sm"
    >
      <Icon
        size={18}
        aria-hidden="true"
        className={cn(
          "mt-0.5 shrink-0",
          VARIANT_ACCENT[variant],
          variant === "loading" && "animate-spin"
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs leading-relaxed text-white/60">
            {toast.description}
          </p>
        )}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className="mt-2 rounded-lg px-2 py-1 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="-me-1 -mt-1 shrink-0 rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </motion.div>
  );
}
