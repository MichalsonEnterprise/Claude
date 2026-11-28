/**
 * Twenty-One (blackjack) — rules from the BJ notes / PUB-04 copy:
 * 6 decks (312 cards) shuffled from the seeds for EVERY hand · dealer stands on all 17s (S17) · blackjack pays 3:2 ·
 * double on any first two cards, also after a split (DAS) · split a pair once (2 hands; a pair = two cards of the
 * same value) · split Aces get one card each (21 after a split is not a blackjack) · dealer peeks with an Ace or a
 * 10-value card showing, so a dealer blackjack only takes the original bet · insurance (Ace showing) costs half the
 * bet and pays 2:1 · no surrender. House edge ≈ 0.50 % with basic strategy (Monte-Carlo tested).
 *
 * PF: the shoe order is a forward Fisher–Yates shuffle of the unshuffled shoe (deck by deck, suits S H D C, ranks
 * A…K) on the byte stream: step i swaps position i with uniformInt(i, 311). Cards are dealt from position 0:
 * player, dealer up card, player, dealer hole card, then every further card in the order it is drawn. The whole
 * 312-card order is fixed when the hand is dealt and is re-created card by card in the verifier.
 */
import { money } from '../../money';
import { creditString } from '../credits';
import { ByteStream, FairError, uniformInt, type SeedInput } from '../stream';

export const BLACKJACK_RULES = {
  rulesVersion: 'twenty-one/1',
  decks: 6,
  houseEdgePercent: '0.50',
  dealerStandsSoft17: true,
  blackjackPays: '3:2',
  insurancePays: '2:1',
  maxHands: 2,
  surrender: false,
} as const;

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'] as const;
export const SUITS = ['S', 'H', 'D', 'C'] as const;
export type CardCode = string; // 'AS', 'TD', 'KC', …

/** Unshuffled shoe: deck by deck, suits S H D C, ranks A … K. */
export function unshuffledShoe(decks: number = BLACKJACK_RULES.decks): CardCode[] {
  const out: CardCode[] = [];
  for (let d = 0; d < decks; d++)
    for (const s of SUITS) for (const r of RANKS) out.push(`${r}${s}`);
  return out;
}

/** Where cards come from: the seeded {@link Shoe} in play; a fixed list in rule tests. */
export interface CardSource {
  readonly decks: number;
  position: number;
  draw(): CardCode;
}

/** Lazily shuffled shoe: computes the forward Fisher–Yates only as far as cards are dealt. */
export class Shoe implements CardSource {
  private readonly stream: ByteStream;
  private readonly base: CardCode[];
  private readonly swapped = new Map<number, CardCode>();
  private fixed = 0;

  constructor(
    seed: SeedInput,
    readonly decks: number = BLACKJACK_RULES.decks,
    /** Cards already dealt (resume a hand). */
    public position = 0,
  ) {
    this.stream = new ByteStream(seed);
    this.base = unshuffledShoe(decks);
  }

  private at(i: number): CardCode {
    return this.swapped.get(i) ?? this.base[i]!;
  }

  /** Card at shoe position `i` (fixes steps 0 … i). */
  cardAt(i: number): CardCode {
    const n = this.base.length;
    if (i < 0 || i >= n) throw new FairError('The shoe is exhausted', 'INTERNAL');
    while (this.fixed <= i) {
      const k = this.fixed;
      if (k < n - 1) {
        const j = uniformInt(this.stream, k, n - 1);
        const a = this.at(k);
        const b = this.at(j);
        this.swapped.set(k, b);
        this.swapped.set(j, a);
      }
      this.fixed += 1;
    }
    return this.at(i);
  }

  draw(): CardCode {
    return this.cardAt(this.position++);
  }
}

/** Full 312-card order for the verifier. */
export function shoeOrder(seed: SeedInput, decks: number = BLACKJACK_RULES.decks): CardCode[] {
  const shoe = new Shoe(seed, decks);
  return unshuffledShoe(decks).map((_, i) => shoe.cardAt(i));
}

export const cardValue = (c: CardCode): number => {
  const r = c[0];
  if (r === 'A') return 1;
  if (r === 'T' || r === 'J' || r === 'Q' || r === 'K') return 10;
  return Number(r);
};

export function handValue(cards: readonly CardCode[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    const v = cardValue(c);
    total += v;
    if (v === 1) aces += 1;
  }
  const soft = aces > 0 && total + 10 <= 21;
  return { total: soft ? total + 10 : total, soft };
}

export const isNatural = (cards: readonly CardCode[]): boolean =>
  cards.length === 2 && handValue(cards).total === 21;

export type BjResult = 'blackjack' | 'win' | 'push' | 'lose' | 'bust';
export interface BjHand {
  cards: CardCode[];
  stake: string;
  doubled: boolean;
  fromSplit: boolean;
  splitAces: boolean;
  done: boolean;
  result: BjResult | null;
  payout: string;
}
export type BjPhase = 'insurance' | 'player' | 'settled';
export type BjAction =
  | { type: 'hit' }
  | { type: 'stand' }
  | { type: 'double' }
  | { type: 'split' }
  | { type: 'insurance'; accept: boolean };
