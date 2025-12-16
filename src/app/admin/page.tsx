"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  Folder,
  Calendar,
  MessageSquare,
  TrendingUp,
  FileText,
  Clock,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AdminStats {
  stats: {
    users: { total: number; clients: number };
    projects: { total: number; active: number; completed: number };
    bookings: { total: number; pending: number };
    inquiries: { total: number; new: number };
    files: { total: number };
  };
  recent: {
    projects: Array<{
      id: string;
      title: string;
      status: string;
      createdAt: string;
      client: { name: string } | null;
    }>;
    bookings: Array<{
      id: string;
      name: string;
      serviceType: string;
      date: string;
      status: string;
      createdAt: string;
    }>;
    inquiries: Array<{
      id: string;
      name: string;
      email: string;
      subject: string;
      status: string;
      createdAt: string;
    }>;
  };
}

const statusColors = {
  IN_PROGRESS: "warning",
  REVIEW: "default",
  COMPLETED: "success",
  DRAFT: "secondary",
  PENDING: "warning",
  CONFIRMED: "success",
  CANCELLED: "destructive",
  NEW: "default",
  READ: "secondary",
  RESPONDED: "success",
} as const;

export default function AdminDashboard() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/admin/stats");
        if (!response.ok) throw new Error("Failed to fetch stats");
        const stats = await response.json();
        setData(stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-white/40" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const stats = data?.stats;
  const recent = data?.recent;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-white/60">
          Overview of your media production business.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-600/20 text-blue-500">
                <Users size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {stats?.users.total || 0}
                </p>
                <p className="text-sm text-white/60">Total Users</p>
                <p className="text-xs text-white/40">
                  {stats?.users.clients || 0} clients
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-600/20 text-purple-500">
                <Folder size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {stats?.projects.total || 0}
                </p>
                <p className="text-sm text-white/60">Projects</p>
                <p className="text-xs text-white/40">
                  {stats?.projects.active || 0} active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-600/20 text-green-500">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {stats?.bookings.total || 0}
                </p>
                <p className="text-sm text-white/60">Bookings</p>
                <p className="text-xs text-white/40">
                  {stats?.bookings.pending || 0} pending
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-orange-600/20 text-orange-500">
                <MessageSquare size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {stats?.inquiries.total || 0}
                </p>
                <p className="text-sm text-white/60">Inquiries</p>
                <p className="text-xs text-white/40">
                  {stats?.inquiries.new || 0} new
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder size={18} className="text-purple-500" />
                Recent Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recent?.projects.length === 0 ? (
                <p className="text-white/40 text-sm">No projects yet</p>
              ) : (
                <div className="space-y-4">
                  {recent?.projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">
                          {project.title}
                        </p>
                        <p className="text-white/40 text-xs">
                          {project.client?.name || "No client"}
                        </p>
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Bookings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar size={18} className="text-green-500" />
                Recent Bookings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recent?.bookings.length === 0 ? (
                <p className="text-white/40 text-sm">No bookings yet</p>
              ) : (
                <div className="space-y-4">
                  {recent?.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">
                          {booking.name}
                        </p>
                        <p className="text-white/40 text-xs">
                          {booking.serviceType}
                        </p>
                      </div>
                      <Badge
                        variant={
                          statusColors[
                            booking.status as keyof typeof statusColors
                          ] || "secondary"
                        }
                      >
                        {booking.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Inquiries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare size={18} className="text-orange-500" />
                Recent Inquiries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recent?.inquiries.length === 0 ? (
                <p className="text-white/40 text-sm">No inquiries yet</p>
              ) : (
                <div className="space-y-4">
                  {recent?.inquiries.map((inquiry) => (
                    <div
                      key={inquiry.id}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white text-sm font-medium">
                          {inquiry.name}
                        </p>
                        <p className="text-white/40 text-xs truncate max-w-[150px]">
                          {inquiry.subject}
                        </p>
                      </div>
                      <Badge
                        variant={
                          statusColors[
                            inquiry.status as keyof typeof statusColors
                          ] || "secondary"
                        }
                      >
                        {inquiry.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
