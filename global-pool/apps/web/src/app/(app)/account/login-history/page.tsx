import type { Metadata } from 'next';

import { LoginHistoryPage } from '@/components/account/login-history';

export const metadata: Metadata = { title: 'Login history' };

/** USR-A6 Login history (sign-ins, flagged review, CSV export). */
export default function Page() {
  return <LoginHistoryPage />;
}
