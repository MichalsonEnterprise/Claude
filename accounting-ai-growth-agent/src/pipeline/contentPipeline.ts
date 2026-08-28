import { join } from 'node:path';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { generateTopicBrief, type TopicBrief } from '../content/topicBrief.js';
import { writeForPlatform } from '../content/writers/index.js';
import type { PlatformKey } from '../content/writers/types.js';
import { generateCards, type MediaFormat } from '../media/cardGenerator.js';
import { runSafetyGate } from '../safety/safetyGate.js';
import { normalizeText } from '../content/duplicateDetection.js';
import type { Topic, Claim, Platform } from '@prisma/client';

const PLATFORM_TO_ENUM: Record<PlatformKey, Platform> = {
  linkedin: 'LINKEDIN',
  'linkedin-page': 'LINKEDIN_PAGE',
  x: 'X',
  facebook: 'FACEBOOK',
  instagram: 'INSTAGRAM',
  tiktok: 'TIKTOK',
};

const NEEDS_MEDIA: Partial<Record<PlatformKey, MediaFormat>> = {
  instagram: 'instagram',
  tiktok: 'tiktok',
};

export async function briefForTopic(topic: Topic): Promise<TopicBrief> {
  const brief = await generateTopicBrief({
    sourceMaterial: topic.summary,
    pillar: topic.contentPillar as any,
    isEvergreen: topic.kind !== 'NEWS',
  });
  await prisma.topic.update({ where: { id: topic.id }, data: { status: 'BRIEFED' } });
  return brief;
}

export interface DraftResult {
  draftId: string;
  platform: PlatformKey;
  safetyVerdict: string;
  mediaCount: number;
}

/**
 * Generates one platform-specific draft from a TopicBrief, produces media
 * when the platform needs it, runs the Safety Gate, and persists everything.
 * This is steps 9-12 of the full pipeline (brief #30).
 */
export async function generateDraftForPlatform(
  topic: Topic,
  brief: TopicBrief,
  claims: Claim[],
  platform: PlatformKey,
  mediaOutDir: string,
): Promise<DraftResult> {
  const platformDraft = await writeForPlatform(brief, platform);

  const semanticSummary = normalizeText(`${brief.title} ${platformDraft.hook} ${platformDraft.body}`).slice(0, 500);

  const claimVerification = topic.kind === 'NEWS' ? aggregateVerification(claims) : null;
  const safety = await runSafetyGate({
    title: brief.title,
    body: `${platformDraft.hook}\n${platformDraft.body}`,
    claimVerification,
    isNewsBased: topic.kind === 'NEWS',
  });

  const draft = await prisma.contentDraft.create({
    data: {
      topicId: topic.id,
      platform: PLATFORM_TO_ENUM[platform],
      body: platformDraft.body,
      hook: platformDraft.hook,
      hashtags: platformDraft.hashtags || [],
      slideCount: platformDraft.slides?.length || 0,
      status: 'SAFETY_CHECKED',
      safetyVerdict: safety.verdict,
      safetyReasons: safety.reasons,
      semanticSummary,
    },
  });

  let mediaCount = 0;
  const mediaFormat = NEEDS_MEDIA[platform];
  if (mediaFormat && platformDraft.slides && platformDraft.slides.length > 0) {
    const generated = await generateCards(platformDraft.slides, mediaFormat, mediaOutDir, `${draft.id}`);
    for (const g of generated) {
      await prisma.mediaAsset.create({
        data: { draftId: draft.id, slideIndex: g.slideIndex, filePath: g.filePath, width: g.width, height: g.height },
      });
    }
    mediaCount = generated.length;
  }

  // DRAFT autopilot mode: every draft needs an explicit human approval
  // record before it can move to scheduling.
  if (config.autopilotMode === 'DRAFT') {
    await prisma.approval.create({ data: { draftId: draft.id, decision: 'PENDING' } });
  }

  logger.info('contentGenerated', { draftId: draft.id, platform, safetyVerdict: safety.verdict, mediaCount });
  return { draftId: draft.id, platform, safetyVerdict: safety.verdict, mediaCount };
}

function aggregateVerification(claims: Claim[]) {
  if (claims.length === 0) return null;
  const order = ['CONFLICTING', 'UNVERIFIED', 'PARTIALLY_VERIFIED', 'VERIFIED'] as const;
  for (const status of order) {
    if (claims.some((c) => c.verification === status)) return status;
  }
  return null;
}

export function mediaDirFor(baseDir: string, topicId: string) {
  return join(baseDir, topicId);
}
