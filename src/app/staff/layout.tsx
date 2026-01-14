"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { StaffSidebar } from "@/components/staff/sidebar";
import { StaffMobileNav } from "@/components/staff/mobile-nav";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/portal/login");
    } else if (
      status === "authenticated" &&
      session?.user?.role !== "STAFF" &&
      session?.user?.role !== "ADMIN"
    ) {
      router.push("/portal/dashboard");
    }
  }, [status, session, router]);

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

  if (!session || (session.user?.role !== "STAFF" && session.user?.role !== "ADMIN")) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      <StaffMobileNav />
      {/* Desktop Sidebar */}
      <StaffSidebar className="hidden md:block fixed left-0 top-0 h-screen w-64 z-40" />

      {/* Main content */}
      <main className="md:ml-64 pt-24 md:pt-8 min-h-screen transition-all duration-300">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
