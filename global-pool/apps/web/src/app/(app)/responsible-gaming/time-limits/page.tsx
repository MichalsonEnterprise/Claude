import type { Metadata } from 'next';

import { RgTimeLimits } from '@/components/rg-history/rg-limits';

export const metadata: Metadata = { title: 'Time limits · GLOBAL POOL' };

/** USR-RG4 — Daily time limit, session length, quiet hours. */
export default function Page() {
  return <RgTimeLimits />;
}
