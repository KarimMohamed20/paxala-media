-- PMP Playground: collaborative creative rooms.
--
-- Purely additive: 15 new tables and 10 new enums. No existing table is altered
-- or dropped, and the back-relations added to User, Project and ProjectFile are
-- Prisma-side relation fields only (the foreign keys live on the new tables), so
-- no existing column changes type or nullability.
--
-- Generated with `prisma migrate diff` between the previous datamodel and the
-- new one, NOT against the dev database: the local dev DB is behind its own
-- migration history (it is missing the Lead pipeline), and diffing against it
-- would have folded that unrelated drift into this migration.

-- CreateEnum
CREATE TYPE "PlaygroundRoomStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RoomMemberRole" AS ENUM ('OWNER', 'EDITOR', 'APPROVER', 'VIEWER');

-- CreateEnum
CREATE TYPE "NodeVisibility" AS ENUM ('TEAM_ONLY', 'CLIENT_SELECTED', 'EVERYONE');

-- CreateEnum
CREATE TYPE "PlaygroundNodeKind" AS ENUM ('STICKY', 'TEXT', 'IMAGE', 'FILE', 'DRAWING', 'SHAPE', 'FRAME', 'CAMPAIGN_ROUTE', 'SCRIPT', 'PALETTE', 'POLL', 'DECISION', 'AI_CARD');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('TEAM', 'SHARED');

