import type { Metadata } from 'next';
import { Suspense } from 'react';

import { DepositFlow } from '@/components/wallet/deposit-flow';
import { MemberGate } from '@/components/wallet/wallet-ui';

export const metadata: Metadata = {
  title: 'Deposit USDT',
  description:
    'Deposit test USDT on Arbitrum Sepolia in 7 steps — no deposit fee (DEMO / testnet).',
};

/** WAL-03…09 Deposit flow · MOB-06 (bottom sheet on mobile). */
export default function DepositPage() {
  return (
    <MemberGate>
      <Suspense>
        <DepositFlow />
      </Suspense>
    </MemberGate>
  );
}
