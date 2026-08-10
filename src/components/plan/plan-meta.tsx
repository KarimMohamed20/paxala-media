import {
  BarChart3,
  Box,
  Camera,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Globe,
  Megaphone,
  Palette,
  PenTool,
  Share2,
  Sparkles,
  UserCheck,
  Video,
} from "lucide-react";
import type { PlanItemStatus } from "./types";

/**
 * Status styling and icon maps for the Monthly Plan.
 *
 * Deliberately NOT shared with `content-meta.tsx`: the plan's mapping differs
 * (plan IN_PROGRESS is amber and SCHEDULED purple; content uses purple and blue).
 * Sharing would couple two palettes that are meant to diverge.
 */

export const PLAN_ITEM_STATUSES: PlanItemStatus[] = [
  "SCHEDULED",
  "IN_PROGRESS",
  "AWAITING_CLIENT",
  "COMPLETED",
];

export function getItemStatusBadgeStyle(status: PlanItemStatus): string {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "IN_PROGRESS":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "AWAITING_CLIENT":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    default:
      return "bg-purple-500/10 text-purple-300 border-purple-500/20";
  }
}

export function getItemStatusDotClass(status: PlanItemStatus): string {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-400";
    case "IN_PROGRESS":
      return "bg-amber-400";
    case "AWAITING_CLIENT":
      return "bg-blue-400";
    default:
      return "bg-purple-400";
  }
}

export function getItemStatusIcon(status: PlanItemStatus, size = 14) {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle2 size={size} className="text-emerald-400" />;
    case "IN_PROGRESS":
      return <Clock size={size} className="text-amber-400" />;
    case "AWAITING_CLIENT":
      return <UserCheck size={size} className="text-blue-400" />;
    default:
      return <Circle size={size} className="text-white/30" />;
  }
}

/** Icons an admin may pick for a deliverable tile — keep in sync with DELIVERABLE_ICONS. */
export const DELIVERABLE_ICONS: Record<string, React.ElementType> = {
  Video,
  Camera,
  Share2,
  Megaphone,
  Palette,
  Globe,
  PenTool,
  BarChart3,
  FileText,
  Sparkles,
};

export function getDeliverableIcon(name: string | null, size = 16) {
  const Icon = (name && DELIVERABLE_ICONS[name]) || Box;
  return <Icon size={size} className="text-red-400" />;
}
