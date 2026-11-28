import type { Metadata } from 'next';
import { Suspense } from 'react';

import { WithdrawFlow } from '@/components/wallet/withdraw-flow';
import { MemberGate } from '@/components/wallet/wallet-ui';

export const metadata: Metadata = {
  title: 'Withdraw USDT',
  description:
    'Withdraw USDT in 9 steps: network fee shown separately, platform fee 0.00, step-up 2FA (DEMO / testnet).',
};

/** WAL-10…19 Withdraw flow · MOB-07 (bottom sheet on mobile). */
export default function WithdrawPage() {
  return (
    <MemberGate>
      <Suspense>
        <WithdrawFlow />
      </Suspense>
    </MemberGate>
  );
}
