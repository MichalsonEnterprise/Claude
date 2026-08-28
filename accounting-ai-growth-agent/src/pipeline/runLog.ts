import { prisma } from '../db.js';
import { logger } from '../logger.js';
import type { RunKind, RunStatus } from '@prisma/client';

export interface RunHandle {
  id: string;
  stage: (name: string, message: string, data?: unknown) => Promise<void>;
  finish: (status: RunStatus, errorSummary?: string) => Promise<void>;
}

/**
 * Every run gets a Run ID and a structured, ordered stage log persisted to
 * AgentRun.log (brief #23: runStarted, researchStarted, ... published,
 * failed). Stage failures are logged but never thrown from here — the
 * caller decides whether a single-platform failure should stop the run.
 */
export async function startRun(kind: RunKind): Promise<RunHandle> {
  const run = await prisma.agentRun.create({ data: { kind, status: 'RUNNING', log: [] } });
  logger.info('runStarted', { runId: run.id, kind });

  const stage = async (name: string, message: string, data?: unknown) => {
    const entry = { ts: new Date().toISOString(), stage: name, message, data };
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { log: { push: entry as any } },
    });
    logger.info(name, { runId: run.id, message, data });
  };

  const finish = async (status: RunStatus, errorSummary?: string) => {
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status, finishedAt: new Date(), errorSummary },
    });
    logger.info('runFinished', { runId: run.id, status, errorSummary });
  };

  return { id: run.id, stage, finish };
}
