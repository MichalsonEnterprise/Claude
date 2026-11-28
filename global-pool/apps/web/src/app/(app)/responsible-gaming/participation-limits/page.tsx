import type { Metadata } from 'next';

import { RgParticipationLimits } from '@/components/rg-history/rg-limits';

export const metadata: Metadata = { title: 'Participation limits · GLOBAL POOL' };

/** USR-RG3 — Participation and loss limits. */
export default function Page() {
  return <RgParticipationLimits />;
}
