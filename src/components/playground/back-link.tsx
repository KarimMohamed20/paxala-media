"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

/**
 * Role-aware exit from the top-level /playground dashboard. The dashboard
 * renders outside every app shell, so without this the agency team's only way
 * back to /admin or /staff is the browser back button.
 */
export function PlaygroundBackLink() {
  const { data: session } = useSession();
  const t = useTranslations("playground");

  const role = session?.user?.role;
  const target =
    role === "ADMIN"
      ? { href: "/admin", labelKey: "back.admin" }
      : role === "STAFF"
        ? { href: "/staff", labelKey: "back.staff" }
        : { href: "/portal/dashboard", labelKey: "back.portal" };

  return (
    <Link
      href={target.href}
      className="mb-6 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-white/40 transition-colors hover:text-white/80"
    >
      <ArrowLeft size={14} aria-hidden="true" className="rtl:rotate-180" />
      {t(target.labelKey)}
    </Link>
  );
}
