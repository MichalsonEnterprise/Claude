export interface LlmMessage {
  role: 'system' | 'user';
  content: string;
}

export interface LlmCallOptions {
  /** Which pipeline stage is calling — used to pick the per-stage model override. */
  stage: 'research' | 'writer' | 'verifier';
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
  /** If set, the provider is asked to return JSON and the caller will JSON.parse it. */
  expectJson?: boolean;
}

export interface LlmResult {
  text: string;
  provider: string;
  model: string;
}

export interface LlmProvider {
  readonly name: string;
  complete(options: LlmCallOptions): Promise<LlmResult>;
}

/**
 * Thrown when a provider returns text that was supposed to be JSON but isn't
 * parseable. Callers (verifier, writers) must handle this explicitly rather
 * than crashing the pipeline — see tests/llm-json.test.ts.
 */
export class InvalidLlmJsonError extends Error {
  constructor(public raw: string, cause?: unknown) {
    super(`LLM did not return valid JSON: ${(cause as Error)?.message || 'parse error'}`);
  }
}

export function parseJsonResult<T>(result: LlmResult): T {
  try {
    // Strip markdown code fences if the model wrapped the JSON in ```json ... ```
    const cleaned = result.text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new InvalidLlmJsonError(result.text, err);
  }
}
