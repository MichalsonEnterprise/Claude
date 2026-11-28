import type { Metadata } from 'next';

import { PromotionsPage } from '@/components/legal/support-promotions';

export const metadata: Metadata = {
  title: 'Promotions (DEMO)',
  description: 'Full terms of the welcome offer and other promotions (DEMO previews).',
};

export default function Page() {
  return <PromotionsPage />;
}
