import type { Metadata } from 'next';

import { WithdrawalTracker } from '@/components/wallet/withdrawal-status';
import { MemberGate } from '@/components/wallet/wallet-ui';

export const metadata: Metadata = {
  title: 'Withdrawal status',
  description: 'Live withdrawal status tracker (DEMO / testnet).',
};

/** WAL-22 Withdrawal status tracker. */
export default async function WithdrawalTrackerRoute({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return (
    <MemberGate>
      <WithdrawalTracker reference={decodeURIComponent(reference).toUpperCase()} />
    </MemberGate>
  );
}
