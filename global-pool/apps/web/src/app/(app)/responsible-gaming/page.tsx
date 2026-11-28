import type { Metadata } from 'next';

import { RgHub } from '@/components/rg-history/rg-hub';

export const metadata: Metadata = { title: 'Responsible gaming · GLOBAL POOL' };

/** USR-RG1 — Responsible gaming hub. */
export default function ResponsibleGamingPage() {
  return <RgHub />;
}
