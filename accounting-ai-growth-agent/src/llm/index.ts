import type { LlmProvider } from './types.js';
import { MockLlmProvider } from './mockProvider.js';
import { config } from '../config.js';
import { logger } from '../logger.js';

let cachedProvider: LlmProvider | null = null;

/**
 * Provider factory. Falls back to mock (with a warning) if the configured
 * provider is missing its API key, so the pipeline never crashes for lack
 * of a credential — it just runs in a clearly-labeled degraded mode.
 */
export async function getLlmProvider(): Promise<LlmProvider> {
  if (cachedProvider) return cachedProvider;

  if (config.ai.provider === 'anthropic') {
    if (!config.ai.anthropicApiKey) {
      logger.warn('AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is missing — falling back to mock provider');
      cachedProvider = new MockLlmProvider();
      return cachedProvider;
    }
    const { AnthropicProvider } = await import('./anthropicProvider.js');
    cachedProvider = new AnthropicProvider(config.ai.anthropicApiKey);
    return cachedProvider;
  }

  if (config.ai.provider === 'openai') {
    if (!config.ai.openaiApiKey) {
      logger.warn('AI_PROVIDER=openai but OPENAI_API_KEY is missing — falling back to mock provider');
      cachedProvider = new MockLlmProvider();
      return cachedProvider;
    }
    const { OpenAiProvider } = await import('./openaiProvider.js');
    cachedProvider = new OpenAiProvider(config.ai.openaiApiKey);
    return cachedProvider;
  }

  cachedProvider = new MockLlmProvider();
  return cachedProvider;
}

export * from './types.js';
