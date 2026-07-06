"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Target,
  Search,
  Loader2,
  Plus,
  LayoutGrid,
  List,
  Trash2,
  Pencil,
  ArrowRightCircle,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

interface Lead {
  id: string;
  clientName: string;
  company: string | null;
  email: string;
  phone: string | null;
  source: string;
  interestedIn: string | null;
  stage: string;
  expectedValue: string | null;
  currency: string;
  nextFollowUpAt: string | null;
  notes: string | null;
  lostReason: string | null;
  convertedProject: { id: string; title: string; slug: string } | null;
  createdAt: string;
  updatedAt: string;
}

const STAGES = ["NEW", "CONTACTED", "PROPOSAL_SENT", "NEGOTIATING", "WON", "LOST"] as const;
const OPEN_STAGES = ["NEW", "CONTACTED", "PROPOSAL_SENT", "NEGOTIATING"];
const SOURCES = ["WEBSITE", "INSTAGRAM", "REFERRAL", "WHATSAPP", "OTHER"] as const;

const stageAccent: Record<string, string> = {
  NEW: "border-t-blue-500",
  CONTACTED: "border-t-cyan-500",
  PROPOSAL_SENT: "border-t-yellow-500",
  NEGOTIATING: "border-t-orange-500",
  WON: "border-t-green-500",
  LOST: "border-t-red-600",
};

const CURRENCY_SYMBOL: Record<string, string> = { ILS: "₪", USD: "$", EUR: "€" };

function fmtMoney(value: number, currency: string) {
  const sym = CURRENCY_SYMBOL[currency] || currency + " ";
  return `${sym}${value.toLocaleString()}`;
}

function isOverdue(lead: Lead) {
  return (
    lead.nextFollowUpAt &&
    OPEN_STAGES.includes(lead.stage) &&
    new Date(lead.nextFollowUpAt) < new Date()
  );
}

interface LeadFormState {
  clientName: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  interestedIn: string;
  stage: string;
  expectedValue: string;
  currency: string;
  nextFollowUpAt: string;
  notes: string;
  lostReason: string;
}

const emptyForm: LeadFormState = {
  clientName: "",
  company: "",
  email: "",
  phone: "",
  source: "OTHER",
  interestedIn: "",
  stage: "NEW",
  expectedValue: "",
  currency: "ILS",
  nextFollowUpAt: "",
  notes: "",
  lostReason: "",
};

