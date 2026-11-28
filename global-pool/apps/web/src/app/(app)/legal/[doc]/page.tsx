import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { InfoPage } from '@/components/legal/info-page';
import { LEGAL_DOC_KEYS, isLegalDocKey, legalDoc } from '@/components/legal/legal-docs';
import { RegionCheck } from '@/components/legal/region-check';

type Params = Promise<{ doc: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_DOC_KEYS.map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { doc } = await params;
  if (!isLegalDocKey(doc)) return {};
  const d = legalDoc(doc);
  return { title: `${d.title} (DEMO)`, description: d.description };
}

/**
 * /legal/terms · privacy · aml · aml-kyc · restricted-countries · licence · fees · cookies — the documents the
 * consent checkboxes, KYC flow, footer and licence card link to (DEMO summaries of this testnet build).
 */
export default async function LegalPage({ params }: { params: Params }) {
  const { doc } = await params;
  if (!isLegalDocKey(doc)) notFound();
  const d = legalDoc(doc);
  return (
    <InfoPage
      crumb={{ label: 'Legal', href: '/legal/terms' }}
      title={d.title}
      intro={d.intro}
      sections={d.sections}
      related={d.related}
    >
      {doc === 'restricted-countries' && <RegionCheck />}
    </InfoPage>
  );
}
