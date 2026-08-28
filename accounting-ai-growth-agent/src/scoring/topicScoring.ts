import type { ResearchItem, SourceTier } from '@prisma/client';

export interface ScoreBreakdown {
  freshness: number;
  authority: number;
  accountingRelevance: number;
  productRelevance: number;
  novelty: number;
  final: number;
}

const TIER_AUTHORITY: Record<SourceTier, number> = {
  TIER1_PRIMARY: 100,
  TIER2_TRUSTED: 70,
  TIER3_MEDIA: 45,
};

const ACCOUNTING_KEYWORDS = [
  'vat', 'cit', 'pit', 'jpk', 'ksef', 'faktur', 'podatk', 'księgow', 'zus',
  'skarbow', 'audyt', 'rachunkow', 'deklaracj', 'ordynacj', 'amortyzacj',
];

const PRODUCT_KEYWORDS = [
  'automatyzacj', 'ai', 'sztuczn', 'dokument', 'proces', 'system', 'błęd',
  'weryfikacj', 'zamknięci', 'analiz',
];

function keywordScore(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  const hits = keywords.filter((k) => lower.includes(k)).length;
  return Math.min(100, Math.round((hits / Math.max(3, keywords.length * 0.3)) * 100));
}

function freshnessScore(publishedAt: Date | null, now = new Date()): number {
  if (!publishedAt) return 40; // unknown date: not fresh, not stale — neutral-low
  const ageHours = (now.getTime() - publishedAt.getTime()) / 36e5;
  if (ageHours <= 24) return 100;
  if (ageHours <= 72) return 85;
  if (ageHours <= 24 * 7) return 65;
  if (ageHours <= 24 * 30) return 40;
  return 15;
}

/**
 * Scores a single research item 0-100 across the dimensions in brief #9.
 * `noveltyPenalty` (0-100, 100 = totally novel) is computed by the caller
 * via duplicate-detection against recently published/selected topics.
 */
export function scoreResearchItem(
  item: Pick<ResearchItem, 'title' | 'rawSummary' | 'publishedAt' | 'sourceTier'>,
  noveltyPenalty = 90,
): ScoreBreakdown {
  const text = `${item.title} ${item.rawSummary}`;
  const freshness = freshnessScore(item.publishedAt);
  const authority = TIER_AUTHORITY[item.sourceTier];
  const accountingRelevance = keywordScore(text, ACCOUNTING_KEYWORDS);
  const productRelevance = keywordScore(text, PRODUCT_KEYWORDS);
  const novelty = Math.max(0, Math.min(100, noveltyPenalty));

  // Weighted composite — accounting relevance and authority matter most for
  // a fact-sensitive domain; novelty guards against repetitive content.
  const final =
    freshness * 0.2 +
    authority * 0.2 +
    accountingRelevance * 0.3 +
    productRelevance * 0.15 +
    novelty * 0.15;

  return {
    freshness,
    authority,
    accountingRelevance,
    productRelevance,
    novelty,
    final: Math.round(final),
  };
}
