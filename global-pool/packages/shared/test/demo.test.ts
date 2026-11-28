import { describe, expect, it } from 'vitest';

import {
  DEMO,
  DEMO_BALANCES,
  DEMO_CURRENT_ROUND,
  DEMO_MY_ENTRY_IDS,
  isDemo,
  isDemoId,
} from '../src/demo';
import { entryQuote, withdrawalQuote } from '../src/fees';
import {
  formatCount,
  formatCountdown,
  formatDateTimeUTC,
  formatRoundNumber,
  truncateAddress,
} from '../src/format';
import { eq, formatUSDT, mul, sum, toUSDTString } from '../src/money';
import { meetsThreshold, prizeBreakdown } from '../src/pool';
import { isEvmAddress, isSolanaAddress, uuidSchema } from '../src/schemas';

/** Collect every record: top-level objects and each object inside arrays (recursively through arrays/records). */
function records(value: unknown, path: string, out: [string, unknown][] = []): [string, unknown][] {
  if (Array.isArray(value)) {
    value.forEach((v, i) => {
      if (typeof v === 'object' && v !== null) out.push([`${path}[${i}]`, v]);
    });
  } else if (typeof value === 'object' && value !== null) {
    out.push([path, value]);
  }
  return out;
}

describe('DEMO flag', () => {
  const all = Object.entries(DEMO).flatMap(([k, v]) => records(v, k));

  it('every DEMO record carries isDemo: true', () => {
    expect(all.length).toBeGreaterThan(60);
    for (const [path, rec] of all) expect(isDemo(rec), path).toBe(true);
  });

  it('uses deterministic UUID demo ids', () => {
    expect(uuidSchema.safeParse(DEMO_CURRENT_ROUND.id).success).toBe(true);
    expect(isDemoId(DEMO.user.id)).toBe(true);
    for (const g of DEMO.games) expect(isDemoId(g.id)).toBe(true);
  });
});

describe('DEMO balances reconcile', () => {
  it('12,480.50 = 9,215.30 + 1,850.00 + 1,000.00 + 415.20', () => {
    const b = DEMO_BALANCES;
    expect(toUSDTString(sum([b.available, b.locked, b.pending, b.owed]))).toBe(b.total);
    expect(formatUSDT(b.total)).toBe('12,480.50 USDT');
    for (const bucket of ['locked', 'pending', 'owed'] as const) {
      expect(toUSDTString(sum(b.breakdown[bucket].map((c) => c.amount)))).toBe(
        toUSDTString(b[bucket]),
      );
    }
  });

  it('lifetime platform fees = 1,284 entries × 0.05', () => {
    expect(toUSDTString(mul('0.05', DEMO.lifetime.entries))).toBe(DEMO.lifetime.platformFeesPaid);
  });
});

describe('DEMO round #1,248', () => {
  const r = DEMO_CURRENT_ROUND;

  it('pool = entries × 10.00, fees = entries × 0.05 (not in the pool), closes 20:00 UTC', () => {
    expect(r.poolBalance).toBe(toUSDTString(mul(r.entryPrice, r.entries!)));
    expect(r.platformFees).toBe(toUSDTString(mul(r.platformFeePerEntry, r.entries!)));
    expect(r.closesAt).toBe('2026-11-27T20:00:00Z');
    expect(formatDateTimeUTC(r.closesAt)).toBe('27 Nov 2026, 20:00 UTC');
    expect(formatRoundNumber(r.number)).toBe('#1,248');
    expect(formatCount(r.participants!)).toBe('3,412');
    expect(r.thresholds.met).toBe(true);
  });

  it('prize split matches the sheet and sums to the pool', () => {
    const tiers = r.prizeDistribution!;
    expect(tiers.map((t) => t.amountEach)).toEqual(['93200.00', '37280.00', '18640.00', '3728.00']);
    expect(eq(sum(tiers.map((t) => t.amountTotal)), r.poolBalance!)).toBe(true);
  });

  it('settled scenario: 13 winners whose prizes sum to the pool', () => {
    const w = DEMO.round1248Settled.winners;
    expect(w).toHaveLength(13);
    expect(eq(sum(w.map((x) => x.amount)), '186400.00')).toBe(true);
    expect(DEMO.round1248Settled.draw?.requestIdDisplay).toBe('0x9f2c…e71a');
  });

  it('my 35 entries E-1248-00981 … E-1248-01015 cost exactly entryQuote(35)', () => {
    expect(DEMO_MY_ENTRY_IDS).toHaveLength(35);
    expect(DEMO_MY_ENTRY_IDS[0]).toBe('E-1248-00981');
    expect(DEMO_MY_ENTRY_IDS[34]).toBe('E-1248-01015');
    const q = entryQuote(DEMO.myEntries.entries);
    expect([q.entryAmount, q.platformFee, q.total]).toEqual([
      DEMO.myEntries.entryAmount,
      DEMO.myEntries.platformFee,
      DEMO.myEntries.total,
    ]);
  });

  it('previous rounds #1,247 … #1,244, #1,245 cancelled with refunds to Owed', () => {
    expect(DEMO.previousRounds.map((x) => [x.number, x.status, x.poolBalance])).toEqual([
      [1247, 'settled', '172950.00'],
      [1246, 'settled', '168420.00'],
      [1245, 'cancelled', '41200.00'],
      [1244, 'settled', '181030.00'],
    ]);
    expect(DEMO.previousRounds[2]!.cancellation?.refundsTo).toBe('owed');
    expect(DEMO.previousRounds[3]!.winners.find((w) => w.handle === 'nova.k')?.amount).toBe(
      '3620.60',
    );
  });

  it('settled history snapshots are internally consistent: participants vs threshold, 13 prizes = pool (Q06)', () => {
    for (const r of DEMO.previousRounds.filter((x) => x.status === 'settled')) {
      expect(r.participants).not.toBeNull();
      expect(r.thresholds.met).toBe(true);
      expect(meetsThreshold({ participants: r.participants!, poolBalance: r.poolBalance! })).toBe(
        true,
      );
      expect(r.winners.map((w) => w.place)).toEqual(Array.from({ length: 13 }, (_, i) => i + 1));
      expect(toUSDTString(sum(r.winners.map((w) => w.amount)))).toBe(r.poolBalance);
      expect(new Set(r.winners.map((w) => w.handle)).size).toBe(13);
      expect(r.winners[0]!.amount).toBe(prizeBreakdown(r.poolBalance!).tiers[0]!.amountEach);
    }
    expect(
      DEMO.previousRounds.map((x) => [x.number, x.participants, x.winners[0]?.handle]),
    ).toEqual([
      [1247, 3166, 'orbit_77'],
      [1246, 3083, 'mira.sol'],
      [1245, 412, undefined],
      [1244, 3314, 'kestrel'],
    ]);
    expect(DEMO.previousRounds[3]!.winners[3]).toMatchObject({
      place: 4,
      tier: 'runner_up',
      handle: 'nova.k',
    });
  });

  it('countdowns derive from the absolute close time', () => {
    expect(formatCountdown(r.closesAt, '2026-11-27T16:42:18Z')).toBe('03:17:42');
    expect(formatCountdown(r.closesAt, '2026-11-28T00:00:00Z')).toBe('00:00:00');
  });
});

