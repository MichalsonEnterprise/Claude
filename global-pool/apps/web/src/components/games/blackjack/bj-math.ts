/**
 * Twenty-One pure helpers (no React): card names, totals, the order cards appear on the felt, copy for results and
 * history rows, the shoe positions of a replayed hand. Totals and the shoe come from `@gp/shared/fair` (the same code
 * the server deals and settles with) — nothing here can choose or change a card. Amounts: decimal.js only.
 */
import {
  blackjack,
  fairGame,
  type BjActionType,
  type BjResult,
  type FairGameInfo,
} from '@gp/shared/fair';
import { formatTimeUTC } from '@gp/shared/format';
import { formatAmount, money, type MoneyInput } from '@gp/shared/money';

import type { BjBetView, BjOutcome, BjRoundView } from '@/lib/api/twenty-one';

export const SLUG = 'twenty-one';
export const INFO = fairGame(SLUG) as FairGameInfo;
export const RULES = blackjack.BLACKJACK_RULES;
/** Chip denominations (BJ-01 "Chip value · tap the bet spot to add"). */
export const CHIP_VALUES = ['1', '5', '10', '25', '100'] as const;
export type ChipValue = (typeof CHIP_VALUES)[number];
/** Published insurance house edge for a 6-deck shoe (BJ-03 copy). */
export const INSURANCE_EDGE = '7.4';

// ── cards ────────────────────────────────────────────────────────────────────────────────────

export type Suit = 'S' | 'H' | 'D' | 'C';
export const SUIT_SYMBOL: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_NAME: Record<Suit, string> = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
const RANK_NAME: Record<string, string> = {
  A: 'Ace',
  K: 'King',
  Q: 'Queen',
  J: 'Jack',
  T: '10',
};

export interface CardFace {
  code: string;
  /** Display rank: A, 2 … 10, J, Q, K. */
  rank: string;
  suit: Suit;
  symbol: string;
  red: boolean;
  /** "A♠" */
  short: string;
  /** "Ace of spades" */
  name: string;
}

/** Parse a shoe code ("AS", "TD", "KC") into what a card shows. */
export function cardFace(code: string): CardFace {
  const r = code.slice(0, -1);
  const suit = code.slice(-1) as Suit;
  const rank = r === 'T' ? '10' : r;
  return {
    code,
    rank,
    suit,
    symbol: SUIT_SYMBOL[suit] ?? '?',
    red: suit === 'H' || suit === 'D',
    short: `${rank}${SUIT_SYMBOL[suit] ?? ''}`,
    name: `${RANK_NAME[r] ?? r} of ${SUIT_NAME[suit] ?? suit}`,
  };
}

export const cardsShort = (cards: readonly string[]) => cards.map((c) => cardFace(c).short).join(' ');

/** Total of the cards that are face up (the shared rule module's `handValue`). */
export function totalOf(cards: readonly (string | null)[]): { total: number; soft: boolean } {
  const up = cards.filter((c): c is string => !!c);
  if (!up.length) return { total: 0, soft: false };
  return blackjack.handValue(up);
}

export const isNatural = (cards: readonly string[]) => blackjack.isNatural(cards);

/** "Pair of 8s" when the first two cards share a value (split-able), else null. */
export function pairLabel(cards: readonly string[]): string | null {
  if (cards.length !== 2) return null;
  const [a, b] = cards as [string, string];
  if (blackjack.cardValue(a) !== blackjack.cardValue(b)) return null;
  const ra = cardFace(a).rank;
  const rb = cardFace(b).rank;
  return ra === rb ? `Pair of ${ra === 'A' ? 'Aces' : `${ra}s`}` : 'Pair of 10s';
}

// ── reveal plan: the order cards land on the felt (card-deal motion) ──────────────────────────────

/** `d:<i>` dealer card i · `h:<hand>:<i>` player card · `flip` = the hole card turns over. */
export type RevealKey = string;

const dealerKey = (i: number) => `d:${i}`;
const handKey = (h: number, i: number) => `h:${h}:${i}`;

/**
 * Cards that are new in `next` compared with `prev`, in the order they come off the shoe: the deal (player, dealer
 * up, player, hole), then the player's cards hand by hand, then the hole card turning over, then the dealer's draws.
 * `prev` null = a new hand. Split: both new hands start with one visible card each (they came from the pair).
 */
