import type { ContentFormat } from "@/components/content/types";

/** Shared domain types for the Monthly Plan. Mirrors the API's serialized shape. */

export type PlanItemStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "AWAITING_CLIENT"
  | "COMPLETED";

export type PlanChangeRequestStatus = "OPEN" | "RESOLVED" | "DECLINED";

export interface PlanClientRef {
  id: string;
  name: string | null;
  username?: string | null;
  image?: string | null;
}

export interface PlanProjectRef {
  id: string;
  title: string;
  slug: string;
}

export interface PlanPackageRef {
  id: string;
  name: string;
  tier: string;
}

export interface PlanDeliverable {
  id: string;
  label: string;
  icon: string | null;
  target: number;
  /** Auto-counted from the month's content when `formats` is non-empty. */
  done: number;
  percent: number;
  auto: boolean;
  formats: ContentFormat[];
  order: number;
}

export interface PlanKeyDate {
  id: string;
  title: string;
  date: string;
  note: string | null;
  order: number;
}

export interface PlanWeekItem {
  id: string;
  title: string;
  status: PlanItemStatus;
  order: number;
}

export interface PlanWeek {
  id: string;
  title: string;
  order: number;
  startsOn: string | null;
  endsOn: string | null;
  items: PlanWeekItem[];
}

export interface PlanAction {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  status: PlanItemStatus;
  order: number;
  contentItemId: string | null;
  completedAt: string | null;
  contentItem?: { id: string; title: string; status: string } | null;
}

export interface PlanTeamMember {
  id: string;
  roleLabel: string | null;
  order: number;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    jobTitle: string | null;
  };
}

export interface PlanProgress {
  percent: number;
  timeline: {
    completed: number;
    inFlight: number;
    total: number;
    score: number;
    percent: number;
  };
  deliverables: { done: number; target: number; percent: number };
}

export interface MonthlyPlan {
  id: string;
  title: string;
  subtitle: string | null;
  month: number;
  year: number;
  objective: string | null;
  tags: string[];
  package: PlanPackageRef | null;
  packageId: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  /** contentUpdatedAt ?? updatedAt — the client-visible timestamp. */
  updatedAt: string;
  client: PlanClientRef;
  project: PlanProjectRef | null;
  progress: PlanProgress;
  deliverables: PlanDeliverable[];
  keyDates: PlanKeyDate[];
  weeks: PlanWeek[];
  actions: PlanAction[];
  team: PlanTeamMember[];
}

export type MonthlyPlanState = "READY" | "EMPTY" | "UNPUBLISHED";

export interface MonthlyPlanResponse {
  month: number;
  year: number;
  clientId: string | null;
  clients: PlanClientRef[];
  canEdit: boolean;
  plan: MonthlyPlan | null;
  state: MonthlyPlanState;
}

/** Admin list row. */
export interface MonthlyPlanSummary {
  id: string;
  title: string;
  subtitle: string | null;
  month: number;
  year: number;
  isPublished: boolean;
  package: PlanPackageRef | null;
  client: PlanClientRef;
  updatedAt: string;
  progressPercent: number;
  contentItemCount: number;
  openChangeRequests: number;
}

export interface PlanChangeRequest {
  id: string;
  message: string;
  status: PlanChangeRequestStatus;
  requesterName: string | null;
  requesterRole: string;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
}
