import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('getLlmProvider — missing credentials fallback', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('falls back to the mock provider when AI_PROVIDER=anthropic but no API key is set', async () => {
    vi.stubEnv('AI_PROVIDER', 'anthropic');
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    const { config } = await import('../src/config.js');
    config.ai.provider = 'anthropic';
    config.ai.anthropicApiKey = '';
    const { getLlmProvider } = await import('../src/llm/index.js');
    const provider = await getLlmProvider();
    expect(provider.name).toBe('mock');
  });

  it('falls back to the mock provider when AI_PROVIDER=openai but no API key is set', async () => {
    const { config } = await import('../src/config.js');
    config.ai.provider = 'openai';
    config.ai.openaiApiKey = '';
    const { getLlmProvider } = await import('../src/llm/index.js');
    const provider = await getLlmProvider();
    expect(provider.name).toBe('mock');
  });

  it('uses the mock provider directly when AI_PROVIDER=mock', async () => {
    const { config } = await import('../src/config.js');
    config.ai.provider = 'mock';
    const { getLlmProvider } = await import('../src/llm/index.js');
    const provider = await getLlmProvider();
    expect(provider.name).toBe('mock');
    const result = await provider.complete({ stage: 'writer', messages: [{ role: 'user', content: 'hello' }] });
    expect(result.provider).toBe('mock');
  });
});
