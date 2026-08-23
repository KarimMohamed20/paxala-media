"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
    LayoutDashboard,
    Users,
    Folder,
    Calendar,
    CalendarCheck,
    CalendarRange,
    MessageSquare,
    ArrowLeft,
    ClipboardCheck,
    Image,
    Home,
    Briefcase,
    FileText,
    BarChart3,
    MessageSquareQuote,
    LogOut,
    Target,
    Receipt,
    Sparkles,
    UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const navItems = [
    { href: "/admin", icon: LayoutDashboard, labelKey: "dashboard" },
    { href: "/admin/leads", icon: Target, labelKey: "leads" },
    { href: "/admin/homepage", icon: Home, labelKey: "homepage" },
    { href: "/admin/services", icon: Briefcase, labelKey: "services" },
    { href: "/admin/team", icon: Users, labelKey: "team" },
    { href: "/admin/users", icon: Users, labelKey: "users" },
    { href: "/admin/projects", icon: Folder, labelKey: "projects" },
    // CalendarRange, not Calendar — /admin/bookings already owns that glyph.
    { href: "/admin/content-calendar", icon: CalendarRange, labelKey: "contentCalendar" },
    // CalendarCheck: Calendar (bookings) and CalendarRange (content) are taken.
    { href: "/admin/monthly-plans", icon: CalendarCheck, labelKey: "monthlyPlans" },
    // Top-level route: a Playground room is edge-to-edge and renders outside
    // the admin shell, so it is not under /admin/*.
    { href: "/playground", icon: Sparkles, labelKey: "playground" },
    { href: "/admin/invoices", icon: Receipt, labelKey: "invoices" },
    { href: "/admin/reports/payments", icon: BarChart3, labelKey: "paymentReports" },
    { href: "/admin/portfolio", icon: Image, labelKey: "portfolio" },
    { href: "/admin/testimonials", icon: MessageSquareQuote, labelKey: "testimonials" },
    { href: "/admin/blog", icon: FileText, labelKey: "blog" },
    { href: "/admin/approvals", icon: ClipboardCheck, labelKey: "approvals" },
    { href: "/admin/client-approvals", icon: UserCheck, labelKey: "clientApprovals" },
    { href: "/admin/bookings", icon: Calendar, labelKey: "bookings" },
    { href: "/admin/inquiries", icon: MessageSquare, labelKey: "inquiries" },
];

interface AdminSidebarProps {
    className?: string;
    onClose?: () => void;
}

export function AdminSidebar({ className, onClose }: AdminSidebarProps) {
    const { data: session } = useSession();
    const pathname = usePathname();
    const t = useTranslations("admin");

    return (
        <aside className={cn("bg-neutral-950 border-e border-white/10", className)}>
            <div className="p-6 h-full flex flex-col overflow-y-auto">
                {/* Logo/Header */}
                <div className="mb-6 px-2">
                    <h1 className="text-xl font-bold text-white tracking-tight">
                        Paxala<span className="text-red-600">Media</span>
                    </h1>
                </div>

                <Link
                    href="/portal/dashboard"
                    className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-6 px-2"
                >
                    <ArrowLeft size={16} />
                    <span className="text-sm">{t("backToPortal")}</span>
                </Link>

                {/* User Info - Simplified for Admin since they likely know who they are, but good connectivity */}
                <div className="mb-6 pb-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center text-red-500 font-medium shrink-0">
                            {session?.user?.name?.[0]?.toUpperCase() || "A"}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">
                                {session?.user?.name || "Admin"}
                            </p>
                            <p className="text-white/40 text-xs truncate">
                                {session?.user?.email}
                            </p>
                        </div>
                    </div>
                </div>

                <h2 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4 px-2">
                    {t("panel")}
                </h2>

                <nav className="space-y-1 flex-1">
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

                <div className="mt-8 pt-6 border-t border-white/10">
                    <button
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/60 hover:text-red-500 hover:bg-white/5 transition-colors w-full"
                    >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </aside>
    );
}
