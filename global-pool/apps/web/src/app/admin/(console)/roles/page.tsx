import type { Metadata } from 'next';

import { RolesPage } from '@/components/admin-a/roles';

export const metadata: Metadata = { title: 'Admin roles' };

export default function AdminRolesRoute() {
  return <RolesPage />;
}
