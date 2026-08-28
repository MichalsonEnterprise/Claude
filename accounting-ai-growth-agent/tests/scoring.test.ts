import { describe, it, expect } from 'vitest';
import { scoreResearchItem } from '../src/scoring/topicScoring.js';

describe('scoreResearchItem', () => {
  it('scores a fresh, primary-source, accounting-heavy item highly', () => {
    const score = scoreResearchItem({
      title: 'Nowy obowiązek KSeF dla podatników VAT',
      rawSummary: 'Ministerstwo Finansów ogłosiło zmiany w JPK i fakturowaniu VAT dla firm.',
      publishedAt: new Date(),
      sourceTier: 'TIER1_PRIMARY',
    }, 90);
    expect(score.final).toBeGreaterThanOrEqual(70);
    expect(score.authority).toBe(100);
    expect(score.freshness).toBe(100);
  });

  it('scores a stale, low-authority, irrelevant item lowly', () => {
    const score = scoreResearchItem({
      title: 'Lokalny festyn w gminie',
      rawSummary: 'W miniony weekend odbył się festyn.',
      publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90),
      sourceTier: 'TIER3_MEDIA',
    }, 20);
    expect(score.final).toBeLessThan(40);
  });

  it('treats a missing publish date as neutral-low freshness, not a crash', () => {
    const score = scoreResearchItem({
      title: 'VAT i JPK — poradnik',
      rawSummary: 'Poradnik księgowy o VAT.',
      publishedAt: null,
      sourceTier: 'TIER2_TRUSTED',
    });
    expect(score.freshness).toBe(40);
    expect(Number.isFinite(score.final)).toBe(true);
  });
});
