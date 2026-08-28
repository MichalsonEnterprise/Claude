import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PostizClient, PostizApiError } from '../src/postiz/postizClient.js';

describe('PostizClient — mock mode', () => {
  it('forces mock mode when no API key is configured, even if mock:false is passed', async () => {
    const client = new PostizClient({ apiKey: '', mock: false });
    expect(client.isMock).toBe(true);
    const integrations = await client.listIntegrations();
    expect(Array.isArray(integrations)).toBe(true);
  });

  it('mockCreatePost returns a stable-shaped result and never throws', async () => {
    const client = new PostizClient({ apiKey: '', mock: true });
    const result = await client.createPost({
      type: 'schedule',
      date: new Date().toISOString(),
      integrationId: 'mock-integration-linkedin',
      value: [{ content: 'hello' }],
    });
    expect(result[0].postId).toMatch(/^mock-post-/);
    expect(result[0].integration).toBe('mock-integration-linkedin');
  });
});

describe('PostizClient — real mode error handling and retries', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('retries on 500 and eventually succeeds', async () => {
    let calls = 0;
    global.fetch = vi.fn(async () => {
      calls++;
      if (calls < 3) return new Response('server error', { status: 500 });
      return new Response(JSON.stringify([{ id: '1', name: 'x', identifier: 'linkedin', disabled: false }]), { status: 200 });
    }) as any;

    const client = new PostizClient({ apiKey: 'real-key', mock: false, baseUrl: 'https://example.invalid/public/v1' });
    const integrations = await client.listIntegrations();
    expect(integrations).toHaveLength(1);
    expect(calls).toBe(3);
  });

  it('throws PostizApiError on a non-retryable 4xx without retrying', async () => {
    let calls = 0;
    global.fetch = vi.fn(async () => {
      calls++;
      return new Response('unauthorized', { status: 401 });
    }) as any;

    const client = new PostizClient({ apiKey: 'bad-key', mock: false, baseUrl: 'https://example.invalid/public/v1' });
    await expect(client.listIntegrations()).rejects.toBeInstanceOf(PostizApiError);
    expect(calls).toBe(1);
  });

  it('throws after exhausting retries on repeated 500s', async () => {
    global.fetch = vi.fn(async () => new Response('down', { status: 500 })) as any;
    const client = new PostizClient({ apiKey: 'real-key', mock: false, baseUrl: 'https://example.invalid/public/v1' });
    await expect(client.listIntegrations()).rejects.toBeInstanceOf(PostizApiError);
  });
});
