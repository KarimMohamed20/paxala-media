import type { SerializedReport } from "@/lib/reports-queries";
import type { PlanClientRef } from "@/components/plan/types";

/**
 * The report payload, derived from the server builder so the two can never
 * drift. `SerializedReport` is the return type of `buildReport`.
 */
export type ReportPayload = SerializedReport;
export type ReportKpis = ReportPayload["kpis"];
export type ReportKpiKey = keyof ReportKpis;
export type ReportMonth = ReportPayload["month"];
export type ReportTrendRow = ReportPayload["trend"][number];

export type ReportState = "NO_CLIENT" | "EMPTY" | "READY";

export interface ReportsResponse {
  state: ReportState;
  clientId: string | null;
  client: PlanClientRef | null;
  /** Non-empty only for ADMIN/STAFF — this IS the role check. */
  clients: PlanClientRef[];
  canSwitchClient: boolean;
  generatedAt: string;
  report: ReportPayload | null;
}

/**
 * Whether a rise is good, bad, or neither. Declared per metric rather than
 * inferred — more assets delivered is volume, not quality, and a falling
 * turnaround is an improvement.
 */
export type MetricSentiment = "up-good" | "down-good" | "neutral";

export const KPI_SENTIMENT: Record<ReportKpiKey, MetricSentiment> = {
  delivered: "up-good",
  deliveryRate: "up-good",
  turnaroundDays: "down-good",
  firstPassRate: "up-good",
  onTimeRate: "up-good",
  assetsCount: "neutral",
};

export const KPI_ORDER: ReportKpiKey[] = [
  "delivered",
  "turnaroundDays",
  "firstPassRate",
  "assetsCount",
];
