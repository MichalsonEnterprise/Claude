import type { Metadata } from 'next';

import { RouletteFairnessPage } from '@/components/games/roulette/roulette-pages';

export const metadata: Metadata = {
  title: 'Verify a spin · Pool Roulette — GLOBAL POOL',
  description: 'Recompute any Pool Roulette spin in your browser from its committed server seed, client seed and nonce.',
};

/** RL-08 — Provably-fair verification of one spin (browser re-derivation with @gp/shared/fair). */
export default function PoolRouletteFairnessPage() {
  return <RouletteFairnessPage />;
}
