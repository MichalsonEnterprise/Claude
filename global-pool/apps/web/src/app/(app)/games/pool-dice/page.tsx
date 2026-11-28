import type { Metadata } from 'next';

import { DiceGame } from '@/components/games/dice/dice-game';

export const metadata: Metadata = {
  title: 'Pool Dice — DEMO credits · GLOBAL POOL',
  description:
    'Pool Dice: roll over or under a target from 0.00 to 99.99. Provably fair, 1.00% house edge. DEMO credits only — no cash value.',
};

/** DI-01 … DI-07 — Pool Dice (DEMO credits only; outcomes settle on the server from commit–reveal seeds). */
export default function PoolDicePage() {
  return <DiceGame />;
}
