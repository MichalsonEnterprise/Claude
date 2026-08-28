import { join } from 'node:path';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { runResearch } from '../research/researchEngine.js';
import { planTopics, verifyTopic } from './topicPipeline.js';
import { briefForTopic, generateDraftForPlatform, mediaDirFor } from './contentPipeline.js';
import { schedulePublishDraft } from './publishPipeline.js';
import { buildWeeklyCalendar, nextMonday } from '../scheduler/calendar.js';
import { withPipelineLock } from './lock.js';
import { startRun } from './runLog.js';
import { isPaused } from './pauseState.js';
import type { PlatformKey } from '../content/writers/types.js';
import type { Platform } from '@prisma/client';

const MEDIA_BASE_DIR = process.env.MEDIA_OUTPUT_DIR || join(process.cwd(), 'artifacts', 'media');

export async function runResearchStage() {
  return withPipelineLock('research', async () => {
    const run = await startRun('RESEARCH');
    await run.stage('researchStarted', 'Fetching all enabled sources');
    try {
      const result = await runResearch();
      await run.stage('researchFound', `Found ${result.itemsNew} new items across ${result.sourcesChecked} sources`, result);
      await run.finish(result.errors > 0 ? 'PARTIAL_FAILURE' : 'SUCCESS');
      return result;
    } catch (err) {
      await run.stage('failed', (err as Error).message);
      await run.finish('FAILED', (err as Error).message);
      throw err;
    }
  });
}

/**
 * Full autonomous pipeline for a target number of topics: score/select ->
 * verify -> brief -> write per platform -> media -> safety gate -> persist.
 * Does NOT schedule/publish — that's a separate, explicit step so DRAFT
 * mode can insert human approval in between (brief #18).
 */
export async function runPlanStage(targetTopicCount = 7) {
  if (await isPaused()) {
    logger.info('runPlanStage skipped: autopilot paused');
    return { topicsOk: 0, topicsRejected: 0, draftsCreated: 0, paused: true };
  }
  return withPipelineLock('plan', async () => {
    const run = await startRun('PLAN');
    let topicsOk = 0;
    let topicsRejected = 0;
    let draftsCreated = 0;

    try {
      const topics = await planTopics(targetTopicCount);
      await run.stage('topicSelected', `Selected ${topics.length} candidate topics`, { count: topics.length });

      for (const topic of topics) {
        const verdict = await verifyTopic(topic);
        if (!verdict.ok) {
          topicsRejected++;
          await run.stage('verificationFailed', `Topic rejected: ${topic.title}`, { topicId: topic.id, verdict: verdict.verdict });
          continue;
        }
        await run.stage('verificationPassed', `Topic verified: ${topic.title}`, { topicId: topic.id, verdict: verdict.verdict });
        topicsOk++;

        const brief = await briefForTopic(topic);
        const claims = await prisma.claim.findMany({ where: { topicId: topic.id } });

        for (const platform of config.publishing.enabledPlatforms as PlatformKey[]) {
          try {
            const draftResult = await generateDraftForPlatform(topic, brief, claims, platform, mediaDirFor(MEDIA_BASE_DIR, topic.id));
            await run.stage('safetyPassed', `Draft ${draftResult.draftId} (${platform}): ${draftResult.safetyVerdict}`, draftResult);
            draftsCreated++;
          } catch (err) {
            // A single platform failing must never abort the whole plan run.
            await run.stage('failed', `Draft generation failed for ${platform} on topic ${topic.id}: ${(err as Error).message}`);
          }
        }
      }

      await run.finish('SUCCESS');
      return { topicsOk, topicsRejected, draftsCreated };
    } catch (err) {
      await run.stage('failed', (err as Error).message);
      await run.finish('FAILED', (err as Error).message);
      throw err;
    }
  });
}

/**
 * Builds the calendar for the upcoming week and, for every existing
 * approved/allow-verdict draft not yet scheduled, assigns it a slot and
 * pushes it toward Postiz (real or dry-run per config.dryRun).
 */
export async function runGenerateWeekStage() {
  if (await isPaused()) {
    logger.info('runGenerateWeekStage skipped: autopilot paused');
    return { weekStart: nextMonday(), slots: 0, sent: 0, waiting: 0, failed: 0, paused: true };
  }
  return withPipelineLock('generate-week', async () => {
    const run = await startRun('GENERATE_WEEK');
    try {
      const weekStart = nextMonday();
      const platforms = config.publishing.enabledPlatforms as PlatformKey[];
      const slots = buildWeeklyCalendar(platforms, weekStart);
      await run.stage('scheduled', `Built ${slots.length} slots for week of ${weekStart.toISOString().slice(0, 10)}`);

      const platformToEnum: Record<PlatformKey, Platform> = {
        linkedin: 'LINKEDIN', 'linkedin-page': 'LINKEDIN_PAGE', x: 'X', facebook: 'FACEBOOK', instagram: 'INSTAGRAM', tiktok: 'TIKTOK',
      };

      let sent = 0;
      let waiting = 0;
      let failed = 0;

      for (const slot of slots) {
        const platformEnum = platformToEnum[slot.platform];
        const draft = await prisma.contentDraft.findFirst({
          where: { platform: platformEnum, status: { in: ['SAFETY_CHECKED', 'APPROVED'] } },
          orderBy: { createdAt: 'asc' },
        });
        if (!draft) continue;

        const outcome = await schedulePublishDraft(draft.id, slot);
        if (!outcome) {
          waiting++;
          continue;
        }
        if (outcome.status === 'FAILED') failed++;
        else sent++;
      }

      await run.stage('published', `sent=${sent} waitingApproval=${waiting} failed=${failed}`);
      await run.finish(failed > 0 ? 'PARTIAL_FAILURE' : 'SUCCESS');
      return { weekStart, slots: slots.length, sent, waiting, failed };
    } catch (err) {
      await run.stage('failed', (err as Error).message);
      await run.finish('FAILED', (err as Error).message);
      throw err;
    }
  });
}

/** Convenience: research -> plan in one call, used by the manual "run now" button and the periodic loop. */
export async function runFullPipeline() {
  return withPipelineLock('full-pipeline', async () => {
    const run = await startRun('FULL_PIPELINE');
    try {
      await runResearch();
      await run.stage('researchFound', 'Research stage complete inside full pipeline');
      if (await isPaused()) {
        await run.stage('failed', 'Autopilot paused — skipping topic planning');
        await run.finish('SUCCESS');
        return { topics: 0, paused: true };
      }
      const planResult = await planTopics(7);
      await run.stage('topicSelected', `Selected ${planResult.length} topics`);
      await run.finish('SUCCESS');
      return { topics: planResult.length };
    } catch (err) {
      await run.stage('failed', (err as Error).message);
      await run.finish('FAILED', (err as Error).message);
      throw err;
    }
  });
}

/** Periodic check: nothing to generate, just re-attempt sending any drafts stuck waiting on approval/allow. */
export async function runQueueCheckStage() {
  if (config.autopilotMode === 'OFF') return { checked: 0 };
  return withPipelineLock('queue-check', async () => {
    const run = await startRun('QUEUE_CHECK');
    const pending = await prisma.contentDraft.count({ where: { status: 'SAFETY_CHECKED' } });
    await run.stage('queueChecked', `${pending} drafts awaiting scheduling`);
    await run.finish('SUCCESS');
    return { checked: pending };
  });
}
