"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Calendar,
  Search,
  MoreVertical,
  Trash2,
  Check,
  X,
  Loader2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from 'next-intl';

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
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

const statusColors = {
  PENDING: "warning",
  CONFIRMED: "success",
  CANCELLED: "destructive",
  COMPLETED: "secondary",
} as const;

export default function BookingsPage() {
  const ta = useTranslations('adminUI');
  const tc = useTranslations('common');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (showUpcoming) params.append("upcoming", "true");
      if (search) params.append("search", search);

      const response = await fetch(`/api/admin/bookings?${params}`);
      if (!response.ok) throw new Error("Failed to fetch bookings");
      const data = await response.json();
      setBookings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [search, statusFilter, showUpcoming]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch("/api/admin/bookings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      fetchBookings();
    } catch (err) {
      alert(err instanceof Error ? err.message : ta('errorOccurred'));
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!confirm(ta('deleteConfirm'))) return;

    try {
      const response = await fetch(`/api/admin/bookings?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete booking");
      }

      fetchBookings();
    } catch (err) {
      alert(err instanceof Error ? err.message : ta('errorOccurred'));
    }
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{ta('bookings')}</h1>
          <p className="text-white/60">
            {ta('manageBookings')}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-4 mb-6 flex-wrap"
      >
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tc('search')}
            className="pl-10"
          />
        </div>
        <Button
          variant={showUpcoming ? "default" : "secondary"}
          size="sm"
          onClick={() => setShowUpcoming(!showUpcoming)}
        >
          <Clock size={16} className="mr-2" />
          {ta('upcomingOnly')}
        </Button>
        <div className="flex gap-2">
          {["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "secondary"}
              size="sm"
              onClick={() =>
                setStatusFilter(statusFilter === status ? null : status)
              }
            >
              {status}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Bookings List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-white/40" size={24} />
              </div>
            ) : bookings.length === 0 ? (
              <div className="text-center py-12">
                <Calendar size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/40">{tc('noResults')}</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-white/60 font-medium">
                      {tc('client')}
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      {ta('service')}
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      {tc('date')}
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      {tc('status')}
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      {ta('actions')}
                    </th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="p-4">
                        <div>
                          <p className="text-white font-medium">
                            {booking.name}
                          </p>
                          <p className="text-white/40 text-sm">
                            {booking.email}
                          </p>
                          {booking.phone && (
                            <p className="text-white/40 text-xs">
                              {booking.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-white/60">{booking.serviceType}</td>
                      <td className="p-4">
                        <div>
                          <p className="text-white">
                            {format(new Date(booking.date), "MMM d, yyyy")}
                          </p>
                          <p className="text-white/40 text-sm">
                            {booking.timeSlot}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            statusColors[
                              booking.status as keyof typeof statusColors
                            ] || "secondary"
                          }
                        >
                          {booking.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          {booking.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-500 hover:text-green-400"
                                onClick={() =>
                                  handleStatusChange(booking.id, "CONFIRMED")
                                }
                              >
                                <Check size={16} className="mr-1" />
                                {tc('confirm')}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-400"
                                onClick={() =>
                                  handleStatusChange(booking.id, "CANCELLED")
                                }
                              >
                                <X size={16} className="mr-1" />
                                {tc('cancel')}
                              </Button>
                            </>
                          )}
                          {booking.status === "CONFIRMED" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleStatusChange(booking.id, "COMPLETED")
                              }
                            >
                              {ta('markComplete')}
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDeleteBooking(booking.id)}
                              className="text-red-500"
                            >
                              <Trash2 size={16} className="mr-2" />
                              {tc('delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
