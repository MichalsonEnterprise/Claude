import type { Metadata } from 'next';

import { RgSelfExclusion } from '@/components/rg-history/rg-breaks';

export const metadata: Metadata = { title: 'Self-exclusion · GLOBAL POOL' };

/** USR-RG7 — Self-exclusion in 4 steps (period → consequences → confirm → active). */
export default function Page() {
  return <RgSelfExclusion />;
}
