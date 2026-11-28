/**
 * Twenty-One (key "blackjack", BJ-01 … BJ-09) — pure helpers: card faces, the order cards land on the felt (reveal
 * plan over the server's public views, hole card hidden until settlement), history copy, the shoe positions of a
 * replayed hand and the browser verification round trip with the SAME shared code the API settles with
 * (@gp/shared/fair → blackjack / verifyBet). DEMO credits only — amounts are decimal strings, never floats.
 */
import { blackjack, sha256Hex, type BjAction, type BjState } from '@gp/shared/fair';
import { describe, expect, it } from 'vitest';

import {
  addChip,
  betTone,
  cardFace,
  decisionsSummary,
  describeHand,
  handTimeline,
  pairLabel,
  payoutTable,
  resultSummary,
  revealPlan,
  roundFromOutcome,
  shoeSlots,
  totalOf,
  visibleRound,
} from '../src/components/games/blackjack/bj-math';
import { verifyInBrowser } from '../src/components/games/kit/verify';
import type { BetVerification } from '../src/lib/api/games';
import type { BjBetView, BjRoundView } from '../src/lib/api/twenty-one';

const SERVER_SEED = '6f1c3e5a9b2d4c7e8f0a1b3c5d7e9f2a4b6c8d0e1f3a5b7c9d1e3f5a7b9c0d2e';
const CLIENT = 'nova-k-7f2a91';

/** Mirror of the API's public view (hole card null until settled) — apps/api stateful.service publicState. */
function publicView(s: BjState): BjRoundView {
  const hidden = !s.holeRevealed;
  const vis = hidden ? [s.dealer[0]!] : s.dealer;
  return {
    phase: s.phase,
    dealer: {
      cards: hidden ? [s.dealer[0]!, null] : [...s.dealer],
      total: blackjack.handValue(vis).total,
      soft: blackjack.handValue(vis).soft,
      blackjack: s.holeRevealed ? s.dealerBlackjack : null,
    },
    hands: s.hands.map((h) => ({ ...h, cards: [...h.cards], ...blackjack.handValue(h.cards) })),
    active: s.active,
    allowedActions: blackjack.allowedActions(s),
    insurance: s.insurance ? { ...s.insurance } : null,
    baseStake: s.baseStake,
    totalStake: s.totalStake,
    totalPayout: s.totalPayout,
    cardsDealt: s.position,
    decks: s.decks,
  };
}

/** Play one hand with a fixed strategy, recording every public view the API would return. */
function playHand(nonce: number, stake = '10.00') {
  const seed = { serverSeed: SERVER_SEED, clientSeed: CLIENT, nonce };
  const shoe = new blackjack.Shoe(seed);
  const s = blackjack.bjDeal(shoe, stake);
  const views = [publicView(structuredClone(s))];
  const actions: BjAction[] = [];
  for (let i = 0; i < 20 && s.phase !== 'settled'; i++) {
    const allowed = blackjack.allowedActions(s);
    const h = s.hands[s.active]!;
    const v = blackjack.handValue(h.cards).total;
    const a: BjAction = allowed.includes('insurance')
      ? { type: 'insurance', accept: nonce % 2 === 0 }
      : allowed.includes('split')
        ? { type: 'split' }
        : allowed.includes('double') && v >= 9 && v <= 11
          ? { type: 'double' }
          : v < 17
            ? { type: 'hit' }
            : { type: 'stand' };
    blackjack.bjApply(s, shoe, a);
    actions.push(a);
    views.push(publicView(structuredClone(s)));
  }
  const outcome = { ...structuredClone(s), actions: blackjack.actionsOf(s) };
  const payout = s.totalPayout;
  const bet = {
    id: `bet-${nonce}`,
    ref: `BJ-${40000 + nonce}`,
    game: { slug: 'twenty-one', name: 'Twenty-One' },
    status: 'settled',
    stake: s.totalStake,
    payout,
    net: subtract(payout, s.totalStake),
    multiplier: null,
    win: null,
    fee: '0.00',
    params: { decks: 6 },
    outcome,
    fairness: { seedPairId: 'p', serverSeedHash: sha256Hex(SERVER_SEED), clientSeed: CLIENT, nonce, revealed: true },
    rulesVersion: 'twenty-one/1',
    currency: 'DEMO',
    createdAt: '2026-11-27T18:42:03.000Z',
    settledAt: '2026-11-27T18:42:09.000Z',
    isDemo: true,
  } as unknown as BjBetView;
  return { seed, state: s, views, actions, bet };
}

