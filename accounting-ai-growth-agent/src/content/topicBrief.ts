import { getLlmProvider } from '../llm/index.js';
import { parseJsonResult, InvalidLlmJsonError } from '../llm/types.js';
import { knowledgeBaseAsPromptBlock } from '../knowledge/knowledgeBase.js';
import { logger } from '../logger.js';

export type ContentPillar = 'education' | 'news' | 'product' | 'problems' | 'case_study' | 'direct_marketing';

export interface TopicBrief {
  title: string;
  summary: string;
  contentPillar: ContentPillar;
  angle: string;
  keyPoints: string[];
}

const FALLBACK_BRIEF: TopicBrief = {
  title: 'Częste błędy przy uzgadnianiu dokumentów księgowych',
  summary: 'Evergreen: jak ręczne uzgadnianie dokumentów prowadzi do błędów i jak wygląda wsparcie AI na etapie wstępnej weryfikacji.',
  contentPillar: 'education',
  angle: 'Konkretny, praktyczny opis problemu i sposobu, w jaki automatyzacja może pomóc.',
  keyPoints: [
    'Ręczne uzgadnianie dokumentów jest czasochłonne.',
    'Błędy często wychodzą na jaw dopiero przy audycie.',
    'AI może wskazać niespójności do przeglądu przez człowieka.',
  ],
};

/**
 * Content Strategist: turns either a verified news item or an evergreen
 * prompt into a single master TopicBrief that platform writers fan out
 * from. Always grounded in the current knowledge base (brief #5: agent
 * must always know these materials before creating content).
 */
export async function generateTopicBrief(input: {
  sourceMaterial: string;
  pillar: ContentPillar;
  isEvergreen: boolean;
}): Promise<TopicBrief> {
  const provider = await getLlmProvider();
  const knowledge = knowledgeBaseAsPromptBlock();

  const prompt = `You are the Content Strategist for Accounting AI's marketing.

PROJECT KNOWLEDGE BASE (authoritative — never contradict or go beyond this):
${knowledge}

TASK: Produce ONE master TopicBrief for content pillar "${input.pillar}"${input.isEvergreen ? ' (evergreen — not tied to a specific news item)' : ''}.

Source material:
${input.sourceMaterial}

Rules:
- Never invent product features, statistics, or capabilities not present in the knowledge base.
- Never present a legislative draft/proposal as being in force.
- Prefer concrete, specific language over hype (see tone-of-voice.md).

Respond with JSON only: {"title","summary","contentPillar","angle","keyPoints":[...]}`;

  try {
    const result = await provider.complete({
      stage: 'writer',
      expectJson: true,
      temperature: 0.5,
      messages: [
        { role: 'system', content: 'You are a precise, non-hyperbolic B2B content strategist for a Polish accounting-tech product.' },
        { role: 'user', content: prompt },
      ],
    });
    const brief = parseJsonResult<TopicBrief>(result);
    if (!brief.title || !brief.summary) throw new InvalidLlmJsonError(result.text);
    return brief;
  } catch (err) {
    logger.error('TopicBrief generation failed — using evergreen fallback', { error: (err as Error).message });
    return { ...FALLBACK_BRIEF, contentPillar: input.pillar };
  }
}
