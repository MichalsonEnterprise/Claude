import type { Metadata } from 'next';

import { PermissionsMatrixPage } from '@/components/admin-a/roles';

export const metadata: Metadata = { title: 'Permissions' };

export default function AdminPermissionsRoute() {
  return <PermissionsMatrixPage />;
}
