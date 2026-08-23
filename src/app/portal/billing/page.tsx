"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import {
  CreditCard,
  Download,
  Folder,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyLocalized, formatDateLocalized } from "@/lib/format";

interface PortalInvoice {
  id: string;
  number: string;
  status: "ISSUED" | "PAID" | "VOID";
  issueDate: string;
  dueDate: string | null;
  currency: string;
  total: string;
  pdfUrl: string | null;
  project: { title: string; slug: string };
  milestone: { title: string } | null;
}

const statusColors = {
  ISSUED: "warning",
  PAID: "success",
  VOID: "secondary",
} as const;

const statusIcons = {
  ISSUED: AlertCircle,
  PAID: CheckCircle2,
  VOID: XCircle,
};

const DATE_OPTS = {
  year: "numeric",
  month: "short",
  day: "numeric",
} as const;

export default function BillingPage() {
  const t = useTranslations("portal");
  const tc = useTranslations("common");
  const tAdmin = useTranslations("adminUI");
  const locale = useLocale();
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const response = await fetch("/api/portal/invoices");
        if (!response.ok) throw new Error("Failed to fetch invoices");
        const data = await response.json();
        setInvoices(data.invoices ?? []);
      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchInvoices();
  }, []);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">{t("billing")}</h1>
        <p className="text-white/60">{t("billingSubtitle")}</p>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-white/50">
          <Loader2 className="animate-spin" size={20} />
          {tc("loading")}
        </div>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CreditCard size={48} className="text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-1">
              {t("nothingHere")}
            </h3>
            <p className="text-white/50 text-sm">{t("billingEmptyBody")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice, index) => {
            const StatusIcon = statusIcons[invoice.status] ?? AlertCircle;
            return (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className="text-white font-semibold">
                            {invoice.number}
                          </span>
                          <Badge
                            variant={statusColors[invoice.status] ?? "secondary"}
                          >
                            <StatusIcon size={12} className="me-1" />
                            {tAdmin(`invoiceStatus_${invoice.status}`)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60">
                          <Link
                            href={`/portal/projects/${invoice.project.slug}`}
                            className="flex items-center gap-1 hover:text-white transition-colors"
                          >
                            <Folder size={14} />
                            {invoice.project.title}
                          </Link>
                          {invoice.milestone && (
                            <span>{invoice.milestone.title}</span>
                          )}
                          <span>
                            {formatDateLocalized(
                              invoice.issueDate,
                              locale,
                              DATE_OPTS
                            )}
                          </span>
                          {invoice.dueDate && invoice.status === "ISSUED" && (
                            <span>
                              {t("dueDate")}:{" "}
                              {formatDateLocalized(
                                invoice.dueDate,
                                locale,
                                DATE_OPTS
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-lg font-semibold text-white whitespace-nowrap">
                          {formatCurrencyLocalized(
                            Number(invoice.total),
                            locale,
                            invoice.currency
                          )}
                        </span>
                        {invoice.pdfUrl && (
                          <a
                            href={`/api/invoices/${invoice.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3.5 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                          >
                            <Download size={15} />
                            PDF
                          </a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