export type BjActionType = BjAction['type'];
export interface BjLogEntry {
  action: 'deal' | BjActionType | 'insurance_declined' | 'dealer' | 'peek';
  hand: number | null;
  cards: CardCode[];
}
export interface BjState {
  rulesVersion: string;
  decks: number;
  baseStake: string;
  position: number;
  dealer: CardCode[];
  holeRevealed: boolean;
  hands: BjHand[];
  active: number;
  phase: BjPhase;
  insurance: { taken: boolean | null; stake: string; payout: string } | null;
  dealerBlackjack: boolean | null;
  log: BjLogEntry[];
  totalStake: string;
  totalPayout: string;
}

const isTenOrAce = (c: CardCode) => cardValue(c) === 10 || cardValue(c) === 1;

function newHand(cards: CardCode[], stake: string, fromSplit = false, splitAces = false): BjHand {
  return {
    cards,
    stake,
    doubled: false,
    fromSplit,
    splitAces,
    done: false,
    result: null,
    payout: '0.00',
  };
}

function recomputeTotals(s: BjState): void {
  let staked = money(0);
  let paid = money(0);
  for (const h of s.hands) {
    staked = staked.plus(money(h.stake));
    paid = paid.plus(money(h.payout));
  }
  if (s.insurance?.taken) {
    staked = staked.plus(money(s.insurance.stake));
    paid = paid.plus(money(s.insurance.payout));
  }
  s.totalStake = creditString(staked);
  s.totalPayout = creditString(paid);
}

/** Deal a new hand: player, dealer up, player, dealer hole. */
export function bjDeal(shoe: CardSource, stake: string): BjState {
  const p1 = shoe.draw();
  const d1 = shoe.draw();
  const p2 = shoe.draw();
  const d2 = shoe.draw();
  const s: BjState = {
    rulesVersion: BLACKJACK_RULES.rulesVersion,
    decks: shoe.decks,
    baseStake: creditString(stake),
    position: shoe.position,
    dealer: [d1, d2],
    holeRevealed: false,
    hands: [newHand([p1, p2], creditString(stake))],
    active: 0,
    phase: 'player',
    insurance: null,
    dealerBlackjack: null,
    log: [{ action: 'deal', hand: 0, cards: [p1, d1, p2] }],
    totalStake: creditString(stake),
    totalPayout: '0.00',
  };
  if (cardValue(d1) === 1) {
    s.phase = 'insurance';
    s.insurance = { taken: null, stake: creditString(money(stake).div(2)), payout: '0.00' };
  } else {
    afterPeek(s, shoe);
  }
  recomputeTotals(s);
  return s;
}

/** Dealer peek (Ace or 10 showing) and naturals. */
function afterPeek(s: BjState, shoe: CardSource): void {
  const dealerBj = isNatural(s.dealer);
  s.dealerBlackjack = isTenOrAce(s.dealer[0]!) ? dealerBj : false;
  if (isTenOrAce(s.dealer[0]!)) s.log.push({ action: 'peek', hand: null, cards: [] });
  const playerBj = isNatural(s.hands[0]!.cards);
  if (s.dealerBlackjack || playerBj) {
    s.hands[0]!.done = true;
    finish(s, shoe, false);
    return;
  }
  s.phase = 'player';
}

export function allowedActions(s: BjState): BjActionType[] {
  if (s.phase === 'insurance') return ['insurance'];
  if (s.phase !== 'player') return [];
  const h = s.hands[s.active];
  if (!h || h.done) return [];
  const out: BjActionType[] = ['hit', 'stand'];
  if (h.cards.length === 2 && !h.splitAces) out.push('double');
  if (
    s.hands.length === 1 &&
    h.cards.length === 2 &&
    cardValue(h.cards[0]!) === cardValue(h.cards[1]!)
  ) {
    out.push('split');
  }
  return out;
}

/** Extra DEMO credits an action takes from the balance before it is applied (double, split, insurance). */
export function actionCost(s: BjState, action: BjAction): string {
  if (action.type === 'double' || action.type === 'split') return s.hands[s.active]!.stake;
  if (action.type === 'insurance' && action.accept) return s.insurance?.stake ?? '0.00';
  return '0.00';
}

