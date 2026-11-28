import type { Metadata } from 'next';

import { WhitelistPage } from '@/components/wallet/addresses';
import { MemberGate } from '@/components/wallet/wallet-ui';

export const metadata: Metadata = {
  title: 'Address whitelist',
  description: 'Withdrawal addresses with a 24 h new-address cool-down (DEMO / testnet).',
};

/** WAL-23 Whitelisted addresses (add with 24 h cool-down, remove — both need step-up 2FA). */
export default function WhitelistRoute() {
  return (
    <MemberGate>
      <WhitelistPage />
    </MemberGate>
  );
}