-- CreateEnum
CREATE TYPE "RoomApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'CHANGES_REQUESTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "RoomApprovalAction" AS ENUM ('SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AiRunStatus" AS ENUM ('OK', 'FAILED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "PlaygroundLinkEntity" AS ENUM ('TASK', 'PROJECT_FILE', 'MILESTONE');

-- CreateEnum
CREATE TYPE "PlaygroundEventType" AS ENUM ('NODE_CREATE', 'NODE_MOVE', 'NODE_RESIZE', 'NODE_STYLE', 'NODE_TEXT', 'NODE_DATA', 'NODE_VISIBILITY', 'NODE_ORDER', 'NODE_DELETE', 'EDGE_CREATE', 'EDGE_UPDATE', 'EDGE_DELETE', 'COMMENT_ADDED', 'COMMENT_RESOLVED', 'MESSAGE', 'REACTION', 'DECISION_RECORDED', 'PUBLISHED_TO_CLIENT', 'UNPUBLISHED_FROM_CLIENT', 'APPROVAL_SUBMITTED', 'APPROVAL_APPROVED', 'APPROVAL_CHANGES_REQUESTED', 'APPROVAL_WITHDRAWN', 'MEMBER_ADDED', 'MEMBER_REMOVED', 'ROOM_UPDATED', 'FILE_UPLOADED', 'AI_GENERATED', 'SAVED_TO_PROJECT');

-- CreateTable
CREATE TABLE "PlaygroundRoom" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "PlaygroundRoomStatus" NOT NULL DEFAULT 'ACTIVE',
    "clientId" TEXT,
    "projectId" TEXT,
    "restricted" BOOLEAN NOT NULL DEFAULT false,
    "opSeq" INTEGER NOT NULL DEFAULT 0,
    "camera" JSONB,
    "createdById" TEXT,
    "createdByName" TEXT,
    "lastActiveAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaygroundRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaygroundMember" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "RoomMemberRole" NOT NULL DEFAULT 'VIEWER',
    "lastSeenSeq" INTEGER NOT NULL DEFAULT 0,
    "lastViewport" JSONB,
    "lastSeenAt" TIMESTAMP(3),
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaygroundMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaygroundNode" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "kind" "PlaygroundNodeKind" NOT NULL,
    "visibility" "NodeVisibility" NOT NULL DEFAULT 'TEAM_ONLY',
    "clientVisibleSince" TIMESTAMP(3),
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "w" DOUBLE PRECISION NOT NULL DEFAULT 240,
    "h" DOUBLE PRECISION NOT NULL DEFAULT 160,
    "z" INTEGER NOT NULL DEFAULT 0,
    "rotation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "frameId" TEXT,
    "text" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "style" JSONB NOT NULL DEFAULT '{}',
    "fileId" TEXT,
    "roomFileId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "editLockById" TEXT,
    "editLockAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaygroundNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaygroundEdge" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'arrow',
    "style" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaygroundEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaygroundEvent" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "type" "PlaygroundEventType" NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "actorRole" "Role" NOT NULL,
    "nodeId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "clientOpId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaygroundEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaygroundComment" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "nodeId" TEXT,
    "body" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT,
    "authorRole" "Role" NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaygroundComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaygroundMessage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL DEFAULT 'TEAM',
    "body" TEXT NOT NULL,
    "replyToId" TEXT,
    "nodeId" TEXT,
    "authorId" TEXT,
    "authorName" TEXT,
    "authorRole" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaygroundMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaygroundReaction" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaygroundReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaygroundDecision" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "options" JSONB NOT NULL DEFAULT '[]',
    "outcome" TEXT,
    "nodeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT,
    "createdByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaygroundDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaygroundApproval" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "decisionId" TEXT,
    "status" "RoomApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "note" TEXT,
    "payload" JSONB NOT NULL,
    "contentHash" TEXT NOT NULL,
    "atSeq" INTEGER NOT NULL,
    "requestedById" TEXT,
    "requestedByName" TEXT,
    "dueAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaygroundApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaygroundApprovalAction" (
    "id" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "action" "RoomApprovalAction" NOT NULL,
    "notes" TEXT,
    "responderId" TEXT,
    "responderName" TEXT,
    "responderRole" "Role" NOT NULL,
    "fromStatus" "RoomApprovalStatus",
    "toStatus" "RoomApprovalStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaygroundApprovalAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaygroundFile" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" DOUBLE PRECISION,
    "thumbUrl" TEXT,
    "projectFileId" TEXT,
    "uploadedById" TEXT,
    "uploadedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaygroundFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaygroundAiRun" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "nodeIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "output" TEXT NOT NULL,
    "status" "AiRunStatus" NOT NULL DEFAULT 'OK',
    "error" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaygroundAiRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaygroundSummary" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "fromSeq" INTEGER NOT NULL,
    "toSeq" INTEGER NOT NULL,
    "draft" JSONB NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "sharedWithClientAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaygroundSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaygroundLink" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "nodeId" TEXT,
    "entityType" "PlaygroundLinkEntity" NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaygroundLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlaygroundRoom_slug_key" ON "PlaygroundRoom"("slug");

-- CreateIndex
CREATE INDEX "PlaygroundRoom_clientId_idx" ON "PlaygroundRoom"("clientId");

-- CreateIndex
CREATE INDEX "PlaygroundRoom_projectId_idx" ON "PlaygroundRoom"("projectId");

-- CreateIndex
CREATE INDEX "PlaygroundRoom_status_lastActiveAt_idx" ON "PlaygroundRoom"("status", "lastActiveAt");

-- CreateIndex
CREATE INDEX "PlaygroundMember_userId_idx" ON "PlaygroundMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaygroundMember_roomId_userId_key" ON "PlaygroundMember"("roomId", "userId");

-- CreateIndex
CREATE INDEX "PlaygroundNode_roomId_idx" ON "PlaygroundNode"("roomId");

-- CreateIndex
CREATE INDEX "PlaygroundNode_roomId_visibility_clientVisibleSince_idx" ON "PlaygroundNode"("roomId", "visibility", "clientVisibleSince");

-- CreateIndex
CREATE INDEX "PlaygroundNode_frameId_idx" ON "PlaygroundNode"("frameId");

-- CreateIndex
CREATE INDEX "PlaygroundNode_roomFileId_idx" ON "PlaygroundNode"("roomFileId");

-- CreateIndex
CREATE INDEX "PlaygroundEdge_roomId_idx" ON "PlaygroundEdge"("roomId");

-- CreateIndex
CREATE INDEX "PlaygroundEdge_fromNodeId_idx" ON "PlaygroundEdge"("fromNodeId");

-- CreateIndex
CREATE INDEX "PlaygroundEdge_toNodeId_idx" ON "PlaygroundEdge"("toNodeId");

-- CreateIndex
CREATE INDEX "PlaygroundEvent_roomId_seq_idx" ON "PlaygroundEvent"("roomId", "seq");

-- CreateIndex
CREATE INDEX "PlaygroundEvent_actorId_idx" ON "PlaygroundEvent"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaygroundEvent_roomId_seq_key" ON "PlaygroundEvent"("roomId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "PlaygroundEvent_roomId_clientOpId_key" ON "PlaygroundEvent"("roomId", "clientOpId");

-- CreateIndex
CREATE INDEX "PlaygroundComment_roomId_createdAt_idx" ON "PlaygroundComment"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "PlaygroundComment_nodeId_idx" ON "PlaygroundComment"("nodeId");

-- CreateIndex
CREATE INDEX "PlaygroundComment_authorId_idx" ON "PlaygroundComment"("authorId");

-- CreateIndex
CREATE INDEX "PlaygroundMessage_roomId_channel_createdAt_idx" ON "PlaygroundMessage"("roomId", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "PlaygroundMessage_nodeId_idx" ON "PlaygroundMessage"("nodeId");

-- CreateIndex
CREATE INDEX "PlaygroundMessage_authorId_idx" ON "PlaygroundMessage"("authorId");

-- CreateIndex
CREATE INDEX "PlaygroundReaction_nodeId_idx" ON "PlaygroundReaction"("nodeId");

-- CreateIndex
CREATE INDEX "PlaygroundReaction_userId_idx" ON "PlaygroundReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaygroundReaction_nodeId_userId_kind_key" ON "PlaygroundReaction"("nodeId", "userId", "kind");

-- CreateIndex
CREATE INDEX "PlaygroundDecision_roomId_createdAt_idx" ON "PlaygroundDecision"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "PlaygroundApproval_roomId_status_idx" ON "PlaygroundApproval"("roomId", "status");

-- CreateIndex
CREATE INDEX "PlaygroundApproval_contentHash_idx" ON "PlaygroundApproval"("contentHash");

-- CreateIndex
CREATE INDEX "PlaygroundApprovalAction_approvalId_createdAt_idx" ON "PlaygroundApprovalAction"("approvalId", "createdAt");

-- CreateIndex
CREATE INDEX "PlaygroundApprovalAction_responderId_idx" ON "PlaygroundApprovalAction"("responderId");

-- CreateIndex
CREATE INDEX "PlaygroundFile_roomId_idx" ON "PlaygroundFile"("roomId");

-- CreateIndex
CREATE INDEX "PlaygroundFile_projectFileId_idx" ON "PlaygroundFile"("projectFileId");

-- CreateIndex
CREATE INDEX "PlaygroundAiRun_roomId_createdAt_idx" ON "PlaygroundAiRun"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "PlaygroundAiRun_createdAt_idx" ON "PlaygroundAiRun"("createdAt");

-- CreateIndex
CREATE INDEX "PlaygroundSummary_roomId_createdAt_idx" ON "PlaygroundSummary"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "PlaygroundLink_roomId_idx" ON "PlaygroundLink"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaygroundLink_roomId_entityType_entityId_key" ON "PlaygroundLink"("roomId", "entityType", "entityId");

-- AddForeignKey
ALTER TABLE "PlaygroundRoom" ADD CONSTRAINT "PlaygroundRoom_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundRoom" ADD CONSTRAINT "PlaygroundRoom_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundRoom" ADD CONSTRAINT "PlaygroundRoom_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundMember" ADD CONSTRAINT "PlaygroundMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PlaygroundRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundMember" ADD CONSTRAINT "PlaygroundMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundNode" ADD CONSTRAINT "PlaygroundNode_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PlaygroundRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundNode" ADD CONSTRAINT "PlaygroundNode_frameId_fkey" FOREIGN KEY ("frameId") REFERENCES "PlaygroundNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundNode" ADD CONSTRAINT "PlaygroundNode_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "ProjectFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundNode" ADD CONSTRAINT "PlaygroundNode_roomFileId_fkey" FOREIGN KEY ("roomFileId") REFERENCES "PlaygroundFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundNode" ADD CONSTRAINT "PlaygroundNode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundEdge" ADD CONSTRAINT "PlaygroundEdge_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PlaygroundRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundEdge" ADD CONSTRAINT "PlaygroundEdge_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "PlaygroundNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundEdge" ADD CONSTRAINT "PlaygroundEdge_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "PlaygroundNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundEvent" ADD CONSTRAINT "PlaygroundEvent_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PlaygroundRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundEvent" ADD CONSTRAINT "PlaygroundEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundComment" ADD CONSTRAINT "PlaygroundComment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PlaygroundRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundComment" ADD CONSTRAINT "PlaygroundComment_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "PlaygroundNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundComment" ADD CONSTRAINT "PlaygroundComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundMessage" ADD CONSTRAINT "PlaygroundMessage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PlaygroundRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundMessage" ADD CONSTRAINT "PlaygroundMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "PlaygroundMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundMessage" ADD CONSTRAINT "PlaygroundMessage_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "PlaygroundNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundMessage" ADD CONSTRAINT "PlaygroundMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundReaction" ADD CONSTRAINT "PlaygroundReaction_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "PlaygroundNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundReaction" ADD CONSTRAINT "PlaygroundReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundDecision" ADD CONSTRAINT "PlaygroundDecision_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PlaygroundRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundDecision" ADD CONSTRAINT "PlaygroundDecision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundApproval" ADD CONSTRAINT "PlaygroundApproval_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PlaygroundRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundApproval" ADD CONSTRAINT "PlaygroundApproval_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "PlaygroundDecision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundApproval" ADD CONSTRAINT "PlaygroundApproval_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundApprovalAction" ADD CONSTRAINT "PlaygroundApprovalAction_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "PlaygroundApproval"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundApprovalAction" ADD CONSTRAINT "PlaygroundApprovalAction_responderId_fkey" FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundFile" ADD CONSTRAINT "PlaygroundFile_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PlaygroundRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundFile" ADD CONSTRAINT "PlaygroundFile_projectFileId_fkey" FOREIGN KEY ("projectFileId") REFERENCES "ProjectFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundFile" ADD CONSTRAINT "PlaygroundFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundAiRun" ADD CONSTRAINT "PlaygroundAiRun_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PlaygroundRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundAiRun" ADD CONSTRAINT "PlaygroundAiRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundSummary" ADD CONSTRAINT "PlaygroundSummary_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PlaygroundRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundSummary" ADD CONSTRAINT "PlaygroundSummary_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaygroundLink" ADD CONSTRAINT "PlaygroundLink_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "PlaygroundRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

