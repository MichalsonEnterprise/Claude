import type { ClaimVerificationStatus } from '@prisma/client';
import { checkBlocklist } from './blocklist.js';
import { checkDuplicateTopic } from '../content/duplicateDetection.js';
import { getLlmProvider } from '../llm/index.js';
import { parseJsonResult, InvalidLlmJsonError } from '../llm/types.js';
import { logger } from '../logger.js';

export type SafetyVerdict = 'ALLOW' | 'ALLOW_WITH_CAUTION' | 'REQUIRE_APPROVAL' | 'BLOCK';

export interface SafetyGateResult {
  verdict: SafetyVerdict;
  reasons: string[];
}

const VERDICT_ORDER: Record<SafetyVerdict, number> = {
  ALLOW: 0,
  ALLOW_WITH_CAUTION: 1,
  REQUIRE_APPROVAL: 2,
  BLOCK: 3,
};

function worst(a: SafetyVerdict, b: SafetyVerdict): SafetyVerdict {
  return VERDICT_ORDER[a] >= VERDICT_ORDER[b] ? a : b;
}

export interface SafetyGateInput {
  title: string;
  body: string;
  claimVerification: ClaimVerificationStatus | null; // null = no news claims (evergreen/product with no factual claim)
  isNewsBased: boolean;
}

/**
 * Safety Gate (brief #19). Deterministic rules run first and can only make
 * the verdict worse, never better — an LLM risk read cannot override a hard
 * blocklist hit or an UNVERIFIED/CONFLICTING claim.
 */
export async function runSafetyGate(input: SafetyGateInput): Promise<SafetyGateResult> {
  let verdict: SafetyVerdict = 'ALLOW';
  const reasons: string[] = [];

  // 1. Hard blocklist — deterministic, always wins.
  const blocklistHits = checkBlocklist(`${input.title}\n${input.body}`);
  if (blocklistHits.length > 0) {
    verdict = 'BLOCK';
    reasons.push(...blocklistHits.map((h) => `Blocklist rule "${h.rule}" matched: "${h.match}"`));
  }

  // 2. Claim verification status (brief #10 publication rule).
  if (input.isNewsBased) {
    if (input.claimVerification === 'UNVERIFIED' || input.claimVerification === 'CONFLICTING') {
      verdict = worst(verdict, 'BLOCK');
      reasons.push(`News-based content with claim status ${input.claimVerification} — never publishable.`);
    } else if (input.claimVerification === 'PARTIALLY_VERIFIED') {
      verdict = worst(verdict, 'REQUIRE_APPROVAL');
      reasons.push('Claim status PARTIALLY_VERIFIED — requires human approval.');
    } else if (input.claimVerification === null) {
      verdict = worst(verdict, 'REQUIRE_APPROVAL');
      reasons.push('News-based content with no claim ledger entries at all — requires approval.');
    }
  }

  // 3. Duplicate protection.
  const dup = await checkDuplicateTopic(input.title, input.body);
  if (dup.isDuplicate) {
    verdict = worst(verdict, 'REQUIRE_APPROVAL');
    reasons.push(`Possible duplicate of "${dup.matchedTitle}" (overlap ${(dup.bestOverlap * 100).toFixed(0)}%).`);
  }

  // 4. LLM-based soft risk read (clickbait, tone, subtle overreach) — can
  // only escalate, and only up to REQUIRE_APPROVAL, never to BLOCK on its
  // own, since it is not deterministic.
  try {
    const provider = await getLlmProvider();
    const result = await provider.complete({
      stage: 'verifier',
      expectJson: true,
      temperature: 0,
      messages: [
        { role: 'system', content: 'You are a strict content risk reviewer (safety gate) for a B2B accounting-tech marketing post.' },
        {
          role: 'user',
          content: `Risk assessment for this post. Flag: unsupported promises, clickbait severity, offensive content, accidental competitor attack, stale-sounding claims, wrong-looking dates.\n\nTitle: ${input.title}\nBody: ${input.body}\n\nRespond with JSON only: {"verdict":"ALLOW|ALLOW_WITH_CAUTION|REQUIRE_APPROVAL","reasons":[...]}`,
        },
      ],
    });
    const parsed = parseJsonResult<{ verdict: SafetyVerdict; reasons: string[] }>(result);
    if (['ALLOW', 'ALLOW_WITH_CAUTION', 'REQUIRE_APPROVAL'].includes(parsed.verdict)) {
      verdict = worst(verdict, parsed.verdict);
      if (parsed.verdict !== 'ALLOW') reasons.push(...(parsed.reasons || []).map((r) => `LLM risk review: ${r}`));
    }
  } catch (err) {
    if (err instanceof InvalidLlmJsonError) {
      logger.warn('Safety gate LLM review returned invalid JSON — escalating to REQUIRE_APPROVAL', { title: input.title });
    } else {
      logger.warn('Safety gate LLM review failed — escalating to REQUIRE_APPROVAL', { title: input.title, error: (err as Error).message });
    }
    verdict = worst(verdict, 'REQUIRE_APPROVAL');
    reasons.push('LLM risk review unavailable — failing closed to REQUIRE_APPROVAL.');
  }

  return { verdict, reasons };
}
