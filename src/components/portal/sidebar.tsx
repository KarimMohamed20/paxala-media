"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutGrid,
  CalendarDays,
  CalendarRange,
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  Folder,
  Image as ImageIcon,
  BarChart3,
  Briefcase,
  Headphones,
  Settings,
  LogOut,
  Shield,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { getWhatsAppUrl } from "@/lib/constants";

const navItems = [
  { href: "/portal/dashboard", icon: LayoutGrid, labelKey: "overview", defaultLabel: "Overview" },
  { href: "/portal/monthly-plan", icon: CalendarDays, labelKey: "monthlyPlan", defaultLabel: "Monthly Plan" },
  { href: "/portal/calendar", icon: CalendarRange, labelKey: "contentCalendar", defaultLabel: "Content Calendar" },
  { href: "/portal/approvals", icon: CheckCircle2, labelKey: "approvals", defaultLabel: "Approvals" },
  // The room list lives in the portal; a room itself is edge-to-edge at
  // /playground/[roomId] and renders outside this sidebar shell.
  { href: "/portal/playground", icon: Sparkles, labelKey: "playground", defaultLabel: "Playground" },
  { href: "/portal/projects", icon: Folder, labelKey: "projects", defaultLabel: "Projects" },
  { href: "/portal/bookings", icon: CalendarCheck, labelKey: "bookings", defaultLabel: "Bookings" },
  { href: "/portal/files", icon: ImageIcon, labelKey: "assetLibrary", defaultLabel: "Asset Library" },
  { href: "/portal/reports", icon: BarChart3, labelKey: "reports", defaultLabel: "Reports" },
  { href: "/portal/billing", icon: CreditCard, labelKey: "billing", defaultLabel: "Billing" },
  { href: "/portal/settings", icon: Settings, labelKey: "settings", defaultLabel: "Settings" },
];

interface PortalSidebarProps {
  className?: string;
  onClose?: () => void;
}

export function PortalSidebar({ className, onClose }: PortalSidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const t = useTranslations("portal");
  const tWhatsApp = useTranslations("whatsapp");

  const isAdmin = session?.user?.role === "ADMIN";
  const isStaff = session?.user?.role === "STAFF";

  const labelFor = (labelKey: string, defaultLabel: string) => {
    try {
      const translated = t(labelKey);
      if (translated && !translated.startsWith("portal.")) {
        return translated;
      }
    } catch {
      // fall through to default
    }
    return defaultLabel;
  };

  return (
    <aside className={cn("bg-neutral-950 border-e border-white/10 w-64 shrink-0 flex flex-col justify-between h-full", className)}>
      <div className="p-6 flex flex-col h-full overflow-y-auto">
        {/* Logo Header */}
        <div className="mb-8 px-2">
          <Link href="/portal/dashboard" className="flex items-center gap-2 group">
            <span className="text-2xl font-black text-white tracking-tighter">
              PMP<span className="text-red-600">.</span>
            </span>
            <span className="text-[10px] text-white/40 leading-tight uppercase tracking-widest font-semibold block border-s border-white/15 ps-2">
              Paxala Media<br />Production
            </span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/portal/dashboard" && pathname.startsWith(item.href));

            const label = labelFor(item.labelKey, item.defaultLabel);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white/10 text-white font-semibold shadow-inner border border-white/10"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon
                  size={18}
                  className={cn(
                    "transition-colors",
                    isActive ? "text-red-500" : "text-white/40 group-hover:text-white"
                  )}
                />
                <span>{label}</span>
              </Link>
            );
          })}

          {/* Support goes straight to WhatsApp — no in-portal support page exists. */}
          <a
            href={getWhatsAppUrl(tWhatsApp("messages.support"))}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <Headphones size={18} className="text-white/40 transition-colors" />
            <span>{labelFor("support", "Support")}</span>
          </a>
        </nav>

        {/* Sidebar Footer & REC Indicator */}
        <div className="mt-8 pt-6 border-t border-white/10 space-y-4">
          {isAdmin && (
            <Link
              href="/admin"
              onClick={onClose}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-amber-400/90 hover:bg-amber-500/10 transition-colors"
            >
              <Shield size={18} />
              <span>{labelFor("adminPanel", "Admin Panel")}</span>
            </Link>
          )}

          {isStaff && (
            <Link
              href="/staff"
              onClick={onClose}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm text-sky-400/90 hover:bg-sky-500/10 transition-colors"
            >
              <Briefcase size={18} />
              <span>{labelFor("staffPanel", "Staff Panel")}</span>
            </Link>
          )}

          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors w-full"
          >
            <LogOut size={16} />
            <span>{labelFor("signOut", "Sign Out")}</span>
          </button>

          {/* PMP Tagline & REC Indicator */}
          <div className="pt-3 border-t border-white/5 text-[11px] text-white/40 font-medium space-y-1">
            <p className="font-semibold text-white/70">PMP - Paxala Media Production</p>
            <p className="text-white/40">We produce. You grow.</p>
            <div className="flex items-center gap-2 pt-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
              <span className="font-bold text-white tracking-widest text-[10px]">REC</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
