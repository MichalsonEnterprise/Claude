import type { Metadata } from 'next';

import { RouletteRulesPage } from '@/components/games/roulette/roulette-pages';

export const metadata: Metadata = {
  title: 'Rules & payouts · Pool Roulette — GLOBAL POOL',
  description: 'European single-zero roulette: where each bet goes, payouts, limits and the 2.70% house edge on every bet. DEMO credits only.',
};

/** RL-07 — Rules & payouts (computed from @gp/shared/fair). */
export default function PoolRouletteRulesPage() {
  return <RouletteRulesPage />;
}
