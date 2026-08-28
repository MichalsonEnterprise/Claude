import { ensureSourcesInDb } from '../src/research/researchEngine.js';
import { prisma } from '../src/db.js';
import { logger } from '../src/logger.js';

async function main() {
  await ensureSourcesInDb();
  const count = await prisma.researchSource.count();
  logger.info('Seed complete', { researchSources: count });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Seed failed', { error: (err as Error).message });
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
