import type { LlmProvider, LlmCallOptions, LlmResult } from './types.js';

/**
 * Deterministic, offline provider used for AI_PROVIDER=mock, tests, and any
 * environment without API keys. It does not call any network. It produces
 * structurally valid, stage-appropriate output so the rest of the pipeline
 * (which expects specific JSON shapes) keeps working end to end.
 */
export class MockLlmProvider implements LlmProvider {
  readonly name = 'mock';

  async complete(options: LlmCallOptions): Promise<LlmResult> {
    const lastUser = [...options.messages].reverse().find((m) => m.role === 'user')?.content || '';
    const text = options.expectJson ? this.mockJsonFor(options, lastUser) : this.mockTextFor(lastUser);
    return { text, provider: this.name, model: `mock-${options.stage}` };
  }

  private mockJsonFor(options: LlmCallOptions, prompt: string): string {
    // Heuristics on prompt content let unit tests exercise different shapes
    // without a real model. Each pipeline stage documents the shape it needs
    // in its own prompt-builder, and this switch mirrors that contract.
    if (/claim ledger|verify|verification/i.test(prompt)) {
      return JSON.stringify({
        claims: [
          {
            text: 'Sample claim extracted from source material.',
            legalStatus: 'IN_FORCE',
            confidence: 0.9,
            verification: 'VERIFIED',
            reasoning: 'Mock provider: single primary source present, no conflicts.',
          },
        ],
      });
    }
    if (/topic brief|content strategist/i.test(prompt)) {
      return JSON.stringify({
        title: 'Jak AI wspiera zamknięcie miesiąca w księgowości',
        summary: 'Evergreen edukacyjny temat o roli automatyzacji w zamknięciu miesiąca.',
        contentPillar: 'education',
        angle: 'Pokazujemy różnicę między ręcznym a wspomaganym przez AI procesem.',
        keyPoints: [
          'Ręczne uzgadnianie dokumentów jest czasochłonne i podatne na błędy.',
          'AI może wskazać niespójności do weryfikacji przez księgowego.',
          'Człowiek zawsze podejmuje ostateczną decyzję.',
        ],
      });
    }
    if (/platform.?specific|writer|linkedin|instagram|tiktok|facebook|"x"/i.test(prompt)) {
      return JSON.stringify({
        hook: 'Zamknięcie miesiąca zajmuje zespołom księgowym średnio kilka dni.',
        body:
          'Problem wygląda tak: dokumenty trzeba ręcznie uzgodnić, a błędy wychodzą na jaw dopiero przy audycie.\n\n' +
          'System może zautomatyzować pierwszy przegląd dokumentów i oznaczyć te, które wymagają uwagi księgowego.\n\n' +
          'To nie zastępuje księgowego — przyspiesza jego pracę na etapie wstępnej weryfikacji.',
        hashtags: ['#księgowość', '#AI'],
        slides: [
          { heading: 'Zamknięcie miesiąca zajmuje dni', bullets: ['Ręczne uzgadnianie', 'Rozproszone dokumenty'] },
          { heading: 'Gdzie pomaga automatyzacja', bullets: ['Wstępny przegląd', 'Oznaczanie niespójności'] },
          { heading: 'Efekt', bullets: ['Więcej czasu na analizę', 'Człowiek decyduje'] },
        ],
      });
    }
    if (/safety gate|risk assessment/i.test(prompt)) {
      return JSON.stringify({
        verdict: 'ALLOW',
        reasons: ['No invented numbers detected.', 'No individual tax advice detected.'],
      });
    }
    if (/duplicate/i.test(prompt)) {
      return JSON.stringify({ isDuplicate: false, reasoning: 'Mock provider: no overlapping topic found.' });
    }
    return JSON.stringify({ note: 'mock response', prompt: prompt.slice(0, 120) });
  }

  private mockTextFor(prompt: string): string {
    return `[mock-summary] ${prompt.slice(0, 200)}`;
  }
}
