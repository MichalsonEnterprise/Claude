import { prisma } from '../db.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { scoreResearchItem } from '../scoring/topicScoring.js';
import { checkDuplicateTopic, noveltyFromOverlap, semanticKeyFor } from '../content/duplicateDetection.js';
import { verifyTopicClaims, aggregateClaimVerdict } from '../verification/claimVerifier.js';
import type { ContentPillar } from '../content/topicBrief.js';
import type { Topic } from '@prisma/client';

const EVERGREEN_TOPICS: { title: string; summary: string }[] = [
  { title: 'Częste błędy przedsiębiorców przy rozliczeniach VAT', summary: 'Praktyczny przegląd najczęstszych pomyłek i jak ich unikać.' },
  { title: 'Jak działa JPK i dlaczego budzi tyle pytań', summary: 'Wyjaśnienie mechaniki JPK w prostych słowach.' },
  { title: 'Dlaczego reconciliation dokumentów jest trudne', summary: 'Analiza, dlaczego ręczne uzgadnianie dokumentów bywa czasochłonne i podatne na błędy.' },
  { title: 'Ręczne vs automatyczne zamknięcie miesiąca', summary: 'Porównanie podejść i tego, gdzie automatyzacja realnie pomaga.' },
  { title: 'Kontrola kontrahenta — na co zwrócić uwagę', summary: 'Praktyczny przewodnik po weryfikacji kontrahentów.' },
  { title: 'Workflow dokumentów księgowych krok po kroku', summary: 'Jak wygląda typowy przepływ dokumentu od wpływu do zaksięgowania.' },
  { title: 'Problemy tradycyjnych systemów księgowych', summary: 'Gdzie klasyczne systemy księgowe najbardziej zawodzą użytkowników.' },
];

/**
 * Scores every NEW research item, promotes items above TOPIC_MIN_SCORE into
 * Topic records (kind=NEWS), and — if too few clear that bar — fills the
 * gap with evergreen topics so the agent is never dependent on there being
 * good news that day (brief #12).
 */
export async function planTopics(targetCount: number): Promise<Topic[]> {
  const newItems = await prisma.researchItem.findMany({ where: { status: 'NEW' }, take: 200 });
  const selected: Topic[] = [];

  for (const item of newItems) {
    const dup = await checkDuplicateTopic(item.title, item.rawSummary);
    const novelty = noveltyFromOverlap(dup.bestOverlap);
    const score = scoreResearchItem(item, novelty);

    await prisma.researchItem.update({
      where: { id: item.id },
      data: {
        freshnessScore: score.freshness,
        authorityScore: score.authority,
        accountingRelevance: score.accountingRelevance,
        productRelevance: score.productRelevance,
        finalScore: score.final,
        status: score.final >= config.research.topicMinScore ? 'SCORED' : 'REJECTED',
      },
    });

    if (score.final < config.research.topicMinScore) continue;
    if (dup.isDuplicate) continue; // too similar to something published/selected recently

    const topic = await prisma.topic.create({
      data: {
        title: item.title,
        summary: item.rawSummary || item.title,
        kind: 'NEWS',
        contentPillar: 'news',
        score: score.final,
        novelty,
        status: 'SELECTED',
        semanticKey: semanticKeyFor(item.title),
        researchItems: { connect: [{ id: item.id }] },
      },
    });
    await prisma.researchItem.update({ where: { id: item.id }, data: { status: 'SELECTED' } });
    selected.push(topic);

    if (selected.length >= targetCount) break;
  }

  logger.info('topicSelected', { newsSelected: selected.length, targetCount });

  // Fill remaining slots with evergreen/product-led topics.
  let evergreenIndex = 0;
  while (selected.length < targetCount) {
    const seed = EVERGREEN_TOPICS[evergreenIndex % EVERGREEN_TOPICS.length];
    evergreenIndex++;
    const dup = await checkDuplicateTopic(seed.title, seed.summary);
    if (dup.isDuplicate && evergreenIndex < EVERGREEN_TOPICS.length * 3) continue; // try next candidate, but don't loop forever

    const topic = await prisma.topic.create({
      data: {
        title: seed.title,
        summary: seed.summary,
        kind: 'EVERGREEN',
        contentPillar: 'education',
        score: 70,
        novelty: noveltyFromOverlap(dup.bestOverlap),
        status: 'SELECTED',
        semanticKey: semanticKeyFor(seed.title),
      },
    });
    selected.push(topic);
    if (evergreenIndex > EVERGREEN_TOPICS.length * 3) break; // safety valve
  }

  return selected;
}

/**
 * Runs claim verification for NEWS topics (evergreen/product-led topics
 * carry no external factual claim and skip this — see safetyGate's
 * isNewsBased flag). Sets topic.status to VERIFIED or REJECTED accordingly.
 */
export async function verifyTopic(topic: Topic): Promise<{ ok: boolean; verdict: string | null }> {
  if (topic.kind !== 'NEWS') {
    await prisma.topic.update({ where: { id: topic.id }, data: { status: 'VERIFIED' } });
    return { ok: true, verdict: null };
  }

  const researchItems = await prisma.researchItem.findMany({ where: { topics: { some: { id: topic.id } } } });
  const evidence = researchItems.map((ri) => ({
    sourceName: ri.sourceName,
    sourceTier: ri.sourceTier,
    url: ri.url,
    quote: ri.rawSummary,
  }));

  const { claims } = await verifyTopicClaims(topic.id, topic.title, evidence);
  const verdict = aggregateClaimVerdict(claims.map((c) => c.verification));

  if (verdict === 'UNVERIFIED' || verdict === 'CONFLICTING') {
    await prisma.topic.update({ where: { id: topic.id }, data: { status: 'REJECTED' } });
    return { ok: false, verdict };
  }

  await prisma.topic.update({ where: { id: topic.id }, data: { status: 'VERIFIED' } });
  return { ok: true, verdict };
}
