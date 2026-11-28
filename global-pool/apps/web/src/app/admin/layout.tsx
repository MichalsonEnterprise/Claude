import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AdminSessionProvider } from '@/components/admin-a/session';

export const metadata: Metadata = {
  title: { default: 'Admin console', template: '%s · Admin · GLOBAL POOL' },
  robots: { index: false, follow: false },
};

/**
 * Admin app (separate product shell, owner decision #3): its own session (email + password + TOTP, no Privy).
 * /admin/login renders without the shell; every other admin page lives in the (console) group.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminSessionProvider>{children}</AdminSessionProvider>;
}
