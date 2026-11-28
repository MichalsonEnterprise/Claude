import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { RoundPage } from '@/components/pool/round-page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}): Promise<Metadata> {
  const { number } = await params;
  return {
    title: `Global Pool round #${number} — draw, results and refunds (DEMO)`,
    description:
      'Round status, Chainlink VRF draw progress, winners and prize distribution, or refunds for a cancelled round. DEMO / testnet only.',
  };
}

/** GP-05 drawing · GP-06 your result · GP-07 public results · GP-09 round detail / cancelled → refunds · GP-13. */
export default async function Page({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1) notFound();
  return <RoundPage number={n} />;
}
