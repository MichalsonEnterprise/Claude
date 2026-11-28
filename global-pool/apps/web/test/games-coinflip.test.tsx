/**
 * Double Side (key "dice-coinflip") — pure logic + static renders. The side always comes from the server; the browser
 * re-derives it with @gp/shared/fair (same code, no duplicated maths). DEMO credits only — no cash value.
 */
import { coinflip, playInstant, sha256Hex, type CoinflipOutcome } from '@gp/shared/fair';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CoinFace, SideDisc } from '@/components/games/coinflip/coin';
import {
  HOUSE_EDGE,
  INFO,
  MULTIPLIER,
  describeFlipOutcome,
  faceAngle,
  landedCounts,
  landingAngle,
  mappingLine,
  normaliseFlipSearch,
  payoutOnWin,
  periodFrom,
  sideOfU32,
  u32Fraction,
  u32Hex,
} from '@/components/games/coinflip/coinflip-math';
import { verifyInBrowser } from '@/components/games/kit/verify';
import type { BetVerification } from '@/lib/api/games';

describe('published Double Side rules (identical for every player)', () => {
  it('pays 1.96× with a 2.00 % edge, 0.10 – 1,000.00 DEMO per flip', () => {
    expect(MULTIPLIER).toBe('1.96');
    expect(HOUSE_EDGE).toBe('2.00');
    expect(INFO).toMatchObject({
      minBet: '0.10',
      maxBet: '1000.00',
      rtpPercent: '98.00',
      refPrefix: 'CF',
    });
  });
  it('payout on a win is stake × 1.96 truncated (decimal strings, never floats)', () => {
    expect(payoutOnWin('10.00')).toBe('19.60');
    expect(payoutOnWin('0.10')).toBe('0.19'); // 0.196 → 0.19, never rounded up
    expect(payoutOnWin('1000.00')).toBe('1960.00');
    expect(payoutOnWin('4.20')).toBe('8.23'); // 8.232
  });
});

describe('scale + map (CF-05 steps) agree with the engine', () => {
  it('x = u32 ÷ 2³², Heads iff u32 < 2³¹', () => {
    expect(u32Hex(0x3a91c0f2)).toBe('0x3a91c0f2');
    expect(u32Fraction(0x3a91c0f2)).toBe('0.2287');
    expect(sideOfU32(2_147_483_647)).toBe('heads');
    expect(sideOfU32(2_147_483_648)).toBe('tails');
    expect(u32Fraction(2_147_483_648)).toBe('0.5000');
    expect(mappingLine(0)).toBe('0.0000 → below 0.5000 → Heads');
    expect(mappingLine(4_294_967_295)).toBe('0.9999 → at or above 0.5000 → Tails');
  });
  it('matches coinflip.coinSide() of @gp/shared/fair for many seeds', () => {
    for (let nonce = 0; nonce < 200; nonce++) {
      const s = coinflip.coinSide({ serverSeed: 'a'.repeat(64), clientSeed: 'qa-client', nonce });
      expect(sideOfU32(s.u32)).toBe(s.side);
    }
  });
});

describe('the coin animation never stages a near miss', () => {
  it('lands on the settled side after ≥ 6 half-turns, whatever the pick', () => {
    for (const from of [0, 180, 360, 540, 1260, -180]) {
      for (const side of ['heads', 'tails'] as const) {
        const to = landingAngle(from, side);
        expect(to - from).toBeGreaterThanOrEqual(6 * 180);
        expect(to - from).toBeLessThan(6 * 180 + 360);
        expect(((to % 360) + 360) % 360).toBe(side === 'heads' ? 0 : 180);
      }
    }
  });
  it('a pick change turns to that face (no turn when already showing it)', () => {
    expect(faceAngle(0, 'heads')).toBe(0);
    expect(faceAngle(0, 'tails')).toBe(180);
    expect(faceAngle(180, 'heads')).toBe(360);
    expect(faceAngle(2340, 'tails')).toBe(2340);
  });
});

