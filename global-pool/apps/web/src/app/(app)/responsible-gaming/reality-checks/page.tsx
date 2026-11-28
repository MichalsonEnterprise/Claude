import type { Metadata } from 'next';

import { RgRealityChecks } from '@/components/rg-history/reality-check';

export const metadata: Metadata = { title: 'Reality checks · GLOBAL POOL' };

/** USR-RG5 — Reality-check settings (the reminder itself is mounted app-wide). */
export default function Page() {
  return <RgRealityChecks />;
}
