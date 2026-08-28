import { getLlmProvider } from '../llm/index.js';
import { parseJsonResult, InvalidLlmJsonError } from '../llm/types.js';
import { prisma } from '../db.js';
import { logger } from '../logger.js';
import type { ClaimVerificationStatus, LegalStatus, SourceTier } from '@prisma/client';

export interface EvidenceInput {
  sourceName: string;
  sourceTier: SourceTier;
  url: string;
  quote: string;
}

interface LlmClaim {
  text: string;
  legalStatus: LegalStatus;
  confidence: number;
  verification: ClaimVerificationStatus;
  reasoning: string;
}

interface LlmVerificationResponse {
  claims: LlmClaim[];
}

const VALID_STATUSES: ClaimVerificationStatus[] = ['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'CONFLICTING'];
const VALID_LEGAL: LegalStatus[] = ['DRAFT', 'CONSULTATION', 'PROPOSAL', 'SIGNED_LAW', 'IN_FORCE', 'UNKNOWN'];

function buildPrompt(topicTitle: string, evidence: EvidenceInput[]): string {
  const sourcesBlock = evidence
    .map((e, i) => `[Source ${i + 1}] ${e.sourceName} (${e.sourceTier}) — ${e.url}\n"${e.quote}"`)
    .join('\n\n');

  return `Claim ledger verification task.

Topic: ${topicTitle}

Evidence gathered:
${sourcesBlock || '(no evidence provided)'}

Extract the factual claims implied by this topic and evaluate each one strictly:
- legalStatus: one of DRAFT, CONSULTATION, PROPOSAL, SIGNED_LAW, IN_FORCE, UNKNOWN.
  Never mark a proposal or draft as IN_FORCE.
- verification: VERIFIED only if a TIER1_PRIMARY source supports it alone, OR at
  least two independent sources (any tier) agree with no contradiction.
  PARTIALLY_VERIFIED if only one non-primary source supports it.
  UNVERIFIED if evidence is insufficient. CONFLICTING if sources disagree.
- confidence: 0..1.
- reasoning: one sentence explaining the verdict, referencing which sources.

Respond with JSON only: {"claims": [{"text","legalStatus","confidence","verification","reasoning"}]}`;
}

export async function verifyTopicClaims(topicId: string, topicTitle: string, evidence: EvidenceInput[]) {
  const provider = await getLlmProvider();
  const prompt = buildPrompt(topicTitle, evidence);

  let parsed: LlmVerificationResponse;
  try {
    const result = await provider.complete({
      stage: 'verifier',
      expectJson: true,
      temperature: 0.1,
      messages: [
        { role: 'system', content: 'You are a strict fact-verification analyst for Polish tax/accounting content. Never overstate certainty.' },
        { role: 'user', content: prompt },
      ],
    });
    parsed = parseJsonResult<LlmVerificationResponse>(result);
  } catch (err) {
    if (err instanceof InvalidLlmJsonError) {
      logger.error('Verifier returned invalid JSON — treating topic as UNVERIFIED', { topicId, raw: err.raw.slice(0, 300) });
    } else {
      logger.error('Verifier call failed — treating topic as UNVERIFIED', { topicId, error: (err as Error).message });
    }
    // Fail closed: no claim ledger entries means the safety gate will block
    // publication (brief #10: UNVERIFIED / no evidence => do not publish).
    return { claims: [] as LlmClaim[] };
  }

  const claims = (parsed.claims || []).filter((c) => VALID_STATUSES.includes(c.verification));

  for (const claim of claims) {
    const legalStatus = VALID_LEGAL.includes(claim.legalStatus) ? claim.legalStatus : 'UNKNOWN';
    const created = await prisma.claim.create({
      data: {
        topicId,
        text: claim.text,
        legalStatus,
        confidence: Math.max(0, Math.min(1, claim.confidence ?? 0)),
        verification: claim.verification,
        reasoning: claim.reasoning || '',
      },
    });
    for (const e of evidence) {
      await prisma.sourceEvidence.create({
        data: {
          claimId: created.id,
          sourceName: e.sourceName,
          sourceTier: e.sourceTier,
          url: e.url,
          quote: e.quote.slice(0, 1000),
          supports: true,
        },
      });
    }
  }

  return { claims };
}

/** Aggregate verdict for a topic: the weakest claim status wins (fail-closed). */
export function aggregateClaimVerdict(statuses: ClaimVerificationStatus[]): ClaimVerificationStatus {
  if (statuses.length === 0) return 'UNVERIFIED';
  if (statuses.includes('CONFLICTING')) return 'CONFLICTING';
  if (statuses.includes('UNVERIFIED')) return 'UNVERIFIED';
  if (statuses.includes('PARTIALLY_VERIFIED')) return 'PARTIALLY_VERIFIED';
  return 'VERIFIED';
}
