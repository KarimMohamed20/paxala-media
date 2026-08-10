import { Prisma, Role } from "@prisma/client";
import { clampString } from "@/lib/security";
import {
  PLAN_LIMITS,
  parseContentFormats,
  parseCount,
  parseDeliverableIcon,
  parsePlanItemStatus,
} from "@/lib/monthly-plan";
import { parseDate } from "@/lib/content-authz";

/**
 * Per-section save for the Monthly Plan admin editor.
 *
 * Every section is a **full ordered array replace**: the array index becomes
 * `order`, rows without an `id` are created, and rows absent from the payload
 * are deleted. This is the same contract `api/milestones/reorder` already
 * enforces, and it makes reorder a local array swap with no per-click request.
 */

export type PlanSection =
  | "deliverables"
  | "key-dates"
  | "weeks"
  | "actions"
  | "team";

export const PLAN_SECTIONS: PlanSection[] = [
  "deliverables",
  "key-dates",
  "weeks",
  "actions",
  "team",
];

export type SectionResult =
  | { ok: true }
  | { ok: false; status: 400 | 403; error: string };

/**
 * An empty `notIn: []` is ambiguous across Prisma versions, and here "no rows
 * kept" must unambiguously mean "delete everything".
 */
const pruneWhere = <T extends object>(base: T, kept: string[]) =>
  kept.length > 0 ? { ...base, id: { notIn: kept } } : base;

