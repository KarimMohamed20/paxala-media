"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

/**
 * Playground shell.
 *
 * Two shapes, chosen by route:
 *  - the dashboard sits inside the normal padded app container;
 *  - a room is EDGE-TO-EDGE. It supplies its own chrome and must own the whole
 *    viewport, so it renders bare.
 *
 * Session enforcement is server-side in src/middleware.ts; this is the
 * defence-in-depth client guard the portal, admin and staff layouts all use, and
 * it exists so a signed-out user sees a redirect rather than a flash of shell.
 * Per-room authorization is a separate decision made by resolveRoomActor() on
 * every request — being signed in gets you to the route, not into a room.
 */
export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/portal/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [status, pathname, router]);

  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-black">
        <Loader2 className="animate-spin text-white/50" size={22} aria-hidden="true" />
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  // A room id route: /playground/<id> and anything under it. /playground/new
  // is the create-room deep link, which is the dashboard, not a room.
  const isRoom =
    /^\/playground\/[^/]+/.test(pathname) &&
    !/^\/playground\/new\/?$/.test(pathname);

  if (isRoom) {
    return <div className="fixed inset-0 z-30 bg-black">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-7xl p-4 pt-24 md:p-8 md:pt-10">{children}</div>
    </div>
  );
}
