"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  ChevronDown,
  ChevronUp,
  UserX,
  Loader2,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useTranslations } from 'next-intl';

interface MilestoneData {
  id: string;
  title: string;
  price: number | null;
  paymentStatus: string;
  paymentAmount: number | null;
  paymentDate: string;
  paidAmount: number;
  project: {
    id: string;
    title: string;
    slug: string;
    client: {
      id: string;
      name: string;
      email: string;
    } | null;
  };
}

interface MonthlyData {
  monthKey: string;
  month: number;
  year: number;
  totalPaid: number;
  milestonesCount: number;
  clientsCount: number;
  milestones: MilestoneData[];
}

interface InactiveClient {
  id: string;
  name: string;
  email: string;
  lastProject: {
    id: string;
    title: string;
    slug: string;
    status: string;
    updatedAt: string;
  };
}

interface PaymentReport {
  year: number;
  month: number | null;
  summary: {
    totalPaid: number;
    totalMilestones: number;
    uniqueClients: number;
    inactiveClientsCount: number;
  };
  monthlyData: MonthlyData[];
  inactiveClients: InactiveClient[];
}

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function PaymentReportsPage() {
  const ta = useTranslations('adminUI');
  const tc = useTranslations('common');
  const [report, setReport] = useState<PaymentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchReport();
  }, [selectedYear, selectedMonth]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: selectedYear });
      if (selectedMonth !== "all") {
        params.append("month", selectedMonth);
      }

      const response = await fetch(`/api/reports/payments?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch report");

      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error("Error fetching payment report:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-white/40" size={48} />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-20">
        <FileText className="mx-auto text-white/20 mb-4" size={64} />
        <h3 className="text-xl font-semibold text-white mb-2">
          {ta('errorOccurred')}
        </h3>
        <p className="text-white/60">{ta('tryAgain')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{ta('paymentReports')}</h1>
          <p className="text-white/60">
            {ta('trackPayments')}
          </p>
        </div>

        <div className="flex gap-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ta('allMonths')}</SelectItem>
              {monthNames.map((month, index) => (
                <SelectItem key={index} value={(index + 1).toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/60 text-sm">{ta('totalRevenue')}</p>
                <DollarSign className="text-green-500" size={20} />
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                ₪{report.summary.totalPaid.toLocaleString()}
              </p>
              <p className="text-white/40 text-xs">
                {selectedMonth === "all"
                  ? `${ta('year')} ${selectedYear}`
                  : `${monthNames[parseInt(selectedMonth) - 1]} ${selectedYear}`}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/60 text-sm">{ta('paidMilestones')}</p>
                <TrendingUp className="text-blue-500" size={20} />
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {report.summary.totalMilestones}
              </p>
              <p className="text-white/40 text-xs">{ta('completedPayments')}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/60 text-sm">{ta('activeClients')}</p>
                <Users className="text-purple-500" size={20} />
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {report.summary.uniqueClients}
              </p>
              <p className="text-white/40 text-xs">{ta('clientsWhoPaid')}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/60 text-sm">{ta('inactiveClients')}</p>
                <UserX className="text-orange-500" size={20} />
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {report.summary.inactiveClientsCount}
              </p>
              <p className="text-white/40 text-xs">{ta('noPayments')}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Monthly Breakdown */}
      {report.monthlyData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{ta('monthlyBreakdown')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.monthlyData.map((monthData, index) => (
                  <div
                    key={monthData.monthKey}
                    className="bg-white/5 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleMonth(monthData.monthKey)}
                      className="w-full p-4 flex items-center justify-between hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <Calendar size={20} className="text-white/60" />
                        <div className="text-left">
                          <h3 className="text-white font-semibold">
                            {monthNames[monthData.month - 1]} {monthData.year}
                          </h3>
                          <p className="text-white/60 text-sm">
                            {monthData.milestonesCount} {ta('milestones')} •{" "}
                            {monthData.clientsCount} {tc('client')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-white font-bold text-lg">
                          ₪{monthData.totalPaid.toLocaleString()}
                        </span>
                        {expandedMonths.has(monthData.monthKey) ? (
                          <ChevronUp size={20} className="text-white/60" />
                        ) : (
                          <ChevronDown size={20} className="text-white/60" />
                        )}
                      </div>
                    </button>

                    {expandedMonths.has(monthData.monthKey) && (
                      <div className="p-4 bg-black/20 border-t border-white/10">
                        <div className="space-y-2">
                          {monthData.milestones.map((milestone) => (
                            <div
                              key={milestone.id}
                              className="bg-white/5 rounded-lg p-4"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="text-white font-medium mb-1">
                                    {milestone.title}
                                  </h4>
                                  <p className="text-white/60 text-sm mb-2">
                                    {tc('project')}:{" "}
                                    <Link
                                      href={`/admin/projects/${milestone.project.slug}`}
                                      className="text-blue-400 hover:text-blue-300"
                                    >
                                      {milestone.project.title}
                                    </Link>
                                  </p>
                                  {milestone.project.client && (
                                    <p className="text-white/60 text-sm">
                                      {tc('client')}: {milestone.project.client.name}
                                    </p>
                                  )}
                                  <p className="text-white/40 text-xs mt-1">
                                    {ta('paidOn')}:{" "}
                                    {new Date(
                                      milestone.paymentDate
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <Badge
                                    variant={
                                      milestone.paymentStatus === "PAID"
                                        ? "success"
                                        : "warning"
                                    }
                                    className="mb-2"
                                  >
                                    {milestone.paymentStatus}
                                  </Badge>
                                  <p className="text-white font-semibold">
                                    ₪{milestone.paidAmount.toLocaleString()}
                                  </p>
                                  {milestone.paymentStatus === "PARTIAL" &&
                                    milestone.price && (
                                      <p className="text-white/40 text-xs">
                                        of ₪{milestone.price.toLocaleString()}
                                      </p>
                                    )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Inactive Clients */}
      {report.inactiveClients.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX size={20} className="text-orange-500" />
                {ta('inactiveClients')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white/60 text-sm mb-4">
                {ta('inactiveClientsDesc')}
              </p>
              <div className="space-y-3">
                {report.inactiveClients.map((client) => (
                  <div
                    key={client.id}
                    className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-white font-medium">{client.name}</h4>
                        <p className="text-white/60 text-sm mb-1">
                          {client.email}
                        </p>
                        <p className="text-white/40 text-xs">
                          {ta('lastProject')}:{" "}
                          <Link
                            href={`/admin/projects/${client.lastProject.slug}`}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            {client.lastProject.title}
                          </Link>
                        </p>
                        <p className="text-white/40 text-xs">
                          {ta('updated')}:{" "}
                          {new Date(
                            client.lastProject.updatedAt
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {client.lastProject.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Empty State */}
      {report.monthlyData.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardContent className="py-20 text-center">
              <FileText size={64} className="mx-auto text-white/20 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                {tc('noResults')}
              </h3>
              <p className="text-white/60">
                {ta('noPaymentsFound')}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
