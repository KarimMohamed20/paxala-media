"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PlanAvatar } from "./plan-avatar";
import type { PlanTeamMember } from "./types";

export function PlanTeamCard({
  team,
  className,
}: {
  team: PlanTeamMember[];
  className?: string;
}) {
  const t = useTranslations("plan");

  return (
    <section
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.03] p-5",
        className
      )}
    >
      <h2 className="mb-4 text-sm font-bold text-white">{t("team.title")}</h2>

      {team.length === 0 ? (
        <p className="py-6 text-center text-xs text-white/40">{t("team.empty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {team.map((m) => (
            <div key={m.id} className="flex items-center gap-3">
              <PlanAvatar name={m.user.name} image={m.user.image} size={48} />
              <span className="min-w-0 text-start">
                <span className="block truncate text-sm font-semibold text-white">
                  {m.user.name ?? m.user.username}
                </span>
                <span className="block truncate text-[11px] text-white/45">
                  {m.roleLabel ?? m.user.jobTitle ?? ""}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