export default function LeadsPage() {
  const ta = useTranslations("adminUI");
  const tc = useTranslations("common");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"board" | "table">("board");
  const [editing, setEditing] = useState<Lead | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<LeadFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropStage, setDropStage] = useState<string | null>(null);
  const [lostLead, setLostLead] = useState<Lead | null>(null);
  const [lostReasonInput, setLostReasonInput] = useState("");

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const res = await fetch(`/api/admin/leads?${params}`);
      if (!res.ok) throw new Error("Failed to fetch leads");
      setLeads(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // ---- Summary metrics ----
  const summary = useMemo(() => {
    const open = leads.filter((l) => OPEN_STAGES.includes(l.stage));
    const byCurrency: Record<string, number> = {};
    for (const l of open) {
      if (l.expectedValue) {
        byCurrency[l.currency] =
          (byCurrency[l.currency] || 0) + Number(l.expectedValue);
      }
    }
    const won = leads.filter((l) => l.stage === "WON").length;
    const lost = leads.filter((l) => l.stage === "LOST").length;
    const conversion = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null;
    const overdue = leads.filter(isOverdue).length;
    const counts: Record<string, number> = {};
    for (const s of STAGES) counts[s] = leads.filter((l) => l.stage === s).length;
    return { byCurrency, conversion, overdue, counts };
  }, [leads]);

  // ---- Mutations ----
  const applyStageChange = async (
    lead: Lead,
    stage: string,
    lostReason?: string
  ) => {
    // optimistic update
    setLeads((prev) =>
      prev.map((l) =>
        l.id === lead.id
          ? { ...l, stage, lostReason: lostReason ?? l.lostReason }
          : l
      )
    );
    const res = await fetch(`/api/admin/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage,
        ...(lostReason !== undefined ? { lostReason } : {}),
      }),
    });
    if (!res.ok) fetchLeads();
  };

  const changeStage = (lead: Lead, stage: string) => {
    if (lead.stage === stage) return;
    if (stage === "LOST") {
      // ask for the reason in a proper dialog instead of window.prompt
      setLostReasonInput(lead.lostReason || "");
      setLostLead(lead);
      return;
    }
    applyStageChange(lead, stage);
  };

  const convertLead = async (lead: Lead) => {
    if (!confirm(ta("leadConvertConfirm"))) return;
    const res = await fetch(`/api/admin/leads/${lead.id}/convert`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || ta("errorOccurred"));
    }
    fetchLeads();
  };

  const deleteLead = async (lead: Lead) => {
    if (!confirm(ta("deleteConfirm"))) return;
    const res = await fetch(`/api/admin/leads/${lead.id}`, { method: "DELETE" });
    if (!res.ok) alert(ta("errorOccurred"));
    fetchLeads();
  };

  const openCreate = () => {
    setForm(emptyForm);
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (lead: Lead) => {
    setForm({
      clientName: lead.clientName,
      company: lead.company || "",
      email: lead.email,
      phone: lead.phone || "",
      source: lead.source,
      interestedIn: lead.interestedIn || "",
      stage: lead.stage,
      expectedValue: lead.expectedValue ? String(lead.expectedValue) : "",
      currency: lead.currency,
      nextFollowUpAt: lead.nextFollowUpAt
        ? format(new Date(lead.nextFollowUpAt), "yyyy-MM-dd")
        : "",
      notes: lead.notes || "",
      lostReason: lead.lostReason || "",
    });
    setEditing(lead);
    setCreating(false);
  };

  const saveForm = async () => {
    if (!form.clientName || !form.email) {
      alert(ta("leadRequiredFields"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        company: form.company || null,
        phone: form.phone || null,
        interestedIn: form.interestedIn || null,
        expectedValue: form.expectedValue || null,
        nextFollowUpAt: form.nextFollowUpAt || null,
        notes: form.notes || null,
        lostReason: form.lostReason || null,
      };
      const res = editing
        ? await fetch(`/api/admin/leads/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save lead");
      }
      setCreating(false);
      setEditing(null);
      fetchLeads();
    } catch (err) {
      alert(err instanceof Error ? err.message : ta("errorOccurred"));
    } finally {
      setSaving(false);
    }
  };

  const stageLabel = (s: string) => ta(`leadStage_${s}`);
  const sourceLabel = (s: string) => ta(`leadSource_${s}`);

  const pipelineValueText =
    Object.entries(summary.byCurrency)
      .map(([cur, val]) => fmtMoney(val, cur))
      .join(" + ") || "—";

  // ---- Card ----
  const LeadCard = ({ lead }: { lead: Lead }) => (
    <div
      draggable
      onDragStart={(e) => {
        setDragId(lead.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={() => {
        setDragId(null);
        setDropStage(null);
      }}
      className={`rounded-lg border bg-neutral-900 p-3 cursor-grab active:cursor-grabbing space-y-2 ${
        isOverdue(lead) ? "border-red-600/60" : "border-white/10"
      } ${dragId === lead.id ? "opacity-40" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-white font-medium truncate">{lead.clientName}</p>
          {lead.company && (
            <p className="text-white/40 text-xs truncate">{lead.company}</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => openEdit(lead)}
            className="text-white/40 hover:text-white p-1"
            title={tc("edit")}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => deleteLead(lead)}
            className="text-white/40 hover:text-red-500 p-1"
            title={tc("delete")}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {lead.interestedIn && (
        <p className="text-white/60 text-xs line-clamp-2">{lead.interestedIn}</p>
      )}

      <div className="flex items-center justify-between text-xs">
        <Badge variant="secondary">{sourceLabel(lead.source)}</Badge>
        {lead.expectedValue && (
          <span className="text-white/80 font-medium">
            {fmtMoney(Number(lead.expectedValue), lead.currency)}
          </span>
        )}
      </div>

      {lead.nextFollowUpAt && OPEN_STAGES.includes(lead.stage) && (
        <div
          className={`flex items-center gap-1.5 text-xs ${
            isOverdue(lead) ? "text-red-500" : "text-white/40"
          }`}
        >
          <Clock size={12} />
          {format(new Date(lead.nextFollowUpAt), "MMM d, yyyy")}
          {isOverdue(lead) && <AlertCircle size={12} />}
        </div>
      )}

      {lead.stage === "LOST" && lead.lostReason && (
        <p className="text-red-500/70 text-xs line-clamp-1">{lead.lostReason}</p>
      )}
      {lead.convertedProject && (
        <p className="text-green-500/80 text-xs truncate">
          → {lead.convertedProject.title}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <select
          value={lead.stage}
          onChange={(e) => changeStage(lead, e.target.value)}
          className="flex-1 bg-neutral-800 border border-white/10 rounded px-2 py-1 text-xs text-white"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {stageLabel(s)}
            </option>
          ))}
        </select>
        {!lead.convertedProject && lead.stage !== "LOST" && (
          <button
            onClick={() => convertLead(lead)}
            className="text-green-500 hover:text-green-400 p-1"
            title={ta("leadConvert")}
          >
            <ArrowRightCircle size={16} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{ta("leads")}</h1>
          <p className="text-white/60">{ta("manageLeads")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} className="mr-2" />
          {ta("newLead")}
        </Button>
      </motion.div>

      {/* Summary bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
      >
        <Card>
          <CardContent className="p-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
              {ta("pipelineValue")}
            </p>
            <p className="text-white text-xl font-bold">{pipelineValueText}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
              {ta("openLeads")}
            </p>
            <p className="text-white text-xl font-bold">
              {OPEN_STAGES.reduce((n, s) => n + (summary.counts[s] || 0), 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
              {ta("conversionRate")}
            </p>
            <p className="text-white text-xl font-bold">
              {summary.conversion === null ? "—" : `${summary.conversion}%`}
            </p>
          </CardContent>
        </Card>
        <Card className={summary.overdue > 0 ? "border-red-600/50" : ""}>
          <CardContent className="p-4">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">
              {ta("overdueFollowUps")}
            </p>
            <p
              className={`text-xl font-bold ${
                summary.overdue > 0 ? "text-red-500" : "text-white"
              }`}
            >
              {summary.overdue}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Toolbar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-4 mb-6"
      >
        <div className="relative flex-1 max-w-md min-w-[220px]">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tc("search")}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === "board" ? "default" : "secondary"}
            size="sm"
            onClick={() => setView("board")}
          >
            <LayoutGrid size={16} className="mr-2" />
            {ta("boardView")}
          </Button>
          <Button
            variant={view === "table" ? "default" : "secondary"}
            size="sm"
            onClick={() => setView("table")}
          >
            <List size={16} className="mr-2" />
            {ta("tableView")}
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-white/40" size={24} />
        </div>
      ) : view === "board" ? (
        /* ---- Kanban board ---- */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start">
          {STAGES.map((stage) => (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                setDropStage(stage);
              }}
              onDragLeave={() => setDropStage((s) => (s === stage ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                const lead = leads.find((l) => l.id === dragId);
                if (lead) changeStage(lead, stage);
                setDragId(null);
                setDropStage(null);
              }}
              className={`rounded-lg border border-white/10 border-t-2 ${stageAccent[stage]} bg-neutral-950 min-h-[140px] ${
                dropStage === stage && dragId ? "bg-white/5" : ""
              }`}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                <span className="text-white/80 text-sm font-medium">
                  {stageLabel(stage)}
                </span>
                <Badge variant="secondary">{summary.counts[stage] || 0}</Badge>
              </div>
              <div className="p-2 space-y-2">
                {leads
                  .filter((l) => l.stage === stage)
                  .map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ---- Table view ---- */
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {leads.length === 0 ? (
              <div className="text-center py-12">
                <Target size={48} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/40">{tc("noResults")}</p>
              </div>
            ) : (
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-4 text-white/60 font-medium">{ta("leadClient")}</th>
                    <th className="text-left p-4 text-white/60 font-medium">{ta("leadInterestedIn")}</th>
                    <th className="text-left p-4 text-white/60 font-medium">{ta("leadSource")}</th>
                    <th className="text-left p-4 text-white/60 font-medium">{ta("leadStage")}</th>
                    <th className="text-left p-4 text-white/60 font-medium">{ta("leadValue")}</th>
                    <th className="text-left p-4 text-white/60 font-medium">{ta("leadFollowUp")}</th>
                    <th className="w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className={`border-b border-white/5 hover:bg-white/5 ${
                        isOverdue(lead) ? "bg-red-950/20" : ""
                      }`}
                    >
                      <td className="p-4">
                        <p className="text-white font-medium">{lead.clientName}</p>
                        <p className="text-white/40 text-sm">
                          {lead.company || lead.email}
                        </p>
                      </td>
                      <td className="p-4 text-white/60 text-sm max-w-[220px] truncate">
                        {lead.interestedIn || "—"}
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary">{sourceLabel(lead.source)}</Badge>
                      </td>
                      <td className="p-4">
                        <select
                          value={lead.stage}
                          onChange={(e) => changeStage(lead, e.target.value)}
                          className="bg-neutral-800 border border-white/10 rounded px-2 py-1 text-xs text-white"
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {stageLabel(s)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-4 text-white/80 text-sm">
                        {lead.expectedValue
                          ? fmtMoney(Number(lead.expectedValue), lead.currency)
                          : "—"}
                      </td>
                      <td className="p-4 text-sm">
                        {lead.nextFollowUpAt ? (
                          <span className={isOverdue(lead) ? "text-red-500" : "text-white/60"}>
                            {format(new Date(lead.nextFollowUpAt), "MMM d, yyyy")}
                          </span>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 justify-end">
                          {!lead.convertedProject && lead.stage !== "LOST" && (
                            <button
                              onClick={() => convertLead(lead)}
                              className="text-green-500 hover:text-green-400 p-1"
                              title={ta("leadConvert")}
                            >
                              <ArrowRightCircle size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(lead)}
                            className="text-white/40 hover:text-white p-1"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => deleteLead(lead)}
                            className="text-white/40 hover:text-red-500 p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create / Edit modal */}
      <Dialog
        open={creating || !!editing}
        onOpenChange={() => {
          setCreating(false);
          setEditing(null);
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? ta("editLead") : ta("newLead")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/60 text-sm mb-1 block">
                  {ta("leadClientName")} *
                </label>
                <Input
                  value={form.clientName}
                  onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-white/60 text-sm mb-1 block">
                  {ta("leadCompany")}
                </label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/60 text-sm mb-1 block">Email *</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-white/60 text-sm mb-1 block">
                  {ta("leadPhone")}
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/60 text-sm mb-1 block">
                  {ta("leadSource")}
                </label>
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  className="w-full bg-neutral-800 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {sourceLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-white/60 text-sm mb-1 block">
                  {ta("leadStage")}
                </label>
                <select
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value })}
                  className="w-full bg-neutral-800 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {stageLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1 block">
                {ta("leadInterestedIn")}
              </label>
              <Input
                value={form.interestedIn}
                onChange={(e) => setForm({ ...form, interestedIn: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className="text-white/60 text-sm mb-1 block">
                  {ta("leadValue")}
                </label>
                <Input
                  type="number"
                  min="0"
                  value={form.expectedValue}
                  onChange={(e) => setForm({ ...form, expectedValue: e.target.value })}
                />
              </div>
              <div className="col-span-1">
                <label className="text-white/60 text-sm mb-1 block">
                  {ta("leadCurrency")}
                </label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full bg-neutral-800 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
                >
                  <option value="ILS">ILS (₪)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div className="col-span-1">
                <label className="text-white/60 text-sm mb-1 block">
                  {ta("leadFollowUp")}
                </label>
                <Input
                  type="date"
                  value={form.nextFollowUpAt}
                  onChange={(e) => setForm({ ...form, nextFollowUpAt: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-white/60 text-sm mb-1 block">
                {ta("leadNotes")}
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full bg-neutral-800 border border-white/10 rounded-md px-3 py-2 text-sm text-white resize-y"
              />
            </div>
            {form.stage === "LOST" && (
              <div>
                <label className="text-white/60 text-sm mb-1 block">
                  {ta("leadLostReason")}
                </label>
                <Input
                  value={form.lostReason}
                  onChange={(e) => setForm({ ...form, lostReason: e.target.value })}
                />
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setCreating(false);
                  setEditing(null);
                }}
              >
                {tc("cancel")}
              </Button>
              <Button onClick={saveForm} disabled={saving}>
                {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
                {tc("save")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lost reason dialog */}
      <Dialog open={!!lostLead} onOpenChange={() => setLostLead(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle size={18} className="text-red-500" />
              {ta("leadMarkLost")}
            </DialogTitle>
          </DialogHeader>
          {lostLead && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center text-red-500 font-medium shrink-0">
                  {lostLead.clientName[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">
                    {lostLead.clientName}
                  </p>
                  {(lostLead.company || lostLead.interestedIn) && (
                    <p className="text-white/40 text-sm truncate">
                      {lostLead.company || lostLead.interestedIn}
                    </p>
                  )}
                </div>
                {lostLead.expectedValue && (
                  <span className="ms-auto text-white/60 text-sm shrink-0">
                    {fmtMoney(Number(lostLead.expectedValue), lostLead.currency)}
                  </span>
                )}
              </div>
              <div>
                <label className="text-white/60 text-sm mb-1 block">
                  {ta("leadLostReasonPrompt")}
                </label>
                <textarea
                  value={lostReasonInput}
                  onChange={(e) => setLostReasonInput(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder={ta("leadLostReason")}
                  className="w-full bg-neutral-800 border border-white/10 rounded-md px-3 py-2 text-sm text-white resize-y"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="secondary" onClick={() => setLostLead(null)}>
                  {tc("cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    applyStageChange(lostLead, "LOST", lostReasonInput.trim());
                    setLostLead(null);
                  }}
                >
                  {ta("leadMarkLost")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
