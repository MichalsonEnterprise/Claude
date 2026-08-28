import cron from 'node-cron';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { runResearchStage, runPlanStage, runQueueCheckStage } from '../pipeline/orchestrator.js';
import { isPaused } from '../pipeline/pauseState.js';

/**
 * Autonomous loop (brief #29): research every RESEARCH_INTERVAL_HOURS,
 * plan once a day, queue-check regularly. Locking (pipeline/lock.ts)
 * guarantees only one of these runs at a time even if two fire close
 * together. All are no-ops while paused or AUTOPILOT_MODE=OFF.
 */
export function startCronLoop() {
  if (config.autopilotMode === 'OFF') {
    logger.info('Cron loop not started: AUTOPILOT_MODE=OFF');
    return;
  }

  const researchCron = `0 */${Math.max(1, config.research.intervalHours)} * * *`;
  cron.schedule(researchCron, async () => {
    if (await isPaused()) return logger.info('Skipping scheduled research: autopilot paused');
    try {
      await runResearchStage();
    } catch (err) {
      logger.error('Scheduled research run failed', { error: (err as Error).message });
    }
  }, { timezone: config.timezone });

  cron.schedule('0 6 * * *', async () => {
    if (await isPaused()) return logger.info('Skipping scheduled plan: autopilot paused');
    try {
      await runPlanStage();
    } catch (err) {
      logger.error('Scheduled plan run failed', { error: (err as Error).message });
    }
  }, { timezone: config.timezone });

  cron.schedule('*/30 * * * *', async () => {
    if (await isPaused()) return;
    try {
      await runQueueCheckStage();
    } catch (err) {
      logger.error('Scheduled queue check failed', { error: (err as Error).message });
    }
  }, { timezone: config.timezone });

  logger.info('Cron loop started', { researchCron, timezone: config.timezone });
}
