/**
 * Pure double-entry posting rules (no I/O) — unit-tested in posting.spec.ts.
 *
 * Sign convention: every line carries a SIGNED amount; positive = value flows INTO the account, negative = value
 * flows OUT. A posting is valid only when it has ≥ 2 non-zero lines with at most 6 decimals that sum to EXACTLY
 * zero. Account balance = Σ amounts of its lines. User buckets and liabilities therefore hold positive balances;
 * CHAIN_CLEARING mirrors custody holdings (assets) and runs negative.
 */
import type { ChainKey } from '@gp/shared/chains';
import { LedgerAccountType } from '@gp/shared/enums';
import { MoneyDecimal, parseUSDT, toUSDTString, type MoneyInput } from '@gp/shared/money';

export type UserBucketAccountType = 'user_available' | 'user_locked' | 'user_pending' | 'user_owed';
export type SingletonAccountType = 'fees' | 'prize_liability' | 'refunds' | 'operator_revenue';

export type AccountRef =
  | { type: UserBucketAccountType; userId: string }
  | { type: 'pool'; roundId: string }
  | { type: SingletonAccountType }
  | { type: 'chain_clearing'; network: ChainKey };

export interface PostingLineInput {
  account: AccountRef;
  amount: MoneyInput;
  /** Beneficial owner (defaults to account.userId for user buckets). */
  userId?: string | null;
}

export interface NormalizedLine {
  account: AccountRef;
  code: string;
  /** Canonical signed amount string ('-351.75', '350.00'). */
  amount: string;
  userId: string | null;
}

export class LedgerError extends Error {
  override readonly name = 'LedgerError';
  constructor(
    readonly code: 'UNBALANCED' | 'TOO_FEW_LINES' | 'ZERO_LINE' | 'PRECISION' | 'INVALID_ACCOUNT',
    message: string,
  ) {
    super(message);
  }
}

export const USER_BUCKET_TYPES: readonly UserBucketAccountType[] = [
  LedgerAccountType.USER_AVAILABLE,
  LedgerAccountType.USER_LOCKED,
  LedgerAccountType.USER_PENDING,
  LedgerAccountType.USER_OWED,
];

export function isUserBucket(ref: AccountRef): ref is { type: UserBucketAccountType; userId: string } {
  return (USER_BUCKET_TYPES as readonly string[]).includes(ref.type);
}

const BUCKET_SUFFIX: Record<UserBucketAccountType, string> = {
  user_available: 'available',
  user_locked: 'locked',
  user_pending: 'pending',
  user_owed: 'owed',
};

/** Stable account code: user:<uuid>:available, pool:<round uuid>, fees, chain_clearing:arbitrum … */
export function accountCode(ref: AccountRef): string {
  if (isUserBucket(ref)) {
    if (!ref.userId) throw new LedgerError('INVALID_ACCOUNT', `${ref.type} needs a userId`);
    return `user:${ref.userId}:${BUCKET_SUFFIX[ref.type]}`;
  }
  switch (ref.type) {
    case 'pool':
      if (!ref.roundId) throw new LedgerError('INVALID_ACCOUNT', 'pool account needs a roundId');
      return `pool:${ref.roundId}`;
    case 'chain_clearing':
      return `chain_clearing:${ref.network}`;
    case 'fees':
    case 'prize_liability':
    case 'refunds':
    case 'operator_revenue':
      return ref.type;
  }
}

/** Validate + normalise posting lines. Throws LedgerError when the posting is not a valid double entry. */
export function normalizePosting(lines: readonly PostingLineInput[]): NormalizedLine[] {
  if (lines.length < 2) {
    throw new LedgerError('TOO_FEW_LINES', 'A posting needs at least two lines');
  }
  let total = new MoneyDecimal(0);
  const out = lines.map((line) => {
    let amount;
    try {
      amount = parseUSDT(line.amount);
    } catch (err) {
      throw new LedgerError('PRECISION', (err as Error).message);
    }
    if (amount.isZero()) throw new LedgerError('ZERO_LINE', 'Posting lines must be non-zero');
    total = total.plus(amount);
    const owner = line.userId ?? (isUserBucket(line.account) ? line.account.userId : null);
    return {
      account: line.account,
      code: accountCode(line.account),
      amount: toUSDTString(amount),
      userId: owner ?? null,
    };
  });
  if (!total.isZero()) {
    throw new LedgerError('UNBALANCED', `Posting is unbalanced by ${total.toFixed()} USDT`);
  }
  return out;
}

/** Σ of signed amounts (for assertions / reconciliation). */
export function sumLines(lines: readonly { amount: MoneyInput }[]): string {
  return toUSDTString(
    lines.reduce((acc, l) => acc.plus(parseUSDT(l.amount)), new MoneyDecimal(0)),
  );
}

// ── Posting templates (one per business event) ──────────────────────────────────────────────────

export interface EntryPurchaseAmounts {
  entryAmount: MoneyInput;
  platformFee: MoneyInput;
}

