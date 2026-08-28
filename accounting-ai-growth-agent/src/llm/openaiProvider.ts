import OpenAI from 'openai';
import type { LlmProvider, LlmCallOptions, LlmResult } from './types.js';
import { config } from '../config.js';

const DEFAULT_MODEL = 'gpt-4o';

export class OpenAiProvider implements LlmProvider {
  readonly name = 'openai';
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  private modelFor(stage: LlmCallOptions['stage']): string {
    if (stage === 'research') return config.ai.researchModel || DEFAULT_MODEL;
    if (stage === 'writer') return config.ai.writerModel || DEFAULT_MODEL;
    return config.ai.verifierModel || DEFAULT_MODEL;
  }

  async complete(options: LlmCallOptions): Promise<LlmResult> {
    const model = this.modelFor(options.stage);
    const response = await this.client.chat.completions.create({
      model,
      max_tokens: options.maxTokens ?? 2000,
      temperature: options.temperature ?? 0.4,
      response_format: options.expectJson ? { type: 'json_object' } : undefined,
      messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const text = response.choices[0]?.message?.content ?? '';
    return { text, provider: this.name, model };
  }
}
