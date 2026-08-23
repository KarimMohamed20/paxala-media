"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Clock, Loader2, Sparkles, UserCheck } from "lucide-react";
import { formatDateLocalized } from "@/lib/format";
import { ContentStatusPill } from "@/components/content/content-status-pill";
import type { ContentClientRef, ContentItem } from "@/components/content/types";

interface PlaygroundApprovalRef {
  id: string;
  roomId: string;
  title: string;
  createdAt: string;
  dueAt: string | null;
  requestedByName: string | null;
  room: { title: string };
}

interface ClientApprovalsResponse {
  items: ContentItem[];
  playgroundApprovals: PlaygroundApprovalRef[];
  counts: {
    awaitingApproval: number;
    changesRequested: number;
    approved: number;
  };
  clients: ContentClientRef[];
  clientId: string | null;
}

const DATE_OPTS = { month: "short", day: "numeric" } as const;

/**
 * The agency's answer to "what is stuck waiting on a client?" — the same data
 * the client sees in their portal inbox, viewed from the other side. Read-only:
 * responding is the client's move; nudging them is the follow-up.
 */
export default function ClientApprovalsPage() {
  const ta = useTranslations("adminUI");
  const t = useTranslations("content");
  const tNav = useTranslations("admin");
  const locale = useLocale();

  const [data, setData] = useState<ClientApprovalsResponse | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ status: "AWAITING_APPROVAL" });
      if (clientFilter) qs.set("clientId", clientFilter);
      const res = await fetch(`/api/portal/approvals?${qs}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load client approvals");
      }
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [clientFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const awaiting =
    data?.items.filter((i) => i.status === "AWAITING_APPROVAL") ?? [];
  const playground = data?.playgroundApprovals ?? [];

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            {ta("clientApprovalsTitle")}
          </h1>
          <p className="text-white/60">{ta("clientApprovalsSubtitle")}</p>
        </div>

        {(data?.clients.length ?? 0) > 0 && (
          <select
            value={data?.clientId ?? ""}
            onChange={(e) => setClientFilter(e.target.value)}
            aria-label={t("form.client")}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-red-500/50 focus:outline-none"
          >
            {data?.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.username ?? c.id}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <p className="mb-6 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-white/50">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : awaiting.length === 0 && playground.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] py-20 text-center">
          <UserCheck size={44} className="mx-auto mb-3 text-white/20" />
          <p className="text-sm text-white/50">{ta("clientApprovalsEmpty")}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {awaiting.length > 0 && (
            <section>
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/40">
                {t("status.AWAITING_APPROVAL")} ({awaiting.length})
              </h2>
              <div className="space-y-3">
                {awaiting.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-white/45">
                        <span>{t(`format.${item.format}`)}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} aria-hidden="true" />
                          {formatDateLocalized(
                            item.reviewDueAt ?? item.scheduledAt,
                            locale,
                            DATE_OPTS
                          )}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <ContentStatusPill status={item.status} />
                      <Link
                        href={`/portal/approvals?item=${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                      >
                        {ta("openInWorkspace")}
                        <ArrowRight
                          size={12}
                          aria-hidden="true"
                          className="rtl:rotate-180"
                        />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {playground.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-white/40">
                <Sparkles size={13} aria-hidden="true" />
                {tNav("playground")} ({playground.length})
              </h2>
              <div className="space-y-3">
                {playground.map((approval) => (
                  <div
                    key={approval.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{approval.title}</p>
                      <p className="mt-0.5 text-xs text-white/45">
                        {approval.room.title}
                        {approval.requestedByName
                          ? ` · ${approval.requestedByName}`
                          : ""}
                        {" · "}
                        {approval.dueAt
                          ? t("approvals.dueOn", {
                              date: formatDateLocalized(
                                approval.dueAt,
                                locale,
                                DATE_OPTS
                              ),
                            })
                          : formatDateLocalized(
                              approval.createdAt,
                              locale,
                              DATE_OPTS
                            )}
                      </p>
                    </div>
                    <Link
                      href={`/playground/${approval.roomId}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                    >
                      {ta("openInWorkspace")}
                      <ArrowRight
                        size={12}
                        aria-hidden="true"
                        className="rtl:rotate-180"
                      />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
