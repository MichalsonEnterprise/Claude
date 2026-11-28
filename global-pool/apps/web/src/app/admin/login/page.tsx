import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AdminLogin } from '@/components/admin-a/login';

export const metadata: Metadata = { title: 'Sign in' };

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLogin />
    </Suspense>
  );
}
