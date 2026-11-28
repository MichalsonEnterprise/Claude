/**
 * Games kit (key "kit") — pure logic: DEMO-credit amounts, auto-play guardrails, Pool Dice odds (same rule functions
 * as the server), browser verification with @gp/shared/fair, catalogue filters and play states.
 */
import { DEMO_GAMES } from '@gp/shared/demo';
import { dice, playInstant, sha256Hex } from '@gp/shared/fair';
import { describe, expect, it } from 'vitest';

import {
  applyPreset,
  parseStake,
  payoutPreview,
  profitPreview,
  sanitizeStakeInput,
  stakeCeiling,
  stakeProblem,
} from '@/components/games/kit/amount';
import { autoPlayProblems, nextAutoBet, type AutoPlayConfig } from '@/components/games/kit/autoplay';
import { PLAY_SCREENS, playStateOf } from '@/components/games/kit/registry';
import { verifyInBrowser } from '@/components/games/kit/verify';
import {
  chanceString,
  clampTargetH,
  fromHundredths,
  isWin,
  multiplierOf,
  targetFromChanceInput,
  targetFromMultiplierInput,
  targetProblem,
  toHundredths,
  zones,
} from '@/components/games/dice/dice-math';
import { filterGames, tileHref } from '@/components/games/lobby/games-lobby';
import { contentFor } from '@/components/games/lobby/game-content';
import { classifyGameError, playInfoOf, type BetVerification, type CatalogueGame } from '@/lib/api/games';
import { ApiRequestError } from '@/lib/api/client';

const LIMITS = { min: '0.10', max: '1000.00', balance: '1000.00' };

describe('DEMO-credit amounts (decimal strings, never floats)', () => {
  it('sanitizes typing to ≤ 2 decimals', () => {
    expect(sanitizeStakeInput('12,345')).toBe('12.34');
    expect(sanitizeStakeInput('abc1.2.3')).toBe('1.23');
    expect(sanitizeStakeInput('007')).toBe('7');
    expect(sanitizeStakeInput('-5')).toBe('5');
  });
  it('parses stakes to 2 dp', () => {
    expect(parseStake('10')).toBe('10.00');
    expect(parseStake('0.1')).toBe('0.10');
    expect(parseStake('')).toBeNull();
    expect(parseStake('1.234')).toBeNull();
  });
  it('presets stay inside [min, min(max, balance)] and Max never exceeds the balance', () => {
    expect(applyPreset('10.00', 'half', LIMITS)).toBe('5.00');
    expect(applyPreset('0.15', 'half', LIMITS)).toBe('0.10');
    expect(applyPreset('10.00', 'double', LIMITS)).toBe('20.00');
    expect(applyPreset('800.00', 'double', LIMITS)).toBe('1000.00');
    expect(applyPreset('10.00', 'min', LIMITS)).toBe('0.10');
    expect(applyPreset('10.00', 'max', { ...LIMITS, balance: '4.209' })).toBe('4.20');
    expect(stakeCeiling({ ...LIMITS, balance: '0.05' })).toBe('0.10');
    expect(stakeCeiling({ ...LIMITS, balance: null })).toBe('1000.00');
  });
  it('flags empty, below min, above max and insufficient balance', () => {
    expect(stakeProblem('', LIMITS)?.kind).toBe('empty');
    expect(stakeProblem('0.05', LIMITS)?.kind).toBe('below_min');
    expect(stakeProblem('1500.00', LIMITS)?.kind).toBe('above_max');
    expect(stakeProblem('50.00', { ...LIMITS, balance: '4.20' })?.kind).toBe('insufficient');
    expect(stakeProblem('4.20', { ...LIMITS, balance: '4.20' })).toBeNull();
  });
  it('previews payout / profit truncated (never rounded up)', () => {
    expect(payoutPreview('10.00', '1.9603')).toBe('19.60');
    expect(profitPreview('10.00', '1.9603')).toBe('9.60');
    expect(payoutPreview('0.10', '1.0102')).toBe('0.10');
  });
});

