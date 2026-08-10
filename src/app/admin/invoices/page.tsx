"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Receipt,
  Loader2,
  Download,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

interface InvoiceRow {
  id: string;
  number: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  total: string;
  isOverdue: boolean;
  project: {
    id: string;
    title: string;
    clientName: string | null;
    client: { id: string; name: string | null; username: string } | null;
  };
  milestone: { id: string; title: string } | null;
}

interface Totals {
  outstanding: { currency: string; amount: string | number }[];
  paidThisMonth: { currency: string; amount: string | number }[];
  overdueCount: number;
}

interface Client {
  id: string;
  username: string;
  name: string | null;
  email: string | null;
}

const statusColors = {
  DRAFT: "secondary",
  ISSUED: "warning",
  PAID: "success",
  VOID: "secondary",
} as const;

const CURRENCY_SYMBOL: Record<string, string> = { ILS: "₪", USD: "$", EUR: "€" };

function fmtMoney(value: number | string, currency: string) {
  const sym = CURRENCY_SYMBOL[currency] || currency + " ";
  return `${sym}${Number(value).toLocaleString()}`;
}

function totalsText(items: { currency: string; amount: string | number }[]) {
  if (!items.length) return "—";
  return items.map((i) => fmtMoney(i.amount, i.currency)).join(" + ");
}

export default function InvoicesPage() {
  const ta = useTranslations("adminUI");
  const tc = useTranslations("common");
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState<string>("");

  const fetchInvoices = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (clientFilter) params.append("clientId", clientFilter);
      if (monthFilter) params.append("month", monthFilter);

      const res = await fetch(`/api/admin/invoices?${params}`);
      if (!res.ok) throw new Error("Failed to fetch invoices");
      const data = await res.json();
      setInvoices(data.invoices);
      setTotals(data.totals);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, clientFilter, monthFilter]);

  useEffect(() => {
    fetch("/api/users?role=CLIENT")
      .then((r) => (r.ok ? r.json() : []))
      .then(setClients)
      .catch(() => {});
  }, []);

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{ta("invoices")}</h1>
          <p className="text-white/60">{ta("manageInvoices")}</p>
        </div>
      </motion.div>

      {/* Totals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
      >
        <Card>
          <CardContent className="p-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
              {ta("outstandingAmount")}
            </p>
            <p className="text-white text-xl font-bold">
              {totals ? totalsText(totals.outstanding) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
              {ta("paidThisMonth")}
            </p>
            <p className="text-green-500 text-xl font-bold">
              {totals ? totalsText(totals.paidThisMonth) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card className={totals && totals.overdueCount > 0 ? "border-red-600/50" : ""}>
          <CardContent className="p-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
              {ta("overdueInvoices")}
            </p>
            <p
              className={`text-xl font-bold ${
                totals && totals.overdueCount > 0 ? "text-red-500" : "text-white"
              }`}
            >
              {totals ? totals.overdueCount : "—"}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-4 mb-6"
      >
        <div className="flex gap-2 flex-wrap">
          {Object.keys(statusColors).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "secondary"}
              size="sm"
              onClick={() =>
                setStatusFilter(statusFilter === status ? null : status)
              }
            >
              {ta(`invoiceStatus_${status}`)}
            </Button>
          ))}
        </div>
        <div className="w-48">
          <Select
            value={clientFilter || "all"}
            onValueChange={(v) => setClientFilter(v === "all" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={tc("client")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ta("allClients")}</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name || c.email || c.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="w-44"
        />
        {(statusFilter || clientFilter || monthFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter(null);
              setClientFilter("");
              setMonthFilter("");
            }}
          >
            {ta("clearFilters")}
          </Button>
        )}
      </motion.div>

      {/* Invoice table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-white/40" size={24} />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12">
                <Receipt size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/40">{tc("noResults")}</p>
              </div>
            ) : (
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-white/60 font-medium">
                      {ta("invoiceNumber")}
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      {tc("project")}
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      {tc("client")}
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      {tc("status")}
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      {ta("issueDate")}
                    </th>
                    <th className="text-left p-4 text-white/60 font-medium">
                      {ta("dueDate")}
                    </th>
                    <th className="text-right p-4 text-white/60 font-medium">
                      {ta("invoiceTotal")}
                    </th>
                    <th className="w-14"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className={`border-b border-white/5 hover:bg-white/5 ${
                        inv.isOverdue ? "bg-red-950/20" : ""
                      }`}
                    >
                      <td className="p-4">
                        <p className="text-white font-medium">{inv.number}</p>
                        {inv.milestone && (
                          <p className="text-white/40 text-xs truncate max-w-[180px]">
                            {inv.milestone.title}
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-white/80 text-sm max-w-[200px] truncate">
                        {inv.project.title}
                      </td>
                      <td className="p-4 text-white/60 text-sm">
                        {inv.project.client?.name ||
                          inv.project.clientName ||
                          "—"}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              statusColors[
                                inv.status as keyof typeof statusColors
                              ] || "secondary"
                            }
                          >
                            {ta(`invoiceStatus_${inv.status}`)}
                          </Badge>
                          {inv.isOverdue && (
                            <span className="flex items-center gap-1 text-red-500 text-xs font-semibold">
                              <AlertCircle size={12} />
                              {ta("overdue")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-white/60 text-sm">
                        {format(new Date(inv.issueDate), "MMM d, yyyy")}
                      </td>
                      <td className="p-4 text-sm">
                        {inv.dueDate ? (
                          <span
                            className={
                              inv.isOverdue ? "text-red-500" : "text-white/60"
                            }
                          >
                            {format(new Date(inv.dueDate), "MMM d, yyyy")}
                          </span>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                      <td className="p-4 text-right text-white font-medium">
                        {fmtMoney(inv.total, inv.currency)}
                      </td>
                      <td className="p-4">
                        <a
                          href={`/api/invoices/${inv.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/40 hover:text-white inline-flex p-1"
                          title={ta("downloadPdf")}
                        >
                          <Download size={16} />
                        </a>
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
