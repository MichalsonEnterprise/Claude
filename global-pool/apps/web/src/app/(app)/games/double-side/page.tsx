import type { Metadata } from 'next';

import { CoinflipGame } from '@/components/games/coinflip/coinflip-game';

export const metadata: Metadata = {
  title: 'Double Side — DEMO credits · GLOBAL POOL',
  description:
    'Double Side: call Heads or Tails, 50.00% each, a correct call pays 1.96×. Provably fair, 2.00% house edge. DEMO credits only — no cash value.',
};

/** CF-01 … CF-03, CF-06 — Double Side (DEMO credits only; every side settles on the server from commit–reveal seeds). */
export default function DoubleSidePage() {
  return <CoinflipGame />;
}
