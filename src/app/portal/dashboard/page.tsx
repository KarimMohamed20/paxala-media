"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { formatDateLocalized } from "@/lib/format";
import { ProgressRing } from "@/components/plan/progress-ring";
import {
  Calendar,
  Clock,
  Loader2,
  Plus,
  ChevronRight,
  Video,
  Box,
  MoreVertical,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectRequestModal } from "@/components/portal/project-request-modal";
import { DeliveredTrendCard } from "@/components/reports/delivered-trend-card";

interface DashboardData {
  userPlan: {
    name: string;
    active: boolean;
  } | null;
  monthlyPlan: {
    id: string;
    title: string;
    subtitle: string | null;
    progress: number;
    month: number;
    year: number;
  } | null;
  stats: {
    deliverables: number;
    awaitingApproval: number;
    upcomingShoots: number;
  };
  contentApprovals: Array<{
    id: string;
    title: string;
    category: string;
    projectTitle: string | null;
    updatedAt: string;
    thumbnail: string | null;
    status: "REVIEW" | "APPROVED" | "CHANGES_REQUESTED";
  }>;
  upcomingProduction: {
    id: string;
    date: string;
    serviceType: string;
    timeSlot: string | null;
    durationMinutes: number;
    status: string;
  } | null;
  deliveryTrend: Array<{
    key: string;
    value: number;
  }>;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const tp = useTranslations("plan");
  const tcon = useTranslations("content");
  const locale = useLocale();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchDashboard();
    }
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-red-600" size={36} />
      </div>
    );
  }

  const userName = session?.user?.name || "Client";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
            Welcome back, {userName}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            {data?.userPlan?.name && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-white/10 text-xs font-semibold text-white/90">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                {tp("strip.packageActive", { package: data.userPlan.name })}
              </span>
            )}
          </div>
        </div>

        {/* Action button & Header utilities */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 pr-2 border-e border-white/10">
            {/* Notifications icon */}
            <div className="relative p-2 rounded-xl bg-neutral-900 border border-white/10 text-white/70 hover:text-white cursor-pointer transition-colors">
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                3
              </span>
            </div>
            {/* User Initials Avatar */}
            <div className="flex items-center gap-2 bg-neutral-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white">
              <div className="w-6 h-6 rounded-full bg-red-600/30 text-red-400 flex items-center justify-center font-bold text-[10px]">
                {userInitials}
              </div>
              <span className="font-semibold">{userName}</span>
            </div>
          </div>

          <Button
            onClick={() => setIsRequestModalOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-medium px-5 rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/20"
          >
            <span>New Request</span>
            <Plus size={18} />
          </Button>
        </div>
      </div>

      {/* Top Metrics Row: Large Monthly Plan Hero + 3 Counter Cards */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-4 gap-6"
      >
        {/* Monthly Plan Hero Card (Spans 2 cols on lg) */}
        <div className="lg:col-span-2 relative bg-neutral-900/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between group min-h-[220px]">
          {data?.monthlyPlan ? (
            <div className="p-6 relative z-10 flex flex-wrap items-center gap-6">
              <div className="min-w-0 flex-1 space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    {data.monthlyPlan.title}
                  </h3>
                  {data.monthlyPlan.subtitle && (
                    <p className="text-xs text-white/60 mt-1">
                      {data.monthlyPlan.subtitle}
                    </p>
                  )}
                </div>

                <div>
                  <div className="text-xs text-white/50 mb-1 font-medium">
                    {tp("admin.fields.progress")}
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5">
                    <motion.div
                      className="h-full bg-red-600 rounded-full shadow-[0_0_12px_rgba(220,38,38,0.8)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${data.monthlyPlan.progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>
                </div>

                <Link
                  href={`/portal/monthly-plan?year=${data.monthlyPlan.year}&month=${data.monthlyPlan.month}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-400 transition-colors pt-2"
                >
                  <span>View plan details</span>
                  <ChevronRight size={14} />
                </Link>
              </div>

              {/* Replaces a hardcoded Unsplash image: no external URL, and it
                  ties the hero to the plan page's own progress ring. */}
              <ProgressRing
                value={data.monthlyPlan.progress}
                size={120}
                stroke={9}
                className="mx-auto"
              />
            </div>
          ) : (
            <div className="p-6 relative z-10 flex flex-col justify-center h-full space-y-3">
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {tp("title")}
              </h3>
              <p className="text-xs text-white/50 max-w-sm">
                {tp("empty.description")}
              </p>
              <Link
                href="/portal/monthly-plan"
                className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-400 transition-colors"
              >
                <span>View plan details</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* Counter Card 1: Deliverables */}
        <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
            <Box size={20} />
          </div>
          <div>
            <div className="text-4xl font-extrabold text-white">
              {data?.stats?.deliverables ?? 0}
            </div>
            <div className="text-xs text-white/50 font-medium mt-1">
              Deliverables
            </div>
          </div>
          <Link
            href="/portal/files"
            className="inline-flex items-center gap-1 text-xs font-semibold text-white/60 hover:text-white transition-colors"
          >
            <span>View all</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* Counter Card 2: Awaiting Approval */}
        <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-4xl font-extrabold text-white">
              {data?.stats?.awaitingApproval ?? 0}
            </div>
            <div className="text-xs text-white/50 font-medium mt-1">
              Awaiting Approval
            </div>
          </div>
          <Link
            href="/portal/approvals"
            className="inline-flex items-center gap-1 text-xs font-semibold text-white/60 hover:text-white transition-colors"
          >
            <span>View all</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {/* Counter Card 3: Upcoming Shoots */}
        <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80">
            <Video size={20} />
          </div>
          <div>
            <div className="text-4xl font-extrabold text-white">
              {data?.stats?.upcomingShoots ?? 0}
            </div>
            <div className="text-xs text-white/50 font-medium mt-1">
              Upcoming Shoots
            </div>
          </div>
          <Link
            href="/portal/calendar"
            className="inline-flex items-center gap-1 text-xs font-semibold text-white/60 hover:text-white transition-colors"
          >
            <span>View schedule</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </motion.div>

      {/* Main 2-Column Dashboard Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Content Approval Section */}
        <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h3 className="text-lg font-bold text-white">Content Approval</h3>
            <Link
              href="/portal/approvals"
              className="inline-flex items-center gap-1 text-xs font-semibold text-white/60 hover:text-white transition-colors"
            >
              <span>View all</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="space-y-4">
            {(data?.contentApprovals?.length ?? 0) === 0 && (
              <p className="py-8 text-center text-xs text-white/40">
                {tp("actions.empty")}
              </p>
            )}
            {data?.contentApprovals?.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-neutral-950 rounded-xl border border-white/5 flex items-center justify-between gap-4 hover:border-white/15 transition-all group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {item.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-16 h-16 rounded-lg object-cover shrink-0 border border-white/10"
                    />
                  ) : (
                    <span className="w-16 h-16 rounded-lg shrink-0 border border-white/10 bg-white/5 grid place-items-center">
                      <Video size={18} className="text-white/25" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-white truncate group-hover:text-red-500 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-white/40 mt-0.5 font-medium">
                      {[item.projectTitle, tcon(`format.${item.category}`)]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                    <p className="text-[11px] text-white/30 mt-1 font-medium">
                      {formatDateLocalized(item.updatedAt, locale, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {/* Status indicator action */}
                <div className="flex items-center gap-3 shrink-0">
                  {item.status === "REVIEW" ? (
                    <Link href="/portal/approvals">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/20 hover:border-white text-white bg-transparent text-xs px-4 h-9 rounded-lg"
                      >
                        Review
                      </Button>
                    </Link>
                  ) : item.status === "APPROVED" ? (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                      Approved
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-xs font-semibold">
                      Changes Requested
                    </span>
                  )}
                  <button className="text-white/40 hover:text-white p-1">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Upcoming Production & Performance Chart */}
        <div className="space-y-6">
          {/* Top Widget: Upcoming Production */}
          <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">
                Upcoming Production
              </h3>
              <Link
                href="/portal/calendar"
                className="inline-flex items-center gap-1 text-xs font-semibold text-white/60 hover:text-white transition-colors"
              >
                <span>View all</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {data?.upcomingProduction ? (
              <div className="p-4 bg-neutral-950 rounded-xl border border-white/5 flex items-center gap-4">
                {/* Red Date Pill */}
                <div className="w-14 h-14 rounded-xl bg-neutral-900 border border-white/10 flex flex-col items-center justify-center shrink-0 overflow-hidden">
                  <div className="bg-red-600 text-white text-[10px] font-black w-full text-center py-0.5 tracking-wider uppercase">
                    {formatDateLocalized(data.upcomingProduction.date, locale, {
                      month: "short",
                    })}
                  </div>
                  <div className="text-xl font-extrabold text-white">
                    {new Date(data.upcomingProduction.date).getDate()}
                  </div>
                </div>

                <div className="min-w-0 space-y-1 flex-1">
                  <h4 className="text-sm font-bold text-white truncate">
                    {data.upcomingProduction.serviceType}
                  </h4>
                  <div className="flex items-center gap-1 text-xs text-white/40">
                    <Clock size={12} />
                    <span>
                      {data.upcomingProduction.timeSlot ??
                        formatDateLocalized(data.upcomingProduction.date, locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-neutral-950 rounded-xl border border-dashed border-white/10 text-center">
                <Calendar size={22} className="mx-auto mb-2 text-white/20" />
                <p className="text-xs text-white/40">No production booked yet</p>
                <Link
                  href="/portal/bookings"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-400 transition-colors"
                >
                  <span>Book a session</span>
                  <ChevronRight size={13} />
                </Link>
              </div>
            )}
          </div>

          {/* Real delivered-per-month series. The old "Campaign Performance"
              card charted six hardcoded literals — this system has no reach or
              engagement data to chart. */}
          <DeliveredTrendCard points={data?.deliveryTrend ?? []} />
        </div>
      </div>

      {/* Project Request Modal */}
      <ProjectRequestModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={() => fetchDashboard()}
      />
    </div>
  );
}
