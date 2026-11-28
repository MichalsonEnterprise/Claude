import { DEMO_CURRENT_ROUND, DEMO_GAMES } from '@gp/shared/demo';
import Link from 'next/link';

import { isGameArtKey } from '@/components/brand/game-art';
import { GameTile } from '@/components/domain/game-tile';
import { JackpotMeter } from '@/components/domain/jackpot-meter';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';

/**
 * Lobby placeholder — the homepage agent replaces this with PUB-01 (hero carousel, pool live, rows, …).
 * It only proves the shell + design system render together.
 */
export default function LobbyPage() {
  const originals = DEMO_GAMES.filter((g) => isGameArtKey(g.slug)).slice(0, 7);
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4 rounded-xl border border-border-gold bg-surface-default bg-gradient-gold-tint p-6 laptop:flex-row laptop:items-center laptop:justify-between">
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-2 text-overline uppercase text-text-gold">
            Global Pool · Round #1,248 <DemoBadge size="s" />
          </p>
          <h1 className="text-h2 laptop:text-h1">One global pool. Every entry verifiable.</h1>
          <p className="text-body-m text-text-secondary">
            Entry 10.00 USDT + 0.05 USDT platform fee · 18+ · You can lose your stake.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <JackpotMeter amount={DEMO_CURRENT_ROUND.poolBalance ?? '0.00'} live demo />
          <Button variant="gold" size="l" asChild>
            <Link href="/pool">Participate</Link>
          </Button>
        </div>
      </section>
      <section aria-labelledby="originals" className="flex flex-col gap-3">
        <h2 id="originals" className="text-h5">
          GLOBAL POOL Originals
        </h2>
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 tablet:mx-0 tablet:px-0">
          {originals.map((g) =>
            isGameArtKey(g.slug) ? (
              <GameTile
                key={g.id}
                game={g.slug}
                name={g.name}
                subtitle={g.category === 'jackpot' ? 'JACKPOT ROUNDS' : 'GLOBAL POOL ORIGINAL'}
                href={g.category === 'jackpot' ? '/pool' : `/games/${g.slug}`}
                edgeLabel={g.edgeLabel}
                players={g.players}
                tag={g.category === 'jackpot' ? 'live' : undefined}
              />
            ) : null,
          )}
        </div>
      </section>
      <p className="text-body-s text-text-tertiary">
        Component catalogue: <Link className="text-text-brand underline" href="/design-system">/design-system</Link>
      </p>
    </div>
  );
}
