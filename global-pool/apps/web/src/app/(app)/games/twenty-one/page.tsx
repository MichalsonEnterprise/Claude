import type { Metadata } from 'next';

import { TwentyOneGame } from '@/components/games/blackjack/bj-game';

export const metadata: Metadata = {
  title: 'Twenty-One — DEMO credits · GLOBAL POOL',
  description:
    'Twenty-One: classic blackjack against the dealer, 6 decks, dealer stands on soft 17, blackjack pays 3:2. Provably fair, house edge ≈ 0.50 % with basic strategy. DEMO credits only — no cash value.',
};

/** BJ-01 … BJ-05, BJ-09 — Twenty-One (DEMO credits only; every hand is dealt and settled on the server). */
export default function TwentyOnePage() {
  return <TwentyOneGame />;
}
