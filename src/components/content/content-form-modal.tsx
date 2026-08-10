"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { AssetPickerGrid } from "./asset-picker-grid";
import {
  CONTENT_FORMATS,
  CONTENT_PLATFORMS,
  CONTENT_STATUSES,
} from "./content-meta";
import type {
  ContentAssetFile,
  ContentClientRef,
  ContentFormValues,
  ContentFormat,
  ContentPlatform,
  ContentProjectRef,
  ContentStatus,
} from "./types";

const EMPTY: ContentFormValues = {
  title: "",
  caption: "",
  platform: "INSTAGRAM",
  format: "REEL",
  status: "DRAFT",
  scheduledAt: "",
  projectId: null,
  clientId: null,
  fileIds: [],
};

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none";
const labelClass = "mb-1.5 block text-xs font-semibold text-white/70";

export function ContentFormModal({
  isOpen,
  onClose,
  onSubmit,
  mode = "create",
  initial,
  projects,
  assets,
  clients,
  showStatusField = false,
  showClientField = false,
  lockedProjectId,
  onClientChange,
  submitting = false,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: ContentFormValues) => Promise<void> | void;
  mode?: "create" | "edit";
  initial?: Partial<ContentFormValues>;
  projects: ContentProjectRef[];
  assets: ContentAssetFile[];
  clients?: ContentClientRef[];
  /** Admin only — clients may never choose their own status. */
  showStatusField?: boolean;
  showClientField?: boolean;
  /** Set from a project page: the project is fixed and the select is read-only. */
  lockedProjectId?: string;
  onClientChange?: (clientId: string) => void;
  submitting?: boolean;
  error?: string | null;
}) {
  const t = useTranslations("content");
  const tc = useTranslations("common");

  const [values, setValues] = useState<ContentFormValues>(EMPTY);
  const [assetSearch, setAssetSearch] = useState("");
  const [scopeToProject, setScopeToProject] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  // Re-seed whenever the modal opens so a day-cell "+" can prefill the date and
  // an edit can prefill everything.
  useEffect(() => {
    if (!isOpen) return;
    setValues({
      ...EMPTY,
      ...initial,
      ...(lockedProjectId && { projectId: lockedProjectId }),
    });
    setAssetSearch("");
    setLocalError(null);
    setScopeToProject(true);
    // `initial` is a fresh object each render; keying on open + the fields that
    // actually seed the form avoids a reset loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initial?.scheduledAt, initial?.projectId, initial?.clientId, lockedProjectId]);

  if (!isOpen) return null;

  const set = <K extends keyof ContentFormValues>(
    key: K,
    value: ContentFormValues[K]
  ) => setValues((v) => ({ ...v, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) return setLocalError(t("form.titleRequired"));
    if (!values.scheduledAt) return setLocalError(t("form.dateRequired"));
    if (showClientField && !values.clientId)
      return setLocalError(t("form.clientRequired"));
    setLocalError(null);
    await onSubmit(values);
  };

  const shown = error ?? localError;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-3xl border border-white/15 bg-neutral-950 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-white">
            {mode === "edit" ? t("form.editTitle") : t("form.createTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={tc("close")}
            className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {showClientField && (
          <div>
            <label className={labelClass} htmlFor="cf-client">
              {t("form.client")} <span className="text-red-400">*</span>
            </label>
            <select
              id="cf-client"
              value={values.clientId ?? ""}
              onChange={(e) => {
                set("clientId", e.target.value || null);
                // Projects and assets are per-client — clear stale selections.
                set("projectId", null);
                set("fileIds", []);
                onClientChange?.(e.target.value);
              }}
              className={fieldClass}
            >
              <option value="">{t("form.selectClient")}</option>
              {(clients ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name ?? c.username ?? c.id}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="cf-title">
            {t("form.contentTitle")} <span className="text-red-400">*</span>
          </label>
          <input
            id="cf-title"
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder={t("form.titlePlaceholder")}
            className={fieldClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="cf-platform">
              {t("form.platform")}
            </label>
            <select
              id="cf-platform"
              value={values.platform}
              onChange={(e) => set("platform", e.target.value as ContentPlatform)}
              className={fieldClass}
            >
              {CONTENT_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {t(`platform.${p}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass} htmlFor="cf-format">
              {t("form.format")}
            </label>
            <select
              id="cf-format"
              value={values.format}
              onChange={(e) => set("format", e.target.value as ContentFormat)}
              className={fieldClass}
            >
              {CONTENT_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {t(`format.${f}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="cf-date">
              {t("form.publishDate")} <span className="text-red-400">*</span>
            </label>
            <input
              id="cf-date"
              type="datetime-local"
              // Date/time inputs stay LTR even in an RTL document.
              dir="ltr"
              value={values.scheduledAt}
              onChange={(e) => set("scheduledAt", e.target.value)}
              className={fieldClass}
            />
          </div>

          {/* The project link — previously missing, which is why no content was
              ever attached to a project. */}
          <div>
            <label className={labelClass} htmlFor="cf-project">
              {t("form.project")}
            </label>
            <select
              id="cf-project"
              value={values.projectId ?? ""}
              disabled={!!lockedProjectId}
              onChange={(e) => set("projectId", e.target.value || null)}
              className={`${fieldClass} disabled:opacity-60`}
            >
              <option value="">{t("form.noProject")}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {showStatusField && (
          <div>
            <label className={labelClass} htmlFor="cf-status">
              {t("form.status")}
            </label>
            <select
              id="cf-status"
              value={values.status}
              onChange={(e) => set("status", e.target.value as ContentStatus)}
              className={fieldClass}
            >
              {/* Approvals and rejections are review outcomes, not form fields. */}
              {CONTENT_STATUSES.filter(
                (s) => s !== "APPROVED" && s !== "REJECTED"
              ).map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className={labelClass} htmlFor="cf-caption">
            {t("form.caption")}
          </label>
          <textarea
            id="cf-caption"
            rows={4}
            value={values.caption}
            onChange={(e) => set("caption", e.target.value)}
            placeholder={t("form.captionPlaceholder")}
            className={`${fieldClass} resize-y`}
          />
        </div>

        <AssetPickerGrid
          assets={assets}
          selectedIds={values.fileIds}
          onChange={(ids) => set("fileIds", ids)}
          projectFilterId={values.projectId}
          projectFilterOn={scopeToProject}
          onProjectFilterToggle={setScopeToProject}
          searchQuery={assetSearch}
          onSearchChange={setAssetSearch}
        />

        {shown && (
          <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {shown}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
          >
            {tc("cancel")}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {submitting
              ? tc("saving")
              : mode === "edit"
                ? t("form.submitSave")
                : t("form.submitCreate")}
          </button>
        </div>
      </form>
    </div>
  );
}
