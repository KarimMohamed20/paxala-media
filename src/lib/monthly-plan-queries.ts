import { Prisma } from "@prisma/client";
import {
  calculatePlanProgress,
  resolveDeliverables,
  resolvePackage,
  type FormatCount,
} from "@/lib/monthly-plan";

/**
 * Shared Prisma selection shapes for the Monthly Plan.
 *
 * These live here rather than in a route file because Next.js App Router route
 * modules may only export HTTP handlers and a fixed set of config keys — the
 * same reason `content-queries.ts` exists.
 */

export const planTeamSelect = {
  id: true,
  roleLabel: true,
  order: true,
  user: {
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      jobTitle: true,
    },
  },
} satisfies Prisma.PlanTeamMemberSelect;

export const planActionSelect = {
  id: true,
  title: true,
  description: true,
  dueAt: true,
  status: true,
  order: true,
  contentItemId: true,
  completedAt: true,
  contentItem: { select: { id: true, title: true, status: true } },
} satisfies Prisma.PlanActionSelect;

/** Everything the portal page and the print view need, in one round trip. */
export const monthlyPlanInclude = {
  client: { select: { id: true, name: true, username: true, image: true } },
  project: { select: { id: true, title: true, slug: true } },
  deliverables: { orderBy: { order: "asc" } },
  keyDates: { orderBy: [{ date: "asc" }, { order: "asc" }] },
  weeks: {
    orderBy: { order: "asc" },
    include: { items: { orderBy: { order: "asc" } } },
  },
  actions: { orderBy: [{ order: "asc" }, { dueAt: "asc" }], select: planActionSelect },
  teamMembers: { orderBy: { order: "asc" }, select: planTeamSelect },
} satisfies Prisma.ContentPlanInclude;

/** As above plus the change-request inbox and counts — agency console only. */
export const monthlyPlanAdminInclude = {
  ...monthlyPlanInclude,
  changeRequests: { orderBy: { createdAt: "desc" }, take: 20 },
  _count: { select: { items: true, changeRequests: true } },
} satisfies Prisma.ContentPlanInclude;

/** Compact shape for the admin list page. */
export const monthlyPlanSummaryInclude = {
  client: { select: { id: true, name: true, username: true, image: true } },
  deliverables: { select: { target: true, formats: true, manualDone: true } },
  weeks: { select: { items: { select: { status: true } } } },
  _count: { select: { items: true, changeRequests: true } },
} satisfies Prisma.ContentPlanInclude;

export type MonthlyPlanPayload = Prisma.ContentPlanGetPayload<{
  include: typeof monthlyPlanInclude;
}>;

/**
 * Turn a plan row plus the month's format counts into the API/UI shape:
 * resolves the package from constants, auto-counts deliverables, and computes
 * the progress ring. One place, so the portal page, the print view, the admin
 * list and the dashboard hero can never disagree about the percentage.
 */
export function serializeMonthlyPlan(
  plan: MonthlyPlanPayload,
  formatCounts: FormatCount[]
) {
  const deliverables = resolveDeliverables(
    plan.deliverables.map((d) => ({
      id: d.id,
      label: d.label,
      icon: d.icon,
      target: d.target,
      formats: d.formats,
      manualDone: d.manualDone,
      order: d.order,
    })),
    formatCounts
  );

  const progress = calculatePlanProgress({
    weeks: plan.weeks,
    deliverables,
  });

  return {
    id: plan.id,
    title: plan.title,
    subtitle: plan.subtitle,
    month: plan.month,
    year: plan.year,
    objective: plan.objective,
    tags: plan.tags,
    package: resolvePackage(plan.packageId),
    packageId: plan.packageId,
    isPublished: plan.isPublished,
    publishedAt: plan.publishedAt,
    // The client-visible timestamp. `updatedAt` moves whenever the calendar
    // upserts the row, so it would misreport "updated today".
    updatedAt: plan.contentUpdatedAt ?? plan.updatedAt,
    client: plan.client,
    project: plan.project,
    progress,
    deliverables,
    keyDates: plan.keyDates,
    weeks: plan.weeks,
    actions: plan.actions,
    team: plan.teamMembers,
  };
}

export type SerializedMonthlyPlan = ReturnType<typeof serializeMonthlyPlan>;
