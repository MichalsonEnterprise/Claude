import { prisma } from '../db.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { PostizClient, type CreatePostInput } from '../postiz/postizClient.js';
import type { PlatformKey } from '../content/writers/types.js';
import type { PublishingSlot } from '../scheduler/calendar.js';

const ENUM_TO_INTEGRATION_IDENTIFIER: Record<string, PlatformKey> = {
  LINKEDIN: 'linkedin',
  LINKEDIN_PAGE: 'linkedin-page',
  X: 'x',
  FACEBOOK: 'facebook',
  INSTAGRAM: 'instagram',
  TIKTOK: 'tiktok',
};

export interface PublishOutcome {
  scheduledContentId: string;
  status: 'SENT_TO_POSTIZ' | 'FAILED' | 'SKIPPED_NOT_ALLOWED' | 'SKIPPED_DRY_RUN';
  postizPostId?: string;
  error?: string;
}

/**
 * Decides whether a draft is allowed to move to scheduling given the
 * current autopilot mode, then (real or dry-run) sends it to Postiz.
 * This is steps 13-16 of the full pipeline (brief #30).
 */
export async function schedulePublishDraft(draftId: string, slot: PublishingSlot): Promise<PublishOutcome | null> {
  const draft = await prisma.contentDraft.findUniqueOrThrow({
    where: { id: draftId },
    include: { media: true, approvals: true },
  });

  const canAutoPublish =
    config.autopilotMode === 'FULL_AUTO' && draft.safetyVerdict === 'ALLOW';
  const isApproved =
    config.autopilotMode === 'DRAFT' && draft.approvals.some((a) => a.decision === 'APPROVED');

  if (config.autopilotMode === 'OFF') {
    logger.info('scheduled', { draftId, outcome: 'SKIPPED_NOT_ALLOWED', reason: 'AUTOPILOT_MODE=OFF' });
    return null;
  }
  if (!canAutoPublish && !isApproved) {
    // In DRAFT mode this is expected — it just means "waiting for approval",
    // not a failure.
    return null;
  }

  const client = new PostizClient();
  const integrations = await client.listIntegrations();
  const platformIdentifier = ENUM_TO_INTEGRATION_IDENTIFIER[draft.platform];
  const integration = integrations.find((i) => i.identifier === platformIdentifier && !i.disabled);

  if (!integration) {
    await failScheduled(draft.id, slot, `No connected Postiz integration for platform "${platformIdentifier}"`);
    return { scheduledContentId: '', status: 'FAILED', error: 'no-integration' };
  }

  // Upload media first (if any) so we can reference the resulting Postiz
  // media ids in the post payload.
  const uploadedImageIds: { id: string }[] = [];
  for (const media of draft.media) {
    try {
      const uploaded = config.dryRun
        ? { id: `dry-run-media-${media.id}`, name: media.filePath, path: media.filePath }
        : await client.uploadMedia(media.filePath);
      await prisma.mediaAsset.update({ where: { id: media.id }, data: { postizId: uploaded.id } });
      uploadedImageIds.push({ id: uploaded.id });
    } catch (err) {
      logger.error('Media upload to Postiz failed', { mediaId: media.id, error: (err as Error).message });
    }
  }

  const postInput: CreatePostInput = {
    type: 'schedule',
    date: slot.date.toISOString(),
    integrationId: integration.id,
    value: [{ content: draft.body, image: uploadedImageIds.length ? uploadedImageIds : undefined }],
    settings: { __type: platformIdentifier.replace('-page', '') },
  };

  const scheduled = await prisma.scheduledContent.create({
    data: {
      draftId: draft.id,
      platform: draft.platform,
      scheduledFor: slot.date,
      status: 'PLANNED',
    },
  });

  if (config.dryRun) {
    logger.info('WOULD_PUBLISH', { scheduledContentId: scheduled.id, draftId: draft.id, payload: postInput });
    await prisma.contentDraft.update({ where: { id: draft.id }, data: { status: 'SCHEDULED' } });
    return { scheduledContentId: scheduled.id, status: 'SKIPPED_DRY_RUN' };
  }

  try {
    const [result] = await client.createPost(postInput);
    await prisma.scheduledContent.update({
      where: { id: scheduled.id },
      data: { status: 'SENT_TO_POSTIZ', postizPostId: result.postId, postizIntegrationId: integration.id, attempts: { increment: 1 } },
    });
    await prisma.contentDraft.update({ where: { id: draft.id }, data: { status: 'SCHEDULED' } });
    logger.info('published', { scheduledContentId: scheduled.id, postizPostId: result.postId });
    return { scheduledContentId: scheduled.id, status: 'SENT_TO_POSTIZ', postizPostId: result.postId };
  } catch (err) {
    await failScheduled(draft.id, slot, (err as Error).message, scheduled.id);
    return { scheduledContentId: scheduled.id, status: 'FAILED', error: (err as Error).message };
  }
}

async function failScheduled(draftId: string, slot: PublishingSlot, error: string, scheduledId?: string) {
  logger.error('failed', { draftId, error, slot: slot.date.toISOString() });
  if (scheduledId) {
    await prisma.scheduledContent.update({
      where: { id: scheduledId },
      data: { status: 'FAILED', lastError: error, attempts: { increment: 1 } },
    });
  }
  await prisma.contentDraft.update({ where: { id: draftId }, data: { status: 'FAILED' } }).catch(() => {});
}
