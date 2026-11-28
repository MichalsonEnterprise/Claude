import type { Metadata } from 'next';

import { Winnings } from '@/components/rg-history/gaming';

export const metadata: Metadata = { title: 'My winnings · GLOBAL POOL' };

/** USR-G5 — Winnings with settlement status. */
export default function Page() {
  return <Winnings />;
}
