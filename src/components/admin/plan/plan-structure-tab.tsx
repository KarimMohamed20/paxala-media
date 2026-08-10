"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { DELIVERABLE_ICONS, getDeliverableIcon } from "@/components/plan/plan-meta";
import { CONTENT_FORMATS } from "@/components/content/content-meta";
import { savePlanSection } from "@/components/plan/use-monthly-plan";
import type { ContentFormat } from "@/components/content/types";
import type { MonthlyPlan } from "@/components/plan/types";
import { RepeatableList } from "./repeatable-list";
import { PlanSectionShell, planField, planLabel } from "./plan-section-shell";

interface DeliverableDraft {
  id: string | null;
  label: string;
  icon: string | null;
  target: number;
  manualDone: number | null;
  formats: ContentFormat[];
}

interface KeyDateDraft {
  id: string | null;
  title: string;
  date: string;
}

const iso = (v: string | Date) => new Date(v).toISOString().slice(0, 10);

export function PlanStructureTab({
  plan,
  onSaved,
}: {
  plan: MonthlyPlan;
  onSaved: (plan: MonthlyPlan) => void;
}) {
  const t = useTranslations("plan");

  const [deliverables, setDeliverables] = useState<DeliverableDraft[]>([]);
  const [keyDates, setKeyDates] = useState<KeyDateDraft[]>([]);
  const [dirtyD, setDirtyD] = useState(false);
  const [dirtyK, setDirtyK] = useState(false);
  const [savingD, setSavingD] = useState(false);
  const [savingK, setSavingK] = useState(false);
  const [errorD, setErrorD] = useState<string | null>(null);
  const [errorK, setErrorK] = useState<string | null>(null);

  useEffect(() => {
    setDeliverables(
      plan.deliverables.map((d) => ({
        id: d.id,
        label: d.label,
        icon: d.icon,
        target: d.target,
        // The API returns the resolved count; only the manual value is editable.
        manualDone: d.auto ? null : d.done,
        formats: d.formats,
      }))
    );
    setKeyDates(
      plan.keyDates.map((k) => ({ id: k.id, title: k.title, date: iso(k.date) }))
    );
    setDirtyD(false);
    setDirtyK(false);
    // Re-seed only on a new plan or a fresh save (id + updatedAt), never on the
    // array identities: those change on every fetch and would wipe edits in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id, plan.updatedAt]);

  const saveDeliverables = async () => {
    setSavingD(true);
    setErrorD(null);
    try {
      onSaved(await savePlanSection(plan.id, "deliverables", deliverables));
      setDirtyD(false);
    } catch (e) {
      setErrorD((e as Error).message);
    } finally {
      setSavingD(false);
    }
  };

  const saveKeyDates = async () => {
    setSavingK(true);
    setErrorK(null);
    try {
      onSaved(await savePlanSection(plan.id, "key-dates", keyDates));
      setDirtyK(false);
    } catch (e) {
      setErrorK((e as Error).message);
    } finally {
      setSavingK(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <PlanSectionShell
        title={t("admin.deliverables.title")}
        hint={t("admin.deliverables.formatsHint")}
        dirty={dirtyD}
        saving={savingD}
        error={errorD}
        onSave={saveDeliverables}
      >
        <RepeatableList<DeliverableDraft>
          items={deliverables}
          onChange={(next) => {
            setDeliverables(next);
            setDirtyD(true);
          }}
          newItem={() => ({
            id: null,
            label: "",
            icon: "Video",
            target: 1,
            manualDone: null,
            formats: [],
          })}
          rowKey={(it, i) => it.id ?? `new-${i}`}
          addLabel={t("admin.deliverables.add")}
          emptyLabel={t("admin.deliverables.empty")}
          maxItems={12}
          renderRow={(item, index, set) => (
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5">
                  {getDeliverableIcon(item.icon, 15)}
                </span>
                <input
                  value={item.label}
                  onChange={(e) => set("label", e.target.value)}
                  placeholder={t("admin.deliverables.label")}
                  className={planField}
                  aria-label={t("admin.deliverables.label")}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className={planLabel} htmlFor={`d-icon-${index}`}>
                    {t("admin.deliverables.icon")}
                  </label>
                  <select
                    id={`d-icon-${index}`}
                    value={item.icon ?? ""}
                    onChange={(e) => set("icon", e.target.value || null)}
                    className={planField}
                  >
                    {Object.keys(DELIVERABLE_ICONS).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={planLabel} htmlFor={`d-target-${index}`}>
                    {t("admin.deliverables.target")}
                  </label>
                  <input
                    id={`d-target-${index}`}
                    type="number"
                    min={0}
                    dir="ltr"
                    value={item.target}
                    onChange={(e) => set("target", Number(e.target.value))}
                    className={planField}
                  />
                </div>
                <div>
                  <label className={planLabel} htmlFor={`d-done-${index}`}>
                    {t("admin.deliverables.manualDone")}
                  </label>
                  <input
                    id={`d-done-${index}`}
                    type="number"
                    min={0}
                    dir="ltr"
                    // Disabled when formats drive the count — otherwise the admin
                    // would be typing a number the API ignores.
                    disabled={item.formats.length > 0}
                    value={item.manualDone ?? ""}
                    onChange={(e) =>
                      set(
                        "manualDone",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    className={`${planField} disabled:opacity-40`}
                  />
                </div>
              </div>

              <div>
                <span className={planLabel}>{t("admin.deliverables.formats")}</span>
                <div className="flex flex-wrap gap-1.5">
                  {CONTENT_FORMATS.map((f) => {
                    const on = item.formats.includes(f);
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() =>
                          set(
                            "formats",
                            on
                              ? item.formats.filter((x) => x !== f)
                              : [...item.formats, f]
                          )
                        }
                        aria-pressed={on}
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition ${
                          on
                            ? "border-red-500/40 bg-red-600/20 text-red-300"
                            : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                        }`}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        />
      </PlanSectionShell>

      <PlanSectionShell
        title={t("admin.keyDates.title")}
        dirty={dirtyK}
        saving={savingK}
        error={errorK}
        onSave={saveKeyDates}
      >
        <RepeatableList<KeyDateDraft>
          items={keyDates}
          onChange={(next) => {
            setKeyDates(next);
            setDirtyK(true);
          }}
          newItem={() => ({
            id: null,
            title: "",
            date: iso(new Date(plan.year, plan.month - 1, 1)),
          })}
          rowKey={(it, i) => it.id ?? `new-${i}`}
          addLabel={t("admin.keyDates.add")}
          emptyLabel={t("admin.keyDates.empty")}
          maxItems={20}
          renderRow={(item, index, set) => (
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={item.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={t("admin.keyDates.label")}
                aria-label={t("admin.keyDates.label")}
                className={planField}
              />
              <input
                type="date"
                dir="ltr"
                value={item.date}
                onChange={(e) => set("date", e.target.value)}
                aria-label={t("admin.keyDates.date")}
                className={planField}
                id={`k-date-${index}`}
              />
            </div>
          )}
        />
      </PlanSectionShell>
    </div>
  );
}
