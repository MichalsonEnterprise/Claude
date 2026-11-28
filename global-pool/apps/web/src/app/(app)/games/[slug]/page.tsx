import { demoGame } from '@gp/shared/demo';
import type { Metadata } from 'next';

import { GameDetails } from '@/components/games/lobby/game-details';

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const name = demoGame(slug)?.name ?? 'Game';
  return { title: `${name} — rules, house edge & limits · GLOBAL POOL` };
}

/**
 * /games/<slug> for every game WITHOUT a play screen in this build (play screens are static routes such as
 * /games/pool-dice, which Next serves first): PUB-04 details with an honest "coming soon".
 */
export default async function GameFallbackPage({ params }: { params: Params }) {
  const { slug } = await params;
  return <GameDetails slug={slug} fallback />;
}
