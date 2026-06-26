"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
    LayoutDashboard,
    Folder,
    Calendar,
    Download,
    Settings,
    LogOut,
    Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const navItems = [
    { href: "/portal/dashboard", icon: LayoutDashboard, labelKey: "dashboard" },
    { href: "/portal/projects", icon: Folder, labelKey: "projects" },
    { href: "/portal/bookings", icon: Calendar, labelKey: "bookings" },
    { href: "/portal/files", icon: Download, labelKey: "files" },
    { href: "/portal/settings", icon: Settings, labelKey: "settings" },
];

interface PortalSidebarProps {
    className?: string;
    onClose?: () => void;
}

export function PortalSidebar({ className, onClose }: PortalSidebarProps) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const t = useTranslations("portal");

    const isAdmin = session?.user?.role === "ADMIN";

    return (
        <aside className={cn("bg-neutral-950 border-e border-white/10", className)}>
            <div className="p-6 h-full flex flex-col">
                {/* Logo */}
                <div className="mb-8 px-2">
                    <h1 className="text-xl font-bold text-white tracking-tight">
                        Paxala<span className="text-red-600">Media</span>
                    </h1>
                </div>

                {/* User Info */}
                <div className="mb-8 pb-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center text-red-500 font-medium shrink-0">
                            {session?.user?.name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">
                                {session?.user?.name || "User"}
                            </p>
                            <p className="text-white/40 text-xs truncate">
                                {session?.user?.email}
                            </p>
                        </div>
                    </div>
                </div>

                <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
                    {t("panel")}
                </h2>

                <nav className="space-y-1 flex-1">
                    {navItems.map((item) => {
                        const isActive =
                            pathname === item.href ||
                            (item.href !== "/portal/dashboard" &&
                                pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
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

                {/* Footer Actions */}
                <div className="mt-auto pt-6 space-y-4">
                    {/* Admin Link */}
                    {isAdmin && (
                        <div className="pt-6 border-t border-white/10">
                            <Link
                                href="/admin"
                                onClick={onClose}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <Shield size={18} />
                                <span>{t("adminPanel")}</span>
                            </Link>
                        </div>
                    )}

                    {/* Logout */}
                    <div className={cn(!isAdmin && "pt-6 border-t border-white/10")}>
                        <button
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/60 hover:text-red-500 hover:bg-white/5 transition-colors w-full"
                        >
                            <LogOut size={18} />
                            <span>{t("signOut")}</span>
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
}
