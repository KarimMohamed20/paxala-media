"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ContentClientRef,
  ContentFormValues,
  ContentItem,
  ContentMetrics,
  ContentStatus,
  PlatformMixEntry,
  ReviewAction,
} from "./types";

/**
 * The single place that knows the content-calendar endpoint URLs and payloads.
 * Swapping a route only changes `buildUrl` below, not the three pages.
 */

const EMPTY_METRICS: ContentMetrics = {
  scheduled: 0,
  awaitingApproval: 0,
  drafts: 0,
  approved: 0,
  published: 0,
  rejected: 0,
};

export interface UseContentCalendarArgs {
  month?: number;
  year?: number;
  platform?: string;
  status?: string;
  format?: string;
  /** Admin cross-client mode. */
  clientId?: string | null;
  /** Project scope — with scope "project" this uses the per-project route. */
  projectId?: string | null;
  projectSlug?: string | null;
  scope?: "month" | "project";
  enabled?: boolean;
}

export interface UseContentCalendarResult {
  items: ContentItem[];
  metrics: ContentMetrics;
  platformMix: PlatformMixEntry[];
  needsApproval: ContentItem[];
  needsApprovalTotal: number;
  /** Non-empty only for ADMIN/STAFF — drives the client switcher. */
  clients: ContentClientRef[];
  /** Which client the response is actually scoped to. */
  resolvedClientId: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function buildUrl(args: UseContentCalendarArgs): string {
  if (args.scope === "project" && args.projectSlug) {
    const qs = new URLSearchParams();
    if (args.status && args.status !== "ALL") qs.set("status", args.status);
    const q = qs.toString();
    return `/api/portal/projects/${args.projectSlug}/content${q ? `?${q}` : ""}`;
  }

  const qs = new URLSearchParams();
  if (args.month) qs.set("month", String(args.month));
  if (args.year) qs.set("year", String(args.year));
  if (args.platform && args.platform !== "ALL") qs.set("platform", args.platform);
  if (args.status && args.status !== "ALL") qs.set("status", args.status);
  if (args.format && args.format !== "ALL") qs.set("format", args.format);
  // "ALL" is a real value to the calendar endpoint (the agency-wide view), not a
  // "no filter" sentinel — forward it instead of dropping it.
  if (args.clientId) qs.set("clientId", args.clientId);
  if (args.projectId) qs.set("projectId", args.projectId);
  return `/api/portal/content-calendar?${qs.toString()}`;
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return typeof body?.error === "string" ? body.error : fallback;
  } catch {
    return fallback;
  }
}

export function useContentCalendar(
  args: UseContentCalendarArgs
): UseContentCalendarResult {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [metrics, setMetrics] = useState<ContentMetrics>(EMPTY_METRICS);
  const [platformMix, setPlatformMix] = useState<PlatformMixEntry[]>([]);
  const [needsApproval, setNeedsApproval] = useState<ContentItem[]>([]);
  const [needsApprovalTotal, setNeedsApprovalTotal] = useState(0);
  const [clients, setClients] = useState<ContentClientRef[]>([]);
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    month,
    year,
    platform,
    status,
    format,
    clientId,
    projectId,
    projectSlug,
    scope,
    enabled = true,
  } = args;

  // Guards against a slow earlier request landing after a newer one — clicking
  // through months quickly used to leave the grid showing the wrong data.
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
      const res = await fetch(
        buildUrl({
          month,
          year,
          platform,
          status,
          format,
          clientId,
          projectId,
          projectSlug,
          scope,
        }),
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error(await readError(res, "Failed to load content"));
      const data = await res.json();
      if (seq !== requestSeq.current) return; // superseded

      setItems(data.items ?? []);
      setMetrics({ ...EMPTY_METRICS, ...(data.metrics ?? {}) });
      setPlatformMix(data.platformMix ?? []);
      setNeedsApproval(data.needsApproval ?? []);
      setNeedsApprovalTotal(
        data.needsApprovalTotal ?? (data.needsApproval?.length ?? 0)
      );
      setClients(data.clients ?? []);
      setResolvedClientId(data.clientId ?? null);
      setError(null);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      if (seq !== requestSeq.current) return;
      setError((e as Error).message);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [
    enabled,
    month,
    year,
    platform,
    status,
    format,
    clientId,
    projectId,
    projectSlug,
    scope,
  ]);

  useEffect(() => {
    void fetchData();
    return () => abortRef.current?.abort();
  }, [fetchData]);

  return {
    items,
    metrics,
    platformMix,
    needsApproval,
    needsApprovalTotal,
    clients,
    resolvedClientId,
    loading,
    error,
    refetch: fetchData,
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createContentItem(
  values: ContentFormValues
): Promise<ContentItem> {
  const res = await fetch("/api/portal/content-calendar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: values.title,
      caption: values.caption,
      platform: values.platform,
      format: values.format,
      status: values.status,
      scheduledAt: values.scheduledAt,
      projectId: values.projectId,
      fileIds: values.fileIds,
      ...(values.clientId && { clientId: values.clientId }),
    }),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to create content"));
  return res.json();
}

export async function updateContentItem(
  id: string,
  patch: Partial<ContentFormValues> & { status?: ContentStatus; clientNotes?: string }
): Promise<ContentItem> {
  const res = await fetch(`/api/portal/content-calendar/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to update content"));
  return res.json();
}

export async function submitReview(
  id: string,
  action: ReviewAction,
  notes: string
): Promise<ContentItem> {
  const res = await fetch(`/api/portal/content-calendar/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, notes }),
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to submit review"));
  return res.json();
}

export async function deleteContentItem(id: string): Promise<void> {
  const res = await fetch(`/api/portal/content-calendar/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await readError(res, "Failed to delete content"));
}

/** Assets + projects for the picker, scoped to a client (admin passes clientId). */
export async function fetchAssetLibrary(clientId?: string | null) {
  const qs = clientId && clientId !== "ALL" ? `?clientId=${clientId}` : "";
  const res = await fetch(`/api/portal/assets${qs}`);
  if (!res.ok) throw new Error(await readError(res, "Failed to load assets"));
  const data = await res.json();
  return {
    files: data.files ?? [],
    projects: data.projects ?? [],
  };
}
