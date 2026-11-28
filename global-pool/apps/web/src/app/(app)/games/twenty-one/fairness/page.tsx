import type { Metadata } from 'next';
import { Suspense } from 'react';

import { BjFairnessPage } from '@/components/games/blackjack/bj-fairness';

export const metadata: Metadata = {
  title: 'Fairness — Twenty-One · GLOBAL POOL',
  description: 'Re-create any Twenty-One shoe card by card from the revealed seed. DEMO credits only — no cash value.',
};

/** BJ-08 — Twenty-One provably-fair verification (shoe order re-derived in the browser). */
export default function TwentyOneFairnessPage() {
  return (
    <Suspense>
      <BjFairnessPage />
    </Suspense>
  );
}
