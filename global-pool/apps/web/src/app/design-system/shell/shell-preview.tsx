'use client';

import { DEMO_BALANCES, DEMO_CURRENT_ROUND, DEMO_GAMES } from '@gp/shared/demo';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { isGameArtKey } from '@/components/brand/game-art';
import { BalanceCard } from '@/components/domain/balance-card';
import { Countdown } from '@/components/domain/countdown';
import { GameTile } from '@/components/domain/game-tile';
import { JackpotMeter } from '@/components/domain/jackpot-meter';
import { AppShellFrame, DEMO_SHELL_MEMBER } from '@/components/shell/app-shell';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { DemoBadge } from '@/components/ui/demo-badge';
import { toast } from '@/components/ui/sonner';

const DEMO_NOW = '2026-11-27T16:42:18Z';

/** Full shell with representative content for responsive QA (no real auth — buttons show a toast). */
export function ShellPreview({
  auth,
  wrongNetwork,
  restricted,
}: {
  auth: 'guest' | 'member';
  wrongNetwork: boolean;
  restricted: boolean;
}) {
  const pathname = usePathname();
  const preview = () => toast({ type: 'info', title: 'Preview only', description: 'Sign-in is wired in the real (app) shell.' });
  const games = DEMO_GAMES.filter((g) => isGameArtKey(g.slug));
  return (
    <AppShellFrame
      auth={auth}
      member={auth === 'member' ? DEMO_SHELL_MEMBER : null}
      pathname={pathname === '/design-system/shell' ? '/' : pathname}
      onSignIn={preview}
      onSignUp={preview}
      onSignOut={preview}
      wrongNetwork={wrongNetwork}
      restricted={restricted}
    >
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-1 gap-4 laptop:grid-cols-[minmax(0,1fr)_360px]">
          <Card variant="gold" radius="xl" padding="l" className="justify-between">
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-overline uppercase text-text-gold">
                Global Pool · Round #1,248 <DemoBadge size="s" />
              </p>
              <h1 className="text-h2 laptop:text-h1">One global pool. Every entry verifiable.</h1>
              <p className="text-body-m text-text-secondary">Closes 27 Nov 2026, 20:00 UTC · 3,412 participants</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="gold" size="l" disabled={restricted}>
                Participate
              </Button>
              <Button variant="ghost" size="l">
                How it works
              </Button>
            </div>
            <p className="text-caption text-text-tertiary">
              Entry 10.00 + fee 0.05 USDT · 18+ · You can lose your stake · Terms apply
            </p>
          </Card>
          <Card padding="l" className="gap-4">
            <CardHeader>
              <CardTitle>Global Pool</CardTitle>
            </CardHeader>
            <JackpotMeter amount={DEMO_CURRENT_ROUND.poolBalance ?? '0.00'} live demo caption="Platform fees (932.00 USDT) are not part of the pool." />
            <Countdown closesAt={DEMO_CURRENT_ROUND.closesAt} demoNow={DEMO_NOW} />
            <Button size="l" block disabled={restricted}>
              Enter round
            </Button>
          </Card>
        </div>
        <section className="flex flex-col gap-3">
          <h2 className="text-h5">GLOBAL POOL Originals</h2>
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 tablet:mx-0 tablet:px-0">
            {games.map((g) =>
              isGameArtKey(g.slug) ? (
                <GameTile
                  key={g.id}
                  game={g.slug}
                  name={g.name}
                  subtitle={g.category === 'jackpot' ? 'JACKPOT ROUNDS' : 'GLOBAL POOL ORIGINAL'}
                  href={`/games/${g.slug}`}
                  edgeLabel={g.edgeLabel}
                  players={g.players}
                  restricted={restricted}
                />
              ) : null,
            )}
          </div>
        </section>
        {auth === 'member' && (
          <section className="grid grid-cols-1 gap-4 tablet:grid-cols-2 laptop:grid-cols-4">
            <BalanceCard type="available" amount={DEMO_BALANCES.available} total={DEMO_BALANCES.total} demo />
            <BalanceCard type="locked" amount={DEMO_BALANCES.locked} total={DEMO_BALANCES.total} demo />
            <BalanceCard type="pending" amount={DEMO_BALANCES.pending} total={DEMO_BALANCES.total} demo />
            <BalanceCard type="owed" amount={DEMO_BALANCES.owed} total={DEMO_BALANCES.total} demo />
          </section>
        )}
      </div>
    </AppShellFrame>
  );
}