export function revealPlan(prev: BjRoundView | null, next: BjRoundView): RevealKey[] {
  const out: RevealKey[] = [];
  const holeUp = next.dealer.cards[1] !== null && next.dealer.cards[1] !== undefined;
  if (!prev) {
    out.push(handKey(0, 0), dealerKey(0), handKey(0, 1), dealerKey(1));
    if (holeUp) out.push('flip');
    for (let i = 2; i < next.dealer.cards.length; i++) out.push(dealerKey(i));
    return out;
  }
  const split = prev.hands.length !== next.hands.length;
  next.hands.forEach((h, j) => {
    const seen = split ? 1 : (prev.hands[j]?.cards.length ?? 0);
    for (let i = seen; i < h.cards.length; i++) out.push(handKey(j, i));
  });
  const prevHoleUp = prev.dealer.cards[1] !== null && prev.dealer.cards[1] !== undefined;
  if (holeUp && !prevHoleUp) out.push('flip');
  for (let i = Math.max(2, prev.dealer.cards.length); i < next.dealer.cards.length; i++) out.push(dealerKey(i));
  return out;
}

/** Hides what the reveal has not reached yet: hidden cards are dropped, an unflipped hole shows its back. */
export function visibleRound(
  r: BjRoundView,
  pending: ReadonlySet<RevealKey>,
): { dealer: (string | null)[]; hands: string[][]; flipped: boolean } {
  const flipped = !pending.has('flip') && r.dealer.cards[1] !== null;
  const dealer: (string | null)[] = [];
  r.dealer.cards.forEach((c, i) => {
    if (pending.has(dealerKey(i))) return;
    dealer.push(i === 1 && !flipped ? null : c);
  });
  const hands = r.hands.map((h, j) => h.cards.filter((_, i) => !pending.has(handKey(j, i))));
  return { dealer, hands, flipped };
}

// ── results and copy ─────────────────────────────────────────────────────────────────────────

export const RESULT_LABEL: Record<BjResult, string> = {
  blackjack: 'Blackjack',
  win: 'Win',
  push: 'Push',
  lose: 'Lose',
  bust: 'Bust',
};

export type BetTone = 'blackjack' | 'win' | 'push' | 'lose';

/** Overall tone of a settled bet by net (blackjack only when a natural was paid 3:2). */
export function betTone(bet: Pick<BjBetView, 'net' | 'outcome'>): BetTone {
  const hands = bet.outcome.hands ?? [];
  const n = money(bet.net);
  if (hands.some((h) => h.result === 'blackjack') && n.gt(0)) return 'blackjack';
  if (n.gt(0)) return 'win';
  if (n.isZero()) return 'push';
  return 'lose';
}

/** "Win", "Bust", "1 win · 1 bust", "Win ×2" (doubled), "Insured" — the history RESULT cell. */
export function resultSummary(outcome: BjOutcome): string {
  const hands = outcome.hands ?? [];
  if (!hands.length) return '—';
  if (hands.length > 1) {
    const counts = new Map<string, number>();
    for (const h of hands) {
      const k = (h.result ?? 'lose') === 'blackjack' ? 'win' : (h.result ?? 'lose');
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].map(([k, c]) => `${c} ${k === 'lose' ? 'loss' : k}`).join(' · ');
  }
  const h = hands[0]!;
  if (outcome.insurance?.taken && outcome.dealerBlackjack) return 'Insured';
  const label = RESULT_LABEL[h.result ?? 'lose'];
  return h.doubled && h.result === 'win' ? `${label} ×2` : label;
}

const ACTION_WORD: Record<BjActionType, string> = {
  hit: 'Hit',
  stand: 'Stand',
  double: 'Double',
  split: 'Split',
  insurance: 'Insurance',
};

/** "Hit · Stand", "Split · Stand, Hit", "Double", "— (blackjack)" — the history DECISIONS cell. */
export function decisionsSummary(outcome: BjOutcome): string {
  const log = outcome.log ?? [];
  const hands = outcome.hands ?? [];
  const parts: string[] = [];
  if (log.some((e) => e.action === 'insurance')) parts.push('Insurance');
  const splitAt = log.findIndex((e) => e.action === 'split');
  const words = (entries: typeof log, hand?: number) =>
    entries
      .filter(
        (e) =>
          (e.action === 'hit' || e.action === 'stand' || e.action === 'double') &&
          (hand === undefined || e.hand === hand),
      )
      .map((e) => ACTION_WORD[e.action as BjActionType])
      .filter((w, i, a) => i === 0 || a[i - 1] !== w);
  if (splitAt >= 0) {
    const before = words(log.slice(0, splitAt));
    const after = log.slice(splitAt + 1);
    const perHand = hands.map((_, i) => words(after, i).join(' ') || (hands[i]?.splitAces ? 'one card' : 'Stand'));
    parts.push(...before, `Split · ${perHand.join(', ')}`);
  } else {
    parts.push(...words(log));
  }
  if (!parts.length) {
    if (hands[0] && isNatural(hands[0].cards)) return '— (blackjack)';
    if (outcome.dealerBlackjack) return '— (dealer blackjack)';
    return '—';
  }
  return parts.join(' · ');
}

