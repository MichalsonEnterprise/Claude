/**
 * @gp/shared/fair — provably-fair engine for GLOBAL POOL games (DEMO credits only, no cash value).
 *
 * One HMAC-SHA256 byte stream (`stream.ts`) feeds pure, integer-only rule functions per game (`games/*`). The API
 * settles bets with these functions and the browser verifier re-derives them with the very same code.
 * Published formulas, house edges and limits: docs/GAMES.md. Test vectors: `vectors.json`.
 */
export * from './catalogue';
export * from './credits';
export * from './games';
export * from './play';
export * from './schemas';
export * from './stream';
export type { BjAction, BjActionType, BjHand, BjPhase, BjResult, BjState } from './games/blackjack';
export type { CrashPoint, LimboOutcome, LimboParams } from './games/crash';
export type { DiceCondition, DiceOutcome, DiceParams } from './games/dice';
export type { CoinSide, CoinflipOutcome, CoinflipParams } from './games/coinflip';
export type { HiloCall, HiloState, HiloStep } from './games/hilo';
export type { KenoOutcome, KenoParams, KenoRisk } from './games/keno';
export type { MinesState } from './games/mines';
export type { PlinkoOutcome, PlinkoParams, PlinkoRisk } from './games/plinko';
export type { RouletteBet, RouletteBetType, RouletteOutcome } from './games/roulette';
export type { WheelOutcome, WheelParams, WheelRisk } from './games/wheel';
