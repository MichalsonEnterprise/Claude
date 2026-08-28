import { prisma } from '../db.js';
import { logger } from '../logger.js';
import { SOURCE_REGISTRY } from './sources.js';
import { fetchSource } from './fetcher.js';
import type { SourceTier } from './sources.js';

export async function ensureSourcesInDb() {
  for (const s of SOURCE_REGISTRY) {
    await prisma.researchSource.upsert({
      where: { url: s.url },
      update: { name: s.name, tier: s.tier, kind: s.kind, enabled: true },
      create: { name: s.name, url: s.url, tier: s.tier, kind: s.kind, enabled: true },
    });
  }
}

export interface ResearchRunResult {
  sourcesChecked: number;
  itemsFound: number;
  itemsNew: number;
  errors: number;
}

/**
 * Fetches every enabled source, dedupes by contentHash (never re-fetch/
 * re-analyze the same URL+title twice — brief #8), and stores new
 * ResearchItems as NEW for the scoring stage to pick up.
 */
export async function runResearch(): Promise<ResearchRunResult> {
  await ensureSourcesInDb();
  const sources = await prisma.researchSource.findMany({ where: { enabled: true } });

  let itemsFound = 0;
  let itemsNew = 0;
  let errors = 0;

  for (const source of sources) {
    const def = SOURCE_REGISTRY.find((s) => s.url === source.url);
    if (!def) continue;

    const fetched = await fetchSource(def);
    itemsFound += fetched.length;
    if (fetched.length === 0) continue;

    for (const item of fetched) {
      try {
        const existing = await prisma.researchItem.findUnique({ where: { contentHash: item.contentHash } });
        if (existing) continue;

        await prisma.researchItem.create({
          data: {
            title: item.title,
            url: item.url,
            sourceId: source.id,
            sourceName: source.name,
            sourceTier: source.tier as SourceTier,
            publishedAt: item.publishedAt,
            rawSummary: item.rawSummary,
            contentHash: item.contentHash,
            status: 'NEW',
          },
        });
        itemsNew++;
      } catch (err) {
        // A malformed single item must never abort the whole research run.
        errors++;
        logger.error('Failed to persist research item', { url: item.url, error: (err as Error).message });
      }
    }
  }

  logger.info('Research run complete', { sourcesChecked: sources.length, itemsFound, itemsNew, errors });
  return { sourcesChecked: sources.length, itemsFound, itemsNew, errors };
}
