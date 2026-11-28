import type { Metadata } from 'next';

import { AgeRestrictedPage } from '@/components/compliance/age-gate';

export const metadata: Metadata = { title: 'You must be 18+' };

/** PUB-22 failure / ERR-05 age state: the "You must be 18+" exit page with help resources. */
export default function Page() {
  return <AgeRestrictedPage />;
}
