import type { Metadata } from 'next';

import { RouletteGame } from '@/components/games/roulette/roulette-game';

export const metadata: Metadata = {
  title: 'Pool Roulette — DEMO credits · GLOBAL POOL',
  description:
    'Pool Roulette: European single-zero roulette with inside and outside bets. Provably fair, 2.70% house edge on every bet. DEMO credits only — no cash value.',
};

/** RL-01 … RL-05, RL-09 — Pool Roulette play screen (DEMO credits only; pockets settle on the server from commit–reveal seeds). */
export default function PoolRoulettePage() {
  return <RouletteGame />;
}
