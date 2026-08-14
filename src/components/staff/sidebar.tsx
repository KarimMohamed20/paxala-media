"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Folder,
    CheckSquare,
    ArrowLeft,
    Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/staff", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/staff/projects", icon: Folder, label: "My Projects" },
    { href: "/staff/tasks", icon: CheckSquare, label: "My Tasks" },
    // This sidebar is hardcoded English (no useTranslations here yet), so the
    // label follows suit rather than being the one translated string.
    { href: "/playground", icon: Sparkles, label: "Playground" },
];

interface StaffSidebarProps {
    className?: string;
    onClose?: () => void;
}

export function StaffSidebar({ className, onClose }: StaffSidebarProps) {
    const pathname = usePathname();

    return (
        <aside className={cn("bg-neutral-950 border-e border-white/10 pt-20", className)}>
            <div className="p-6 h-full flex flex-col">
                {/* Logo/Header */}
                <div className="mb-6 px-2">
                    <h1 className="text-xl font-bold text-white tracking-tight">
                        Paxala<span className="text-red-600">Media</span>
                    </h1>
                </div>

                <Link
                    href="/portal/dashboard"
                    onClick={onClose}
                    className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-6 px-2"
                >
                    <ArrowLeft size={16} />
                    <span className="text-sm">Back to Portal</span>
                </Link>

                <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
                    Staff Panel
                </h2>

                <nav className="space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                    isActive
                                        ? "bg-blue-600 text-white"
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
    );
}
