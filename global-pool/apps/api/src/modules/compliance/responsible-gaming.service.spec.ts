import { describe, expect, it } from 'vitest';

import { AppError } from '../../common/errors';
import type { PrismaService } from '../../infra/prisma/prisma.service';
import type { StepUpService } from '../security/step-up.service';
import type { TotpService } from '../security/totp.service';
import { ResponsibleGamingService } from './responsible-gaming.service';

type Limit = {
  id: string;
  userId: string;
  type: string;
  period: string;
  amount: { toFixed(): string } | null;
  minutes: number | null;
  pendingAmount: { toFixed(): string } | null;
  pendingMinutes: number | null;
  pendingEffectiveAt: Date | null;
  pendingRemoval?: boolean;
};

const dec = (v: string | null | undefined) =>
  v === null || v === undefined ? null : { toFixed: () => v, d: [1] };

/** Minimal in-memory Prisma double for the RG tables + transaction aggregates. */
function fakePrisma(opts: { spentToday?: string; selfExcludedUntil?: Date | null } = {}) {
  const limits: Limit[] = [];
  const db = {
    rgLimit: {
      findMany: ({ where }: { where: { userId: string } }) =>
        Promise.resolve(limits.filter((l) => l.userId === where.userId)),
      update: ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = limits.find((l) => l.id === where.id)!;
        for (const [k, v] of Object.entries(data))
          (row as Record<string, unknown>)[k] = typeof v === 'string' ? dec(v) : v;
        return Promise.resolve(row);
      },
      upsert: ({
        where,
        create,
        update,
      }: {
        where: { userId_type_period: { userId: string; type: string; period: string } };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
      }) => {
        const k = where.userId_type_period;
        let row = limits.find(
          (l) => l.userId === k.userId && l.type === k.type && l.period === k.period,
        );
        const apply = (target: Record<string, unknown>, data: Record<string, unknown>) => {
          for (const [key, v] of Object.entries(data))
            target[key] =
              typeof v === 'string' && key.toLowerCase().includes('amount') ? dec(v) : v;
        };
        if (!row) {
          row = {
            id: `l${limits.length}`,
            userId: k.userId,
            type: k.type,
            period: k.period,
            amount: null,
            minutes: null,
            pendingAmount: null,
            pendingMinutes: null,
            pendingEffectiveAt: null,
          };
          apply(row, create);
          limits.push(row);
        } else {
          apply(row, update);
        }
        return Promise.resolve(row);
      },
    },
    rgSelfExclusion: {
      findFirst: () =>
        Promise.resolve(
          opts.selfExcludedUntil !== undefined
            ? { duration: '7d', endsAt: opts.selfExcludedUntil }
            : null,
        ),
      findMany: () =>
        Promise.resolve(
          opts.selfExcludedUntil !== undefined
            ? [{ duration: '7d', startsAt: new Date(0), endsAt: opts.selfExcludedUntil }]
            : [],
        ),
    },
    rgSettings: { findUnique: () => Promise.resolve(null) },
    transaction: {
      aggregate: ({ where }: { where: { type: string } }) =>
        Promise.resolve({
          _sum: { netAmount: where.type === 'entry_purchase' ? dec(opts.spentToday ?? '0') : null },
        }),
    },
  };
  return { db: db as unknown as PrismaService, limits };
}

const USER = 'u1';

/** Stubs for the security services (2FA off). */
const stepUp = {
  assert: () => Promise.resolve({ method: 'totp' as const }),
} as unknown as StepUpService;
const totp = { status: () => Promise.resolve({ enabled: false }) } as unknown as TotpService;
const service = (db: PrismaService) => new ResponsibleGamingService(db, stepUp, totp);

describe('responsible gaming limits (server-side)', () => {
  it('a first limit and decreases apply immediately; increases wait for the 24 h cool-down', async () => {
    const { db } = fakePrisma();
    const rg = service(db);
    const now = new Date('2026-11-27T12:00:00Z');
    let state = await rg.updateLimit(
      USER,
      { type: 'participation', period: 'day', amount: '500.00' },
      now,
    );
    expect(state.limits[0]).toMatchObject({ limit: '500.00', pendingIncrease: null });

    state = await rg.updateLimit(
      USER,
      { type: 'participation', period: 'day', amount: '300.00' },
      now,
    );
    expect(state.limits[0]).toMatchObject({ limit: '300.00', pendingIncrease: null });

    state = await rg.updateLimit(
      USER,
      { type: 'participation', period: 'day', amount: '800.00' },
      now,
    );
    expect(state.limits[0]!.limit).toBe('300.00');
    expect(state.limits[0]!.pendingIncrease).toEqual({
      amount: '800.00',
      minutes: null,
      effectiveAt: '2026-11-28T12:00:00.000Z',
    });

    // after the cool-down the pending increase becomes the effective limit
    const later = await rg.state(USER, new Date('2026-11-28T12:00:01Z'));
    expect(later.limits[0]).toMatchObject({ limit: '800.00', pendingIncrease: null });
  });

  it('blocks a purchase that would exceed the daily participation limit', async () => {
    const { db } = fakePrisma({ spentToday: '351.75' });
    const rg = service(db);
    await rg.updateLimit(USER, { type: 'participation', period: 'day', amount: '500.00' });
    await expect(rg.assertCanParticipate(USER, '100.50', db)).resolves.toBeUndefined(); // 452.25 ≤ 500
    const err = await rg.assertCanParticipate(USER, '160.80', db).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).code).toBe('RG_LIMIT_EXCEEDED');
    expect((err as AppError).details).toMatchObject({
      limit: '500.00',
      used: '351.75',
      remaining: '148.25',
    });
  });

  it('self-excluded players cannot participate or deposit', async () => {
    const { db } = fakePrisma({ selfExcludedUntil: new Date(Date.now() + 86_400_000) });
    const rg = service(db);
    await expect(rg.assertCanParticipate(USER, '10.05', db)).rejects.toMatchObject({
      code: 'SELF_EXCLUDED',
    });
    await expect(rg.assertCanDeposit(USER, '10.00', db)).rejects.toMatchObject({
      code: 'SELF_EXCLUDED',
    });
  });
});
