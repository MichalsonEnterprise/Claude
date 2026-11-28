import type { Metadata } from 'next';

import { FeesPage } from '@/components/admin-b/finance/fees-page';

export const metadata: Metadata = { title: 'Platform fees · Finance' };

export default function Page() {
  return <FeesPage />;
}