/** Apply one player action (mutates and returns the state). Throws FairError for an illegal action. */
export function bjApply(s: BjState, shoe: CardSource, action: BjAction): BjState {
  if (shoe.position !== s.position) throw new FairError('Shoe position mismatch', 'INTERNAL');
  if (!allowedActions(s).includes(action.type)) {
    throw new FairError(`"${action.type}" is not possible right now`, 'ACTION_NOT_ALLOWED');
  }
  if (action.type === 'insurance') {
    s.insurance!.taken = action.accept;
    s.log.push({
      action: action.accept ? 'insurance' : 'insurance_declined',
      hand: null,
      cards: [],
    });
    afterPeek(s, shoe);
    if (s.insurance!.taken && s.dealerBlackjack) {
      s.insurance!.payout = creditString(money(s.insurance!.stake).times(3));
    }
  } else {
    const h = s.hands[s.active]!;
    if (action.type === 'hit') {
      const c = shoe.draw();
      h.cards.push(c);
      s.log.push({ action: 'hit', hand: s.active, cards: [c] });
      const v = handValue(h.cards).total;
      if (v >= 21) h.done = true;
    } else if (action.type === 'stand') {
      h.done = true;
      s.log.push({ action: 'stand', hand: s.active, cards: [] });
    } else if (action.type === 'double') {
      h.stake = creditString(money(h.stake).times(2));
      h.doubled = true;
      const c = shoe.draw();
      h.cards.push(c);
      h.done = true;
      s.log.push({ action: 'double', hand: s.active, cards: [c] });
    } else if (action.type === 'split') {
      const [a, b] = h.cards as [CardCode, CardCode];
      const aces = cardValue(a) === 1;
      const h1 = newHand([a], h.stake, true, aces);
      const h2 = newHand([b], h.stake, true, aces);
      s.hands = [h1, h2];
      s.active = 0;
      const c1 = shoe.draw();
      h1.cards.push(c1);
      const drawn = [c1];
      if (aces) {
        const c2 = shoe.draw();
        h2.cards.push(c2);
        drawn.push(c2);
        h1.done = true;
        h2.done = true;
      } else if (handValue(h1.cards).total === 21) {
        h1.done = true;
      }
      s.log.push({ action: 'split', hand: 0, cards: drawn });
    }
    advance(s, shoe);
  }
  s.position = shoe.position;
  recomputeTotals(s);
  return s;
}

/** Move to the next unfinished hand (dealing a split hand's second card) or play the dealer. */
function advance(s: BjState, shoe: CardSource): void {
  for (let i = 0; i < s.hands.length; i++) {
    const h = s.hands[i]!;
    if (h.done) continue;
    s.active = i;
    if (h.cards.length === 1) {
      const c = shoe.draw();
      h.cards.push(c);
      s.log.push({ action: 'deal', hand: i, cards: [c] });
      if (handValue(h.cards).total === 21) {
        h.done = true;
        continue;
      }
    }
    return;
  }
  finish(s, shoe, true);
}

/** Dealer plays (only if a hand is still standing) and every hand is settled. */
function finish(s: BjState, shoe: CardSource, dealerPlays: boolean): void {
  s.holeRevealed = true;
  const live = s.hands.some((h) => handValue(h.cards).total <= 21);
  const naturalOnly = s.hands.length === 1 && isNatural(s.hands[0]!.cards);
  if (dealerPlays && live && !naturalOnly) {
    const drawn: CardCode[] = [];
    while (handValue(s.dealer).total < 17) {
      const c = shoe.draw();
      s.dealer.push(c);
      drawn.push(c);
    }
    s.log.push({ action: 'dealer', hand: null, cards: drawn });
  }
  if (s.dealerBlackjack === null) s.dealerBlackjack = isNatural(s.dealer);
  const dealer = handValue(s.dealer).total;
  const dealerNatural = isNatural(s.dealer);
  for (const h of s.hands) {
    const v = handValue(h.cards).total;
    const natural = !h.fromSplit && isNatural(h.cards);
    const stake = money(h.stake);
    let result: BjResult;
    let payout = money(0);
    if (v > 21) result = 'bust';
    else if (natural && dealerNatural) {
      result = 'push';
      payout = stake;
    } else if (natural) {
      result = 'blackjack';
      payout = stake.times(5).div(2);
    } else if (dealerNatural) result = 'lose';
    else if (dealer > 21 || v > dealer) {
      result = 'win';
      payout = stake.times(2);
    } else if (v === dealer) {
      result = 'push';
      payout = stake;
    } else result = 'lose';
    h.result = result;
    h.payout = creditString(payout);
    h.done = true;
  }
  s.phase = 'settled';
  s.position = shoe.position;
}

/** Replay a full hand from its seeds and recorded actions (verifier). */
export function replayBlackjack(
  seed: SeedInput,
  stake: string,
  actions: BjAction[],
  decks: number = BLACKJACK_RULES.decks,
): BjState {
  const shoe = new Shoe(seed, decks);
  const s = bjDeal(shoe, stake);
  for (const a of actions) bjApply(s, shoe, a);
  return s;
}

/** The player's actions recorded in a state's log (input for {@link replayBlackjack}). */
export function actionsOf(s: BjState): BjAction[] {
  const out: BjAction[] = [];
  for (const e of s.log) {
    if (e.action === 'insurance') out.push({ type: 'insurance', accept: true });
    else if (e.action === 'insurance_declined') out.push({ type: 'insurance', accept: false });
    else if (
      e.action === 'hit' ||
      e.action === 'stand' ||
      e.action === 'double' ||
      e.action === 'split'
    ) {
      out.push({ type: e.action });
    }
  }
  return out;
}
