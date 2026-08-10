"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PLAN_ITEM_STATUSES } from "@/components/plan/plan-meta";
import { PlanAvatar } from "@/components/plan/plan-avatar";
import { savePlanSection } from "@/components/plan/use-monthly-plan";
import type { MonthlyPlan, PlanItemStatus } from "@/components/plan/types";
import { RepeatableList } from "./repeatable-list";
import { PlanSectionShell, planField, planLabel } from "./plan-section-shell";

interface ActionDraft {
  id: string | null;
  title: string;
  dueAt: string;
  status: PlanItemStatus;
  contentItemId: string | null;
}

interface TeamDraft {
  id: string | null;
  userId: string;
  roleLabel: string;
}

interface StaffOption {
  id: string;
  name: string | null;
  image: string | null;
  jobTitle?: string | null;
}

interface ContentOption {
  id: string;
  title: string;
}

const iso = (v: string | Date | null) =>
  v ? new Date(v).toISOString().slice(0, 10) : "";

export function PlanActionsTeamTab({
  plan,
  onSaved,
}: {
  plan: MonthlyPlan;
  onSaved: (plan: MonthlyPlan) => void;
}) {
  const t = useTranslations("plan");

  const [actions, setActions] = useState<ActionDraft[]>([]);
  const [team, setTeam] = useState<TeamDraft[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [contentItems, setContentItems] = useState<ContentOption[]>([]);

  const [dirtyA, setDirtyA] = useState(false);
  const [dirtyT, setDirtyT] = useState(false);
  const [savingA, setSavingA] = useState(false);
  const [savingT, setSavingT] = useState(false);
  const [errorA, setErrorA] = useState<string | null>(null);
  const [errorT, setErrorT] = useState<string | null>(null);

  useEffect(() => {
    setActions(
      plan.actions.map((a) => ({
        id: a.id,
        title: a.title,
        dueAt: iso(a.dueAt),
        status: a.status,
        contentItemId: a.contentItemId,
      }))
    );
    setTeam(
      plan.team.map((m) => ({
        id: m.id,
        userId: m.user.id,
        roleLabel: m.roleLabel ?? m.user.jobTitle ?? "",
      }))
    );
    setDirtyA(false);
    setDirtyT(false);
    // Re-seed only on a new plan or a fresh save (id + updatedAt), never on the
    // array identities: those change on every fetch and would wipe edits in progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id, plan.updatedAt]);

  // /api/users/staff is the correct endpoint for agency accounts —
  // /api/users?role=STAFF,ADMIN passes an invalid enum value.
  useEffect(() => {
    fetch("/api/users/staff")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setStaff(Array.isArray(d) ? d : (d.users ?? [])))
      .catch(() => setStaff([]));
  }, []);

  // Content items for this client and month, for the optional action deep link.
  useEffect(() => {
    const from = new Date(Date.UTC(plan.year, plan.month - 1, 1)).toISOString();
    const to = new Date(Date.UTC(plan.year, plan.month, 1)).toISOString();
    fetch(
      `/api/admin/content-calendar?clientId=${plan.client.id}&from=${from}&to=${to}&pageSize=200`
    )
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) =>
        setContentItems(
          (d.items ?? []).map((i: { id: string; title: string }) => ({
            id: i.id,
            title: i.title,
          }))
        )
      )
      .catch(() => setContentItems([]));
  }, [plan.client.id, plan.month, plan.year]);

  const saveActions = async () => {
    setSavingA(true);
    setErrorA(null);
    try {
      onSaved(
        await savePlanSection(
          plan.id,
          "actions",
          actions.map((a) => ({ ...a, dueAt: a.dueAt || null }))
        )
      );
      setDirtyA(false);
    } catch (e) {
      setErrorA((e as Error).message);
    } finally {
      setSavingA(false);
    }
  };

  const saveTeam = async () => {
    setSavingT(true);
    setErrorT(null);
    try {
      onSaved(await savePlanSection(plan.id, "team", team));
      setDirtyT(false);
    } catch (e) {
      setErrorT((e as Error).message);
    } finally {
      setSavingT(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <PlanSectionShell
        title={t("admin.actions.title")}
        dirty={dirtyA}
        saving={savingA}
        error={errorA}
        onSave={saveActions}
      >
        <RepeatableList<ActionDraft>
          items={actions}
          onChange={(next) => {
            setActions(next);
            setDirtyA(true);
          }}
          newItem={() => ({
            id: null,
            title: "",
            dueAt: "",
            status: "AWAITING_CLIENT",
            contentItemId: null,
          })}
          rowKey={(it, i) => it.id ?? `new-${i}`}
          addLabel={t("admin.actions.add")}
          emptyLabel={t("admin.actions.empty")}
          maxItems={20}
          renderRow={(item, index, set) => (
            <div className="space-y-2">
              <input
                value={item.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder={t("admin.actions.actionTitle")}
                aria-label={t("admin.actions.actionTitle")}
                className={planField}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className={planLabel} htmlFor={`a-due-${index}`}>
                    {t("admin.actions.dueAt")}
                  </label>
                  <input
                    id={`a-due-${index}`}
                    type="date"
                    dir="ltr"
                    value={item.dueAt}
                    onChange={(e) => set("dueAt", e.target.value)}
                    className={planField}
                  />
                </div>
                <div>
                  <label className={planLabel} htmlFor={`a-status-${index}`}>
                    {t("itemStatus.ALL")}
                  </label>
                  <select
                    id={`a-status-${index}`}
                    value={item.status}
                    onChange={(e) => set("status", e.target.value as PlanItemStatus)}
                    className={planField}
                  >
                    {PLAN_ITEM_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(`itemStatus.${s}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={planLabel} htmlFor={`a-content-${index}`}>
                  {t("admin.actions.contentItem")}
                </label>
                <select
                  id={`a-content-${index}`}
                  value={item.contentItemId ?? ""}
                  onChange={(e) => set("contentItemId", e.target.value || null)}
                  className={planField}
                >
                  <option value="">{t("admin.actions.noContentItem")}</option>
                  {contentItems.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        />
      </PlanSectionShell>

      <PlanSectionShell
        title={t("admin.team.title")}
        dirty={dirtyT}
        saving={savingT}
        error={errorT}
        onSave={saveTeam}
      >
        <RepeatableList<TeamDraft>
          items={team}
          onChange={(next) => {
            setTeam(next);
            setDirtyT(true);
          }}
          newItem={() => ({ id: null, userId: "", roleLabel: "" })}
          rowKey={(it, i) => it.id ?? `new-${i}`}
          addLabel={t("admin.team.add")}
          emptyLabel={t("admin.team.empty")}
          maxItems={12}
          renderRow={(item, index, set) => {
            const picked = staff.find((s) => s.id === item.userId);
            return (
              <div className="flex items-start gap-2">
                <PlanAvatar
                  name={picked?.name}
                  image={picked?.image}
                  size={36}
                  className="mt-5"
                />
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                  <div>
                    <label className={planLabel} htmlFor={`tm-user-${index}`}>
                      {t("admin.team.member")}
                    </label>
                    <select
                      id={`tm-user-${index}`}
                      value={item.userId}
                      onChange={(e) => set("userId", e.target.value)}
                      className={planField}
                    >
                      <option value="">{t("admin.team.selectMember")}</option>
                      {staff
                        // Hide people already on the lineup, except this row's own.
                        .filter(
                          (s) =>
                            s.id === item.userId ||
                            !team.some((x) => x.userId === s.id)
                        )
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name ?? s.id}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className={planLabel} htmlFor={`tm-role-${index}`}>
                      {t("admin.team.roleLabel")}
                    </label>
                    <input
                      id={`tm-role-${index}`}
                      value={item.roleLabel}
                      onChange={(e) => set("roleLabel", e.target.value)}
                      placeholder={picked?.jobTitle ?? ""}
                      className={planField}
                    />
                  </div>
                </div>
              </div>
            );
          }}
        />
      </PlanSectionShell>
    </div>
  );
}
