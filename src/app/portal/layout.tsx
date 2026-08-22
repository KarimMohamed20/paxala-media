"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { PortalSidebar } from "@/components/portal/sidebar";
import { PortalMobileNav } from "@/components/portal/mobile-nav";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Must stay in sync with PUBLIC_PORTAL_PATHS in src/middleware.ts — these
  // pages exist precisely for visitors without a session.
  const isPublicPath =
    pathname === "/portal/login" || pathname === "/portal/forgot-password";

  useEffect(() => {
    if (status === "unauthenticated" && !isPublicPath) {
      router.push("/portal/login");
    }
  }, [status, isPublicPath, router]);

  // Public pages render as bare documents — no sidebar shell, no auth gate.
  if (isPublicPath) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white flex items-center gap-2">
          <Loader2 className="animate-spin" size={20} />
          Loading...
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Print views render as a bare document — no sidebar, no nav — but still
  // behind the session check above.
  if (pathname.endsWith("/print")) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-black">
      <PortalMobileNav />
      {/* Desktop Sidebar */}
      <PortalSidebar className="hidden md:block fixed start-0 top-0 h-screen w-64 z-40" />

      {/* Main content */}
      <main className="md:ms-64 pt-24 md:pt-8 min-h-screen transition-all duration-300">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
