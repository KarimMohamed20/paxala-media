import { Prisma } from "@prisma/client";

/**
 * Shared Prisma selection shapes for content items.
 *
 * These live here rather than in a route file because Next.js App Router route
 * modules may only export the HTTP handlers and a fixed set of config keys.
 */

/** The last few review actions — enough for a summary badge on a calendar chip. */
export const approvalPreviewArgs = {
  orderBy: { createdAt: "desc" },
  take: 3,
  select: {
    id: true,
    action: true,
    notes: true,
    reviewerName: true,
    reviewerRole: true,
    fromStatus: true,
    toStatus: true,
    createdAt: true,
  },
} satisfies Prisma.ContentItemInclude["approvals"];

/** The full review thread, newest first — for the review drawer. */
export const approvalThreadArgs = {
  orderBy: { createdAt: "desc" },
  take: 20,
  select: {
    id: true,
    action: true,
    notes: true,
    reviewerId: true,
    reviewerName: true,
    reviewerRole: true,
    fromStatus: true,
    toStatus: true,
    createdAt: true,
  },
} satisfies Prisma.ContentItemInclude["approvals"];

/** Fields of a feedback comment the UI renders. */
export const commentSelect = {
  id: true,
  body: true,
  timecodeSec: true,
  assetId: true,
  resolved: true,
  authorId: true,
  authorName: true,
  authorRole: true,
  createdAt: true,
} satisfies Prisma.ContentCommentSelect;

/** Oldest-first: a feedback thread reads top to bottom. */
export const commentThreadArgs = {
  orderBy: { createdAt: "asc" },
  select: commentSelect,
} satisfies {
  orderBy: Prisma.ContentCommentOrderByWithRelationInput;
  select: Prisma.ContentCommentSelect;
};

/** Standard shape for a content item returned to any calendar-style UI. */
export const contentItemInclude = {
  project: { select: { id: true, title: true, slug: true } },
  assets: {
    orderBy: { order: "asc" },
    include: {
      file: {
        select: {
          id: true,
          name: true,
          url: true,
          type: true,
          thumbnail: true,
          category: true,
        },
      },
    },
  },
  approvals: approvalPreviewArgs,
} satisfies Prisma.ContentItemInclude;

/** As above, plus the owning client — for cross-client admin listings. */
export const contentItemAdminInclude = {
  ...contentItemInclude,
  plan: {
    select: {
      id: true,
      title: true,
      month: true,
      year: true,
      client: { select: { id: true, name: true, username: true, email: true } },
    },
  },
} satisfies Prisma.ContentItemInclude;

/** Item + full thread — for the review drawer and approval responses. */
export const contentItemDetailInclude = {
  ...contentItemInclude,
  approvals: approvalThreadArgs,
} satisfies Prisma.ContentItemInclude;
