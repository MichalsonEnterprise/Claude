import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/content/duplicateDetection.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/content/duplicateDetection.js')>();
  return { ...actual, checkDuplicateTopic: vi.fn().mockResolvedValue({ isDuplicate: false, bestOverlap: 0 }) };
});

vi.mock('../src/llm/index.js', () => ({
  getLlmProvider: vi.fn().mockResolvedValue({
    name: 'mock',
    complete: vi.fn().mockResolvedValue({ text: JSON.stringify({ verdict: 'ALLOW', reasons: [] }), provider: 'mock', model: 'mock' }),
  }),
}));

import { runSafetyGate } from '../src/safety/safetyGate.js';
import { checkDuplicateTopic } from '../src/content/duplicateDetection.js';

describe('runSafetyGate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('BLOCKs content matching the hard blocklist regardless of LLM verdict', async () => {
    const result = await runSafetyGate({
      title: 'Jak uniknąć podatku',
      body: 'Zrób tak żeby uniknąć podatku VAT i zapłacić mniej.',
      claimVerification: 'VERIFIED',
      isNewsBased: false,
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons.some((r) => r.includes('Blocklist'))).toBe(true);
  });

  it('BLOCKs UNVERIFIED news claims', async () => {
    const result = await runSafetyGate({
      title: 'Nowa zmiana w VAT',
      body: 'System analizuje dokumenty i wskazuje niespójności.',
      claimVerification: 'UNVERIFIED',
      isNewsBased: true,
    });
    expect(result.verdict).toBe('BLOCK');
  });

  it('BLOCKs CONFLICTING news claims', async () => {
    const result = await runSafetyGate({
      title: 'Sporny termin wejścia w życie',
      body: 'System analizuje dokumenty.',
      claimVerification: 'CONFLICTING',
      isNewsBased: true,
    });
    expect(result.verdict).toBe('BLOCK');
  });

  it('REQUIRE_APPROVAL for PARTIALLY_VERIFIED news claims', async () => {
    const result = await runSafetyGate({
      title: 'Możliwa zmiana w JPK',
      body: 'System analizuje dokumenty i wskazuje niespójności.',
      claimVerification: 'PARTIALLY_VERIFIED',
      isNewsBased: true,
    });
    expect(result.verdict).toBe('REQUIRE_APPROVAL');
  });

  it('ALLOWs clean, verified, non-duplicate content', async () => {
    const result = await runSafetyGate({
      title: 'Jak działa JPK',
      body: 'Moduł analizuje dokumenty i wskazuje niespójności do przeglądu przez księgowego.',
      claimVerification: 'VERIFIED',
      isNewsBased: true,
    });
    expect(result.verdict).toBe('ALLOW');
  });

  it('escalates to REQUIRE_APPROVAL on duplicate detection', async () => {
    vi.mocked(checkDuplicateTopic).mockResolvedValueOnce({ isDuplicate: true, bestOverlap: 0.8, matchedTitle: 'Stary temat' });
    const result = await runSafetyGate({
      title: 'Jak działa JPK',
      body: 'Moduł analizuje dokumenty.',
      claimVerification: 'VERIFIED',
      isNewsBased: true,
    });
    expect(result.verdict).toBe('REQUIRE_APPROVAL');
  });

  it('fails closed to REQUIRE_APPROVAL when the LLM risk review throws', async () => {
    const { getLlmProvider } = await import('../src/llm/index.js');
    vi.mocked(getLlmProvider).mockResolvedValueOnce({
      name: 'mock',
      complete: vi.fn().mockRejectedValue(new Error('network down')),
    } as any);
    const result = await runSafetyGate({
      title: 'Jak działa JPK',
      body: 'Moduł analizuje dokumenty.',
      claimVerification: 'VERIFIED',
      isNewsBased: true,
    });
    expect(result.verdict).toBe('REQUIRE_APPROVAL');
  });
});
