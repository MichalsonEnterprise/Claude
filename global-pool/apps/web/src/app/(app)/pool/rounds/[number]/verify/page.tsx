import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { VerifyPage } from '@/components/pool/verify-page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  return {
    title: `Verify Global Pool round #${number} — re-derive the winners (DEMO)`,
    description:
      'Re-derive a Global Pool draw in your browser from its random word and entry list. Nothing is sent to GLOBAL POOL. DEMO / testnet only.',
  };
}

/** GP-12 Provably fair verification (verified / failed / unavailable). */
export default async function Page({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1) notFound();
  return <VerifyPage number={n} />;
}
