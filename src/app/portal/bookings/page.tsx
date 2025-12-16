"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import {
  Calendar,
  Clock,
  Plus,
  MapPin,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  serviceType: string;
  date: string;
  timeSlot: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

const statusColors = {
  PENDING: "warning",
  CONFIRMED: "success",
  CANCELLED: "destructive",
  COMPLETED: "secondary",
} as const;

const statusIcons = {
  PENDING: AlertCircle,
  CONFIRMED: CheckCircle2,
  CANCELLED: XCircle,
  COMPLETED: CheckCircle2,
};

function getDateLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMMM d, yyyy");
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");

  useEffect(() => {
    async function fetchBookings() {
      try {
        const response = await fetch("/api/bookings");
        if (!response.ok) throw new Error("Failed to fetch bookings");
        const data = await response.json();
        setBookings(data);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, []);

  const now = new Date();
  const filteredBookings = bookings.filter((booking) => {
    const bookingDate = new Date(booking.date);
    if (filter === "upcoming") return bookingDate >= now;
    if (filter === "past") return bookingDate < now;
    return true;
  });

  const upcomingCount = bookings.filter(
    (b) => new Date(b.date) >= now && b.status !== "CANCELLED"
  ).length;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Bookings</h1>
          <p className="text-white/60">
            View and manage your consultation bookings.
          </p>
        </div>
        <Link href="/booking">
          <Button>
            <Plus size={18} className="mr-2" />
            New Booking
          </Button>
        </Link>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-600/20 text-green-500">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">{upcomingCount}</p>
                <p className="text-sm text-white/60">Upcoming Bookings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-yellow-600/20 text-yellow-500">
                <Clock size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {bookings.filter((b) => b.status === "PENDING").length}
                </p>
                <p className="text-sm text-white/60">Pending Confirmation</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-600/20 text-blue-500">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-3xl font-bold text-white">
                  {bookings.filter((b) => b.status === "COMPLETED").length}
                </p>
                <p className="text-sm text-white/60">Completed Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex gap-2 mb-6"
      >
        {(["upcoming", "past", "all"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "secondary"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </motion.div>

      {/* Bookings List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-white/40" size={32} />
        </div>
      ) : filteredBookings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-16"
        >
          <Calendar size={64} className="text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No bookings found
          </h3>
          <p className="text-white/60 mb-6">
            {filter === "upcoming"
              ? "You don't have any upcoming bookings."
              : filter === "past"
              ? "No past bookings to show."
              : "Start by booking a consultation."}
          </p>
          <Link href="/booking">
            <Button>Book a Consultation</Button>
          </Link>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {filteredBookings.map((booking, index) => {
            const bookingDate = new Date(booking.date);
            const StatusIcon = statusIcons[booking.status as keyof typeof statusIcons] || AlertCircle;
            const isUpcoming = bookingDate >= now;

            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
              >
                <Card
                  className={`${
                    !isUpcoming || booking.status === "CANCELLED"
                      ? "opacity-60"
                      : ""
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {/* Date Box */}
                        <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-red-600/20 flex flex-col items-center justify-center text-center">
                          <span className="text-red-500 text-sm font-medium">
                            {format(bookingDate, "MMM")}
                          </span>
                          <span className="text-white text-2xl font-bold">
                            {format(bookingDate, "d")}
                          </span>
                          <span className="text-white/60 text-xs">
                            {format(bookingDate, "EEE")}
                          </span>
                        </div>

                        {/* Details */}
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {booking.serviceType}
                          </h3>
                          <div className="flex items-center gap-4 text-white/60 text-sm mb-3">
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {booking.timeSlot}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar size={14} />
                              {getDateLabel(bookingDate)}
                            </span>
                          </div>
                          {booking.notes && (
                            <p className="text-white/40 text-sm">
                              Note: {booking.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          variant={
                            statusColors[
                              booking.status as keyof typeof statusColors
                            ] || "secondary"
                          }
                          className="flex items-center gap-1"
                        >
                          <StatusIcon size={12} />
                          {booking.status}
                        </Badge>
                        {isUpcoming && booking.status === "CONFIRMED" && (
                          <p className="text-green-500 text-xs">
                            Confirmed
                          </p>
                        )}
                        {isUpcoming && booking.status === "PENDING" && (
                          <p className="text-yellow-500 text-xs">
                            Awaiting confirmation
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
