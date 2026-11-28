import type { Metadata } from 'next';

import { PrizesPage } from '@/components/pool/prizes-page';

export const metadata: Metadata = {
  title: 'Global Pool prize distribution — 13 prizes per round (DEMO)',
  description:
    '1st 50% · 2nd 20% · 3rd 10% · 10 runner-ups 2% each — 100% of the pool is paid out; platform fees are never part of it. DEMO / testnet only.',
};

/** GP-11 Prize distribution breakdown. */
export default function Page() {
  return <PrizesPage />;
}
