/**
 * DRY_RUN sample-week generator (brief #34). Forces DRY_RUN + mock
 * AI/Postiz so this can run anywhere with just a database, then copies the
 * generated drafts/media into artifacts/sample-week/ as a human-readable
 * snapshot.
 */
process.env.DRY_RUN = 'true';
process.env.AUTOPILOT_MODE = process.env.AUTOPILOT_MODE || 'DRAFT';

import { mkdirSync, writeFileSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { prisma } from '../src/db.js';
import { logger } from '../src/logger.js';
import { runResearchStage, runPlanStage, runGenerateWeekStage } from '../src/pipeline/orchestrator.js';

const OUT_DIR = join(process.cwd(), 'artifacts', 'sample-week');

async function main() {
  if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  logger.info('Sample week generation starting');
  await runResearchStage();
  await runPlanStage(7);
  const weekResult = await runGenerateWeekStage();

  const drafts = await prisma.contentDraft.findMany({
    orderBy: { createdAt: 'asc' },
    include: { media: true, topic: true, scheduled: true },
  });

  const summary: any[] = [];
  for (const draft of drafts) {
    const fileName = `${draft.platform}-${draft.id}.md`;
    const md = [
      `# ${draft.topic.title}`,
      '',
      `**Platform:** ${draft.platform}`,
      `**Pillar:** ${draft.topic.contentPillar}`,
      `**Safety verdict:** ${draft.safetyVerdict}`,
      draft.safetyReasons.length ? `**Safety reasons:** ${draft.safetyReasons.join('; ')}` : '',
      `**Scheduled for:** ${draft.scheduled ? draft.scheduled.scheduledFor.toISOString() : '(not scheduled — waiting on approval or no slot)'}`,
      '',
      '## Hook',
      draft.hook || '(none)',
      '',
      '## Body',
      draft.body,
      '',
      draft.hashtags.length ? `## Hashtags\n${draft.hashtags.join(' ')}` : '',
    ].filter((l) => l !== '').join('\n');

    writeFileSync(join(OUT_DIR, fileName), md, 'utf-8');

    for (const media of draft.media) {
      const destName = `${draft.platform}-${draft.id}-slide-${media.slideIndex + 1}.png`;
      try {
        copyFileSync(media.filePath, join(OUT_DIR, destName));
      } catch (err) {
        logger.warn('Could not copy media into sample-week artifacts', { filePath: media.filePath, error: (err as Error).message });
      }
    }

    summary.push({
      platform: draft.platform,
      topic: draft.topic.title,
      pillar: draft.topic.contentPillar,
      safetyVerdict: draft.safetyVerdict,
      scheduledFor: draft.scheduled?.scheduledFor ?? null,
      mediaSlides: draft.media.length,
      file: fileName,
    });
  }

  writeFileSync(join(OUT_DIR, 'SUMMARY.json'), JSON.stringify({ generatedAt: new Date().toISOString(), weekResult, drafts: summary }, null, 2));
  logger.info('Sample week generation complete', { drafts: summary.length, outDir: OUT_DIR });
}

main()
  .then(() => {
    // Explicit exit: the research fetchers leave open keep-alive sockets
    // (undici's fetch connection pool) that would otherwise keep this
    // one-shot CLI process alive indefinitely after the real work is done.
    process.exit(0);
  })
  .catch((err) => {
    logger.error('Sample week generation failed', { error: (err as Error).message, stack: (err as Error).stack });
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
