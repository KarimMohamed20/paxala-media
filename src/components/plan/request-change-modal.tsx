"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, MessageSquarePlus, X } from "lucide-react";
import { submitChangeRequest } from "./use-monthly-plan";

/**
 * "Request Change" — the only write a client makes against the plan document.
 * Shaped after `portal/project-request-modal.tsx`.
 */
export function RequestChangeModal({
  isOpen,
  onClose,
  onSuccess,
  month,
  year,
  clientId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  month: number;
  year: number;
  clientId?: string | null;
}) {
  const t = useTranslations("plan");
  const tc = useTranslations("common");

  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMessage("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError(t("changeRequest.messageRequired"));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitChangeRequest({ month, year, message, clientId });
      onSuccess(t("changeRequest.success"));
      onClose();
    } catch (err) {
      setError((err as Error).message || t("changeRequest.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-lg space-y-4 rounded-3xl border border-white/15 bg-neutral-950 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-600/20">
              <MessageSquarePlus size={18} className="text-red-400" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">
                {t("changeRequest.title")}
              </h2>
              <p className="text-xs text-white/45">
                {t("changeRequest.description")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={tc("close")}
            className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div>
          <label
            htmlFor="plan-change-message"
            className="mb-1.5 block text-xs font-semibold text-white/70"
          >
            {t("changeRequest.message")} <span className="text-red-400">*</span>
          </label>
          <textarea
            id="plan-change-message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("changeRequest.messagePlaceholder")}
            className="w-full resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-red-500/50 focus:outline-none"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
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
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {t("changeRequest.submit")}
          </button>
        </div>
      </form>
    </div>
  );
}
