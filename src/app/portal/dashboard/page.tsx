"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Folder,
  Calendar,
  FileText,
  Bell,
  Download,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Users,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardData {
  stats: {
    activeProjects: number;
    upcomingBookings: number;
    filesAvailable: number;
    notifications: number;
  };
  recentProjects: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    progress: number;
    lastUpdate: string;
    filesCount: number;
  }>;
  upcomingBookings: Array<{
    id: string;
    service: string;
    date: string;
    time: string;
    status: string;
  }>;
  notifications: Array<{
    id: string;
    message: string;
    time: string;
    type: string;
  }>;
}

const statusColors = {
  DRAFT: "secondary",
  IN_PROGRESS: "warning",
  REVIEW: "default",
  COMPLETED: "success",
  ARCHIVED: "secondary",
} as const;

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/portal/login");
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch("/api/dashboard");
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    if (status === "authenticated") {
      fetchDashboardData();
    }
  }, [status]);

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white flex items-center gap-2">
          <Loader2 className="animate-spin" size={20} />
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {
    activeProjects: 0,
    upcomingBookings: 0,
    filesAvailable: 0,
    notifications: 0,
  };

  return (
    <div className="min-h-screen bg-black pt-24 pb-12">
      <div className="mx-auto px-6 md:px-8 lg:px-12 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome back, {session.user?.name || "Client"}
              </h1>
              <p className="text-white/60">
                Here&apos;s an overview of your projects and upcoming activities.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {(session.user?.role === "STAFF" || session.user?.role === "ADMIN") && (
                <Link href="/staff">
                  <Button variant="secondary" className="gap-2">
                    <Users size={16} />
                    Staff Panel
                  </Button>
                </Link>
              )}
              {session.user?.role === "ADMIN" && (
                <Link href="/admin">
                  <Button variant="secondary" className="gap-2">
                    <Settings size={16} />
                    Admin Panel
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {[
            { icon: Folder, label: "Active Projects", value: stats.activeProjects.toString(), color: "text-blue-500" },
            { icon: Calendar, label: "Upcoming Bookings", value: stats.upcomingBookings.toString(), color: "text-green-500" },
            { icon: FileText, label: "Files Available", value: stats.filesAvailable.toString(), color: "text-purple-500" },
            { icon: Bell, label: "Notifications", value: stats.notifications.toString(), color: "text-orange-500" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
                    <stat.icon size={24} />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-white">
                      {loading ? <Loader2 className="animate-spin" size={24} /> : stat.value}
                    </p>
                    <p className="text-sm text-white/60">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Projects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Projects</CardTitle>
                <Link href="/portal/projects">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-white/40" size={24} />
                  </div>
                ) : dashboardData?.recentProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <Folder size={48} className="text-white/20 mx-auto mb-4" />
                    <p className="text-white/40">No projects yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardData?.recentProjects.map((project) => (
                      <Link
                        key={project.id}
                        href={`/portal/projects/${project.slug}`}
                        className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors block"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-red-600/20 flex items-center justify-center">
                            <Folder size={20} className="text-red-500" />
                          </div>
                          <div>
                            <h3 className="font-medium text-white">
                              {project.title}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock size={12} className="text-white/40" />
                              <span className="text-xs text-white/40">
                                {project.lastUpdate}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-red-600 rounded-full transition-all"
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-white/40 mt-1">
                              {project.progress}%
                            </span>
                          </div>
                          <Badge
                            variant={
                              statusColors[
                                project.status as keyof typeof statusColors
                              ] || "secondary"
                            }
                          >
                            {project.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            {/* Upcoming Bookings */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="animate-spin text-white/40" size={20} />
                  </div>
                ) : dashboardData?.upcomingBookings.length === 0 ? (
                  <div className="text-center py-4">
                    <Calendar size={32} className="text-white/20 mx-auto mb-2" />
                    <p className="text-white/40 text-sm">No upcoming bookings</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardData?.upcomingBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-white/5"
                      >
                        <div className="p-2 rounded-lg bg-green-600/20">
                          <Calendar size={16} className="text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">
                            {booking.service}
                          </p>
                          <p className="text-xs text-white/60">
                            {booking.date} at {booking.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Link href="/booking">
                  <Button variant="secondary" className="w-full mt-4" size="sm">
                    Book New Session
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="animate-spin text-white/40" size={20} />
                  </div>
                ) : dashboardData?.notifications.length === 0 ? (
                  <div className="text-center py-4">
                    <Bell size={32} className="text-white/20 mx-auto mb-2" />
                    <p className="text-white/40 text-sm">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {dashboardData?.notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="flex items-start gap-3"
                      >
                        <div
                          className={`p-1.5 rounded-full ${
                            notification.type === "success"
                              ? "bg-green-600/20"
                              : notification.type === "warning"
                              ? "bg-yellow-600/20"
                              : "bg-blue-600/20"
                          }`}
                        >
                          {notification.type === "success" ? (
                            <CheckCircle2
                              size={14}
                              className="text-green-500"
                            />
                          ) : notification.type === "warning" ? (
                            <AlertCircle size={14} className="text-yellow-500" />
                          ) : (
                            <Bell size={14} className="text-blue-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-white/80">
                            {notification.message}
                          </p>
                          <p className="text-xs text-white/40 mt-0.5">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/portal/projects">
                  <Button variant="ghost" className="w-full justify-start">
                    <Folder size={18} className="mr-3" />
                    View Projects
                  </Button>
                </Link>
                <Link href="/portal/bookings">
                  <Button variant="ghost" className="w-full justify-start">
                    <Calendar size={18} className="mr-3" />
                    Manage Bookings
                  </Button>
                </Link>
                <Link href="/portal/files">
                  <Button variant="ghost" className="w-full justify-start">
                    <Download size={18} className="mr-3" />
                    Download Files
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
