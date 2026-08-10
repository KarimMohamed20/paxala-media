/**
 * Shared domain types for the content calendar.
 *
 * Single source of truth for the portal calendar, the project Content tab and the
 * admin console. Fields the API may not yet return (`approvals`, `approvedAt`,
 * `publishedAt`) are optional so every consumer degrades gracefully.
 */

export type ContentPlatform =
  | "INSTAGRAM"
  | "FACEBOOK"
  | "TIKTOK"
  | "LINKEDIN"
  | "YOUTUBE"
  | "PAID_ADS";

export type ContentFormat =
  | "REEL"
  | "CAROUSEL"
  | "POST"
  | "STORIES"
  | "VIDEO"
  | "PAID_CAMPAIGN";

export type ContentStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "AWAITING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SCHEDULED"
  | "PUBLISHED";

export type ContentApprovalAction = "SUBMITTED" | "APPROVED" | "REJECTED";

export type ReviewRole = "ADMIN" | "STAFF" | "CLIENT";

export interface ContentProjectRef {
  id: string;
  title: string;
  slug?: string;
}

export interface ContentClientRef {
  id: string;
  name: string | null;
  username?: string;
  email?: string | null;
}

export interface ContentAssetFile {
  id: string;
  name: string;
  url: string;
  type: string;
  thumbnail?: string | null;
  category?: string | null;
  size?: number | null;
  duration?: string | null;
  project?: ContentProjectRef | null;
}

export interface ContentItemAsset {
  id: string;
  order: number;
  file: ContentAssetFile;
}

export interface ContentApprovalEntry {
  id: string;
  action: ContentApprovalAction;
  notes: string | null;
  reviewerId?: string | null;
  reviewerName: string | null;
  reviewerRole: ReviewRole;
  fromStatus?: ContentStatus | null;
  toStatus: ContentStatus;
  createdAt: string;
}

export interface ContentComment {
  id: string;
  body: string;
  /** Seconds into `assetId`'s video. Null for a general comment. */
  timecodeSec: number | null;
  assetId: string | null;
  resolved: boolean;
  authorId: string | null;
  authorName: string | null;
  authorRole: ReviewRole;
  createdAt: string;
}

export interface ContentItem {
  id: string;
  title: string;
  caption?: string | null;
  platform: ContentPlatform;
  format: ContentFormat;
  status: ContentStatus;
  /** The publish date — required on every item. */
  scheduledAt: string;
  publishedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  /** Review deadline; falls back to scheduledAt when unset. */
  reviewDueAt?: string | null;
  project?: ContentProjectRef | null;
  /** Present in admin (cross-client) responses. */
  plan?: {
    id: string;
    title?: string;
    month?: number;
    year?: number;
    client?: ContentClientRef;
  } | null;
  assets: ContentItemAsset[];
  /** Denormalized latest verdict note. The full thread is `approvals`. */
  clientNotes?: string | null;
  approvals?: ContentApprovalEntry[];
  comments?: ContentComment[];
}

export interface ContentMetrics {
  scheduled: number;
  awaitingApproval: number;
  drafts: number;
  approved: number;
  published: number;
  rejected: number;
}

export interface PlatformMixEntry {
  name: ContentPlatform | string;
  count: number;
  percentage: number;
}

/** What the create/edit form produces — mirrors the POST/PUT body. */
export interface ContentFormValues {
  title: string;
  caption: string;
  platform: ContentPlatform;
  format: ContentFormat;
  status: ContentStatus;
  /** "YYYY-MM-DDTHH:mm" from a datetime-local input. */
  scheduledAt: string;
  /** The link that makes content live inside a project. */
  projectId: string | null;
  /** Admin create-on-behalf only. */
  clientId?: string | null;
  fileIds: string[];
}

export type ReviewAction = "SUBMIT" | "APPROVE" | "REJECT";