/** One line for the verifier and the result card: "You A♠ K♥ = blackjack · Dealer 10♦ 7♣ = 17". */
export function describeHand(outcome: BjOutcome): string {
  const hands = outcome.hands ?? [];
  const dealer = (outcome.dealer ?? []).filter(Boolean);
  const you = hands
    .map((h) => {
      const v = blackjack.handValue(h.cards).total;
      const what = !h.fromSplit && isNatural(h.cards) ? 'blackjack' : v > 21 ? `${v} bust` : String(v);
      const res = h.result ? RESULT_LABEL[h.result].toLowerCase() : null;
      return `${cardsShort(h.cards)} = ${what}${res && !what.includes(res) ? ` (${res})` : ''}`;
    })
    .join(' / ');
  const dv = dealer.length ? blackjack.handValue(dealer).total : 0;
  const dWhat = isNatural(dealer) ? 'blackjack' : dv > 21 ? `${dv} bust` : String(dv);
  return `You ${you} · Dealer ${cardsShort(dealer)} = ${dWhat}`;
}

/** Copy for the result card (BJ-05): headline + detail. Real settled hands only. */
export function resultCopy(bet: BjBetView): { title: string; detail: string; status: string } {
  const o = bet.outcome;
  const hands = o.hands ?? [];
  const dealer = (o.dealer ?? []).filter(Boolean);
  const dv = dealer.length ? blackjack.handValue(dealer).total : 0;
  const dealerWord = isNatural(dealer) ? 'dealer blackjack' : dv > 21 ? `dealer busts with ${dv}` : `dealer ${dv}`;
  const payout = formatAmount(bet.payout);
  const tone = betTone(bet);
  if (hands.length > 1) {
    const s = resultSummary(o);
    return {
      title: tone === 'win' ? `You won ${payout} DEMO` : tone === 'push' ? 'Even — stakes back' : 'Split hands settled',
      detail: `Twenty-One · split · ${s} against ${dealerWord}`,
      status: `Split settled: ${s}. ${payout} DEMO back to your balance.`,
    };
  }
  const h = hands[0];
  if (!h) return { title: 'Hand settled', detail: 'Twenty-One', status: 'Hand settled.' };
  const v = blackjack.handValue(h.cards).total;
  const insured = !!(o.insurance?.taken && o.dealerBlackjack);
  switch (h.result) {
    case 'blackjack':
      return {
        title: 'Blackjack — paid 3:2',
        detail: `Twenty-One · ${cardsShort(h.cards)} · you receive ${payout} DEMO`,
        status: `Blackjack pays 3:2 — ${payout} DEMO back to your balance (${formatAmount(h.stake)} stake + ${formatAmount(money(h.payout).minus(money(h.stake)).toFixed(2))} win).`,
      };
    case 'win':
      return {
        title: `You won ${payout} DEMO`,
        detail: `Twenty-One · ${v} ${dv > 21 ? `· ${dealerWord}` : `beats dealer ${dv}`} · win pays 1:1${h.doubled ? ' · doubled' : ''}`,
        status: `You win: ${dv > 21 ? `the dealer busts with ${dv}` : `${v} beats the dealer’s ${dv}`}. Paid 1:1 — ${payout} DEMO back to your balance.`,
      };
    case 'push':
      return {
        title: 'Push — stake back',
        detail: isNatural(h.cards) ? 'Twenty-One · blackjack each · stake returned' : `Twenty-One · ${v} each · stake returned`,
        status: `Push: ${isNatural(h.cards) ? 'blackjack each' : `${v} each`}. Your ${formatAmount(h.stake)} DEMO stake is back on your balance.`,
      };
    case 'bust':
      return {
        title: `Bust — ${v}`,
        detail: `Twenty-One · over 21 · the hand is lost`,
        status: `Bust: ${cardsShort(h.cards)} makes ${v}. The ${formatAmount(h.stake)} DEMO stake is lost.`,
      };
    case 'lose':
    case null:
      return {
        title: insured ? 'Insurance paid 2:1' : 'Dealer wins',
        detail: insured
          ? `Twenty-One · dealer blackjack · insurance returned ${formatAmount(o.insurance!.payout)} DEMO`
          : `Twenty-One · ${dealerWord} beats ${v}`,
        status: insured
          ? `Dealer blackjack. Your insurance paid 2:1 — ${formatAmount(o.insurance!.payout)} DEMO back, the main bet is lost.`
          : `Dealer wins: ${isNatural(dealer) ? 'blackjack' : dv} beats your ${v}.`,
      };
  }
}