describe('DEMO transactions & wallets', () => {
  it('has the six history rows from the designs', () => {
    expect(DEMO.transactions.map((t) => t.id)).toEqual([
      'DP-77412',
      'WD-20931',
      'E-1248-00981-01015',
      'DP-77380',
      'WD-20877',
      'WD-20850',
    ]);
  });

  it('withdrawal amounts agree with withdrawalQuote', () => {
    for (const t of DEMO.transactions.filter(
      (x) => x.type === 'withdrawal' && x.status !== 'rejected',
    )) {
      const q = withdrawalQuote(t.amount, t.network!);
      expect([q.networkFee, q.youReceive], t.id).toEqual([t.networkFee, t.netAmount]);
    }
  });

  it('wallet placeholders are structurally valid and match their display form', () => {
    const [bnb, arb, solana] = DEMO.wallets;
    expect(isEvmAddress(bnb!.address)).toBe(true);
    expect(isEvmAddress(arb!.address)).toBe(true);
    expect(isSolanaAddress(solana!.address)).toBe(true);
    for (const w of DEMO.wallets) {
      expect(truncateAddress(w.address).toLowerCase()).toBe(w.addressDisplay.toLowerCase());
    }
  });
});

describe('DEMO catalogue, promotions, RG', () => {
  it('uses the original game names with disclosed house edge', () => {
    const names = DEMO.games.map((g) => g.name);
    for (const n of [
      'Global Pool',
      'Orbit Rush',
      'Pool Dice',
      'Double Side',
      'Pool Roulette',
      'Twenty-One',
      'Vault Sweeper',
      'Skyline',
      'Pinfall',
      'Fortune Ring',
      'Neon Koi',
    ]) {
      expect(names).toContain(n);
    }
    for (const g of DEMO.games) expect(g.edgeLabel.length).toBeGreaterThan(0);
    expect(DEMO.games.find((g) => g.slug === 'orbit-rush')?.players).toBe(1062);
    expect(DEMO.games.filter((g) => g.mode === 'pool').map((g) => g.slug)).toEqual(['global-pool']);
  });

  it('every promotion shows key terms and "Terms apply"', () => {
    for (const p of DEMO.promotions) {
      expect(p.keyTerms.length).toBeGreaterThan(0);
      expect(p.termsApply).toBe(true);
    }
    expect(toUSDTString(sum(DEMO.dailyStreak))).toBe('13.75');
    const t = DEMO.tournamentPrizes;
    const total = sum(t.places.map((p) => mul(p.amountEach, p.to - p.from + 1)));
    expect(toUSDTString(total)).toBe(t.prizePool);
  });

  it('RG: participation 351.75 / 500.00 today, loss 24.60 / 200.00, deposit increase pending', () => {
    const [participation, loss, deposit] = DEMO.responsibleGaming.limits;
    expect(participation).toMatchObject({ limit: '500.00', used: '351.75' });
    expect(participation!.used).toBe(entryQuote(35).total);
    expect(loss).toMatchObject({ limit: '200.00', used: '24.60' });
    expect(deposit!.pendingIncrease?.amount).toBe('7500.00');
    expect(DEMO.responsibleGaming.session.durationSeconds).toBe(42 * 60 + 18);
  });
});
