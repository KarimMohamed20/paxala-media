"use client";

import { useEffect, useRef, useState, createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { isAppShellRoute } from "@/lib/constants";

interface ScrollContextType {
  lenis: Lenis | null;
}

const ScrollContext = createContext<ScrollContextType>({ lenis: null });

export const useScroll = () => useContext(ScrollContext);

interface ScrollProviderProps {
  children: React.ReactNode;
}

/**
 * Smooth scrolling for the marketing site.
 *
 * Lenis is NOT INSTANTIATED AT ALL on app-shell routes (portal, admin, staff,
 * playground) — it is destroyed on entering one and rebuilt on leaving.
 *
 * Calling `lenis.stop()` instead would be wrong, and subtly so. Lenis attaches
 * `wheel`, `touchstart` and `touchmove` to `window` with `{ passive: false }`
 * (lenis 1.3.15, virtual-scroll.ts `listenerOptions`), and a *stopped* instance
 * keeps those listeners attached while calling `event.preventDefault()` on every
 * cancelable one (lenis.mjs `onVirtualScroll`: `if (this.isStopped || this.isLocked)`).
 * So stopping does not release the gesture — it converts Lenis into a global
 * "cancel every wheel and touch default" machine, which would break two-finger
 * pinch-zoom on the Playground canvas on tablets. Only destroy() removes the
 * listeners.
 *
 * The rAF loop is also cancelled on teardown; the previous implementation
 * scheduled itself forever and leaked one loop per mount.
 */
export function ScrollProvider({ children }: ScrollProviderProps) {
  const pathname = usePathname();
  const isAppShell = isAppShellRoute(pathname);

  const lenisRef = useRef<Lenis | null>(null);
  // State, not just a ref: consumers of useScroll() have to re-render once the
  // instance exists. The previous version read `lenisRef.current` during the
  // same render that created it, so the context value was permanently null.
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (isAppShell) return;

    const instance = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    lenisRef.current = instance;
    setLenis(instance);

    let frame = requestAnimationFrame(function raf(time: number) {
      instance.raf(time);
      frame = requestAnimationFrame(raf);
    });

    return () => {
      cancelAnimationFrame(frame);
      instance.destroy();
      lenisRef.current = null;
      setLenis(null);
    };
  }, [isAppShell]);

  return (
    <ScrollContext.Provider value={{ lenis }}>{children}</ScrollContext.Provider>
  );
}
