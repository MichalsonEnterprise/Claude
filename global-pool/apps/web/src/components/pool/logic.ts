/**
 * Pure Global Pool view logic (no React): participation checks for the preview modal, round phases, odds,
 * relative times and the in-browser draw verification. Unit-tested in test/pool.test.ts.
 *
 * Money is decimal strings / decimal.js only (never JS floats). The API stays authoritative: these checks only
 * explain in advance what the server will enforce (balance, round window, responsible-gaming limits).
 */
import { deriveWinners, splitPool } from '@gp/contracts/verify';
import {
  ENTRY_TOTAL_PER_ENTRY,
  MAX_ENTRIES_PER_PURCHASE,
  entryQuote,
  type EntryQuote,
} from '@gp/shared/fees';
import { formatTimeUTC } from '@gp/shared/format';
import {
  fromBaseUnits,
  money,
  sub,
  toBaseUnits,
  toUSDTString,
  type MoneyInput,
} from '@gp/shared/money';
import { oddsDisclosure, PRIZES_PER_ROUND, type OddsDisclosure } from '@gp/shared/pool';
import { keccak256, stringToHex } from 'viem';

import type { PoolRoundView, PoolVerification, RgLimitView } from '@/lib/api/pool';

// ── participation ─────────────────────────────────────────────────────────────────────────────

export interface ParticipationLimit {
  limit: string;
  used: string;
  /** used + this purchase. */
  after: string;
  remaining: string;
  period: RgLimitView['period'];
  type: 'participation' | 'loss';
  exceeded: boolean;
  /** Most entries that still fit under the limit (0 when none). */
  maxEntries: number;
}

export interface ParticipationCheck {
  quote: EntryQuote;
  /** Available − total (may be negative when funds are short). */
  availableAfter: string | null;
  insufficient: boolean;
  /** total − available when insufficient. */
  shortBy: string | null;
  /** Most entries the Available balance covers (10.05 each). */
  maxAffordable: number | null;
  /** Tightest RG limit (participation / loss) after this purchase, if the player has one. */
  limit: ParticipationLimit | null;
  limitReached: boolean;
  /** Entries the player can still buy (balance + limits + per-purchase maximum). */
  maxEntries: number;
}

const entriesFitting = (budget: MoneyInput) =>
  Math.max(0, money(budget).div(ENTRY_TOTAL_PER_ENTRY).floor().toNumber());

/** What the server will check before accepting `entries` (balance + RG participation / loss limits). */
export function checkParticipation(input: {
  entries: number;
  available: string | null;
  limits: readonly RgLimitView[] | null;
}): ParticipationCheck {
  const quote = entryQuote(input.entries);
  const available = input.available;
  const insufficient = available !== null && money(quote.total).gt(money(available));
  const maxAffordable = available !== null ? entriesFitting(available) : null;

  let limit: ParticipationLimit | null = null;
  for (const l of input.limits ?? []) {
    if ((l.type !== 'participation' && l.type !== 'loss') || l.limit === null) continue;
    const used = l.used ?? '0';
    const after = money(used).plus(quote.total);
    const remaining = money(l.limit).minus(used);
    const candidate: ParticipationLimit = {
      limit: l.limit,
      used: toUSDTString(used),
      after: toUSDTString(after),
      remaining: toUSDTString(remaining.isNegative() ? 0 : remaining),
      period: l.period,
      type: l.type,
      exceeded: after.gt(money(l.limit)),
      maxEntries: remaining.isNegative() ? 0 : entriesFitting(remaining),
    };
    // keep the tightest limit (fewest entries left); prefer the one that is exceeded
    if (
      !limit ||
      (candidate.exceeded && !limit.exceeded) ||
      (candidate.exceeded === limit.exceeded && candidate.maxEntries < limit.maxEntries)
    )
      limit = candidate;
  }
  const maxEntries = Math.min(
    MAX_ENTRIES_PER_PURCHASE,
    maxAffordable ?? MAX_ENTRIES_PER_PURCHASE,
    limit ? limit.maxEntries : MAX_ENTRIES_PER_PURCHASE,
  );
  return {
    quote,
    availableAfter: available !== null ? toUSDTString(sub(available, quote.total)) : null,
    insufficient,
    shortBy: insufficient && available !== null ? toUSDTString(sub(quote.total, available)) : null,
    maxAffordable,
    limit,
    limitReached: Boolean(limit?.exceeded),
    maxEntries,
  };
}

