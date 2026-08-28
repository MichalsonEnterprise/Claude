import { describe, it, expect, vi, beforeEach } from 'vitest';

const { prismaMock, llmMock } = vi.hoisted(() => ({
  prismaMock: {
    claim: { create: vi.fn().mockResolvedValue({ id: 'claim-1' }) },
    sourceEvidence: { create: vi.fn().mockResolvedValue({}) },
  },
  llmMock: { name: 'mock', complete: vi.fn() },
}));
vi.mock('../src/db.js', () => ({ prisma: prismaMock }));
vi.mock('../src/llm/index.js', () => ({ getLlmProvider: vi.fn().mockResolvedValue(llmMock) }));

import { verifyTopicClaims, aggregateClaimVerdict } from '../src/verification/claimVerifier.js';

describe('verifyTopicClaims', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fails closed (empty claims, nothing persisted) when the LLM returns invalid JSON', async () => {
    llmMock.complete.mockResolvedValue({ text: 'not valid json', provider: 'mock', model: 'm' });
    const result = await verifyTopicClaims('topic-1', 'Some topic', []);
    expect(result.claims).toEqual([]);
    expect(prismaMock.claim.create).not.toHaveBeenCalled();
  });

  it('fails closed when the LLM call throws (e.g. missing credentials / network error)', async () => {
    llmMock.complete.mockRejectedValue(new Error('missing API key'));
    const result = await verifyTopicClaims('topic-1', 'Some topic', []);
    expect(result.claims).toEqual([]);
  });

  it('normalizes an unrecognized legalStatus to UNKNOWN rather than trusting the LLM blindly', async () => {
    llmMock.complete.mockResolvedValue({
      text: JSON.stringify({
        claims: [{ text: 'A draft bill was proposed.', legalStatus: 'TOTALLY_MADE_UP', confidence: 0.9, verification: 'VERIFIED', reasoning: 'x' }],
      }),
      provider: 'mock',
      model: 'm',
    });
    await verifyTopicClaims('topic-1', 'Draft bill', []);
    const createCall = prismaMock.claim.create.mock.calls[0][0];
    expect(createCall.data.legalStatus).toBe('UNKNOWN');
  });

  it('drops claims with an unrecognized verification status instead of persisting garbage', async () => {
    llmMock.complete.mockResolvedValue({
      text: JSON.stringify({ claims: [{ text: 'x', legalStatus: 'IN_FORCE', confidence: 0.9, verification: 'TOTALLY_SURE', reasoning: 'x' }] }),
      provider: 'mock',
      model: 'm',
    });
    const result = await verifyTopicClaims('topic-1', 'x', []);
    expect(result.claims).toEqual([]);
  });
});

describe('aggregateClaimVerdict — publication date vs effective date / draft vs signed law scenarios', () => {
  it('is UNVERIFIED for an empty claim set (e.g. a draft law with no confirming source yet)', () => {
    expect(aggregateClaimVerdict([])).toBe('UNVERIFIED');
  });

  it('is CONFLICTING if any claim conflicts, even if others are VERIFIED', () => {
    expect(aggregateClaimVerdict(['VERIFIED', 'CONFLICTING', 'VERIFIED'])).toBe('CONFLICTING');
  });

  it('is UNVERIFIED if any claim is UNVERIFIED and none conflict', () => {
    expect(aggregateClaimVerdict(['VERIFIED', 'UNVERIFIED'])).toBe('UNVERIFIED');
  });

  it('is PARTIALLY_VERIFIED only when the weakest claim is PARTIALLY_VERIFIED', () => {
    expect(aggregateClaimVerdict(['VERIFIED', 'PARTIALLY_VERIFIED'])).toBe('PARTIALLY_VERIFIED');
  });

  it('is VERIFIED only when every claim is VERIFIED', () => {
    expect(aggregateClaimVerdict(['VERIFIED', 'VERIFIED'])).toBe('VERIFIED');
  });
});
