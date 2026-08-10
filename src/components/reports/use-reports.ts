"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReportRange } from "@/lib/reports";
import type { PlanClientRef } from "@/components/plan/types";
import type { ReportPayload, ReportState, ReportsResponse } from "./types";

/** The only module that knows the reports endpoint URL. */

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export interface UseReportsArgs {
  year: number;
  month: number;
  range: ReportRange;
  clientId?: string | null;
  enabled?: boolean;
}

export interface UseReportsResult {
  report: ReportPayload | null;
  state: ReportState;
  client: PlanClientRef | null;
  clients: PlanClientRef[];
  resolvedClientId: string | null;
  generatedAt: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useReports({
  year,
  month,
  range,
  clientId,
  enabled = true,
}: UseReportsArgs): UseReportsResult {
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [state, setState] = useState<ReportState>("EMPTY");
  const [client, setClient] = useState<PlanClientRef | null>(null);
  const [clients, setClients] = useState<PlanClientRef[]>([]);
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Three controls race here — range pills, month nav and the client switcher.
  const requestSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const seq = ++requestSeq.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const qs = new URLSearchParams({
        month: String(month),
        year: String(year),
        range: String(range),
      });
      if (clientId) qs.set("clientId", clientId);

      const res = await fetch(`/api/portal/reports?${qs}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(await readError(res, "Failed to load report"));
      const data: ReportsResponse = await res.json();
      if (seq !== requestSeq.current) return;

      setReport(data.report);
      setState(data.state);
      setClient(data.client);
      setClients(data.clients ?? []);
      setResolvedClientId(data.clientId);
      setGeneratedAt(data.generatedAt);
      setError(null);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      if (seq !== requestSeq.current) return;
      setError((e as Error).message);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [enabled, year, month, range, clientId]);

  useEffect(() => {
    void fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  return {
    report,
    state,
    client,
    clients,
    resolvedClientId,
    generatedAt,
    loading,
    error,
    refetch: fetchData,
  };
}
