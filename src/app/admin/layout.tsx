"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Folder,
  Calendar,
  MessageSquare,
  Settings,
  ArrowLeft,
  Loader2,
  ClipboardCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/projects", icon: Folder, label: "Projects" },
  { href: "/admin/approvals", icon: ClipboardCheck, label: "Approvals" },
  { href: "/admin/bookings", icon: Calendar, label: "Bookings" },
  { href: "/admin/inquiries", icon: MessageSquare, label: "Inquiries" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/portal/login");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
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

  if (!session || session.user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-neutral-950 border-r border-white/10 pt-20">
        <div className="p-6">
          <Link
            href="/portal/dashboard"
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Back to Portal</span>
          </Link>

          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
            Admin Panel
          </h2>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-red-600 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 pt-20 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