/** Odds after buying `adding` more entries (the pool grows by the same entries). */
export function oddsAfter(
  round: Pick<PoolRoundView, 'entries'>,
  mine: number,
  adding: number,
): OddsDisclosure {
  return oddsFor(mine + adding, round.entries + adding);
}

/**
 * "≈2.41%" — odds percent strings (from oddsDisclosure) with precision that fits the size: 2 dp from 1%, 3 dp from
 * 0.1%, else 4 dp. Always rounded DOWN, so a disclosed chance is never overstated.
 */
export function approxPercent(percent: string): string {
  const d = money(percent);
  const places = d.gte(1) ? 2 : d.gte('0.1') ? 3 : 4;
  return `≈${d.toDecimalPlaces(places, 1).toFixed(places)}%`;
}

/** Odds disclosure with enough decimals for display (approxPercent picks the shown precision). */
export const oddsFor = (mine: number, total: number) =>
  oddsDisclosure(mine, total, Math.min(PRIZES_PER_ROUND, total), 6);

// ── round phase ───────────────────────────────────────────────────────────────────────────────

export type RoundPhase =
  | 'scheduled'
  /** status open but `opensAt` is still in the future (DEMO seed shift) — entries are not accepted yet. */
  | 'not_open_yet'
  | 'open'
  /** open, close time passed, lifecycle has not closed it yet. */
  | 'closing'
  | 'drawing'
  /** drawing and the VRF request is older than the delay threshold. */
  | 'delayed'
  | 'settled'
  | 'cancelled';

/** Typical VRF response is 30–90 s; after this the drawing screen switches to the "taking longer" state. */
export const VRF_DELAY_MS = 5 * 60_000;

export function roundPhase(
  round: Pick<PoolRoundView, 'status' | 'opensAt' | 'closesAt' | 'draw'>,
  nowMs: number,
): RoundPhase {
  switch (round.status) {
    case 'scheduled':
      return 'scheduled';
    case 'open': {
      if (nowMs < Date.parse(round.opensAt)) return 'not_open_yet';
      return nowMs >= Date.parse(round.closesAt) ? 'closing' : 'open';
    }
    case 'closed':
      return 'drawing';
    case 'drawing': {
      const requested = round.draw?.requestedAt ? Date.parse(round.draw.requestedAt) : null;
      return requested !== null && !round.draw?.fulfilledAt && nowMs - requested > VRF_DELAY_MS
        ? 'delayed'
        : 'drawing';
    }
    case 'settled':
      return 'settled';
    case 'cancelled':
      return 'cancelled';
  }
}

/** True while entries can be bought (the server re-checks the window). */
export const acceptsEntries = (phase: RoundPhase) => phase === 'open';

// ── time ──────────────────────────────────────────────────────────────────────────────────────

/** "12 s ago" / "4 min ago" — falls back to the absolute UTC time for future or older (> 1 h) timestamps. */
export function relativeTime(iso: string, nowMs: number | null): string {
  if (nowMs === null) return formatTimeUTC(iso);
  const s = Math.round((nowMs - Date.parse(iso)) / 1000);
  if (s < 0 || s >= 3600) return `${formatTimeUTC(iso)}`;
  if (s < 60) return `${s} s ago`;
  return `${Math.floor(s / 60)} min ago`;
}

export interface Hms {
  totalMs: number;
  h: number;
  m: number;
  s: number;
}