export async function saveSection(
  tx: Prisma.TransactionClient,
  planId: string,
  clientId: string,
  section: PlanSection,
  rawItems: unknown
): Promise<SectionResult> {
  if (!Array.isArray(rawItems)) {
    return { ok: false, status: 400, error: "`items` must be an array" };
  }

  switch (section) {
    // ---------------------------------------------------------------- deliverables
    case "deliverables": {
      const items = rawItems.slice(0, PLAN_LIMITS.DELIVERABLES);
      const kept: string[] = [];
      for (const [i, raw] of items.entries()) {
        const r = raw as Record<string, unknown>;
        const label = clampString(r.label, PLAN_LIMITS.LABEL);
        if (!label) {
          return { ok: false, status: 400, error: `Deliverable ${i + 1} needs a label` };
        }
        const data = {
          label,
          icon: parseDeliverableIcon(r.icon),
          target: parseCount(r.target) ?? 0,
          formats: parseContentFormats(r.formats),
          manualDone: parseCount(r.manualDone),
          order: i,
        };
        const row =
          typeof r.id === "string" && r.id
            ? await tx.planDeliverable.update({ where: { id: r.id }, data })
            : await tx.planDeliverable.create({ data: { planId, ...data } });
        kept.push(row.id);
      }
      await tx.planDeliverable.deleteMany({ where: pruneWhere({ planId }, kept) });
      return { ok: true };
    }

    // ------------------------------------------------------------------- key dates
    case "key-dates": {
      const items = rawItems.slice(0, PLAN_LIMITS.KEY_DATES);
      const kept: string[] = [];
      for (const [i, raw] of items.entries()) {
        const r = raw as Record<string, unknown>;
        const title = clampString(r.title, PLAN_LIMITS.LABEL);
        const date = parseDate(r.date);
        if (!title) {
          return { ok: false, status: 400, error: `Key date ${i + 1} needs a label` };
        }
        if (!date) {
          return { ok: false, status: 400, error: `Key date "${title}" needs a valid date` };
        }
        const data = {
          title,
          date,
          note: r.note ? clampString(r.note, PLAN_LIMITS.NOTE) : null,
          order: i,
        };
        const row =
          typeof r.id === "string" && r.id
            ? await tx.planKeyDate.update({ where: { id: r.id }, data })
            : await tx.planKeyDate.create({ data: { planId, ...data } });
        kept.push(row.id);
      }
      await tx.planKeyDate.deleteMany({ where: pruneWhere({ planId }, kept) });
      return { ok: true };
    }

    // ----------------------------------------------------------- weeks + their items
    case "weeks": {
      const weeks = rawItems.slice(0, PLAN_LIMITS.WEEKS);
      const keptWeeks: string[] = [];
      for (const [i, raw] of weeks.entries()) {
        const w = raw as Record<string, unknown>;
        const title = clampString(w.title, PLAN_LIMITS.LABEL);
        if (!title) {
          return { ok: false, status: 400, error: `Week ${i + 1} needs a title` };
        }
        const data = {
          title,
          startsOn: parseDate(w.startsOn) ?? null,
          endsOn: parseDate(w.endsOn) ?? null,
          order: i,
        };
        const week =
          typeof w.id === "string" && w.id
            ? await tx.planWeek.update({ where: { id: w.id }, data })
            : await tx.planWeek.create({ data: { planId, ...data } });
        keptWeeks.push(week.id);

        const rawWeekItems = Array.isArray(w.items) ? w.items : [];
        const weekItems = rawWeekItems.slice(0, PLAN_LIMITS.ITEMS_PER_WEEK);
        const keptItems: string[] = [];
        for (const [j, rawItem] of weekItems.entries()) {
          const it = rawItem as Record<string, unknown>;
          const itemTitle = clampString(it.title, PLAN_LIMITS.LABEL);
          if (!itemTitle) {
            return {
              ok: false,
              status: 400,
              error: `Week ${i + 1}, task ${j + 1} needs a title`,
            };
          }
          const itemData = {
            title: itemTitle,
            status: parsePlanItemStatus(it.status) ?? "SCHEDULED",
            order: j,
          };
          const row =
            typeof it.id === "string" && it.id
              ? await tx.planWeekItem.update({ where: { id: it.id }, data: itemData })
              : await tx.planWeekItem.create({
                  data: { weekId: week.id, ...itemData },
                });
          keptItems.push(row.id);
        }
        await tx.planWeekItem.deleteMany({
          where: pruneWhere({ weekId: week.id }, keptItems),
        });
      }
      await tx.planWeek.deleteMany({ where: pruneWhere({ planId }, keptWeeks) });
      return { ok: true };
    }

    // --------------------------------------------------------------------- actions
    case "actions": {
      const items = rawItems.slice(0, PLAN_LIMITS.ACTIONS);

      // Any linked content item must belong to this client, or an admin could
      // deep-link a client into another client's approval thread.
      const linkedIds = items
        .map((r) => (r as Record<string, unknown>).contentItemId)
        .filter((v): v is string => typeof v === "string" && !!v);
      if (linkedIds.length > 0) {
        const owned = await tx.contentItem.findMany({
          where: { id: { in: linkedIds }, plan: { clientId } },
          select: { id: true },
        });
        if (owned.length !== new Set(linkedIds).size) {
          return {
            ok: false,
            status: 403,
            error: "A linked content item does not belong to this client",
          };
        }
      }

      const kept: string[] = [];
      for (const [i, raw] of items.entries()) {
        const r = raw as Record<string, unknown>;
        const title = clampString(r.title, PLAN_LIMITS.LABEL);
        if (!title) {
          return { ok: false, status: 400, error: `Action ${i + 1} needs a title` };
        }
        const data = {
          title,
          description: r.description
            ? clampString(r.description, PLAN_LIMITS.OBJECTIVE)
            : null,
          dueAt: parseDate(r.dueAt) ?? null,
          status: parsePlanItemStatus(r.status) ?? "SCHEDULED",
          contentItemId:
            typeof r.contentItemId === "string" && r.contentItemId
              ? r.contentItemId
              : null,
          order: i,
        };
        const row =
          typeof r.id === "string" && r.id
            ? await tx.planAction.update({ where: { id: r.id }, data })
            : await tx.planAction.create({ data: { planId, ...data } });
        kept.push(row.id);
      }
      await tx.planAction.deleteMany({ where: pruneWhere({ planId }, kept) });
      return { ok: true };
    }

    // ------------------------------------------------------------------------ team
    case "team": {
      const items = rawItems.slice(0, PLAN_LIMITS.TEAM);
      const userIds = items
        .map((r) => (r as Record<string, unknown>).userId)
        .filter((v): v is string => typeof v === "string" && !!v);
      const unique = [...new Set(userIds)];

      if (unique.length !== userIds.length) {
        return { ok: false, status: 400, error: "A team member is listed twice" };
      }

      if (unique.length > 0) {
        // Agency-only: without this an admin could pin a client's own user
        // account onto the PMP Team strip.
        const staff = await tx.user.findMany({
          where: { id: { in: unique }, role: { in: [Role.ADMIN, Role.STAFF] } },
          select: { id: true },
        });
        if (staff.length !== unique.length) {
          return {
            ok: false,
            status: 403,
            error: "One or more team members are not agency users",
          };
        }
      }

      const kept: string[] = [];
      for (const [i, raw] of items.entries()) {
        const r = raw as Record<string, unknown>;
        if (typeof r.userId !== "string" || !r.userId) {
          return { ok: false, status: 400, error: `Team row ${i + 1} needs a user` };
        }
        const roleLabel = r.roleLabel
          ? clampString(r.roleLabel, PLAN_LIMITS.LABEL)
          : null;
        const row = await tx.planTeamMember.upsert({
          where: { planId_userId: { planId, userId: r.userId } },
          update: { roleLabel, order: i },
          create: { planId, userId: r.userId, roleLabel, order: i },
        });
        kept.push(row.id);
      }
      await tx.planTeamMember.deleteMany({ where: pruneWhere({ planId }, kept) });
      return { ok: true };
    }
  }
}
