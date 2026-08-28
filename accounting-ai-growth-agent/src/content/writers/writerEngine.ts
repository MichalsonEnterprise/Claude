import { getLlmProvider } from '../../llm/index.js';
import { parseJsonResult, InvalidLlmJsonError } from '../../llm/types.js';
import { knowledgeBaseAsPromptBlock } from '../../knowledge/knowledgeBase.js';
import { logger } from '../../logger.js';
import type { TopicBrief } from '../topicBrief.js';
import type { PlatformDraft, PlatformKey } from './types.js';

interface PlatformRules {
  register: string;
  lengthGuidance: string;
  hashtagRange: string;
  needsSlides: boolean;
  slideCountRange: [number, number];
}

export const PLATFORM_RULES: Record<PlatformKey, PlatformRules> = {
  linkedin: {
    register: 'ekspercki, rzeczowy, bez infantylnych emoji, czytelne akapity',
    lengthGuidance: '900-1400 znaków, umiarkowana długość',
    hashtagRange: '0-3',
    needsSlides: false,
    slideCountRange: [0, 0],
  },
  'linkedin-page': {
    register: 'ekspercki, głos firmy (nie osoby prywatnej), rzeczowy',
    lengthGuidance: '900-1400 znaków',
    hashtagRange: '0-3',
    needsSlides: false,
    slideCountRange: [0, 0],
  },
  x: {
    register: 'krótko, mocny insight, konkretnie, bez lania wody',
    lengthGuidance: 'maks. 260 znaków na pojedynczy post; jeśli temat wymaga, zaznacz to w polu body jako kolejne tweety oddzielone "---"',
    hashtagRange: '0-2',
    needsSlides: false,
    slideCountRange: [0, 0],
  },
  facebook: {
    register: 'przystępny, konwersacyjny, można zwracać się bezpośrednio do czytelnika',
    lengthGuidance: '600-1000 znaków',
    hashtagRange: '0-3',
    needsSlides: false,
    slideCountRange: [0, 0],
  },
  instagram: {
    register: 'prosty hook w pierwszej linii, caption wspiera karuzelę',
    lengthGuidance: 'caption 400-800 znaków',
    hashtagRange: '2-5',
    needsSlides: true,
    slideCountRange: [3, 7],
  },
  tiktok: {
    register: 'bardzo krótki hook, materiał wizualny niesie treść',
    lengthGuidance: 'caption 100-250 znaków',
    hashtagRange: '1-3',
    needsSlides: true,
    slideCountRange: [3, 7],
  },
};

const FALLBACK_DRAFT: PlatformDraft = {
  hook: 'Zamknięcie miesiąca zajmuje zespołom księgowym średnio kilka dni.',
  body: 'Problem wygląda tak: dokumenty trzeba ręcznie uzgodnić, a błędy wychodzą na jaw dopiero przy audycie. Pracujemy nad automatyzacją wstępnego przeglądu dokumentów, żeby oznaczać te wymagające uwagi księgowego.',
  hashtags: ['#księgowość'],
};

export async function writeForPlatform(brief: TopicBrief, platform: PlatformKey): Promise<PlatformDraft> {
  const rules = PLATFORM_RULES[platform];
  const provider = await getLlmProvider();
  const knowledge = knowledgeBaseAsPromptBlock();

  const prompt = `You are the platform-specific writer for "${platform}" (Accounting AI marketing).

PROJECT KNOWLEDGE BASE (authoritative):
${knowledge}

TOPIC BRIEF:
Title: ${brief.title}
Summary: ${brief.summary}
Angle: ${brief.angle}
Key points: ${brief.keyPoints.join(' | ')}

PLATFORM RULES for "${platform}":
- Register: ${rules.register}
- Length: ${rules.lengthGuidance}
- Hashtags: ${rules.hashtagRange}
- ${rules.needsSlides ? `Also produce ${rules.slideCountRange[0]}-${rules.slideCountRange[1]} slides for a visual carousel (heading + 2-4 short bullets each, last slide can be a soft CTA).` : 'No slides needed for this platform.'}

Do not repeat the same wording as other platforms verbatim — this is a fresh version for this specific audience, same underlying facts. Never invent numbers, features, or guarantees not in the knowledge base.

Respond with JSON only: {"hook","body","hashtags":[...]${rules.needsSlides ? ',"slides":[{"heading","bullets":[...]}, ...]' : ''}}`;

  try {
    const result = await provider.complete({
      stage: 'writer',
      expectJson: true,
      temperature: 0.6,
      messages: [
        { role: 'system', content: `You write ${platform} content for a serious B2B accounting-tech product. Follow tone-of-voice.md and forbidden-claims.md strictly.` },
        { role: 'user', content: prompt },
      ],
    });
    const draft = parseJsonResult<PlatformDraft>(result);
    if (!draft.body) throw new InvalidLlmJsonError(result.text);
    return draft;
  } catch (err) {
    logger.error('Platform writer failed — using fallback draft', { platform, error: (err as Error).message });
    return { ...FALLBACK_DRAFT };
  }
}
