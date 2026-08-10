"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  MonthlyPlan,
  MonthlyPlanResponse,
  MonthlyPlanState,
  PlanClientRef,
} from "./types";

/** The only module that knows the Monthly Plan endpoint URLs. */

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export interface UseMonthlyPlanArgs {
  year: number;
  month: number;
  clientId?: string | null;
  enabled?: boolean;
}

export interface UseMonthlyPlanResult {
  plan: MonthlyPlan | null;
  state: MonthlyPlanState;
  clients: PlanClientRef[];
  resolvedClientId: string | null;
  canEdit: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  /** Optimistic local patch, e.g. after ticking an action off. */
  setPlan: (updater: (prev: MonthlyPlan | null) => MonthlyPlan | null) => void;
}

export function useMonthlyPlan({
  year,
  month,
  clientId,
  enabled = true,
}: UseMonthlyPlanArgs): UseMonthlyPlanResult {
  const [plan, setPlanState] = useState<MonthlyPlan | null>(null);
  const [state, setState] = useState<MonthlyPlanState>("EMPTY");
  const [clients, setClients] = useState<PlanClientRef[]>([]);
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Month navigation is exactly the race this guards: a slow earlier request
  // must not overwrite a newer month's data.
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
      const qs = new URLSearchParams({ month: String(month), year: String(year) });
      if (clientId) qs.set("clientId", clientId);

      const res = await fetch(`/api/portal/monthly-plan?${qs}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(await readError(res, "Failed to load plan"));
      const data: MonthlyPlanResponse = await res.json();
      if (seq !== requestSeq.current) return;

      setPlanState(data.plan);
      setState(data.state);
      setClients(data.clients ?? []);
      setResolvedClientId(data.clientId ?? null);
      setCanEdit(!!data.canEdit);
      setError(null);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      if (seq !== requestSeq.current) return;
      setError((e as Error).message);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [enabled, month, year, clientId]);

  useEffect(() => {
    void fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  return {
    plan,
    state,
    clients,
    resolvedClientId,
    canEdit,
    loading,
    error,
    refetch: fetchData,
    setPlan: setPlanState,
  };
}

// ---------------------------------------------------------------------------
// Client mutations
// ---------------------------------------------------------------------------

export async function submitChangeRequest(input: {
  month: number;
  year: number;
  message: string;
  clientId?: string | null;
}): Promise<{ id: string }> {
  const res = await fetch("/api/portal/monthly-plan/request-change", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to send request"));
  return res.json();
}

export async function setActionDone(id: string, done: boolean) {
  const res = await fetch(`/api/portal/monthly-plan/actions/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done }),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to update action"));
  return res.json();
}

// ---------------------------------------------------------------------------
// Admin mutations
// ---------------------------------------------------------------------------

export type PlanSection =
  | "deliverables"
  | "key-dates"
  | "weeks"
  | "actions"
  | "team";

export async function createMonthlyPlan(input: {
  clientId: string;
  month: number;
  year: number;
  title?: string;
  subtitle?: string;
}) {
  const res = await fetch("/api/admin/monthly-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to create plan"));
  return res.json();
}

export async function updateMonthlyPlan(
  id: string,
  patch: Record<string, unknown>
): Promise<MonthlyPlan> {
  const res = await fetch(`/api/admin/monthly-plan/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to save plan"));
  return res.json();
}

/** Full ordered-array replace — the array index becomes each row's `order`. */
export async function savePlanSection<T>(
  id: string,
  section: PlanSection,
  items: T[]
): Promise<MonthlyPlan> {
  const res = await fetch(`/api/admin/monthly-plan/${id}/${section}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to save section"));
  return res.json();
}

export async function togglePlanPublished(id: string, isPublished: boolean) {
  const res = await fetch(`/api/admin/monthly-plan/${id}/publish`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isPublished }),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to update plan"));
  return res.json();
}

/** Clears the plan layer. Scheduled content for the month is preserved. */
export async function clearMonthlyPlan(id: string): Promise<void> {
  const res = await fetch(`/api/admin/monthly-plan/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await readError(res, "Failed to clear plan"));
}
