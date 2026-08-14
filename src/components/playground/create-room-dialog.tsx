"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Lock, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ROOM_TEMPLATES } from "@/lib/playground/templates";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { ClientOption, ProjectOption, RoomPerson } from "./types";

/**
 * Create a Playground room.
 *
 * Radix is not used here for the same reason the newer portal modals are not:
 * ui/dialog.tsx still positions its close button with a physical `right-4` and
 * its animation classes are dead (tailwindcss-animate is not installed), so it
 * is not RTL-correct. This follows the hand-rolled overlay pattern of
 * plan/request-change-modal.tsx but adds the focus trap and Escape handling
 * those modals lack.
 *
 * Templates preload titled, EMPTY frames — the shape of a session, never fake
 * content. A canvas that opens pre-populated with plausible placeholder ideas is
 * worse than an empty one, because someone eventually presents a slide PMP never
 * wrote.
 */
export function CreateRoomDialog({
  open,
  onClose,
  clients,
  projects,
  people,
}: {
  open: boolean;
  onClose: () => void;
  clients: ClientOption[];
  projects: ProjectOption[];
  people: RoomPerson[];
}) {
  const t = useTranslations("playground");
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [projectId, setProjectId] = React.useState("");
  const [restricted, setRestricted] = React.useState(false);
  const [template, setTemplate] = React.useState("BLANK");
  const [memberIds, setMemberIds] = React.useState<string[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const panelRef = React.useRef<HTMLFormElement>(null);
  const titleRef = React.useRef<HTMLInputElement>(null);

  // Selecting a client narrows the project list; picking a project from another
  // client would be rejected server-side by validateRoomLinks anyway, so the UI
  // simply never offers it.
  const visibleProjects = React.useMemo(
    () => (clientId ? projects.filter((p) => p.clientId === clientId) : projects),
    [clientId, projects]
  );

  React.useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const toggleMember = (id: string) =>
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/playground/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          clientId: clientId || null,
          projectId: projectId || null,
          restricted,
          template,
          memberIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("create.failed"));
        return;
      }

      toast({
        variant: "success",
        title: t("create.created"),
        description: data.room.title,
      });
      onClose();
      router.push(`/playground/${data.room.id}`);
    } catch {
      setError(t("create.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <form
        ref={panelRef}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={t("create.title")}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/15 bg-neutral-950 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">{t("create.title")}</h2>
            <p className="mt-0.5 text-xs text-white/45">{t("create.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <Field label={t("create.roomName")} htmlFor="pg-title" required>
            <input
              id="pg-title"
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
              placeholder={t("create.roomNamePlaceholder")}
              className={inputClass}
            />
          </Field>

          <Field label={t("create.brief")} htmlFor="pg-description">
            <textarea
              id="pg-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder={t("create.briefPlaceholder")}
              className={cn(inputClass, "resize-none")}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("create.client")} htmlFor="pg-client">
              <select
                id="pg-client"
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setProjectId("");
                }}
                className={inputClass}
              >
                <option value="">{t("create.noClient")}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name ?? c.username}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t("create.project")} htmlFor="pg-project">
              <select
                id="pg-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className={inputClass}
              >
                <option value="">{t("create.noProject")}</option>
                {visibleProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <fieldset>
            <legend className="mb-2 block text-xs font-medium text-white/70">
              {t("create.template")}
            </legend>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {ROOM_TEMPLATES.map((option) => {
                const active = template === option.id;
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "cursor-pointer rounded-lg border px-2.5 py-2 text-[11px] transition-colors",
                      active
                        ? "border-red-500/50 bg-red-500/10 text-white"
                        : "border-white/10 text-white/60 hover:bg-white/5"
                    )}
                  >
                    <input
                      type="radio"
                      name="pg-template"
                      value={option.id}
                      checked={active}
                      onChange={() => setTemplate(option.id)}
                      className="sr-only"
                    />
                    <span className="block font-semibold">
                      {t(`templates.${option.id}`)}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-white/35">
                      {option.frames.length === 0
                        ? t("create.blankHint")
                        : t("create.frameCount", { count: option.frames.length })}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 block text-xs font-medium text-white/70">
              {t("create.participants")}
            </legend>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.02] p-2">
              {people.map((person) => {
                const checked = memberIds.includes(person.id);
                return (
                  <label
                    key={person.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition-colors",
                      checked ? "bg-white/10" : "hover:bg-white/5"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMember(person.id)}
                      className="h-4 w-4 shrink-0 accent-red-600"
                    />
                    <Avatar name={person.name} image={person.image} size={24} />
                    <span className="min-w-0 flex-1 truncate text-xs text-white/80">
                      {person.name ?? t("common.unnamed")}
                    </span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-white/35">
                      {person.role === "CLIENT"
                        ? t("roles.client")
                        : t("roles.team")}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <input
              type="checkbox"
              checked={restricted}
              onChange={(e) => setRestricted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Lock size={12} aria-hidden="true" className="text-white/50" />
                {t("create.restricted")}
              </span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-white/45">
                {t("create.restrictedHint")}
              </span>
            </span>
          </label>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {t("create.submit")}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/50";

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-xs font-medium text-white/70"
      >
        {label}
        {required && <span className="ms-1 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
