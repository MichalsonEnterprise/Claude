import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../db.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { PostizClient } from '../postiz/postizClient.js';
import { getLlmProvider } from '../llm/index.js';
import { isPaused, setPaused } from '../pipeline/pauseState.js';
import {
  runResearchStage,
  runPlanStage,
  runGenerateWeekStage,
  runFullPipeline,
} from '../pipeline/orchestrator.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PANEL_DIR = join(HERE, '..', '..', 'src', 'panel', 'public');

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Very light single-operator auth: if PANEL_TOKEN is set, require it on
  // everything except /health.
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/health' || !config.panelToken) return next();
    if (req.headers['x-panel-token'] === config.panelToken) return next();
    res.status(401).json({ error: 'unauthorized' });
  });

  app.use(express.static(PANEL_DIR));

  app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  app.get('/status', async (_req, res) => {
    try {
      const [dbOk, paused] = await Promise.all([
        prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
        isPaused(),
      ]);
      const postiz = new PostizClient();
      const ai = await getLlmProvider();

      const since = new Date();
      since.setHours(0, 0, 0, 0);

      const [researchToday, topicsToday, draftsToday, scheduledToday, publishedToday, failedToday] = await Promise.all([
        prisma.researchItem.count({ where: { discoveredAt: { gte: since } } }),
        prisma.topic.count({ where: { createdAt: { gte: since } } }),
        prisma.contentDraft.count({ where: { createdAt: { gte: since } } }),
        prisma.scheduledContent.count({ where: { createdAt: { gte: since } } }),
        prisma.publishedContent.count({ where: { publishedAt: { gte: since } } }),
        prisma.scheduledContent.count({ where: { status: 'FAILED', updatedAt: { gte: since } } }),
      ]);

      res.json({
        autopilotMode: config.autopilotMode,
        paused,
        dryRun: config.dryRun,
        db: dbOk ? 'CONNECTED' : 'DISCONNECTED',
        postiz: postiz.isMock ? 'MOCK' : 'CONNECTED',
        ai: { provider: ai.name, status: ai.name === 'mock' ? 'MOCK' : 'CONNECTED' },
        today: {
          researchItems: researchToday,
          topicsSelected: topicsToday,
          drafts: draftsToday,
          scheduled: scheduledToday,
          published: publishedToday,
          failed: failedToday,
        },
      });
    } catch (err) {
      logger.error('status endpoint failed', { error: (err as Error).message });
      res.status(500).json({ error: 'status_failed' });
    }
  });

  app.post('/agent/run', async (_req, res) => {
    try {
      const result = await runFullPipeline();
      res.json({ ok: true, result });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  app.post('/agent/research', async (_req, res) => {
    try {
      const result = await runResearchStage();
      res.json({ ok: true, result });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  app.post('/agent/generate-week', async (_req, res) => {
    try {
      const planResult = await runPlanStage();
      const weekResult = await runGenerateWeekStage();
      res.json({ ok: true, planResult, weekResult });
    } catch (err) {
      res.status(500).json({ ok: false, error: (err as Error).message });
    }
  });

  app.post('/autopilot/pause', async (_req, res) => {
    await setPaused(true);
    logger.info('Autopilot paused via API');
    res.json({ ok: true, paused: true });
  });

  app.post('/autopilot/resume', async (_req, res) => {
    await setPaused(false);
    logger.info('Autopilot resumed via API');
    res.json({ ok: true, paused: false });
  });

  app.get('/research', async (req, res) => {
    const items = await prisma.researchItem.findMany({
      orderBy: { discoveredAt: 'desc' },
      take: Number(req.query.limit) || 50,
    });
    res.json(items);
  });

  app.get('/topics', async (req, res) => {
    const topics = await prisma.topic.findMany({
      orderBy: { createdAt: 'desc' },
      take: Number(req.query.limit) || 50,
      include: { claims: true },
    });
    res.json(topics);
  });

  app.get('/drafts', async (req, res) => {
    const drafts = await prisma.contentDraft.findMany({
      orderBy: { createdAt: 'desc' },
      take: Number(req.query.limit) || 50,
      include: { media: true, approvals: true, topic: true },
    });
    res.json(drafts);
  });

  app.get('/scheduled', async (req, res) => {
    const items = await prisma.scheduledContent.findMany({
      orderBy: { scheduledFor: 'asc' },
      take: Number(req.query.limit) || 100,
      include: { draft: true },
    });
    res.json(items);
  });

  app.get('/published', async (req, res) => {
    const items = await prisma.publishedContent.findMany({
      orderBy: { publishedAt: 'desc' },
      take: Number(req.query.limit) || 50,
    });
    res.json(items);
  });

  app.get('/failures', async (req, res) => {
    const items = await prisma.scheduledContent.findMany({
      where: { status: 'FAILED' },
      orderBy: { updatedAt: 'desc' },
      take: Number(req.query.limit) || 50,
      include: { draft: true },
    });
    res.json(items);
  });

  app.get('/runs', async (req, res) => {
    const runs = await prisma.agentRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: Number(req.query.limit) || 20,
    });
    res.json(runs);
  });

  app.post('/drafts/:id/approve', async (req, res) => {
    const draft = await prisma.contentDraft.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED' },
    });
    await prisma.approval.updateMany({
      where: { draftId: req.params.id, decision: 'PENDING' },
      data: { decision: 'APPROVED', decidedAt: new Date() },
    });
    res.json({ ok: true, draft });
  });

  app.post('/drafts/:id/reject', async (req, res) => {
    const draft = await prisma.contentDraft.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' },
    });
    await prisma.approval.updateMany({
      where: { draftId: req.params.id, decision: 'PENDING' },
      data: { decision: 'REJECTED', decidedAt: new Date(), reason: req.body?.reason || null },
    });
    res.json({ ok: true, draft });
  });

  return app;
}
