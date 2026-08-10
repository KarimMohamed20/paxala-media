"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { packages } from "@/lib/constants";
import { ProgressRing } from "@/components/plan/progress-ring";
import { updateMonthlyPlan } from "@/components/plan/use-monthly-plan";
import type { MonthlyPlan } from "@/components/plan/types";
import { PlanSectionShell, planField, planLabel } from "./plan-section-shell";

export function PlanOverviewTab({
  plan,
  onSaved,
}: {
  plan: MonthlyPlan;
  onSaved: (plan: MonthlyPlan) => void;
}) {
  const t = useTranslations("plan");

  const [title, setTitle] = useState(plan.title);
  const [subtitle, setSubtitle] = useState(plan.subtitle ?? "");
  const [objective, setObjective] = useState(plan.objective ?? "");
  const [tags, setTags] = useState<string[]>(plan.tags);
  const [tagDraft, setTagDraft] = useState("");
  const [packageId, setPackageId] = useState(plan.packageId ?? "");

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-seed when the parent swaps in a freshly saved plan.
  useEffect(() => {
    setTitle(plan.title);
    setSubtitle(plan.subtitle ?? "");
    setObjective(plan.objective ?? "");
    setTags(plan.tags);
    setPackageId(plan.packageId ?? "");
    setDirty(false);
    // Re-seed only on a new plan or a fresh save (id + updatedAt), never on the
    // array identities: those change on every fetch and would wipe edits in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id, plan.updatedAt]);

  const touch = () => {
    setDirty(true);
    setSaved(false);
  };

  const addTag = () => {
    const v = tagDraft.trim();
    if (!v || tags.includes(v)) return;
    setTags([...tags, v]);
    setTagDraft("");
    touch();
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateMonthlyPlan(plan.id, {
        title,
        subtitle: subtitle || null,
        objective: objective || null,
        tags,
        packageId: packageId || null,
      });
      onSaved(updated);
      setDirty(false);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PlanSectionShell
      title={t("admin.tabs.overview")}
      dirty={dirty}
      saving={saving}
      saved={saved}
      error={error}
      onSave={save}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={planLabel} htmlFor="po-title">
              {t("admin.fields.title")}
            </label>
            <input
              id="po-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                touch();
              }}
              placeholder={t("admin.fields.titlePlaceholder")}
              className={planField}
            />
          </div>
          <div>
            <label className={planLabel} htmlFor="po-subtitle">
              {t("admin.fields.subtitle")}
            </label>
            <input
              id="po-subtitle"
              value={subtitle}
              onChange={(e) => {
                setSubtitle(e.target.value);
                touch();
              }}
              placeholder={t("admin.fields.subtitlePlaceholder")}
              className={planField}
            />
          </div>
        </div>

        <div>
          <label className={planLabel} htmlFor="po-objective">
            {t("admin.fields.objective")}
          </label>
          <textarea
            id="po-objective"
            rows={4}
            value={objective}
            onChange={(e) => {
              setObjective(e.target.value);
              touch();
            }}
            placeholder={t("admin.fields.objectivePlaceholder")}
            className={`${planField} resize-y`}
          />
        </div>

        <div>
          <label className={planLabel} htmlFor="po-tag">
            {t("admin.fields.tags")}
          </label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] text-white/75"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => {
                    setTags(tags.filter((x) => x !== tag));
                    touch();
                  }}
                  className="rounded-full p-0.5 hover:bg-white/10"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <input
            id="po-tag"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder={t("admin.fields.tagPlaceholder")}
            className={`${planField} mt-2`}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={planLabel} htmlFor="po-package">
              {t("admin.fields.package")}
            </label>
            <select
              id="po-package"
              value={packageId}
              onChange={(e) => {
                setPackageId(e.target.value);
                touch();
              }}
              className={planField}
            >
              <option value="">{t("admin.fields.noPackage")}</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className={planLabel}>{t("admin.fields.progress")}</span>
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <ProgressRing value={plan.progress.percent} size={34} stroke={3} />
              <span className="text-[11px] text-white/45">
                {t("admin.fields.progressAuto")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </PlanSectionShell>
  );
}