/** Status line on the felt while a hand is open (BJ-02 … BJ-04). */
export function feltStatus(r: BjRoundView, visibleDealerTotal: number, dealing: boolean): string {
  if (dealing) return 'Dealing… cards come off a freshly shuffled 6-deck shoe.';
  if (r.phase === 'insurance') return 'Dealer shows an Ace — choose whether to insure before the dealer checks for blackjack.';
  if (r.phase === 'player') {
    const h = r.hands[r.active];
    if (!h) return 'Your move.';
    const v = totalOf(h.cards).total;
    if (r.hands.length > 1) {
      const other = r.active === 0 ? ' Hand 2 gets its second card when hand 1 is finished.' : '';
      return `Hand ${r.active + 1} of ${r.hands.length}: ${v} against a dealer ${visibleDealerTotal}.${other}`;
    }
    return `Your move: ${v} against a dealer ${visibleDealerTotal}. No time limit — take your time.`;
  }
  return '';
}

// ── replay / shoe positions (BJ-08) ──────────────────────────────────────────────────────────

export interface ShoeSlot {
  position: number;
  card: string;
  /** "You", "Dealer up", "Dealer hole", "Hand 2 · hit", "Dealer draws" — null = not dealt this hand. */
  role: string | null;
}

/**
 * Label every shoe position the hand used, from the replayed log (positions 0–3 are the deal; later cards come off
 * the shoe in the order of the log). Cards beyond `cardsDealt` were never dealt.
 */
export function shoeSlots(order: readonly string[], outcome: BjOutcome, count: number): ShoeSlot[] {
  const roles: string[] = ['You', 'Dealer up', 'You', 'Dealer hole'];
  const log = outcome.log ?? [];
  const multi = (outcome.hands ?? []).length > 1;
  log.slice(1).forEach((e) => {
    e.cards.forEach((_, i) => {
      const hand = e.hand === null ? '' : multi ? `Hand ${(e.action === 'split' ? i : e.hand) + 1} · ` : '';
      switch (e.action) {
        case 'hit':
          roles.push(`${hand}You hit`);
          break;
        case 'double':
          roles.push(`${hand}You double`);
          break;
        case 'split':
          roles.push(`Hand ${i + 1} · 2nd card`);
          break;
        case 'deal':
          roles.push(`Hand ${(e.hand ?? 0) + 1} · 2nd card`);
          break;
        case 'dealer':
          roles.push('Dealer draws');
          break;
        case 'insurance':
        case 'insurance_declined':
        case 'peek':
        case 'stand':
          roles.push('—');
          break;
      }
    });
  });
  return order.slice(0, count).map((card, position) => ({ position, card, role: roles[position] ?? null }));
}

// ── amounts ──────────────────────────────────────────────────────────────────────────────────

const two = (v: MoneyInput) => money(v).toDecimalPlaces(2, 1).toFixed(2);
/** Returned on a win 1:1 / blackjack 3:2 / insurance stake for a base bet (decimal.js, 2 dp truncated). */
export function payoutTable(stake: MoneyInput) {
  const s = money(stake);
  return {
    win: two(s.times(2)),
    blackjack: two(s.times(5).div(2)),
    push: two(s),
    insuranceStake: two(s.div(2)),
    insuranceReturn: two(s.div(2).times(3)),
  };
}

/** Sum of a chip stack (decimal strings). */
export function addChip(current: string, chip: string): string {
  const base = /^\d+(\.\d{1,2})?$/.test(current) ? money(current) : money(0);
  return base.plus(money(chip)).toFixed(2);
}

/**
 * Public round view of a SETTLED hand rebuilt from its stored outcome (when the hand was finished elsewhere — another
 * tab or device — and only the bet view is available). Totals come from the shared rule module.
 */
