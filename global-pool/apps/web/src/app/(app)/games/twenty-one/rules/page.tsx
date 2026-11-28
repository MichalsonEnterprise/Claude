import type { Metadata } from 'next';

import { BjRulesPage } from '@/components/games/blackjack/bj-pages';

export const metadata: Metadata = {
  title: 'Rules & payouts — Twenty-One · GLOBAL POOL',
  description:
    'Twenty-One rules: 6 decks, dealer stands on soft 17, blackjack pays 3:2, double any two cards, split once, insurance pays 2:1. DEMO credits only.',
};

/** BJ-07 — Twenty-One rules & payouts. */
export default function TwentyOneRulesPage() {
  return <BjRulesPage />;
}