function subtract(a: string, b: string): string {
  // exact 2-dp decimal strings → integer cents (no floats)
  const c = (x: string) => {
    const neg = x.startsWith('-');
    const [w, f = ''] = x.replace('-', '').split('.');
    const v = BigInt(w!) * 100n + BigInt((f + '00').slice(0, 2));
    return neg ? -v : v;
  };
  const d = c(a) - c(b);
  const abs = d < 0n ? -d : d;
  return `${d < 0n ? '-' : ''}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`;
}

describe('cards', () => {
  it('parses shoe codes into faces with names for screen readers', () => {
    expect(cardFace('AS')).toMatchObject({ rank: 'A', suit: 'S', red: false, short: 'A♠', name: 'Ace of spades' });
    expect(cardFace('TD')).toMatchObject({ rank: '10', red: true, short: '10♦', name: '10 of diamonds' });
    expect(cardFace('KH').name).toBe('King of hearts');
  });
  it('totals with the shared rule module (soft aces, hidden hole ignored)', () => {
    expect(totalOf(['AS', '6H'])).toEqual({ total: 17, soft: true });
    expect(totalOf(['AS', '6H', 'TD'])).toEqual({ total: 17, soft: false });
    expect(totalOf(['TC', null])).toEqual({ total: 10, soft: false });
    expect(pairLabel(['8S', '8H'])).toBe('Pair of 8s');
    expect(pairLabel(['KS', 'QH'])).toBe('Pair of 10s');
    expect(pairLabel(['8S', '9H'])).toBeNull();
  });
  it('adds chips and computes payouts with decimal maths (truncated, never floats)', () => {
    expect(addChip('10.00', '5')).toBe('15.00');
    expect(addChip('', '25')).toBe('25.00');
    expect(payoutTable('10.00')).toEqual({
      win: '20.00',
      blackjack: '25.00',
      push: '10.00',
      insuranceStake: '5.00',
      insuranceReturn: '15.00',
    });
    expect(payoutTable('1.25').blackjack).toBe('3.12'); // 3.125 truncated
  });
});

describe('reveal plan (card-deal order on the felt)', () => {
  it('deals player, dealer up, player, hole — and the hole stays face down until it flips', () => {
    const { views } = playHand(3);
    const first = views[0]!;
    const plan = revealPlan(null, first);
    expect(plan.slice(0, 4)).toEqual(['h:0:0', 'd:0', 'h:0:1', 'd:1']);
    const half = visibleRound(first, new Set(plan.slice(2)));
    expect(half.hands[0]).toHaveLength(1);
    expect(half.dealer).toHaveLength(1);
    const dealt = visibleRound(first, new Set());
    expect(dealt.dealer[1] ?? null).toBe(first.phase === 'settled' ? first.dealer.cards[1] : null);
  });

  it('every transition reveals exactly the new cards, in shoe order, for 300 real hands', () => {
    let splits = 0;
    let dealerDraws = 0;
    for (let nonce = 0; nonce < 300; nonce++) {
      const { views, state } = playHand(nonce);
      let prev: BjRoundView | null = null;
      let seen = 0;
      for (const v of views) {
        const plan = revealPlan(prev, v);
        const flips = plan.filter((k) => k === 'flip').length;
        const before = prev ? visibleRound(prev, new Set()) : { dealer: [], hands: [] as string[][] };
        const after = visibleRound(v, new Set());
        const count = (x: { dealer: (string | null)[]; hands: string[][] }) =>
          x.dealer.length + x.hands.reduce((n, h) => n + h.length, 0);
        // a split re-arranges the same two cards into two hands: nothing new is revealed for them
        expect(plan.length - flips, `nonce ${nonce}`).toBe(count(after) - count(before));
        // hidden while pending: the full plan hides every new card
        const hidden = visibleRound(v, new Set(plan));
        expect(count(hidden)).toBe(count(before));
        seen += plan.length - flips;
        if (prev && prev.hands.length !== v.hands.length) splits += 1;
        if (plan.some((k) => /^d:[2-9]/.test(k))) dealerDraws += 1;
        prev = v;
      }
      // every card that came off the shoe was shown once
      expect(seen, `nonce ${nonce}`).toBe(state.position);
    }
    expect(splits).toBeGreaterThan(0);
    expect(dealerDraws).toBeGreaterThan(0);
  });
});

