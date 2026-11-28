import type { Metadata } from 'next';

import { TwoFactorPage } from '@/components/account/two-factor';

export const metadata: Metadata = { title: 'Two-factor authentication' };

/** USR-A3 Two-factor authentication (manage / enable via AUTH-07 setup / disable + reset with step-up). */
export default function Page() {
  return <TwoFactorPage />;
}
