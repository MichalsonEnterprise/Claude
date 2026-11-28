import { demoGame } from '@gp/shared/demo';
import type { Metadata } from 'next';

import { GameDetails } from '@/components/games/lobby/game-details';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const name = demoGame(slug)?.name ?? 'Game';
  return { title: `${name} — rules, house edge & limits · GLOBAL POOL` };
}

/** PUB-04 Game Details for every game (also those with a play screen): rules, house edge, limits, PF explainer. */
export default async function GameDetailsPage({ params }: { params: Params }) {
  const { slug } = await params;
  return <GameDetails slug={slug} />;
}
