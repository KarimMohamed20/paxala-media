"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Folder,
  Calendar,
  Download,
  Settings,
  LogOut,
  Shield,
  Loader2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";

const navItems = [
  { href: "/portal/dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
  { href: "/portal/projects", icon: Folder, labelKey: "projects" },
  { href: "/portal/bookings", icon: Calendar, labelKey: "bookings" },
  { href: "/portal/files", icon: Download, labelKey: "files" },
  { href: "/portal/settings", icon: Settings, labelKey: "settings" },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("portal");

  useEffect(() => {
    if (status === "unauthenticated" && pathname !== "/portal/login") {
      router.push("/portal/login");
    }
  }, [status, pathname, router]);

  // Don't show layout on login page
  if (pathname === "/portal/login") {
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

  const isAdmin = session.user?.role === "ADMIN";

  return (
    <div className="min-h-screen bg-black">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-neutral-950 border-r border-white/10 pt-20 z-40">
        <div className="p-6">
          {/* User Info */}
          <div className="mb-8 pb-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center text-red-500 font-medium">
                {session.user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {session.user?.name || "User"}
                </p>
                <p className="text-white/40 text-xs truncate">
                  {session.user?.email}
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
            {t("panel")}
          </h2>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/portal/dashboard" &&
                  pathname.startsWith(item.href));
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
                  <span>{t(item.labelKey)}</span>
                </Link>
              );
            })}
          </nav>

          {/* Admin Link */}
          {isAdmin && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <Link
                href="/admin"
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Shield size={18} />
                <span>{t("adminPanel")}</span>
              </Link>
            </div>
          )}

          {/* Logout */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/60 hover:text-red-500 hover:bg-white/5 transition-colors w-full"
            >
              <LogOut size={18} />
              <span>{t("signOut")}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 pt-20 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
