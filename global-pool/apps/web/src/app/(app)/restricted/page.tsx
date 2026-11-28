import type { Metadata } from 'next';

import { RestrictedIndex } from '@/components/auth/restricted';

export const metadata: Metadata = { title: 'Account status' };

/** /restricted → redirects to the page for the current account gate (AUTH-18). */
export default function Page() {
  return <RestrictedIndex />;
}
