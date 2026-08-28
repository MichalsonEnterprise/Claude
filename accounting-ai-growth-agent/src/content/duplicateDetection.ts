import { prisma } from '../db.js';
import { config } from '../config.js';

/** Lowercase, strip punctuation/diacritics-insensitive-ish, collapse whitespace. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set([
  'i', 'w', 'z', 'na', 'do', 'nie', 'to', 'jest', 'oraz', 'dla', 'o', 'a', 'the', 'and', 'of', 'to', 'in', 'is',
]);

export function keywordSet(text: string): Set<string> {
  return new Set(
    normalizeText(text)
      .split(' ')
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

/** Jaccard overlap between two keyword sets, 0..1. */
export function keywordOverlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function semanticKeyFor(title: string): string {
  return Array.from(keywordSet(title)).sort().join('-').slice(0, 200) || 'untitled';
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  bestOverlap: number;
  matchedTitle?: string;
  matchedAt?: Date;
}

/**
 * MVP duplicate detection (brief #16): normalized text similarity + keyword
 * overlap against topics created within the duplicate window. No embeddings
 * required. An LLM duplicate judgment can be layered on top by callers that
 * want a second opinion on borderline overlap scores (see safetyGate).
 */
export async function checkDuplicateTopic(candidateTitle: string, candidateSummary: string): Promise<DuplicateCheckResult> {
  const since = new Date(Date.now() - config.research.duplicateWindowDays * 24 * 60 * 60 * 1000);
  const recent = await prisma.topic.findMany({
    where: { createdAt: { gte: since }, status: { in: ['SELECTED', 'BRIEFED', 'VERIFIED', 'PUBLISHED'] } },
    select: { title: true, summary: true, createdAt: true },
  });

  const candidateSet = keywordSet(`${candidateTitle} ${candidateSummary}`);
  let best = { overlap: 0, title: undefined as string | undefined, at: undefined as Date | undefined };

  for (const topic of recent) {
    const existingSet = keywordSet(`${topic.title} ${topic.summary}`);
    const overlap = keywordOverlap(candidateSet, existingSet);
    if (overlap > best.overlap) best = { overlap, title: topic.title, at: topic.createdAt };
  }

  // Overlap threshold tuned conservatively: 0.55+ Jaccard on keyword sets is
  // a strong signal of "same topic," not just "same domain vocabulary."
  const isDuplicate = best.overlap >= 0.55;
  return { isDuplicate, bestOverlap: best.overlap, matchedTitle: best.title, matchedAt: best.at };
}

/** Novelty score (0-100, 100 = fully novel) for use as a scoring input. */
export function noveltyFromOverlap(bestOverlap: number): number {
  return Math.round((1 - Math.min(1, bestOverlap)) * 100);
}
