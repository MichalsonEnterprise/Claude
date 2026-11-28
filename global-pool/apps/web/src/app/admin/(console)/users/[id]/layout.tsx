import type { ReactNode } from 'react';

import { UserDetailLayout } from '@/components/admin-a/user-detail';

/** The player id comes from the URL (useParams inside the client layout). */
export default function AdminUserLayout({ children }: { children: ReactNode }) {
  return <UserDetailLayout>{children}</UserDetailLayout>;
}
