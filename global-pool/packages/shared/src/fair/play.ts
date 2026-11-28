/**
 * One entry point per bet type so the API and the browser verifier run the SAME code:
 * - {@link playInstant} settles an instant game from its seeds and parameters;
 * - {@link verifyBet} re-derives any recorded bet (instant, stateful or crash) from the revealed seeds.
 */
import { money } from '../money';
import { FAIR_GAMES, type FairGameSlug } from './catalogue';
import { creditString, parseStake } from './credits';
import { blackjack, coinflip, crash, dice, hilo, keno, mines, plinko, roulette, wheel } from './games';
import { FairError, verifyServerSeed, type SeedInput } from './stream';

export interface InstantResult {
  /** Total stake taken from the DEMO credit balance. */
  stake: string;
  /** Total returned (stake + winnings) or 0.00. */
  payout: string;
  /** Effective multiplier payout ÷ stake (4 dp) — for history rows. */
  multiplier: string;
  win: boolean;
  outcome: Record<string, unknown>;
}

const ratio = (payout: string, stake: string) =>
  money(stake).isZero() ? '0.0000' : money(payout).div(money(stake)).toDecimalPlaces(4, 1).toFixed(4);

/** Settle one instant bet (pure). Throws FairError for invalid parameters or limits. */
export function playInstant(
  slug: FairGameSlug,
  seed: SeedInput,
  params: Record<string, unknown>,
  stakeInput: string | undefined,
): InstantResult {
  const info = FAIR_GAMES[slug];
  const stakeOf = () => {
    if (stakeInput === undefined) throw new FairError('Stake is required', 'INVALID_STAKE');
    return creditString(parseStake(stakeInput, info.minBet, info.maxBet));
  };
  const done = (stake: string, payout: string, outcome: object): InstantResult => ({
    stake,
    payout,
    multiplier: ratio(payout, stake),
    win: money(payout).gt(0),
    outcome: outcome as Record<string, unknown>,
  });
  switch (slug) {
    case 'pool-dice': {
      const stake = stakeOf();
      const o = dice.playDice(seed, params as unknown as dice.DiceParams);
      return done(stake, dice.dicePayout(stake, o), o);
    }
    case 'double-side': {
      const stake = stakeOf();
      const o = coinflip.playCoinflip(seed, params as unknown as coinflip.CoinflipParams);
      return done(stake, coinflip.coinflipPayout(stake, o), o);
    }
    case 'pool-roulette': {
      const bets = (params as { bets?: roulette.RouletteBet[] }).bets ?? [];
      const total = creditString(roulette.validateRouletteBets(bets));
      if (stakeInput !== undefined && !money(stakeInput).eq(money(total))) {
        throw new FairError('Stake must equal the sum of the bets on the slip', 'INVALID_STAKE');
      }
      const o = roulette.playRoulette(seed, bets);
      return done(total, roulette.roulettePayout(o), o);
    }
    case 'skyline': {
      const stake = stakeOf();
      const o = crash.playLimbo(seed, params as unknown as crash.LimboParams);
      return done(stake, crash.limboPayout(stake, o), o);
    }
    case 'fortune-ring': {
      const stake = stakeOf();
      const o = wheel.playWheel(seed, params as unknown as wheel.WheelParams);
      return done(stake, wheel.wheelPayout(stake, o), o);
    }
    case 'pool-keno': {
      const stake = stakeOf();
      const o = keno.playKeno(seed, params as unknown as keno.KenoParams);
      return done(stake, keno.kenoPayout(stake, o), o);
    }
    case 'pinfall': {
      const stake = stakeOf();
      const o = plinko.playPlinko(seed, params as unknown as plinko.PlinkoParams);
      return done(stake, plinko.plinkoPayout(stake, o), o);
    }
    default:
      throw new FairError(`${info.name} is not an instant game`, 'INVALID_GAME');
  }
}

/** Everything needed to re-derive a recorded bet. */
export interface VerifyInput {
  slug: FairGameSlug;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  stake: string;
  /** Instant: the bet params. Stateful: mines { mines, picks, cashedOut } · hi-lo { actions, cashedOut } ·
   *  blackjack { actions, decks }. Crash: { salt, chainIndex, chainCommitment? }. */
  params: Record<string, unknown>;
}

export interface VerifyResult {
  /** sha256(serverSeed) equals the commitment shown before play. */
  commitmentValid: boolean;
  /** Recomputed outcome (same shape as the stored outcome). */
  outcome: Record<string, unknown>;
  payout: string;
}

export function verifyBet(input: VerifyInput): VerifyResult {
  const seed: SeedInput = { serverSeed: input.serverSeed, clientSeed: input.clientSeed, nonce: input.nonce };
  const commitmentValid = verifyServerSeed(input.serverSeed, input.serverSeedHash);
  const p = input.params;
  switch (input.slug) {
    case 'vault-sweeper': {
      const r = mines.replayMines(
        seed,
        Number(p.mines),
        input.stake,
        (p.picks as number[]) ?? [],
        Boolean(p.cashedOut),
      );
      return { commitmentValid, outcome: r as unknown as Record<string, unknown>, payout: r.payout };
    }
    case 'high-card': {
      const r = hilo.replayHilo(
        seed,
        input.stake,
        (p.actions as (hilo.HiloCall | 'skip')[]) ?? [],
        Boolean(p.cashedOut),
      );
      return { commitmentValid, outcome: r as unknown as Record<string, unknown>, payout: r.payout };
    }
    case 'twenty-one': {
      const r = blackjack.replayBlackjack(
        seed,
        input.stake,
        (p.actions as blackjack.BjAction[]) ?? [],
        typeof p.decks === 'number' ? p.decks : blackjack.BLACKJACK_RULES.decks,
      );
      return { commitmentValid, outcome: r as unknown as Record<string, unknown>, payout: r.totalPayout };
    }
    case 'orbit-rush': {
      const cp = crash.crashPointOf(input.serverSeed, String(p.salt ?? input.clientSeed));
      const chainOk =
        typeof p.chainIndex === 'number' && typeof p.chainCommitment === 'string'
          ? crash.verifyChainSeed(input.serverSeed, p.chainIndex, p.chainCommitment)
          : true;
      return {
        commitmentValid: commitmentValid && chainOk,
        outcome: { ...cp },
        payout: '0.00',
      };
    }
    default: {
      const r = playInstant(input.slug, seed, p, input.slug === 'pool-roulette' ? undefined : input.stake);
      return { commitmentValid, outcome: r.outcome, payout: r.payout };
    }
  }
}
