/**
 * GLOBAL POOL — DEMO compliance cases for the admin back-office (ADM-C1 KYC queue, ADM-C2 AML alerts).
 * Runs only with DEMO_MODE=true:
 *
 *   pnpm --filter @gp/api exec tsx prisma/seed-admin-ops.ts
 *
 * Idempotent and additive: creates open KYC cases and AML alerts for DEMO crowd players (provider ref / rule
 * marker `demo-admin-ops-v1`). It never touches the ledger, balances, deposits, withdrawals or rounds — these rows
 * only give reviewers something to decide in DEMO. Every row is is_demo = true.
 */
import { PrismaClient, type AmlRiskLevel, type KycLevel, type KycStatus } from '@prisma/client';

import { loadEnvFiles } from '../src/config/load-env';

loadEnvFiles();
const prisma = new PrismaClient();
const MARKER = 'demo-admin-ops-v1';

interface KycCase {
  handle: string;
  level: Exclude<KycLevel, 'none'>;
  status: KycStatus;
  hoursAgo: number;
}
interface AmlCase {
  handle: string;
  risk: AmlRiskLevel;
  rule: string;
  reason: string;
  hoursAgo: number;
}

const KYC: KycCase[] = [
  { handle: 'player_0012', level: 'level_2', status: 'pending', hoursAgo: 47 },
  { handle: 'player_0027', level: 'level_3', status: 'in_review', hoursAgo: 46 },
  { handle: 'player_0041', level: 'level_2', status: 'pending', hoursAgo: 44 },
  { handle: 'player_0058', level: 'level_3', status: 'pending', hoursAgo: 39 },
  { handle: 'player_0063', level: 'level_2', status: 'in_review', hoursAgo: 34 },
  { handle: 'player_0077', level: 'level_2', status: 'pending', hoursAgo: 25 },
  { handle: 'player_0081', level: 'level_2', status: 'in_review', hoursAgo: 21 },
  { handle: 'player_0094', level: 'level_2', status: 'pending', hoursAgo: 20 },
  { handle: 'player_0105', level: 'level_2', status: 'pending', hoursAgo: 18 },
  { handle: 'player_0118', level: 'level_1', status: 'pending', hoursAgo: 6 },
];

const AML: AmlCase[] = [
  {
    handle: 'player_0203',
    risk: 'high',
    rule: 'sanctions_proximity',
    reason: 'Destination one hop from a sanctioned cluster (DEMO analytics)',
    hoursAgo: 30,
  },
  {
    handle: 'player_0218',
    risk: 'high',
    rule: 'mixer_exposure',
    reason: 'Destination two transfers away from a mixer-linked cluster (DEMO analytics)',
    hoursAgo: 22,
  },
  {
    handle: 'player_0227',
    risk: 'high',
    rule: 'rapid_in_out',
    reason: '96 % of a deposit withdrawn within 3 h with little play',
    hoursAgo: 18,
  },
  {
    handle: 'player_0236',
    risk: 'medium',
    rule: 'structuring',
    reason: '6 deposits just under 1,000.00 in 24 h',
    hoursAgo: 14,
  },
  {
    handle: 'player_0245',
    risk: 'medium',
    rule: 'shared_device',
    reason: 'Same device fingerprint as 3 other accounts',
    hoursAgo: 9,
  },
  {
    handle: 'player_0254',
    risk: 'low',
    rule: 'velocity',
    reason: '14 withdrawal requests in 24 h',
    hoursAgo: 4,
  },
];

async function main() {
  if (process.env.DEMO_MODE !== 'true') throw new Error('DEMO_MODE=true is required');
  const now = Date.now();
  let kyc = 0;
  let aml = 0;
  for (const c of KYC) {
    const user = await prisma.user.findFirst({ where: { handle: c.handle, isDemo: true } });
    if (!user) continue;
    const ref = `${MARKER}:${c.handle}:${c.level}`;
    const exists = await prisma.kycRecord.findFirst({ where: { providerRef: ref } });
    if (exists) continue;
    const at = new Date(now - c.hoursAgo * 3_600_000);
    await prisma.kycRecord.create({
      data: {
        userId: user.id,
        level: c.level,
        status: c.status,
        provider: 'mock',
        providerRef: ref,
        submittedAt: at,
        createdAt: at,
        isDemo: true,
      },
    });
    kyc++;
  }
  for (const a of AML) {
    const user = await prisma.user.findFirst({ where: { handle: a.handle, isDemo: true } });
    if (!user) continue;
    const exists = await prisma.amlAlert.findFirst({
      where: { userId: user.id, rule: a.rule, details: { path: ['marker'], equals: MARKER } },
    });
    if (exists) continue;
    const at = new Date(now - a.hoursAgo * 3_600_000);
    await prisma.amlAlert.create({
      data: {
        userId: user.id,
        riskLevel: a.risk,
        rule: a.rule,
        status: 'open',
        details: {
          marker: MARKER,
          provider: 'mock',
          decision: 'review',
          reason: a.reason,
          checks: 6,
        },
        createdAt: at,
        isDemo: true,
      },
    });
    aml++;
  }
  console.info(`seed-admin-ops: +${kyc} KYC cases, +${aml} AML alerts (DEMO, non-ledger)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
