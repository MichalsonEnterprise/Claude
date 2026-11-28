import type { Metadata } from 'next';

import { RgCoolingOff } from '@/components/rg-history/rg-breaks';

export const metadata: Metadata = { title: 'Cooling-off period · GLOBAL POOL' };

/** USR-RG6 — Cooling-off break (choose / confirm / active). */
export default function Page() {
  return <RgCoolingOff />;
}
