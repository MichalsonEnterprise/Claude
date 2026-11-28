import type { Metadata } from 'next';

import { AntiPhishingPage } from '@/components/account/anti-phishing';

export const metadata: Metadata = { title: 'Anti-phishing code' };

/** USR-A10 Anti-phishing code (change with step-up 2FA). */
export default function Page() {
  return <AntiPhishingPage />;
}
