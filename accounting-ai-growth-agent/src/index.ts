import { config, assertValidConfig } from './config.js';
import { logger } from './logger.js';
import { createServer } from './api/server.js';
import { startCronLoop } from './cron/loop.js';
import { ensureSourcesInDb } from './research/researchEngine.js';

async function main() {
  assertValidConfig();
  logger.info('accounting-ai-growth-agent starting', {
    autopilotMode: config.autopilotMode,
    dryRun: config.dryRun,
    aiProvider: config.ai.provider,
    postizMock: config.postiz.mock,
  });

  await ensureSourcesInDb();

  const app = createServer();
  app.listen(config.port, () => {
    logger.info(`HTTP API + panel listening on :${config.port}`);
  });

  startCronLoop();
}

main().catch((err) => {
  logger.error('Fatal startup error', { error: (err as Error).message, stack: (err as Error).stack });
  process.exit(1);
});
