import type { Metadata } from 'next';

import { RgDepositLimits } from '@/components/rg-history/rg-limits';

export const metadata: Metadata = { title: 'Deposit limits · GLOBAL POOL' };

/** USR-RG2 — Deposit limits (incl. 24 h cool-down on increases). */
export default function Page() {
  return <RgDepositLimits />;
}
