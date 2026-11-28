/**
 * Close-out pass 2 (web-money): onboarding-gated player queries (Q12), up-front pauses for entries / deposits /
 * withdrawals (Q16 · Q17 · Q19), the platform fee as its own history line (Q26), unknown write outcomes on retries
 * (R41b) and amount separators typed after the decimals (R59b). UI wiring is covered by e2e/web-money-pass2.spec.ts.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { sanitizeAmount } from '@/components/domain/amount-input';
import { ENTRY_DEFINITE_CODES } from '@/components/pool/participate-flow';
import { gamingPause } from '@/components/pool/pool-hub';
import { txAmount, txFeeLine } from '@/components/rg-history/history-common';
import {
  AccountPauseNotice,
  accountPause,
  restrictionCopy,
} from '@/components/wallet/account-pause';
import { WITHDRAWAL_DEFINITE_CODES } from '@/components/wallet/withdraw-flow';
import type { AccountStatus } from '@/lib/api/auth';
import { ApiRequestError, writeOutcome } from '@/lib/api/client';
import { playerDataReady } from '@/lib/api/player-ready';
import type { TxView } from '@/lib/api/rg-history';

const status = (over: Partial<AccountStatus> = {}): AccountStatus => ({
  gate: 'ok',
  onboarded: true,
  status: 'active',
  restrictions: [],
  paused: { gaming: false, deposits: false, withdrawals: false },
  selfExclusion: { active: false, startsAt: null, endsAt: null, kind: null, reopen: null },
  region: { current: null, declared: null, permitted: true },
  isDemo: true,
  ...over,
});
const onBreak = status({
  gate: 'self_excluded',
  paused: { gaming: true, deposits: true, withdrawals: false },
  selfExclusion: {
    active: true,
    startsAt: '2026-11-28T10:00:00.000Z',
    endsAt: '2026-11-29T10:00:00.000Z',
    kind: 'cooling_off',
    reopen: null,
  },
});
const frozen = status({
  gate: 'under_review',
  restrictions: [
    { type: 'withdrawals_frozen', since: '2026-11-28T09:00:00.000Z', reference: 'FRZ-1A2B3C' },
  ],
  paused: { gaming: false, deposits: false, withdrawals: true },
});
const apiErr = (status: number, code: string, details?: Record<string, unknown>) =>
  new ApiRequestError(status, '/x', code, code, 'req-1', undefined, details);

describe('Q12 · player data waits for the profile and never fires before the onboarding redirect', () => {
  const profile = (onboardingRequired: boolean) =>
    ({ onboardingRequired, onboarded: !onboardingRequired }) as never;
  it('is off for guests, while the profile syncs, and while a not-onboarded member is about to be redirected', () => {
    expect(playerDataReady({ status: 'guest' }, '/wallet')).toBe(false);
    expect(playerDataReady({ status: 'loading' }, '/wallet')).toBe(false);
    expect(playerDataReady({ status: 'member', syncing: true, profile: null }, '/wallet')).toBe(
      false,
    );
    expect(
      playerDataReady({ status: 'member', syncing: false, profile: profile(true) }, '/history/fees'),
    ).toBe(false);
    expect(
      playerDataReady({ status: 'member', syncing: false, profile: profile(true) }, '/pool'),
    ).toBe(false);
  });
  it('is on for onboarded members, on exempt pages, and when the profile failed to load (no endless wait)', () => {
    expect(
      playerDataReady({ status: 'member', syncing: false, profile: profile(false) }, '/wallet'),
    ).toBe(true);
    expect(
      playerDataReady(
        { status: 'member', syncing: false, profile: profile(true) },
        '/responsible-gaming/cooling-off',
      ),
    ).toBe(true);
    expect(playerDataReady({ status: 'member', syncing: false, profile: null }, '/wallet')).toBe(
      true,
    );
  });
});

describe('Q16 · Q17 · Q19 · what the account gate pauses, per action', () => {
  it('a break pauses entries and deposits — never withdrawals', () => {
    expect(accountPause(onBreak, 'gaming')).toEqual({
      kind: 'cooling_off',
      endsAt: '2026-11-29T10:00:00.000Z',
    });
    expect(accountPause(onBreak, 'deposits')).toEqual({
      kind: 'cooling_off',
      endsAt: '2026-11-29T10:00:00.000Z',
    });
    expect(accountPause(onBreak, 'withdrawals')).toBeNull();
  });
  it('a self-exclusion, a region block and an admin deposit block are told apart', () => {
    const se = status({
      paused: { gaming: true, deposits: true, withdrawals: false },
      selfExclusion: {
        active: true,
        startsAt: null,
        endsAt: null,
        kind: 'self_exclusion',
        reopen: null,
      },
    });
    expect(accountPause(se, 'gaming')).toEqual({ kind: 'self_excluded', endsAt: null });
    const region = status({
      paused: { gaming: true, deposits: true, withdrawals: false },
      region: {
        current: { code: 'US', name: 'United States', permitted: false },
        declared: null,
        permitted: false,
      },
    });
    expect(accountPause(region, 'deposits')).toEqual({
      kind: 'region',
      countryName: 'United States',
    });
    const blocked = status({
      restrictions: [{ type: 'deposits_blocked', since: '2026-11-28T09:00:00.000Z', reference: 'REV-9' }],
      paused: { gaming: false, deposits: true, withdrawals: false },
    });
    expect(accountPause(blocked, 'deposits')).toEqual({
      kind: 'restriction',
      restriction: 'deposits_blocked',
      reference: 'REV-9',
    });
    expect(accountPause(blocked, 'gaming')).toBeNull();
    expect(accountPause(status(), 'deposits')).toBeNull();
  });
  it('an AML freeze holds withdrawals only, with its case reference and honest copy', () => {
    expect(accountPause(frozen, 'gaming')).toBeNull();
    expect(accountPause(frozen, 'deposits')).toBeNull();
    const hold = accountPause(frozen, 'withdrawals');
    expect(hold).toEqual({
      kind: 'restriction',
      restriction: 'withdrawals_frozen',
      reference: 'FRZ-1A2B3C',
    });
    const copy = restrictionCopy(hold as never, 'withdrawals');
    expect(copy.title).toBe('Withdrawals are on hold while we review your account');
    expect(copy.body).toContain('case FRZ-1A2B3C');
    expect(copy.body).toContain('Nothing has been sent or deducted');
    const html = renderToStaticMarkup(<AccountPauseNotice pause={hold!} action="withdrawals" />);
    expect(html).toContain('href="/support"');
    expect(html).toContain('Withdrawals are on hold');
  });
  it('the pool hub falls back to the RG state while the gate loads; the gate wins once loaded', () => {
    const rg = {
      selfExclusion: { active: true, endsAt: '2026-11-29T10:00:00.000Z' },
      exclusion: {
        active: true,
        kind: 'cooling_off' as const,
        endsAt: '2026-11-29T10:00:00.000Z',
      },
    };
    expect(gamingPause(undefined, rg)).toEqual({
      kind: 'cooling_off',
      endsAt: '2026-11-29T10:00:00.000Z',
    });
    expect(gamingPause(undefined, { selfExclusion: { active: false, endsAt: null } })).toBeNull();
    expect(gamingPause(status(), rg)).toBeNull();
    expect(gamingPause(onBreak, undefined)?.kind).toBe('cooling_off');
  });
});

describe('Q26 · the platform fee is its own line in All activity', () => {
  const entry: TxView = {
    id: 'EP-1248-00001-00003',
    uuid: 'u-ep',
    type: 'entry_purchase',
    status: 'completed',
    direction: 'out',
    network: null,
    amount: '30.00',
    networkFee: '0.00',
    platformFee: '0.15',
    netAmount: '30.15',
    addressDisplay: null,
    txHash: null,
    txHashDisplay: null,
    confirmations: null,
    description: '3 entries · Round #1,248',
    statusDetail: 'Entries 30.00 + platform fee 0.15',
    roundId: 'r1',
    createdAt: '2026-11-28T18:40:12.000Z',
    completedAt: '2026-11-28T18:40:12.000Z',
    isDemo: true,
  } as TxView;
  it('splits stake and fee into two lines that add up to what Available moved by', () => {
    expect(txAmount(entry).text).toBe('−30.00');
    expect(txFeeLine(entry)).toEqual({
      title: 'Platform fee',
      sub: '3 qualifying entries × 0.05 USDT · not added to the prize pool',
      text: '−0.15',
      tone: 'text-text-danger',
    });
    expect(txFeeLine({ ...entry, description: '1 entry · Round #1,248', platformFee: '0.05' })?.sub).toBe(
      '1 qualifying entry × 0.05 USDT · not added to the prize pool',
    );
  });
  it('has no fee line for deposits or fee-free rows', () => {
    expect(txFeeLine({ ...entry, type: 'deposit', platformFee: '0.00' })).toBeNull();
    expect(txFeeLine({ ...entry, platformFee: '0.00' })).toBeNull();
  });
});

describe('R41b · a refusal of a retry says nothing about the earlier unanswered attempt', () => {
  const entry = (err: unknown, pending: boolean) =>
    writeOutcome(err, { pendingUnknown: pending, definiteCodes: ENTRY_DEFINITE_CODES });
  it('first attempt: a definite 4xx means nothing was booked; no answer means unknown', () => {
    expect(entry(new TypeError('Failed to fetch'), false)).toBe('unknown');
    expect(entry(apiErr(502, 'HTTP_ERROR'), false)).toBe('unknown');
    expect(entry(apiErr(429, 'RATE_LIMITED'), false)).toBe('refused');
    expect(entry(apiErr(422, 'RG_LIMIT_EXCEEDED'), false)).toBe('refused');
  });
  it('retry of an unanswered attempt: throttling / session / policy refusals keep it unknown', () => {
    expect(entry(apiErr(429, 'RATE_LIMITED'), true)).toBe('unknown');
    expect(entry(apiErr(401, 'UNAUTHENTICATED'), true)).toBe('unknown');
    expect(entry(apiErr(403, 'SELF_EXCLUDED'), true)).toBe('unknown');
    expect(entry(apiErr(400, 'VALIDATION_FAILED'), true)).toBe('unknown');
  });
  it('retry of an unanswered attempt: only errors raised after the key lookup release it', () => {
    for (const code of ['INSUFFICIENT_FUNDS', 'RG_LIMIT_EXCEEDED', 'ROUND_NOT_OPEN', 'NOT_FOUND'])
      expect(entry(apiErr(422, code), true)).toBe('refused');
  });
  it('IDEMPOTENCY_CONFLICT is never "nothing was charged"', () => {
    expect(entry(apiErr(422, 'IDEMPOTENCY_CONFLICT'), false)).toBe('already_used');
    expect(entry(apiErr(422, 'IDEMPOTENCY_CONFLICT'), true)).toBe('already_used');
  });
  it('withdrawals: a 429 / wrong code on the retry keeps "couldn’t confirm"; limit / KYC checks release it', () => {
    const wd = (err: unknown, pending: boolean) =>
      writeOutcome(err, { pendingUnknown: pending, definiteCodes: WITHDRAWAL_DEFINITE_CODES });
    expect(wd(apiErr(429, 'RATE_LIMITED'), true)).toBe('unknown');
    expect(wd(apiErr(401, 'STEP_UP_INVALID'), true)).toBe('unknown');
    expect(wd(apiErr(403, 'FORBIDDEN', { restriction: 'withdrawals_frozen' }), true)).toBe(
      'unknown',
    );
    expect(wd(apiErr(422, 'INSUFFICIENT_FUNDS'), true)).toBe('refused');
    expect(wd(apiErr(400, 'VALIDATION_FAILED'), true)).toBe('refused');
    expect(wd(apiErr(403, 'FORBIDDEN', { restriction: 'withdrawals_frozen' }), false)).toBe(
      'refused',
    );
  });
});

describe('R59b · a comma typed after the decimals never multiplies the amount', () => {
  it('keystrokes on a value that already has a decimal point', () => {
    expect(sanitizeAmount('0.5,', 2)).toBe('0.5');
    expect(sanitizeAmount('12.5,', 2)).toBe('12.5');
    expect(sanitizeAmount('1234.5,', 2)).toBe('1234.5');
    expect(sanitizeAmount('100.50,', 2)).toBe('100.50');
    expect(sanitizeAmount('9215.30,', 2)).toBe('9215.30');
    expect(sanitizeAmount('12,.5', 2)).toBe('12.5');
  });
  it('pasted amounts keep their thousands (R59) in both notations', () => {
    expect(sanitizeAmount('9,215.30', 2)).toBe('9215.30');
    expect(sanitizeAmount('9.215,30', 2)).toBe('9215.30');
    expect(sanitizeAmount('1.234.567,89', 2)).toBe('1234567.89');
    expect(sanitizeAmount('1,000,000.00', 2)).toBe('1000000.00');
  });
});
