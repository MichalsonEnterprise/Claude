import type { Metadata } from 'next';

import { MyHandsPage } from '@/components/games/blackjack/bj-pages';

export const metadata: Metadata = {
  title: 'My hands — Twenty-One · GLOBAL POOL',
  description: 'Your Twenty-One hands with seeds and nonces to verify them. DEMO credits only — no cash value.',
};

/** BJ-06 — Twenty-One history (My hands). */
export default function TwentyOneMyHandsPage() {
  return <MyHandsPage />;
}
