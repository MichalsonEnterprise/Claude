import type { Metadata } from 'next';

import { RouletteHistoryPage } from '@/components/games/roulette/roulette-pages';

export const metadata: Metadata = {
  title: 'My bets · Pool Roulette — DEMO credits · GLOBAL POOL',
  description: 'Your Pool Roulette spins with pockets, per-bet settlement and the seeds to verify them. DEMO credits only — no cash value.',
};

/** RL-06 — My spins (DEMO credits only). */
export default function PoolRouletteBetsPage() {
  return <RouletteHistoryPage />;
}
