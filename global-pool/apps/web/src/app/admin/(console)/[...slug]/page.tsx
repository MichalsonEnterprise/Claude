import type { Metadata } from 'next';

import { ModuleNotBuilt } from '@/components/admin-a/no-access';

export const metadata: Metadata = { title: 'Module not available' };

/** Unknown /admin/* paths (modules owned by other batches) render an honest state inside the admin shell. */
export default function AdminCatchAllRoute() {
  return <ModuleNotBuilt />;
}