export function roundFromOutcome(o: BjOutcome): BjRoundView | null {
  if (!o.hands || !o.dealer) return null;
  const dealer = o.dealer;
  const dv = blackjack.handValue(dealer);
  return {
    phase: 'settled',
    dealer: { cards: dealer, total: dv.total, soft: dv.soft, blackjack: o.dealerBlackjack ?? null },
    hands: o.hands.map((h) => ({ ...h, ...blackjack.handValue(h.cards) })),
    active: o.active ?? 0,
    allowedActions: [],
    insurance: o.insurance ?? null,
    baseStake: o.baseStake ?? '0.00',
    totalStake: o.totalStake ?? '0.00',
    totalPayout: o.totalPayout ?? '0.00',
    cardsDealt: o.position ?? 0,
    decks: o.decks ?? RULES.decks,
  };
}

// ── history: what happened in a hand (BJ-06 row details) ────────────────────────────────────────

const handTotal = (cards: readonly string[]) => (isNatural(cards) ? 'BJ' : String(totalOf(cards).total));

/** Step-by-step story of a settled hand from its log (cards and totals only — times are deal and settle). */
export function handTimeline(b: BjBetView): { time: string | null; text: string }[] {
  const o = b.outcome;
  const log = o.log ?? [];
  const dealer = (o.dealer ?? []);
  const out: { time: string | null; text: string }[] = [];
  let hands: string[][] = [];
  const short = (c: string) => cardFace(c).short;
  const tot = (cards: string[]) => blackjack.handValue(cards).total;
  log.forEach((e, idx) => {
    if (e.action === 'deal' && idx === 0) {
      const [p1, d1, p2] = e.cards as [string, string, string];
      hands = [[p1, p2]];
      out.push({
        time: formatTimeUTC(b.createdAt, { seconds: true }),
        text: `Deal — you ${short(p1)} ${short(p2)} (${handTotal([p1, p2])}), dealer shows ${short(d1)}`,
      });
    } else if (e.action === 'peek') {
      out.push({ time: null, text: 'Dealer checks for blackjack' });
    } else if (e.action === 'insurance') {
      out.push({ time: null, text: `You take insurance (${formatAmount(o.insurance?.stake ?? '0')} DEMO)` });
    } else if (e.action === 'insurance_declined') {
      out.push({ time: null, text: 'You decline insurance' });
    } else if (e.action === 'split') {
      const [a, bb] = hands[0] as [string, string];
      hands = [[a, e.cards[0]!], e.cards[1] ? [bb, e.cards[1]] : [bb]];
      out.push({
        time: null,
        text: `You split — hand 1 gets ${short(e.cards[0]!)} (${tot(hands[0]!)})${e.cards[1] ? `, hand 2 gets ${short(e.cards[1])} (${tot(hands[1]!)})` : ''}`,
      });
    } else if (e.action === 'deal') {
      const h = e.hand ?? 0;
      hands[h] = [...(hands[h] ?? []), ...e.cards];
      out.push({ time: null, text: `Hand ${h + 1} gets ${e.cards.map(short).join(' ')} (${tot(hands[h])})` });
    } else if (e.action === 'hit' || e.action === 'double') {
      const h = e.hand ?? 0;
      hands[h] = [...(hands[h] ?? []), ...e.cards];
      const v = tot(hands[h]);
      const who = hands.length > 1 ? `Hand ${h + 1}: you` : 'You';
      out.push({
        time: null,
        text: `${who} ${e.action === 'double' ? 'double' : 'hit'} — ${e.cards.map(short).join(' ')} makes ${v}${v > 21 ? ': bust' : ''}`,
      });
    } else if (e.action === 'stand') {
      const h = e.hand ?? 0;
      out.push({ time: null, text: `${hands.length > 1 ? `Hand ${h + 1}: you` : 'You'} stand on ${tot(hands[h] ?? [])}` });
    } else if (e.action === 'dealer' && e.cards.length) {
      out.push({ time: null, text: `Dealer draws ${e.cards.map(short).join(' ')} → ${tot(dealer)}` });
    }
  });
  if (b.status === 'settled' && dealer.length >= 2) {
    out.push({
      time: b.settledAt ? formatTimeUTC(b.settledAt, { seconds: true }) : null,
      text: `Settled ${formatAmount(b.net, { sign: 'always' })} DEMO · hole card ${short(dealer[1]!)} revealed (${handTotal(dealer)})`,
    });
  }
  return out;
}

