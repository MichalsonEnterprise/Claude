import type { Metadata } from 'next';
import { Suspense } from 'react';

import { UsersListPage } from '@/components/admin-a/users-list';

export const metadata: Metadata = { title: 'Users' };

export default function AdminUsersRoute() {
  return (
    <Suspense>
      <UsersListPage />
    </Suspense>
  );
}
