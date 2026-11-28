import { randomBytes } from 'node:crypto';

import { getAddress } from 'viem';
import { describe, expect, it } from 'vitest';

import {
  CHAINS,
  CHAIN_DISPLAY_ORDER,
  ENABLED_CHAINS,
  MVP_CHAIN_ID,
  chainByTestnetId,
  explorerTxUrl,
} from '../src/chains';
import { ROLE_PERMISSIONS, PERMISSIONS, canTransitionWithdrawal } from '../src/enums';
import {
  adminLoginSchema,
  base58Decode,
  base58Encode,
  enterRoundSchema,
  errorEnvelopeSchema,
  isEvmAddress,
  isSolanaAddress,
  makeErrorEnvelope,
  normalizeAddress,
  onboardingSchema,
  paginationQuerySchema,
  rgLimitUpdateSchema,
  totpChallengeSchema,
  withdrawalRequestSchema,
  zodIssues,
} from '../src/schemas';

/** Throwaway addresses generated at runtime — never real wallets. */
const evm = () => getAddress(`0x${randomBytes(20).toString('hex')}`);
const sol = () => base58Encode(new Uint8Array(randomBytes(32)));
/** Flip the case of the first letter after 0x to break an EIP-55 checksum. */
function breakChecksum(addr: string): string {
  const i = [...addr].findIndex((c, idx) => idx > 1 && /[a-f]/i.test(c));
  const c = addr[i]!;
  return (
    addr.slice(0, i) +
    (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()) +
    addr.slice(i + 1)
  );
}

describe('chains (testnet only, MVP = Arbitrum Sepolia)', () => {
  it('only Arbitrum Sepolia 421614 is enabled; the rest are coming soon', () => {
    expect(ENABLED_CHAINS.map((c) => c.id)).toEqual(['arbitrum']);
    expect(CHAINS.arbitrum.testnet.chainId).toBe(MVP_CHAIN_ID);
    for (const key of ['bnb', 'polygon', 'ethereum', 'solana'] as const) {
      expect(CHAINS[key].enabled).toBe(false);
      expect(CHAINS[key].status).toBe('coming_soon');
    }
  });

  it('has the testnet ids, confirmations and limits from the brief', () => {
    expect(
      CHAIN_DISPLAY_ORDER.map((k) => [k, CHAINS[k].testnet.chainId, CHAINS[k].confirmations]),
    ).toEqual([
      ['arbitrum', 421614, 20],
      ['bnb', 97, 15],
      ['polygon', 80002, 64],
      ['ethereum', 11155111, 12],
      ['solana', null, 32],
    ]);
    expect(CHAINS.solana.testnet.cluster).toBe('devnet');
    for (const c of Object.values(CHAINS)) {
      expect(c.minDeposit).toBe('10.00');
      expect(c.minWithdrawal).toBe('20.00');
    }
    expect(chainByTestnetId(97)?.id).toBe('bnb');
    expect(explorerTxUrl('arbitrum', '0xabc')).toBe('https://sepolia.arbiscan.io/tx/0xabc');
    expect(explorerTxUrl('solana', 'sig')).toBe(
      'https://explorer.solana.com/tx/sig?cluster=devnet',
    );
  });
});

describe('address validation', () => {
  it('EVM: checksummed and lowercase accepted, bad checksum / length rejected', () => {
    const a = evm();
    expect(isEvmAddress(a)).toBe(true);
    expect(isEvmAddress(a.toLowerCase())).toBe(true);
    expect(isEvmAddress(breakChecksum(a))).toBe(false);
    expect(isEvmAddress(a.slice(0, -1))).toBe(false);
    expect(isEvmAddress('12ab' + a.slice(2))).toBe(false);
    expect(normalizeAddress('arbitrum', a.toLowerCase())).toBe(a);
  });

  it('Solana: base58 32–44 chars decoding to 32 bytes', () => {
    for (let i = 0; i < 20; i++) {
      const s = sol();
      expect(isSolanaAddress(s), s).toBe(true);
      expect(base58Decode(s)?.length).toBe(32);
    }
    expect(isSolanaAddress('1'.repeat(32))).toBe(true); // 32 zero bytes
    expect(isSolanaAddress('0OIl' + 'a'.repeat(40))).toBe(false); // excluded characters
    expect(isSolanaAddress('abc')).toBe(false);
    expect(isSolanaAddress('z'.repeat(44))).toBe(false); // decodes to 33 bytes
  });
});

describe('withdrawalRequestSchema', () => {
  const base = { network: 'arbitrum', amount: '1500.00', idempotencyKey: 'wd-3f2a9c1e-0001' };

  it('accepts a valid Arbitrum withdrawal', () => {
    const r = withdrawalRequestSchema.safeParse({ ...base, address: evm() });
    expect(r.success).toBe(true);
  });

  it('rejects a broken checksum, a Solana address on EVM, coming-soon networks and below-minimum amounts', () => {
    const issuesOf = (input: unknown) => {
      const r = withdrawalRequestSchema.safeParse(input);
      return r.success ? [] : zodIssues(r.error).map((i) => `${i.path.join('.')}: ${i.message}`);
    };
    expect(issuesOf({ ...base, address: breakChecksum(evm()) })).toEqual([
      'address: This address is not valid for the selected network',
    ]);
    expect(issuesOf({ ...base, address: sol() })).toHaveLength(1);
    expect(issuesOf({ ...base, network: 'solana', address: sol() })).toEqual([
      'network: This network is coming soon',
    ]);
    expect(issuesOf({ ...base, address: evm(), amount: '19.99' })).toEqual([
      'amount: Minimum withdrawal is 20.00 USDT',
    ]);
    expect(issuesOf({ ...base, address: evm(), amount: '20.1234567' })[0]).toMatch(/^amount:/);
    expect(issuesOf({ ...base, address: evm(), amount: 20 })[0]).toMatch(/^amount:/);
    expect(issuesOf({ ...base, network: 'dogecoin', address: evm() })[0]).toMatch(/^network:/);
  });
});

