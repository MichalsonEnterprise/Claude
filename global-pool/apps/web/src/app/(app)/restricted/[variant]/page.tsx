import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { RestrictedScreen } from '@/components/auth/restricted';
import { RESTRICTED_VARIANTS, type RestrictedVariant } from '@/components/auth/restricted-variants';

export const metadata: Metadata = { title: 'Account status' };

/** AUTH-18 restricted account: /restricted/suspended · under-review · self-excluded · region. */
export default async function Page({ params }: { params: Promise<{ variant: string }> }) {
  const { variant } = await params;
  if (!(RESTRICTED_VARIANTS as readonly string[]).includes(variant)) notFound();
  return <RestrictedScreen variant={variant as RestrictedVariant} />;
}
