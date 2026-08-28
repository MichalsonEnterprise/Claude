import { describe, it, expect } from 'vitest';
import { parseJsonResult, InvalidLlmJsonError } from '../src/llm/types.js';

describe('parseJsonResult', () => {
  it('parses plain JSON', () => {
    const parsed = parseJsonResult<{ a: number }>({ text: '{"a": 1}', provider: 'mock', model: 'm' });
    expect(parsed.a).toBe(1);
  });

  it('strips markdown code fences before parsing', () => {
    const parsed = parseJsonResult<{ a: number }>({ text: '```json\n{"a": 2}\n```', provider: 'mock', model: 'm' });
    expect(parsed.a).toBe(2);
  });

  it('throws InvalidLlmJsonError on malformed JSON instead of crashing silently', () => {
    expect(() => parseJsonResult({ text: 'this is not json at all', provider: 'mock', model: 'm' })).toThrow(InvalidLlmJsonError);
  });

  it('throws InvalidLlmJsonError on empty string', () => {
    expect(() => parseJsonResult({ text: '', provider: 'mock', model: 'm' })).toThrow(InvalidLlmJsonError);
  });
});
