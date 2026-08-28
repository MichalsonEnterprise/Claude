-- CreateEnum
CREATE TYPE "SourceTier" AS ENUM ('TIER1_PRIMARY', 'TIER2_TRUSTED', 'TIER3_MEDIA');

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('RSS', 'HTML', 'API');

-- CreateEnum
CREATE TYPE "ResearchItemStatus" AS ENUM ('NEW', 'SCORED', 'SELECTED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TopicStatus" AS ENUM ('CANDIDATE', 'SELECTED', 'BRIEFED', 'VERIFIED', 'REJECTED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TopicKind" AS ENUM ('NEWS', 'EVERGREEN', 'PRODUCT_LED');

-- CreateEnum
CREATE TYPE "ClaimVerificationStatus" AS ENUM ('VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'CONFLICTING');

-- CreateEnum
CREATE TYPE "LegalStatus" AS ENUM ('DRAFT', 'CONSULTATION', 'PROPOSAL', 'SIGNED_LAW', 'IN_FORCE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('LINKEDIN', 'LINKEDIN_PAGE', 'X', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK');

-- CreateEnum
CREATE TYPE "DraftStatus" AS ENUM ('GENERATED', 'SAFETY_CHECKED', 'APPROVED', 'REJECTED', 'SCHEDULED', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('PLANNED', 'SENT_TO_POSTIZ', 'CONFIRMED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RunKind" AS ENUM ('RESEARCH', 'PLAN', 'GENERATE_WEEK', 'FULL_PIPELINE', 'QUEUE_CHECK');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL_FAILURE', 'FAILED');

-- CreateTable
CREATE TABLE "ResearchSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "kind" "SourceKind" NOT NULL,
    "tier" "SourceTier" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResearchSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceTier" "SourceTier" NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawSummary" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION,
    "freshnessScore" DOUBLE PRECISION,
    "authorityScore" DOUBLE PRECISION,
    "accountingRelevance" DOUBLE PRECISION,
    "productRelevance" DOUBLE PRECISION,
    "finalScore" DOUBLE PRECISION,
    "status" "ResearchItemStatus" NOT NULL DEFAULT 'NEW',
    "contentHash" TEXT NOT NULL,

    CONSTRAINT "ResearchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topic" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "kind" "TopicKind" NOT NULL,
    "contentPillar" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "novelty" DOUBLE PRECISION NOT NULL,
    "status" "TopicStatus" NOT NULL DEFAULT 'CANDIDATE',
    "semanticKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "legalStatus" "LegalStatus" NOT NULL DEFAULT 'UNKNOWN',
    "confidence" DOUBLE PRECISION NOT NULL,
    "verification" "ClaimVerificationStatus" NOT NULL,
    "reasoning" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceEvidence" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceTier" "SourceTier" NOT NULL,
    "url" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "supports" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentDraft" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "body" TEXT NOT NULL,
    "hook" TEXT,
    "hashtags" TEXT[],
    "slideCount" INTEGER NOT NULL DEFAULT 0,
    "status" "DraftStatus" NOT NULL DEFAULT 'GENERATED',
    "safetyVerdict" TEXT,
    "safetyReasons" TEXT[],
    "semanticSummary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "slideIndex" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "postizId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledContent" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'PLANNED',
    "postizPostId" TEXT,
    "postizIntegrationId" TEXT,
    "lastError" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishedContent" (
    "id" TEXT NOT NULL,
    "scheduledContentId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "postizPostId" TEXT NOT NULL,
    "releaseUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "impressions" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "engagementRate" DOUBLE PRECISION,
    "metricsFetchedAt" TIMESTAMP(3),

    CONSTRAINT "PublishedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "kind" "RunKind" NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "log" JSONB[],
    "errorSummary" TEXT,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "_ResearchItemToTopic" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ResearchSource_url_key" ON "ResearchSource"("url");

-- CreateIndex
CREATE INDEX "ResearchSource_tier_idx" ON "ResearchSource"("tier");

-- CreateIndex
CREATE INDEX "ResearchSource_enabled_idx" ON "ResearchSource"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchItem_contentHash_key" ON "ResearchItem"("contentHash");

-- CreateIndex
CREATE INDEX "ResearchItem_status_idx" ON "ResearchItem"("status");

-- CreateIndex
CREATE INDEX "ResearchItem_contentHash_idx" ON "ResearchItem"("contentHash");

-- CreateIndex
CREATE INDEX "ResearchItem_discoveredAt_idx" ON "ResearchItem"("discoveredAt");

-- CreateIndex
CREATE INDEX "Topic_status_idx" ON "Topic"("status");

-- CreateIndex
CREATE INDEX "Topic_semanticKey_idx" ON "Topic"("semanticKey");

-- CreateIndex
CREATE INDEX "Topic_createdAt_idx" ON "Topic"("createdAt");

-- CreateIndex
CREATE INDEX "Claim_topicId_idx" ON "Claim"("topicId");

-- CreateIndex
CREATE INDEX "Claim_verification_idx" ON "Claim"("verification");

-- CreateIndex
CREATE INDEX "SourceEvidence_claimId_idx" ON "SourceEvidence"("claimId");

-- CreateIndex
CREATE INDEX "ContentDraft_topicId_idx" ON "ContentDraft"("topicId");

-- CreateIndex
CREATE INDEX "ContentDraft_platform_idx" ON "ContentDraft"("platform");

-- CreateIndex
CREATE INDEX "ContentDraft_status_idx" ON "ContentDraft"("status");

-- CreateIndex
CREATE INDEX "ContentDraft_createdAt_idx" ON "ContentDraft"("createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_draftId_idx" ON "MediaAsset"("draftId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledContent_draftId_key" ON "ScheduledContent"("draftId");

-- CreateIndex
CREATE INDEX "ScheduledContent_scheduledFor_idx" ON "ScheduledContent"("scheduledFor");

-- CreateIndex
CREATE INDEX "ScheduledContent_status_idx" ON "ScheduledContent"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedContent_scheduledContentId_key" ON "PublishedContent"("scheduledContentId");

-- CreateIndex
CREATE INDEX "PublishedContent_platform_idx" ON "PublishedContent"("platform");

-- CreateIndex
CREATE INDEX "PublishedContent_publishedAt_idx" ON "PublishedContent"("publishedAt");

-- CreateIndex
CREATE INDEX "Approval_draftId_idx" ON "Approval"("draftId");

-- CreateIndex
CREATE INDEX "Approval_decision_idx" ON "Approval"("decision");

-- CreateIndex
CREATE INDEX "AgentRun_kind_idx" ON "AgentRun"("kind");

-- CreateIndex
CREATE INDEX "AgentRun_status_idx" ON "AgentRun"("status");

-- CreateIndex
CREATE INDEX "AgentRun_startedAt_idx" ON "AgentRun"("startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "_ResearchItemToTopic_AB_unique" ON "_ResearchItemToTopic"("A", "B");

-- CreateIndex
CREATE INDEX "_ResearchItemToTopic_B_index" ON "_ResearchItemToTopic"("B");

-- AddForeignKey
ALTER TABLE "ResearchItem" ADD CONSTRAINT "ResearchItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ResearchSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceEvidence" ADD CONSTRAINT "SourceEvidence_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentDraft" ADD CONSTRAINT "ContentDraft_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ContentDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledContent" ADD CONSTRAINT "ScheduledContent_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ContentDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedContent" ADD CONSTRAINT "PublishedContent_scheduledContentId_fkey" FOREIGN KEY ("scheduledContentId") REFERENCES "ScheduledContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Approval" ADD CONSTRAINT "Approval_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "ContentDraft"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResearchItemToTopic" ADD CONSTRAINT "_ResearchItemToTopic_A_fkey" FOREIGN KEY ("A") REFERENCES "ResearchItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ResearchItemToTopic" ADD CONSTRAINT "_ResearchItemToTopic_B_fkey" FOREIGN KEY ("B") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