export function hmsUntil(targetIso: string, nowMs: number): Hms {
  const totalMs = Math.max(0, Date.parse(targetIso) - nowMs);
  const t = Math.floor(totalMs / 1000);
  return { totalMs, h: Math.floor(t / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}

/** Elapsed / remaining milliseconds as h:m:s parts. */
export function hmsOf(ms: number): Hms {
  const totalMs = Math.max(0, ms);
  const t = Math.floor(totalMs / 1000);
  return { totalMs, h: Math.floor(t / 3600), m: Math.floor((t % 3600) / 60), s: t % 60 };
}

const p2 = (n: number) => String(n).padStart(2, '0');
/** 03:17:42 */
export const clock = (x: Hms) => `${p2(x.h)}:${p2(x.m)}:${p2(x.s)}`;
/** 03 h 17 m 42 s */
export const clockWords = (x: Hms) => `${p2(x.h)} h ${p2(x.m)} m ${p2(x.s)} s`;

// ── draw verification (runs in the browser, nothing is sent anywhere) ─────────────────────────

export type CheckStatus = 'passed' | 'failed' | 'skipped' | 'info';

export interface VerifyCheck {
  id: 'request' | 'randomness' | 'snapshot' | 'winners' | 'prizes';
  title: string;
  detail: string;
  status: CheckStatus;
}

export interface RecomputedWinner {
  place: number;
  entrySeq: number;
  amount: string;
  /** Stored winner at this place (from the API), if any. */
  storedSeq: number | null;
  storedAmount: string | null;
  handle: string | null;
  entryId: string | null;
  matches: boolean;
}

export interface VerifyReport {
  state: 'verified' | 'failed' | 'unavailable';
  /** Why the round cannot be verified yet (no randomness / not settled / no entries). */
  reason: string | null;
  checks: VerifyCheck[];
  passed: number;
  winners: RecomputedWinner[];
  randomWordUsed: string | null;
}

const HEX_WORD = /^0x[0-9a-fA-F]{1,64}$/;

/** Mock VRF word as the API's MockVrfProvider derives it (DEV only — always labelled mock). */
export const mockVrfWord = (requestId: string) =>
  keccak256(stringToHex(`GP_MOCK_VRF:${requestId}`));

/**
 * Re-derive a settled round's winners from its random word with @gp/contracts/verify (the same code the
 * contract's DrawMath is proven against) and compare them with the stored result. `randomWordOverride` lets a
 * player paste the word from the explorer — a different word makes the check fail, which is the point.
 */
export function verifyDraw(
  bundle: PoolVerification,
  round: (Pick<PoolRoundView, 'closesAt'> & { closedAt?: string | null }) | null,
  randomWordOverride?: string,
): VerifyReport {
  const r = bundle.randomness;
  const n = bundle.round.totalEntries;
  const unavailable = (reason: string): VerifyReport => ({
    state: 'unavailable',
    reason,
    checks: [],
    passed: 0,
    winners: [],
    randomWordUsed: null,
  });
  if (bundle.round.status === 'cancelled')
    return unavailable(
      'This round was cancelled before a draw, so there is no randomness to check.',
    );
  if (!r?.randomWord)
    return unavailable(
      bundle.round.status === 'settled'
        ? 'No random word is recorded for this round (DEMO history snapshot) — there is nothing to re-derive.'
        : 'The draw has not been fulfilled yet. Verification opens once the random word is recorded.',
    );
  if (n === 0) return unavailable('This round has no entries.');

  const word = (randomWordOverride?.trim() || r.randomWord).toLowerCase();
  const checks: VerifyCheck[] = [];

  // 1 — the request belongs to this round and was made after entries closed
  // entries freeze when the round is closed (the lifecycle closes it at — or just after — closesAt)
  const closedAt = round ? (round.closedAt ?? round.closesAt) : null;
  const after = closedAt ? Date.parse(r.requestedAt) >= Date.parse(closedAt) : true;
  checks.push({
    id: 'request',
    title: `Request belongs to round #${bundle.round.number}`,
    detail: `Request ${shortHash(r.requestId)} sent ${formatTimeUTC(r.requestedAt, { seconds: true })}${round ? (after ? ', after entries closed.' : ', BEFORE entries closed.') : '.'}`,
    status: after ? 'passed' : 'failed',
  });

  // 2 — the random word is the one the randomness source produced
  const wellFormed = HEX_WORD.test(word);
  if (r.provider === 'mock') {
    const expected = mockVrfWord(r.requestId).toLowerCase();
    const ok = wellFormed && BigInt(word) === BigInt(expected);
    checks.push({
      id: 'randomness',
      title: ok ? 'Random word matches the DEV mock VRF' : 'Random word does not match the source',
      detail: ok
        ? 'DEV mock VRF: word = keccak256("GP_MOCK_VRF:" + request id), recomputed in your browser. Mainnet rounds use Chainlink VRF.'
        : `You entered …${word.slice(-8)}; the source produces …${expected.slice(-8)}.`,
      status: ok ? 'passed' : 'failed',
    });
  } else {
    const ok = wellFormed && BigInt(word) === BigInt(r.randomWord);
    checks.push({
      id: 'randomness',
      title: ok
        ? 'Randomness came from Chainlink VRF'
        : 'Random word does not match the VRF fulfilment',
      detail: ok
        ? `Fulfilled ${r.fulfilledAt ? formatTimeUTC(r.fulfilledAt, { seconds: true }) : ''}${r.fulfillTxHash ? ` in tx ${shortHash(r.fulfillTxHash)}` : ''}. The VRF proof itself is checked on-chain by the coordinator.`
        : `You entered …${word.slice(-8)}; the fulfilment emitted …${r.randomWord.slice(-8)}.`,
      status: ok ? 'passed' : 'failed',
    });
  }

  // 3 — entry snapshot (count now; Merkle root once the keeper publishes it on-chain)
  checks.push({
    id: 'snapshot',
    title: 'Entry snapshot',
    detail: `${n.toLocaleString('en-US')} qualifying entries, ordered by sequence (index = seq − 1). The on-chain snapshot root is not published for this round yet, so only the count is checked.`,
    status: 'info',
  });

  // 4 — winners
  const bps = bundle.algorithm.prizeSplitBps;
  const count = Math.min(bps.length, n);
  const stored = [...bundle.winners].sort((a, b) => a.place - b.place);
  let indices: bigint[] = [];
  if (wellFormed) {
    indices = deriveWinners(
      BigInt(bundle.algorithm.roundIdUsed),
      BigInt(word),
      BigInt(n),
      BigInt(count),
    );
  }
  const drawn = bps.slice(0, count);
  const missing = bps.slice(count).reduce((a, b) => a + b, 0);
  if (drawn.length) drawn[0] = drawn[0]! + missing;
  const amounts = splitPool(toBaseUnits(bundle.round.pool), drawn);
  const winners: RecomputedWinner[] = indices.map((idx, i) => {
    const s = stored[i];
    const seq = Number(idx) + 1;
    const amount = toUSDTString(fromBaseUnits(amounts[i] ?? 0n));
    const matches = Boolean(s) && s!.entrySeq === seq && money(s!.amount).eq(money(amount));
    return {
      place: i + 1,
      entrySeq: seq,
      amount,
      storedSeq: s?.entrySeq ?? null,
      storedAmount: s?.amount ?? null,
      handle: s?.handle ?? null,
      entryId: s?.entryId ?? null,
      matches,
    };
  });
  const seqMatches = winners.filter((w) => w.storedSeq === w.entrySeq).length;
  const winnersOk = wellFormed && stored.length === count && seqMatches === count;
  checks.push({
    id: 'winners',
    title: winnersOk ? 'Winners re-derived' : 'Winners do not match',
    detail: !wellFormed
      ? 'The random word must be a 0x-prefixed hex number.'
      : winnersOk
        ? `Same ${count} entries as the stored settlement (GLOBAL_POOL_WINNERS_V1, round id ${bundle.algorithm.roundIdUsed}).`
        : `${count - seqMatches} of ${count} entries differ from the stored settlement.`,
    status: winnersOk ? 'passed' : 'failed',
  });

  // 5 — prizes
  const total = amounts.reduce((a, b) => a + b, 0n);
  const poolUnits = toBaseUnits(bundle.round.pool);
  const amountsOk = winnersOk && total === poolUnits && winners.every((w) => w.matches);
  checks.push({
    id: 'prizes',
    title: amountsOk ? 'Prize amounts add up' : 'Prize amounts not confirmed',
    detail: amountsOk
      ? `${toUSDTString(fromBaseUnits(total))} USDT = 100% of the pool.`
      : winnersOk
        ? 'Recomputed prize amounts differ from the stored ones.'
        : 'Not checked until the winners match.',
    status: amountsOk ? 'passed' : winnersOk ? 'failed' : 'skipped',
  });

  const failed = checks.some((c) => c.status === 'failed');
  return {
    state: failed ? 'failed' : 'verified',
    reason: null,
    checks,
    passed: checks.filter((c) => c.status === 'passed').length,
    winners,
    randomWordUsed: word,
  };
}

export function shortHash(h: string, head = 6, tail = 4): string {
  return h.length > head + tail + 1 ? `${h.slice(0, head)}…${h.slice(-tail)}` : h;
}