describe('other schemas', () => {
  it('enterRound: entries 1..1000, uuid round id, idempotency key', () => {
    const ok = {
      roundId: 'de000002-0000-4000-8000-000000001248',
      entries: 35,
      idempotencyKey: 'enter-1248-abcdef',
    };
    expect(enterRoundSchema.safeParse(ok).success).toBe(true);
    expect(enterRoundSchema.safeParse({ ...ok, entries: 0 }).success).toBe(false);
    expect(enterRoundSchema.safeParse({ ...ok, entries: 1001 }).success).toBe(false);
    expect(enterRoundSchema.safeParse({ ...ok, entries: 1.5 }).success).toBe(false);
    expect(enterRoundSchema.safeParse({ ...ok, roundId: 'round-1248' }).success).toBe(false);
    expect(enterRoundSchema.safeParse({ ...ok, idempotencyKey: 'short' }).success).toBe(false);
  });

  it('onboarding requires every consent to be explicitly true (never pre-checked); marketing optional', () => {
    const consents = {
      ageConfirmed: true,
      jurisdictionConfirmed: true,
      termsAccepted: true,
      privacyAccepted: true,
    };
    const parsed = onboardingSchema.parse({ handle: 'Nova.K', country: 'pt', consents });
    expect(parsed).toMatchObject({
      handle: 'nova.k',
      country: 'PT',
      consents: { marketingOptIn: false },
    });
    expect(
      onboardingSchema.safeParse({
        handle: 'nova.k',
        country: 'PT',
        consents: { ...consents, termsAccepted: false },
      }).success,
    ).toBe(false);
    expect(
      onboardingSchema.safeParse({
        handle: 'nova.k',
        country: 'PT',
        consents: { ...consents, ageConfirmed: undefined },
      }).success,
    ).toBe(false);
    expect(
      onboardingSchema.safeParse({
        handle: 'nova.k',
        country: 'PT',
        consents,
        dateOfBirth: '2015-01-01',
      }).success,
    ).toBe(false);
    expect(
      onboardingSchema.safeParse({
        handle: 'nova.k',
        country: 'PT',
        consents,
        dateOfBirth: '1990-05-17',
      }).success,
    ).toBe(true);
  });

  it('admin login needs email, password and a 6-digit TOTP', () => {
    expect(
      adminLoginSchema.safeParse({
        email: 'A.Marin@GlobalPool.example ',
        password: 'x',
        totpCode: '123456',
      }).data?.email,
    ).toBe('a.marin@globalpool.example');
    expect(
      adminLoginSchema.safeParse({ email: 'a.marin@globalpool.example', password: 'x' }).success,
    ).toBe(false);
    expect(
      totpChallengeSchema.safeParse({ purpose: 'withdrawal', code: 'k7q2-9xma' }).success,
    ).toBe(true);
  });

  it('pagination coerces query strings and caps the page size', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(paginationQuerySchema.parse({ page: '3', pageSize: '50' })).toEqual({
      page: 3,
      pageSize: 50,
    });
    expect(paginationQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false);
  });

  it('RG limit updates and error envelopes', () => {
    expect(
      rgLimitUpdateSchema.safeParse({ type: 'deposit', period: 'week', amount: '7500.00' }).success,
    ).toBe(true);
    expect(
      rgLimitUpdateSchema.safeParse({ type: 'session_time', period: 'day', minutes: 120 }).success,
    ).toBe(true);
    const env = makeErrorEnvelope('INSUFFICIENT_FUNDS', 'Not enough available balance', {
      requestId: 'req_1',
    });
    expect(env.error.statusCode).toBe(422);
    expect(errorEnvelopeSchema.safeParse(env).success).toBe(true);
  });
});

describe('RBAC & state machine', () => {
  it('has no permission that could alter results, winners or ledger rows', () => {
    for (const p of PERMISSIONS)
      expect(p).not.toMatch(/result|winner|ledger\.(write|edit)|balance\.adjust|payout\.manual/);
    expect(ROLE_PERMISSIONS.super_admin).toEqual(PERMISSIONS);
    expect(ROLE_PERMISSIONS.read_only.every((p) => p.endsWith('.read'))).toBe(true);
    expect(ROLE_PERMISSIONS.support).not.toContain('withdrawals.approve');
  });

  it('withdrawal transitions follow requested → risk_check → under_review/queued → broadcast → confirmed', () => {
    expect(canTransitionWithdrawal('requested', 'risk_check')).toBe(true);
    expect(canTransitionWithdrawal('risk_check', 'under_review')).toBe(true);
    expect(canTransitionWithdrawal('under_review', 'queued')).toBe(true);
    expect(canTransitionWithdrawal('queued', 'broadcast')).toBe(true);
    expect(canTransitionWithdrawal('broadcast', 'confirmed')).toBe(true);
    expect(canTransitionWithdrawal('confirmed', 'requested')).toBe(false);
    expect(canTransitionWithdrawal('requested', 'broadcast')).toBe(false);
  });
});
