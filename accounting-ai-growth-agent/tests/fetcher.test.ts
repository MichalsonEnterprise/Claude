import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchSource } from '../src/research/fetcher.js';

describe('fetchSource — malformed / unreachable sources', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('returns an empty array (never throws) when the HTML source is unreachable', async () => {
    global.fetch = vi.fn(async () => new Response('not found', { status: 404 })) as any;
    const items = await fetchSource({ name: 'broken', url: 'https://example.invalid/x', kind: 'HTML', tier: 'TIER3_MEDIA' });
    expect(items).toEqual([]);
  });

  it('returns an empty array when an RSS feed URL points at non-XML garbage', async () => {
    const items = await fetchSource({ name: 'garbage', url: 'not a real url at all', kind: 'RSS', tier: 'TIER2_TRUSTED' });
    expect(items).toEqual([]);
  });

  it('skips unsupported source kinds gracefully', async () => {
    const items = await fetchSource({ name: 'weird', url: 'https://example.com', kind: 'API' as any, tier: 'TIER1_PRIMARY' });
    expect(items).toEqual([]);
  });
});
