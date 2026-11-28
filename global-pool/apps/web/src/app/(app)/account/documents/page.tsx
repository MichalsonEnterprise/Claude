import type { Metadata } from 'next';

import { DocumentsPage } from '@/components/account/documents';

export const metadata: Metadata = { title: 'Verification documents' };

/** USR-A5 Verification documents (metadata only). */
export default function Page() {
  return <DocumentsPage />;
}