describe('history copy and shoe positions', () => {
  it('summarises results, decisions and the story of a hand', () => {
    const tones = new Set<string>();
    for (let nonce = 0; nonce < 200; nonce++) {
      const { bet, state } = playHand(nonce);
      tones.add(betTone(bet));
      expect(resultSummary(bet.outcome)).not.toBe('—');
      expect(decisionsSummary(bet.outcome).length).toBeGreaterThan(0);
      expect(describeHand(bet.outcome)).toMatch(/^You .+ · Dealer .+ = /);
      const lines = handTimeline(bet);
      expect(lines[0]!.text).toMatch(/^Deal — you /);
      expect(lines.at(-1)!.text).toMatch(/^Settled /);
      if (state.hands.length > 1) expect(decisionsSummary(bet.outcome)).toMatch(/Split · /);
      const round = roundFromOutcome(bet.outcome)!;
      expect(round.phase).toBe('settled');
      expect(round.dealer.total).toBe(blackjack.handValue(state.dealer).total);
    }
    expect(tones).toEqual(new Set(['win', 'lose', 'push', 'blackjack']));
  });

  it('labels every dealt shoe position from the replayed log, matching the shuffled shoe', () => {
    for (let nonce = 0; nonce < 120; nonce++) {
      const { seed, state, bet } = playHand(nonce);
      const order = blackjack.shoeOrder(seed).slice(0, state.position + 2);
      const slots = shoeSlots(order, bet.outcome, order.length);
      expect(slots.slice(0, 4).map((s) => s.role)).toEqual(['You', 'Dealer up', 'You', 'Dealer hole']);
      expect(order[0]).toBe(state.log[0]!.cards[0]);
      expect(order[1]).toBe(state.dealer[0]);
      expect(order[3]).toBe(state.dealer[1]);
      let pos = 4;
      for (const e of state.log.slice(1))
        for (const c of e.cards) {
          expect(order[pos], `nonce ${nonce} pos ${pos}`).toBe(c);
          expect(slots[pos]!.role).not.toBeNull();
          pos += 1;
        }
      expect(pos).toBe(state.position);
      expect(slots[state.position]!.role).toBeNull(); // first card not dealt
    }
  });
});

describe('browser verification (same shared code as the API)', () => {
  const verification = (bet: BjBetView, nonce: number): BetVerification => ({
    bet,
    verify: {
      game: 'twenty-one',
      rulesVersion: 'twenty-one/1',
      serverSeedHash: sha256Hex(SERVER_SEED),
      serverSeed: SERVER_SEED,
      clientSeed: CLIENT,
      nonce,
      stake: '10.00',
      params: { actions: bet.outcome.actions, decks: 6 },
      stream: 'HMAC-SHA256',
      library: '@gp/shared/fair',
    },
    revealed: true,
    commitmentValid: true,
    recomputed: null,
    matches: true,
    message: '',
    isDemo: true,
  });

  it('re-derives the recorded hand from the revealed seed; an edited seed or nonce fails', () => {
    for (const nonce of [0, 7, 41, 99]) {
      const { bet } = playHand(nonce);
      const v = verification(bet, nonce);
      const ok = verifyInBrowser(v, { serverSeed: SERVER_SEED, clientSeed: CLIENT, nonce });
      expect(ok.commitmentValid).toBe(true);
      expect(ok.matches).toBe(true);
      const tampered = verifyInBrowser(v, { serverSeed: SERVER_SEED.slice(0, 63), clientSeed: CLIENT, nonce });
      expect(tampered.matches).toBe(false);
      const other = verifyInBrowser(v, { serverSeed: SERVER_SEED, clientSeed: CLIENT, nonce: nonce + 1 });
      expect(other.matches).toBe(false);
    }
  });
});