describe('auto-play guardrails', () => {
  const cfg: AutoPlayConfig = { stake: '10.00', bets: 10, stopLoss: '30.00', stopProfit: null };
  it('requires a stop-loss of at least one bet and 1–100 bets', () => {
    expect(autoPlayProblems({ ...cfg, stopLoss: '' })).toContain('A stop-loss is required.');
    expect(autoPlayProblems({ ...cfg, stopLoss: '5.00' })).toContain('The stop-loss must be at least one bet.');
    expect(autoPlayProblems({ ...cfg, bets: 0 })).toHaveLength(1);
    expect(autoPlayProblems({ ...cfg, bets: 101 })).toHaveLength(1);
    expect(autoPlayProblems(cfg)).toEqual([]);
  });
  it('never raises the stake after a loss (constant stake on every round)', () => {
    let net = '0.00';
    for (let placed = 0; placed < 3; placed++) {
      const d = nextAutoBet(cfg, { placed, net });
      expect(d).toEqual({ go: true, stake: '10.00' });
      net = (Number.parseInt(net, 10) - 10).toFixed(2); // lost every round (integer test data)
    }
  });
  it('stops BEFORE a bet that could pass the stop-loss, at the count and at the profit target', () => {
    expect(nextAutoBet(cfg, { placed: 3, net: '-30.00' })).toEqual({ go: false, reason: 'stop_loss' });
    expect(nextAutoBet(cfg, { placed: 2, net: '-25.00' })).toEqual({ go: false, reason: 'stop_loss' });
    expect(nextAutoBet(cfg, { placed: 2, net: '-20.00' })).toEqual({ go: true, stake: '10.00' });
    expect(nextAutoBet(cfg, { placed: 10, net: '5.00' })).toEqual({ go: false, reason: 'completed' });
    expect(nextAutoBet({ ...cfg, stopProfit: '15.00' }, { placed: 4, net: '15.00' })).toEqual({
      go: false,
      reason: 'stop_profit',
    });
  });
});

describe('Pool Dice odds = server rule functions (decision #34)', () => {
  it('parses and formats hundredths without floats', () => {
    expect(toHundredths('50.50')).toBe(5050);
    expect(toHundredths('50.5')).toBe(5050);
    expect(toHundredths('7')).toBe(700);
    expect(toHundredths('5.555')).toBeNull();
    expect(fromHundredths(5)).toBe('0.05');
  });
  it('win chance + multiplier match @gp/shared/fair (99 ÷ chance, truncated to 4 dp)', () => {
    expect(chanceString(5050, 'over')).toBe('49.50');
    expect(multiplierOf(5050, 'over')).toBe('2.0000');
    expect(multiplierOf(5050, 'under')).toBe('1.9603');
    expect(multiplierOf(200, 'over')).toBe('1.0102');
    expect(multiplierOf(1, 'under')).toBe('9900.0000');
    expect(multiplierOf(3400, 'over')).toBe(dice.diceMultiplier({ target: '34.00', condition: 'over' }));
  });
  it('limits win chance to 0.01–98.00 % (over 2.00–99.99, under 0.01–98.00)', () => {
    expect(targetProblem(150, 'over')).toBe('chance_high');
    expect(targetProblem(200, 'over')).toBeNull();
    expect(targetProblem(9999, 'over')).toBeNull();
    expect(targetProblem(9801, 'under')).toBe('chance_high');
    expect(targetProblem(0, 'under')).toBe('chance_low');
    expect(clampTargetH(150, 'over')).toBe(200);
    expect(clampTargetH(12_000, 'under')).toBe(9800);
  });
  it('linked inputs: chance → target, multiplier → target', () => {
    expect(targetFromChanceInput('49.50', 'over')).toBe(5050);
    expect(targetFromChanceInput('25', 'under')).toBe(2500);
    expect(targetFromMultiplierInput('2', 'over')).toBe(5050);
    expect(targetFromMultiplierInput('1.00', 'over')).toBeNull();
  });
  it('zones cover all 10,000 results and the win rule matches the server', () => {
    const z = zones(5050, 'over');
    expect(z.win).toEqual({ from: 5050, to: 9999, count: 4950 });
    expect(z.lose.count + z.win.count).toBe(10_000);
    const seed = { serverSeed: 'a'.repeat(64), clientSeed: 'kit-test', nonce: 7 };
    const o = dice.playDice(seed, { target: '50.50', condition: 'over' });
    expect(isWin(toHundredths(o.roll)!, 5050, 'over')).toBe(o.win);
  });
});

