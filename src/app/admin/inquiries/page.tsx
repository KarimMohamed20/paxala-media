"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  MessageSquare,
  Search,
  MoreVertical,
  Trash2,
  Eye,
  Mail,
  Loader2,
  Check,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from 'next-intl';

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

const statusColors = {
  NEW: "default",
  READ: "secondary",
  RESPONDED: "success",
  ARCHIVED: "secondary",
} as const;

export default function InquiriesPage() {
  const ta = useTranslations('adminUI');
  const tc = useTranslations('common');
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInquiries = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (search) params.append("search", search);

      const response = await fetch(`/api/admin/inquiries?${params}`);
      if (!response.ok) throw new Error("Failed to fetch inquiries");
      const data = await response.json();
      setInquiries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, [search, statusFilter]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch("/api/admin/inquiries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      fetchInquiries();
    } catch (err) {
      alert(err instanceof Error ? err.message : ta('errorOccurred'));
    }
  };

  const handleDeleteInquiry = async (id: string) => {
    if (!confirm(ta('deleteConfirm'))) return;

    try {
      const response = await fetch(`/api/admin/inquiries?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete inquiry");
      }

      fetchInquiries();
    } catch (err) {
      alert(err instanceof Error ? err.message : ta('errorOccurred'));
    }
  };

  const handleViewInquiry = async (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);

    // Mark as read if it's new
    if (inquiry.status === "NEW") {
      handleStatusChange(inquiry.id, "READ");
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
          <h1 className="text-3xl font-bold text-white mb-2">{ta('inquiries')}</h1>
          <p className="text-white/60">
            {ta('manageInquiries')}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-4 mb-6"
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
        <div className="flex gap-2">
          {["NEW", "READ", "RESPONDED", "ARCHIVED"].map((status) => (
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

      {/* Inquiries List */}
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
            ) : inquiries.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare
                  size={48}
                  className="text-white/20 mx-auto mb-4"
                />
                <p className="text-white/40">{tc('noResults')}</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-white/60 font-medium">
                      {ta('from')}
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      {ta('subject')}
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      {tc('status')}
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      {tc('date')}
                    </th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((inquiry) => (
                    <tr
                      key={inquiry.id}
                      className={`border-b border-white/5 hover:bg-white/5 cursor-pointer ${
                        inquiry.status === "NEW" ? "bg-white/[0.02]" : ""
                      }`}
                      onClick={() => handleViewInquiry(inquiry)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-600/20 flex items-center justify-center text-orange-500">
                            {inquiry.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p
                              className={`font-medium ${
                                inquiry.status === "NEW"
                                  ? "text-white"
                                  : "text-white/80"
                              }`}
                            >
                              {inquiry.name}
                            </p>
                            <p className="text-white/40 text-sm">
                              {inquiry.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p
                          className={`${
                            inquiry.status === "NEW"
                              ? "text-white font-medium"
                              : "text-white/60"
                          }`}
                        >
                          {inquiry.subject}
                        </p>
                        <p className="text-white/40 text-sm truncate max-w-[300px]">
                          {inquiry.message}
                        </p>
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            statusColors[
                              inquiry.status as keyof typeof statusColors
                            ] || "secondary"
                          }
                        >
                          {inquiry.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-white/60 text-sm">
                        {format(new Date(inquiry.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="p-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button variant="ghost" size="sm">
                              <MoreVertical size={16} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewInquiry(inquiry);
                              }}
                            >
                              <Eye size={16} className="mr-2" />
                              {ta('viewDetails')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(inquiry.id, "RESPONDED");
                              }}
                            >
                              <Check size={16} className="mr-2" />
                              {ta('markResponded')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(inquiry.id, "ARCHIVED");
                              }}
                            >
                              {ta('archive')}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteInquiry(inquiry.id);
                              }}
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

      {/* View Inquiry Modal */}
      <Dialog
        open={!!selectedInquiry}
        onOpenChange={() => setSelectedInquiry(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{ta('inquiryDetails')}</DialogTitle>
          </DialogHeader>
          {selectedInquiry && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-white/10">
                <div className="w-12 h-12 rounded-full bg-orange-600/20 flex items-center justify-center text-orange-500 text-lg font-medium">
                  {selectedInquiry.name[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-white font-medium">{selectedInquiry.name}</p>
                  <p className="text-white/60 text-sm">{selectedInquiry.email}</p>
                  {selectedInquiry.phone && (
                    <p className="text-white/40 text-sm">{selectedInquiry.phone}</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-white/60 text-sm mb-1">{ta('subject')}</p>
                <p className="text-white font-medium">{selectedInquiry.subject}</p>
              </div>

              <div>
                <p className="text-white/60 text-sm mb-1">{ta('message')}</p>
                <p className="text-white/80 whitespace-pre-wrap">
                  {selectedInquiry.message}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div>
                  <p className="text-white/40 text-xs">
                    {ta('received')}{" "}
                    {format(
                      new Date(selectedInquiry.createdAt),
                      "MMM d, yyyy 'at' h:mm a"
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      window.location.href = `mailto:${selectedInquiry.email}?subject=Re: ${selectedInquiry.subject}`;
                      handleStatusChange(selectedInquiry.id, "RESPONDED");
                    }}
                  >
                    <Mail size={16} className="mr-2" />
                    {ta('reply')}
                  </Button>
                  {selectedInquiry.status !== "RESPONDED" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        handleStatusChange(selectedInquiry.id, "RESPONDED");
                        setSelectedInquiry(null);
                      }}
                    >
                      <Check size={16} className="mr-2" />
                      {ta('markResponded')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