describe('history helpers', () => {
  it('normalises flip search (ref or nonce) and rejects anything else', () => {
    expect(normaliseFlipSearch('CF-52107')).toBe('CF-52107');
    expect(normaliseFlipSearch(' cf52107 ')).toBe('CF-52107');
    expect(normaliseFlipSearch('418')).toBe('418');
    expect(normaliseFlipSearch('D-10482')).toBeNull();
    expect(normaliseFlipSearch('drop table')).toBeNull();
    expect(normaliseFlipSearch('')).toBeNull();
  });
  it('periods start at 00:00 UTC / 7 / 30 days back; "all" has no bound', () => {
    const now = new Date('2026-11-28T18:44:06Z');
    expect(periodFrom('today', now)).toBe('2026-11-28T00:00:00.000Z');
    expect(periodFrom('7d', now)).toBe('2026-11-21T18:44:06.000Z');
    expect(periodFrom('30d', now)).toBe('2026-10-29T18:44:06.000Z');
    expect(periodFrom('all', now)).toBeUndefined();
  });
  it('counts landed sides', () => {
    expect(landedCounts(['heads', 'tails', 'heads'])).toEqual({ heads: 2, tails: 1 });
    expect(landedCounts([])).toEqual({ heads: 0, tails: 0 });
  });
  it('describes an outcome for the verifier', () => {
    expect(
      describeFlipOutcome({
        side: 'heads',
        pick: 'heads',
        u32: 982_630_642,
        win: true,
        multiplier: '1.96',
      }),
    ).toBe('x = 0.2287 → Heads · picked Heads → Win · 1.96×');
    expect(
      describeFlipOutcome({ side: 'tails', pick: 'heads', u32: 3_000_000_000, win: false }),
    ).toBe('x = 0.6984 → Tails · picked Heads → Lose');
  });
});

describe('browser verification of a Double Side flip (@gp/shared/fair)', () => {
  const serverSeed = 'c71d0a58e94f3b26a18d5e07f2c94b6d1e83a5f07c29d4b81e6f3a90d5c27b14';
  const seed = { serverSeed, clientSeed: 'nova-k-7f2a91', nonce: 418 };
  const settled = playInstant('double-side', seed, { pick: 'heads' }, '10.00');
  const o = settled.outcome as unknown as CoinflipOutcome;
  const v: BetVerification = {
    bet: {
      id: 'b1',
      ref: 'CF-52107',
      game: { slug: 'double-side', name: 'Double Side' },
      status: 'settled',
      stake: settled.stake,
      payout: settled.payout,
      net: '0.00',
      multiplier: settled.multiplier,
      win: settled.win,
      fee: '0.00',
      params: { pick: 'heads' },
      outcome: { ...settled.outcome, win: settled.win },
      fairness: {
        seedPairId: 's',
        serverSeedHash: sha256Hex(serverSeed),
        clientSeed: seed.clientSeed,
        nonce: 418,
        revealed: true,
      },
      rulesVersion: 'double-side/1',
      currency: 'DEMO',
      createdAt: '2026-11-28T00:00:00Z',
      settledAt: '2026-11-28T00:00:00Z',
      isDemo: true,
    },
    verify: {
      game: 'double-side',
      rulesVersion: 'double-side/1',
      serverSeedHash: sha256Hex(serverSeed),
      serverSeed,
      clientSeed: seed.clientSeed,
      nonce: 418,
      stake: '10.00',
      params: { pick: 'heads' },
      stream: '',
      library: '',
    },
    revealed: true,
    commitmentValid: true,
    recomputed: null,
    matches: true,
    message: '',
    isDemo: true,
  };
  it('re-derives the recorded side and payout', () => {
    const r = verifyInBrowser(v, seed);
    expect(r.matches).toBe(true);
    expect((r.result?.outcome as unknown as CoinflipOutcome).side).toBe(o.side);
    // block 0's first 4 bytes are the u32 the engine used
    expect(Number.parseInt(r.firstBlock!.slice(0, 8), 16)).toBe(o.u32);
    expect(settled.payout).toBe(o.side === 'heads' ? '19.60' : '0.00');
  });
  it('a truncated seed (63 chars) fails the commitment', () => {
    const r = verifyInBrowser(v, { ...seed, serverSeed: serverSeed.slice(0, 63) });
    expect(r.commitmentValid).toBe(false);
    expect(r.matches).toBe(false);
  });
  it('the pick never changes the side', () => {
    const tails = playInstant('double-side', seed, { pick: 'tails' }, '10.00');
    expect((tails.outcome as unknown as CoinflipOutcome).side).toBe(o.side);
    expect(tails.win).toBe(!settled.win);
  });
});

describe('coin rendering', () => {
  it('heads is mint with the medallion, tails silver; both decorative (aria-hidden)', () => {
    const heads = renderToStaticMarkup(<CoinFace side="heads" size={96} />);
    const tails = renderToStaticMarkup(<CoinFace side="tails" size={96} />);
    expect(heads).toContain('HEADS');
    expect(heads).toContain('bg-brand');
    expect(tails).toContain('TAILS');
    expect(tails).toContain('bg-ink-200');
    expect(heads).not.toMatch(/gold/);
    expect(heads).toContain('aria-hidden');
    expect(renderToStaticMarkup(<SideDisc side="tails" newest />)).toContain('ring-2');
  });
});