describe('browser verifier re-derives with @gp/shared/fair (no duplicated maths)', () => {
  const serverSeed = 'f'.repeat(63) + '1';
  const seed = { serverSeed, clientSeed: 'nova-k-7f2a91', nonce: 417 };
  const params = { target: '50.50', condition: 'over' as const };
  const settled = playInstant('pool-dice', seed, params, '10.00');
  const v: BetVerification = {
    bet: {
      id: 'b1',
      ref: 'D-1',
      game: { slug: 'pool-dice', name: 'Pool Dice' },
      status: 'settled',
      stake: settled.stake,
      payout: settled.payout,
      net: '0.00',
      multiplier: settled.multiplier,
      win: settled.win,
      fee: '0.00',
      params,
      outcome: { ...settled.outcome, win: settled.win },
      fairness: { seedPairId: 's', serverSeedHash: sha256Hex(serverSeed), clientSeed: seed.clientSeed, nonce: 417, revealed: true },
      rulesVersion: 'pool-dice/1',
      currency: 'DEMO',
      createdAt: '2026-11-28T00:00:00Z',
      settledAt: '2026-11-28T00:00:00Z',
      isDemo: true,
    },
    verify: {
      game: 'pool-dice',
      rulesVersion: 'pool-dice/1',
      serverSeedHash: sha256Hex(serverSeed),
      serverSeed,
      clientSeed: seed.clientSeed,
      nonce: 417,
      stake: '10.00',
      params,
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
  it('matches the recorded bet', () => {
    const r = verifyInBrowser(v, seed);
    expect(r.ok).toBe(true);
    expect(r.commitmentValid).toBe(true);
    expect(r.matches).toBe(true);
    expect(r.firstBlock).toMatch(/^[0-9a-f]{64}$/);
  });
  it('shows a mismatch for a server seed from another pair or another nonce', () => {
    expect(verifyInBrowser(v, { ...seed, serverSeed: 'e'.repeat(64) }).matches).toBe(false);
    expect(verifyInBrowser(v, { ...seed, serverSeed: 'e'.repeat(64) }).commitmentValid).toBe(false);
    const other = verifyInBrowser(v, { ...seed, nonce: 418 });
    expect(other.commitmentValid).toBe(true);
    // a different nonce gives a different roll (and only matches by coincidence of the same outcome + payout)
    expect(other.result?.outcome.roll === settled.outcome.roll ? other.matches : !other.matches).toBe(true);
  });
  it('reports malformed inputs instead of throwing', () => {
    const wrong = verifyInBrowser(v, { ...seed, serverSeed: 'not-hex' });
    expect(wrong.matches).toBe(false);
    expect(wrong.commitmentValid).toBe(false);
    const bad = verifyInBrowser(v, { ...seed, clientSeed: 'bad:seed' });
    expect(bad.ok).toBe(false);
    expect(bad.error).toBeTruthy();
  });
});

describe('catalogue: play states, filters, honest "coming soon"', () => {
  const cat: CatalogueGame[] = DEMO_GAMES.map((g) => ({ ...g, play: playInfoOf(g.slug) }));
  it('only engine games with a play screen are playable', () => {
    expect(playStateOf('pool-dice')).toBe('playable');
    expect(playStateOf('skyline')).toBe('engine-only');
    expect(playStateOf('neon-koi')).toBe('coming-soon');
    for (const s of PLAY_SCREENS) expect(playInfoOf(s).playable).toBe(true);
    expect(tileHref(cat.find((g) => g.slug === 'neon-koi')!)).toBe('/games/neon-koi/details');
    expect(tileHref(cat.find((g) => g.slug === 'pool-dice')!)).toBe('/games/pool-dice');
    expect(tileHref(cat.find((g) => g.slug === 'global-pool')!)).toBe('/pool');
  });
  it('play block publishes DEMO currency, fee 0.00 and no real money', () => {
    const p = playInfoOf('pool-dice');
    expect(p.playable && p.currency).toBe('DEMO');
    expect(p.playable && p.fee).toBe('0.00');
    expect(p.playable && p.realMoney).toBe(false);
  });
  const base = { tab: 'all' as const, q: '', fair: false, edge: false, playable: false, fav: false, sort: 'popular' as const };
  it('filters by tab, search, house edge and playable', () => {
    expect(filterGames(cat, { ...base, tab: 'table' }, new Set()).every((g) => g.category === 'table')).toBe(true);
    expect(filterGames(cat, { ...base, q: 'orbit' }, new Set()).map((g) => g.slug)).toEqual(
      expect.arrayContaining(['orbit-rush', 'orbit-rush-duel']),
    );
    expect(filterGames(cat, { ...base, edge: true }, new Set()).every((g) => g.houseEdgePercent && g.houseEdgePercent <= '1.00')).toBe(true);
    expect(filterGames(cat, { ...base, playable: true }, new Set()).map((g) => g.slug).sort()).toEqual(
      [...PLAY_SCREENS, 'global-pool'].sort(),
    );
    expect(filterGames(cat, { ...base, tab: 'originals', q: 'baccarat' }, new Set())).toEqual([]);
  });
  it('details content: payouts are computed by the shared rules; non-engine titles say so', () => {
    const d = contentFor('pool-dice', 'Dice', '1.00% house edge');
    expect(d.payouts?.rows.find((r) => r[0] === 'Over 50.50')).toEqual(['Over 50.50', '49.50%', '2.0000×', '20.00 DEMO']);
    expect(contentFor('pool-roulette', '', '').payouts?.rows[0]).toEqual(['Straight up', '1 number', '35 : 1', '2.70%']);
    expect(contentFor('neon-koi', 'Slot', 'RTP 96.0–96.7%').rules[0]).toMatch(/not playable in this build/);
  });
});

describe('game error classification (shared envelope → UI state)', () => {
  const err = (status: number, code: string, details?: Record<string, unknown>) =>
    new ApiRequestError(status, '/games/pool-dice/bets', 'x', code, 'req-1', undefined, details);
  it('maps refusals to their states', () => {
    expect(classifyGameError(err(422, 'INSUFFICIENT_FUNDS')).kind).toBe('insufficient');
    expect(classifyGameError(err(422, 'RG_LIMIT_EXCEEDED', { type: 'loss' })).kind).toBe('loss_limit');
    expect(classifyGameError(err(422, 'RG_LIMIT_EXCEEDED', { type: 'quiet_hours' })).kind).toBe('time_limit');
    expect(classifyGameError(err(403, 'SELF_EXCLUDED')).kind).toBe('self_excluded');
    expect(classifyGameError(err(451, 'GEO_RESTRICTED')).kind).toBe('region');
    expect(classifyGameError(err(403, 'REAL_MONEY_DISABLED')).kind).toBe('real_money');
    expect(classifyGameError(err(409, 'CONFLICT', { reason: 'REALITY_CHECK_DUE' })).kind).toBe('reality_check');
    expect(classifyGameError(err(400, 'BAD_REQUEST', { reason: 'BET_ABOVE_MAX' })).kind).toBe('bet_limits');
    expect(classifyGameError(new TypeError('Failed to fetch')).kind).toBe('network');
    expect(classifyGameError(err(503, 'SERVICE_UNAVAILABLE')).kind).toBe('network');
  });
});