/** Entry purchase: AVAILABLE −(entries + fee) → POOL(round) +entries, FEES +fee (fee never enters the pool). */
export function entryPurchaseLines(
  userId: string,
  roundId: string,
  q: EntryPurchaseAmounts,
): PostingLineInput[] {
  const entry = parseUSDT(q.entryAmount);
  const fee = parseUSDT(q.platformFee);
  const lines: PostingLineInput[] = [
    { account: { type: 'user_available', userId }, amount: entry.plus(fee).negated() },
    { account: { type: 'pool', roundId }, amount: entry, userId },
  ];
  if (!fee.isZero()) lines.push({ account: { type: 'fees' }, amount: fee, userId });
  return lines;
}

/** Deposit detected on-chain: CHAIN_CLEARING(network) −amount → PENDING +amount. */
export function depositDetectedLines(
  userId: string,
  network: ChainKey,
  amount: MoneyInput,
): PostingLineInput[] {
  const a = parseUSDT(amount);
  return [
    { account: { type: 'chain_clearing', network }, amount: a.negated(), userId },
    { account: { type: 'user_pending', userId }, amount: a },
  ];
}

/** Deposit reached the required confirmations: PENDING −amount → AVAILABLE +amount. */
export function depositCreditedLines(userId: string, amount: MoneyInput): PostingLineInput[] {
  const a = parseUSDT(amount);
  return [
    { account: { type: 'user_pending', userId }, amount: a.negated() },
    { account: { type: 'user_available', userId }, amount: a },
  ];
}

/** Withdrawal requested: AVAILABLE −amount → LOCKED +amount. */
export function withdrawalLockLines(userId: string, amount: MoneyInput): PostingLineInput[] {
  const a = parseUSDT(amount);
  return [
    { account: { type: 'user_available', userId }, amount: a.negated() },
    { account: { type: 'user_locked', userId }, amount: a },
  ];
}

/** Withdrawal rejected / failed / cancelled: LOCKED −amount → AVAILABLE +amount (no fee charged). */
export function withdrawalReleaseLines(userId: string, amount: MoneyInput): PostingLineInput[] {
  const a = parseUSDT(amount);
  return [
    { account: { type: 'user_locked', userId }, amount: a.negated() },
    { account: { type: 'user_available', userId }, amount: a },
  ];
}

/**
 * Withdrawal confirmed on-chain: LOCKED −amount → CHAIN_CLEARING +net (left custody) and OPERATOR_REVENUE
 * +networkFee (recovers the gas the hot wallet paid). Platform withdrawal fee is 0.00.
 */
export function withdrawalSettleLines(
  userId: string,
  network: ChainKey,
  amounts: { amount: MoneyInput; networkFee: MoneyInput; platformFee: MoneyInput },
): PostingLineInput[] {
  const amount = parseUSDT(amounts.amount);
  const networkFee = parseUSDT(amounts.networkFee);
  const platformFee = parseUSDT(amounts.platformFee);
  const net = amount.minus(networkFee).minus(platformFee);
  const lines: PostingLineInput[] = [
    { account: { type: 'user_locked', userId }, amount: amount.negated() },
  ];
  if (!net.isZero()) lines.push({ account: { type: 'chain_clearing', network }, amount: net, userId });
  if (!networkFee.isZero())
    lines.push({ account: { type: 'operator_revenue' }, amount: networkFee, userId });
  if (!platformFee.isZero()) lines.push({ account: { type: 'fees' }, amount: platformFee, userId });
  return lines;
}

/** Move a settled round's pool into PRIZE_LIABILITY (the pool account goes to zero). */
export function roundSettlementLines(roundId: string, pool: MoneyInput): PostingLineInput[] {
  const p = parseUSDT(pool);
  return [
    { account: { type: 'pool', roundId }, amount: p.negated() },
    { account: { type: 'prize_liability' }, amount: p },
  ];
}

/** Award prizes from PRIZE_LIABILITY to each winner's OWED bucket. */
export function prizeAwardLines(
  awards: readonly { userId: string; amount: MoneyInput }[],
): PostingLineInput[] {
  const total = awards.reduce((acc, a) => acc.plus(parseUSDT(a.amount)), new MoneyDecimal(0));
  return [
    { account: { type: 'prize_liability' }, amount: total.negated() },
    ...awards.map((a) => ({
      account: { type: 'user_owed' as const, userId: a.userId },
      amount: parseUSDT(a.amount),
    })),
  ];
}

/** Cancelled round: each player's stake leaves POOL(round) and is owed back (refunds clearing account). */
export function roundRefundLines(
  roundId: string,
  refunds: readonly { userId: string; amount: MoneyInput }[],
): PostingLineInput[] {
  const lines: PostingLineInput[] = [];
  for (const r of refunds) {
    const a = parseUSDT(r.amount);
    lines.push({ account: { type: 'pool', roundId }, amount: a.negated(), userId: r.userId });
    lines.push({ account: { type: 'refunds' }, amount: a, userId: r.userId });
    lines.push({ account: { type: 'refunds' }, amount: a.negated(), userId: r.userId });
    lines.push({ account: { type: 'user_owed', userId: r.userId }, amount: a });
  }
  return lines;
}

/** Claim everything owed: OWED −amount → AVAILABLE +amount. */
export function owedClaimLines(userId: string, amount: MoneyInput): PostingLineInput[] {
  const a = parseUSDT(amount);
  return [
    { account: { type: 'user_owed', userId }, amount: a.negated() },
    { account: { type: 'user_available', userId }, amount: a },
  ];
}
