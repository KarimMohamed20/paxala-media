"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PLAN_ITEM_STATUSES } from "@/components/plan/plan-meta";
import { savePlanSection } from "@/components/plan/use-monthly-plan";
import type { MonthlyPlan, PlanItemStatus } from "@/components/plan/types";
import { RepeatableList } from "./repeatable-list";
import { PlanSectionShell, planField, planLabel } from "./plan-section-shell";

interface WeekItemDraft {
  id: string | null;
  title: string;
  status: PlanItemStatus;
}

interface WeekDraft {
  id: string | null;
  title: string;
  items: WeekItemDraft[];
}

export function PlanTimelineTab({
  plan,
  onSaved,
}: {
  plan: MonthlyPlan;
  onSaved: (plan: MonthlyPlan) => void;
}) {
  const t = useTranslations("plan");

  const [weeks, setWeeks] = useState<WeekDraft[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setWeeks(
      plan.weeks.map((w) => ({
        id: w.id,
        title: w.title,
        items: w.items.map((i) => ({
          id: i.id,
          title: i.title,
          status: i.status,
        })),
      }))
    );
    setDirty(false);
    // Re-seed only on a new plan or a fresh save (id + updatedAt), never on the
    // array identities: those change on every fetch and would wipe edits in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id, plan.updatedAt]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      onSaved(await savePlanSection(plan.id, "weeks", weeks));
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PlanSectionShell
      title={t("admin.weeks.title")}
      dirty={dirty}
      saving={saving}
      error={error}
      onSave={save}
    >
      <RepeatableList<WeekDraft>
        items={weeks}
        onChange={(next) => {
          setWeeks(next);
          setDirty(true);
        }}
        newItem={() => ({ id: null, title: "", items: [] })}
        rowKey={(it, i) => it.id ?? `new-${i}`}
        addLabel={t("admin.weeks.add")}
        emptyLabel={t("admin.weeks.empty")}
        maxItems={6}
        renderRow={(week, index, set) => (
          <div className="space-y-3">
            <div>
              <label className={planLabel} htmlFor={`w-title-${index}`}>
                {t("admin.weeks.weekLabel", { number: index + 1 })}
              </label>
              <input
                id={`w-title-${index}`}
                value={week.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={t("admin.weeks.weekTitle")}
                className={planField}
              />
            </div>

            {/* RepeatableList nests inside itself: it is fully controlled, so the
                inner list just edits this week's `items` array. */}
            <RepeatableList<WeekItemDraft>
              items={week.items}
              onChange={(nextItems) => set("items", nextItems)}
              newItem={() => ({ id: null, title: "", status: "SCHEDULED" })}
              rowKey={(it, i) => it.id ?? `new-${i}`}
              addLabel={t("admin.weeks.addItem")}
              emptyLabel={t("admin.weeks.noItems")}
              maxItems={12}
              renderRow={(item, j, setItem) => (
                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input
                    value={item.title}
                    onChange={(e) => setItem("title", e.target.value)}
                    placeholder={t("admin.weeks.itemLabel")}
                    aria-label={t("admin.weeks.itemLabel")}
                    className={planField}
                  />
                  <select
                    value={item.status}
                    onChange={(e) =>
                      setItem("status", e.target.value as PlanItemStatus)
                    }
                    aria-label={t("itemStatus.ALL")}
                    id={`wi-status-${index}-${j}`}
                    className={planField}
                  >
                    {PLAN_ITEM_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(`itemStatus.${s}`)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            />
          </div>
        )}
      />
    </PlanSectionShell>
  );
}
