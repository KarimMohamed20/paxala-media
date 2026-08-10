"use client";

import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Editor for an ordered array of objects.
 *
 * Generalises the add/remove/update shape from `admin/homepage/page.tsx` and
 * adds reorder. Reorder is up/down buttons rather than drag-and-drop: no DnD
 * library is installed anywhere in the repo, and vertical arrows carry no RTL
 * burden — horizontal ones would need mirroring.
 *
 * The array index becomes each row's `order` at save time, so nothing here
 * writes an order field.
 */
export function RepeatableList<T>({
  items,
  onChange,
  newItem,
  renderRow,
  addLabel,
  emptyLabel,
  maxItems,
  rowKey,
  className,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  newItem: () => T;
  /** `set` is a typed per-row setter, same shape as content-form-modal's. */
  renderRow: (
    item: T,
    index: number,
    set: <K extends keyof T>(key: K, value: T[K]) => void
  ) => React.ReactNode;
  addLabel: string;
  emptyLabel?: string;
  maxItems?: number;
  /** Stable key. Index-only keys break when rows move. */
  rowKey?: (item: T, index: number) => string;
  className?: string;
}) {
  const t = useTranslations("plan");
  const tc = useTranslations("common");

  const update = (index: number, next: T) =>
    onChange(items.map((it, i) => (i === index ? next : it)));

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [row] = next.splice(from, 1);
    next.splice(to, 0, row);
    onChange(next);
  };

  const atMax = maxItems !== undefined && items.length >= maxItems;

  return (
    <div className={cn("space-y-2", className)}>
      {items.length === 0 && emptyLabel && (
        <p className="rounded-xl border border-dashed border-white/10 py-6 text-center text-xs text-white/40">
          {emptyLabel}
        </p>
      )}

      {items.map((item, index) => {
        const set = <K extends keyof T>(key: K, value: T[K]) =>
          update(index, { ...item, [key]: value });

        return (
          <div
            key={rowKey ? rowKey(item, index) : `row-${index}`}
            className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3"
          >
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                onClick={() => move(index, index - 1)}
                disabled={index === 0}
                aria-label={t("admin.moveUp")}
                className="rounded p-0.5 text-white/40 transition hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => move(index, index + 1)}
                disabled={index === items.length - 1}
                aria-label={t("admin.moveDown")}
                className="rounded p-0.5 text-white/40 transition hover:bg-white/10 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent"
              >
                <ChevronDown size={14} />
              </button>
            </div>

            <div className="min-w-0 flex-1">{renderRow(item, index, set)}</div>

            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              aria-label={tc("remove")}
              title={tc("remove")}
              className="shrink-0 rounded p-1 text-white/35 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => onChange([...items, newItem()])}
        disabled={atMax}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-2.5 text-xs font-medium text-white/60 transition hover:border-white/30 hover:bg-white/5 hover:text-white disabled:opacity-40"
      >
        <Plus size={14} />
        {addLabel}
      </button>
    </div>
  );
}
