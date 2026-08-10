"use client";

import { useLocale, useTranslations } from "next-intl";
import { Folder, MessageSquare, Paperclip, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateLocalized } from "@/lib/format";
import { ContentStatusPill } from "./content-status-pill";
import { getFormatIcon, getPlatformIcon } from "./content-meta";
import type { ContentItem } from "./types";

/**
 * One content item, in the three densities the app needs:
 *  - `chip` a calendar day cell entry
 *  - `card` the "needs approval" queue
 *  - `row`  a project tab / admin list row
 */
export function ContentItemCard({
  item,
  variant,
  showProject = true,
  showClient = false,
  showAssets = true,
  onClick,
  className,
}: {
  item: ContentItem;
  variant: "chip" | "row" | "card";
  showProject?: boolean;
  showClient?: boolean;
  showAssets?: boolean;
  onClick?: (item: ContentItem) => void;
  className?: string;
}) {
  const t = useTranslations("content");
  const locale = useLocale();

  const assetCount = item.assets?.length ?? 0;
  const noteCount = item.approvals?.filter((a) => a.notes).length ?? 0;
  const clientName = item.plan?.client?.name ?? item.plan?.client?.username;

  const time = formatDateLocalized(item.scheduledAt, locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateTime = formatDateLocalized(item.scheduledAt, locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handle = onClick ? () => onClick(item) : undefined;
  const Tag = onClick ? "button" : "div";

  // ---------- chip ----------
  if (variant === "chip") {
    return (
      <Tag
        type={onClick ? "button" : undefined}
        onClick={handle}
        className={cn(
          "w-full text-start rounded-md border px-1.5 py-1 transition",
          "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20",
          className
        )}
      >
        <span className="flex items-center gap-1">
          {getPlatformIcon(item.platform, 11)}
          <span className="flex-1 truncate text-[11px] font-medium text-white/90">
            {item.title}
          </span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 flex-wrap">
          <ContentStatusPill status={item.status} size="xs" pulse />
          {showAssets && assetCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[9px] text-white/50">
              <Paperclip size={9} />
              {assetCount}
            </span>
          )}
          {showProject && item.project && (
            <span className="inline-flex items-center gap-0.5 text-[9px] text-white/40 max-w-full truncate">
              <Folder size={9} />
              <span className="truncate">{item.project.title}</span>
            </span>
          )}
        </span>
      </Tag>
    );
  }

  // ---------- card ----------
  if (variant === "card") {
    return (
      <Tag
        type={onClick ? "button" : undefined}
        onClick={handle}
        className={cn(
          "w-full text-start rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-white/25 hover:bg-white/10",
          className
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-white line-clamp-2">
            {item.title}
          </p>
          <ContentStatusPill status={item.status} size="xs" pulse />
        </div>

        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/50">
          {getPlatformIcon(item.platform, 12)}
          <span>{t(`format.${item.format}`)}</span>
          <span aria-hidden>·</span>
          <span>{dateTime}</span>
        </div>

        {item.caption && (
          <p className="mt-2 text-[11px] italic text-white/40 line-clamp-2">
            {item.caption}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-white/40">
          {showProject && item.project && (
            <span className="inline-flex items-center gap-1">
              <Folder size={10} />
              {item.project.title}
            </span>
          )}
          {showClient && clientName && (
            <span className="inline-flex items-center gap-1">
              <User size={10} />
              {clientName}
            </span>
          )}
          {showAssets && assetCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip size={10} />
              {t("calendar.mediaCount", { count: assetCount })}
            </span>
          )}
        </div>
      </Tag>
    );
  }

  // ---------- row ----------
  const thumbs = item.assets?.slice(0, 3) ?? [];
  const extra = assetCount - thumbs.length;

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={handle}
      className={cn(
        "w-full text-start flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 transition hover:border-white/25 hover:bg-white/10",
        className
      )}
    >
      {showAssets && (
        <div className="flex -space-x-2 rtl:space-x-reverse shrink-0">
          {thumbs.map((a) => (
            <span
              key={a.id}
              className="w-10 h-10 rounded-lg overflow-hidden border border-white/15 bg-white/5 grid place-items-center"
            >
              {a.file.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.file.thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <Paperclip size={12} className="text-white/40" />
              )}
            </span>
          ))}
          {extra > 0 && (
            <span className="w-10 h-10 rounded-lg border border-white/15 bg-white/10 grid place-items-center text-[10px] text-white/60">
              +{extra}
            </span>
          )}
          {thumbs.length === 0 && (
            <span className="w-10 h-10 rounded-lg border border-dashed border-white/15 grid place-items-center">
              {getFormatIcon(item.format, 14)}
            </span>
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {getPlatformIcon(item.platform, 12)}
          <p className="truncate text-sm font-semibold text-white">{item.title}</p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/50">
          <span>{t(`format.${item.format}`)}</span>
          <span aria-hidden>·</span>
          <span>{time}</span>
          {showProject && item.project && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Folder size={10} />
                {item.project.title}
              </span>
            </>
          )}
          {showClient && clientName && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <User size={10} />
                {clientName}
              </span>
            </>
          )}
          {noteCount > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare size={10} />
                {t("projectTab.notesCount", { count: noteCount })}
              </span>
            </>
          )}
        </div>
      </div>

      <ContentStatusPill status={item.status} size="sm" className="shrink-0" />
    </Tag>
  );
}
