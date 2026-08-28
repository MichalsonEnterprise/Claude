import { prisma } from '../db.js';
import { logger } from '../logger.js';

const LOCK_KEY = 'pipeline:lock';
const LOCK_TTL_MS = 30 * 60 * 1000; // 30 minutes — long enough for a full run, short enough to self-heal after a crash

/**
 * Simple DB-backed lock (SystemSetting row) preventing overlapping cron
 * runs (brief #29: "Dodaj locking"). Not distributed-systems-grade, but
 * this is a single-worker service, which is all the brief calls for.
 */
export async function withPipelineLock<T>(runId: string, fn: () => Promise<T>): Promise<T | null> {
  const now = Date.now();
  const existing = await prisma.systemSetting.findUnique({ where: { key: LOCK_KEY } });

  if (existing) {
    const heldSince = new Date(existing.updatedAt).getTime();
    if (now - heldSince < LOCK_TTL_MS) {
      logger.warn('Pipeline lock held by another run — skipping', { runId, lockedSince: existing.value });
      return null;
    }
    logger.warn('Stale pipeline lock found — reclaiming', { runId, staleValue: existing.value });
  }

  await prisma.systemSetting.upsert({
    where: { key: LOCK_KEY },
    update: { value: runId },
    create: { key: LOCK_KEY, value: runId },
  });

  try {
    return await fn();
  } finally {
    await prisma.systemSetting.deleteMany({ where: { key: LOCK_KEY, value: runId } });
  }
}
