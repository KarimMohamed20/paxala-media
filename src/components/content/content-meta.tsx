import {
  Facebook,
  Film,
  Images,
  Instagram,
  Layers,
  Linkedin,
  Megaphone,
  Music2,
  Share2,
  SquarePlay,
  Video,
} from "lucide-react";
import type {
  ContentApprovalAction,
  ContentFormat,
  ContentPlatform,
  ContentStatus,
} from "./types";

/**
 * Enum lists, styling and transition rules for content items.
 *
 * Every enum value the schema defines is listed here exactly once, which is what
 * keeps the filter pills, the create form and the admin console from drifting out
 * of sync with each other (previously TikTok/LinkedIn were missing from the
 * filters and PAID_CAMPAIGN from the format select).
 */

export const CONTENT_PLATFORMS: ContentPlatform[] = [
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "LINKEDIN",
  "YOUTUBE",
  "PAID_ADS",
];

export const CONTENT_FORMATS: ContentFormat[] = [
  "REEL",
  "CAROUSEL",
  "POST",
  "STORIES",
  "VIDEO",
  "PAID_CAMPAIGN",
];

export const CONTENT_STATUSES: ContentStatus[] = [
  "DRAFT",
  "IN_PROGRESS",
  "AWAITING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "SCHEDULED",
  "PUBLISHED",
];

/** Statuses a client can act on from the review drawer. */
export const REVIEWABLE_STATUSES: ContentStatus[] = [
  "AWAITING_APPROVAL",
  "REJECTED",
];

export function getStatusBadgeStyle(
  status: ContentStatus,
  opts?: { pulse?: boolean }
): string {
  switch (status) {
    case "PUBLISHED":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "APPROVED":
      return "bg-green-500/10 text-green-400 border-green-500/20";
    case "SCHEDULED":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "AWAITING_APPROVAL":
      return `bg-amber-500/10 text-amber-400 border-amber-500/20${
        opts?.pulse ? " animate-pulse" : ""
      }`;
    case "REJECTED":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    case "IN_PROGRESS":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    default:
      return "bg-white/10 text-white/60 border-white/10";
  }
}

export function getStatusDotClass(status: ContentStatus): string {
  switch (status) {
    case "PUBLISHED":
      return "bg-emerald-400";
    case "APPROVED":
      return "bg-green-400";
    case "SCHEDULED":
      return "bg-blue-400";
    case "AWAITING_APPROVAL":
      return "bg-amber-400";
    case "REJECTED":
      return "bg-red-400";
    case "IN_PROGRESS":
      return "bg-purple-400";
    default:
      return "bg-white/40";
  }
}

export function getPlatformIcon(platform: ContentPlatform, size = 14) {
  switch (platform) {
    case "INSTAGRAM":
      return <Instagram size={size} className="text-pink-400" />;
    case "FACEBOOK":
      return <Facebook size={size} className="text-blue-400" />;
    case "TIKTOK":
      return <Music2 size={size} className="text-cyan-300" />;
    case "LINKEDIN":
      return <Linkedin size={size} className="text-sky-400" />;
    case "YOUTUBE":
      return <Video size={size} className="text-red-500" />;
    case "PAID_ADS":
      return <Megaphone size={size} className="text-amber-400" />;
    default:
      return <Share2 size={size} className="text-white/60" />;
  }
}

export function getFormatIcon(format: ContentFormat, size = 14) {
  switch (format) {
    case "REEL":
      return <SquarePlay size={size} className="text-white/60" />;
    case "CAROUSEL":
      return <Images size={size} className="text-white/60" />;
    case "STORIES":
      return <Layers size={size} className="text-white/60" />;
    case "VIDEO":
      return <Film size={size} className="text-white/60" />;
    case "PAID_CAMPAIGN":
      return <Megaphone size={size} className="text-white/60" />;
    default:
      return <Images size={size} className="text-white/60" />;
  }
}

export function getApprovalActionStyle(action: ContentApprovalAction): {
  dot: string;
  text: string;
} {
  switch (action) {
    case "APPROVED":
      return { dot: "bg-green-400", text: "text-green-400" };
    case "REJECTED":
      return { dot: "bg-red-400", text: "text-red-400" };
    default:
      return { dot: "bg-amber-400", text: "text-amber-400" };
  }
}

/**
 * Status transitions an agency user may apply directly from the admin console.
 *
 * APPROVED and REJECTED are absent by design: those are review outcomes and must
 * go through the /approve endpoint so a ContentApproval row is written. The admin
 * drawer offers them as review actions instead.
 */
export const NEXT_STATUSES: Record<ContentStatus, ContentStatus[]> = {
  DRAFT: ["IN_PROGRESS"],
  IN_PROGRESS: ["DRAFT"],
  AWAITING_APPROVAL: ["DRAFT", "IN_PROGRESS"],
  REJECTED: ["DRAFT", "IN_PROGRESS"],
  APPROVED: ["SCHEDULED", "PUBLISHED"],
  SCHEDULED: ["PUBLISHED"],
  PUBLISHED: [],
};

/** Can this item be sent to the client for review? */
export function canSubmitForApproval(status: ContentStatus): boolean {
  return status !== "PUBLISHED" && status !== "AWAITING_APPROVAL";
}
