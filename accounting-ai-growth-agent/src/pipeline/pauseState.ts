import { prisma } from '../db.js';

const PAUSE_KEY = 'autopilot:paused';

/**
 * Global kill switch (brief #24). Independent of AUTOPILOT_MODE so an
 * operator can hit PAUSE without editing env vars/restarting. While
 * paused: no new content generation, nothing new sent to Postiz. Already
 * scheduled posts already sent to Postiz remain — Postiz owns final
 * execution, per the architecture split in the brief.
 */
export async function isPaused(): Promise<boolean> {
  const row = await prisma.systemSetting.findUnique({ where: { key: PAUSE_KEY } });
  return row?.value === 'true';
}

export async function setPaused(paused: boolean): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: PAUSE_KEY },
    update: { value: String(paused) },
    create: { key: PAUSE_KEY, value: String(paused) },
  });
}
