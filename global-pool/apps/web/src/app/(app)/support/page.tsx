import type { Metadata } from 'next';

import { SupportPage } from '@/components/legal/support-promotions';

export const metadata: Metadata = {
  title: 'Support (DEMO)',
  description: 'Help with deposits, withdrawals, account security and responsible gaming.',
};

export default function Page() {
  return <SupportPage />;
}
