import type { Metadata } from 'next';

import { MyFlipsPage } from '@/components/games/coinflip/my-flips';

export const metadata: Metadata = {
  title: 'My flips — Double Side · GLOBAL POOL',
  description: 'Your Double Side flips with seeds and nonces to verify them. DEMO credits only — no cash value.',
};

/** CF-04 — Double Side history (My flips). */
export default function DoubleSideMyFlipsPage() {
  return <MyFlipsPage />;
}
