import Anthropic from '@anthropic-ai/sdk';
import type { LlmProvider, LlmCallOptions, LlmResult } from './types.js';
import { config } from '../config.js';

const DEFAULT_MODEL = 'claude-sonnet-4-5';

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  private modelFor(stage: LlmCallOptions['stage']): string {
    if (stage === 'research') return config.ai.researchModel || DEFAULT_MODEL;
    if (stage === 'writer') return config.ai.writerModel || DEFAULT_MODEL;
    return config.ai.verifierModel || DEFAULT_MODEL;
  }

  async complete(options: LlmCallOptions): Promise<LlmResult> {
    const model = this.modelFor(options.stage);
    const system = options.messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
    const userMessages = options.messages.filter((m) => m.role === 'user');

    const response = await this.client.messages.create({
      model,
      max_tokens: options.maxTokens ?? 2000,
      temperature: options.temperature ?? 0.4,
      system: system || undefined,
      messages: userMessages.map((m) => ({ role: 'user' as const, content: m.content })),
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    return { text, provider: this.name, model };
  }
}
