import type { Metadata } from 'next';

import { RegionUnavailableRoute } from '@/components/compliance/gate-pages';

export const metadata: Metadata = { title: 'Not available in your region' };

/** PUB-21 as a page: the geo interstitial for a restricted location, or "available here" when permitted. */
export default function Page() {
  return <RegionUnavailableRoute />;
}
