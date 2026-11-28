'use client';

import { formatDateTimeUTC, formatDuration } from '@gp/shared/format';
import { History, PauseCircle, ShieldCheck, SlidersHorizontal, Timer, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { useElapsed } from '@/components/rg-history/session-bar';
import { AgeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import type { DemoCreditsView } from '@/lib/api/games';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

import { CreditsAmount, KitMeter, KvRow, credits as fmt } from './parts';
import { GAMES_ROUTES } from './registry';
import type { DemoLossLimit } from './use-game-gate';

type BarState = 'normal' | 'approaching' | 'reached';

function barState(loss: DemoLossLimit | null, blocked: boolean): BarState {
  if (blocked || (loss && loss.used !== null && loss.share >= 1)) return 'reached';
  if (loss && loss.used !== null && loss.share >= 0.8) return 'approaching';
  return 'normal';
}

const PERIOD: Record<DemoLossLimit['period'], string> = {
  day: 'Daily',
  week: 'Weekly',
  month: 'Monthly',
};

function SessionDetails({
  session,
  loss,
  elapsed,
  state,
}: {
  session: DemoCreditsView['session'];
  loss: DemoLossLimit | null;
  elapsed: number;
  state: BarState;
}) {
  return (
    <div className="flex flex-col gap-3">
      <KvRow
        label="Started"
        value={session.startedAt ? `${formatDateTimeUTC(session.startedAt)}` : 'Not playing'}
      />
      <KvRow label="Time played" value={formatDuration(elapsed)} />
      <KvRow label="Bets this session" value={String(session.bets)} />
      <KvRow
        label="Net result"
        value={<CreditsAmount value={session.net} signed tone="net" />}
        demo
      />
      <KvRow
        label="Today (UTC)"
        value={<CreditsAmount value={session.today.net} signed tone="net" />}
        demo
      />
      {loss && (
        <div className="flex flex-col gap-1.5">
          <KvRow
            label={`${PERIOD[loss.period]} loss limit used`}
            value={
              loss.used !== null
                ? `${fmt(loss.used)} / ${fmt(loss.limit)}`
                : `limit ${fmt(loss.limit)}`
            }
            valueClassName={state === 'approaching' ? 'text-text-warning' : state === 'reached' ? 'text-text-danger' : undefined}
          />
          {loss.used !== null && <KitMeter value={loss.share} label="Loss limit used" />}
          <p className="text-caption text-text-tertiary">
            DEMO play is counted separately from USDT, in DEMO credits.
            {loss.resetsAt ? ` Resets ${formatDateTimeUTC(loss.resetsAt)}.` : ''} Lowering a limit
            applies now; raising it waits 24 h.
          </p>
        </div>
      )}
      {state === 'approaching' && (
        <div className="flex items-start gap-2 rounded-md border border-status-warning bg-status-warning-tint p-3 text-body-s text-text-primary">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-text-warning" />
          <p>
            <strong>You’re close to your loss limit.</strong> This is a good moment for a break.
          </p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="s" asChild className="min-h-11 tablet:min-h-8">
          <Link href={GAMES_ROUTES.coolingOff}>
            <PauseCircle aria-hidden />
            Take a break
          </Link>
        </Button>
        <Button variant="ghost" size="s" asChild className="min-h-11 tablet:min-h-8">
          <Link href={GAMES_ROUTES.responsibleGaming}>
            <SlidersHorizontal aria-hidden />
            Set limits
          </Link>
        </Button>
        <Button variant="ghost" size="s" asChild className="min-h-11 tablet:min-h-8">
          <Link href={GAMES_ROUTES.history}>
            <History aria-hidden />
            Session history
          </Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * GM-01 RG/Session Bar for games: session time (real clock from the server session start), net this session and the
 * loss-limit meter in DEMO credits, 18+, Responsible gaming and Take a break — always visible, never collapsed by
 * default. Desktop: one bar + "Session details" popover; mobile: compact strip + bottom sheet.
 */
export function GameSessionBar({
  data,
  lossLimit,
  loading = false,
  className,
}: {
  data: DemoCreditsView | undefined;
  lossLimit: DemoLossLimit | null;
  loading?: boolean;
  className?: string;
}) {
  const desktop = useMediaQuery(MQ.tablet, true);
  const [open, setOpen] = React.useState(false);
  const session = data?.session;
  const elapsed = useElapsed(session?.startedAt ?? null);

  if (!session) {
    return loading ? <Skeleton className={cn('h-[76px] w-full rounded-xl', className)} /> : null;
  }
  const state = barState(lossLimit, session.blockedReason !== null && session.blockedReason !== 'excluded');
  const border =
    state === 'reached'
      ? 'border-border-danger'
      : state === 'approaching'
        ? 'border-status-warning'
        : 'border-border-subtle';

  const details = <SessionDetails session={session} loss={lossLimit} elapsed={elapsed} state={state} />;
  const detailsButton = (
    <Button variant="ghost" size="s" className="min-h-11 tablet:min-h-8" aria-haspopup="dialog">
      <Timer aria-hidden />
      Session details
    </Button>
  );

  if (!desktop) {
    return (
      <section
        aria-label="Your session"
        className={cn(
          'flex flex-col gap-2 rounded-lg border p-3',
          state === 'reached'
            ? 'border-border-danger bg-status-danger-tint'
            : state === 'approaching'
              ? 'border-status-warning bg-status-warning-tint'
              : 'border-border-subtle bg-surface-default',
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <Timer aria-hidden className="size-4 text-icon-muted" />
          <span className="font-mono text-mono-s text-text-primary tabular-nums">
            {session.startedAt ? formatDuration(elapsed) : '00:00:00'}
          </span>
          <span className="text-caption text-text-tertiary">Net</span>
          <span className="text-body-s-strong">
            <CreditsAmount value={session.net} signed tone="net" />
          </span>
          <DemoBadge size="xs" />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ml-auto inline-flex size-11 items-center justify-center rounded-md text-icon-default hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-border-focus"
            aria-label="Session details, limits and take a break"
          >
            <PauseCircle aria-hidden className="size-5" />
          </button>
        </div>
        {lossLimit && (
          <div className="flex items-center gap-2">
            <span className="text-caption text-text-tertiary">{PERIOD[lossLimit.period]} loss limit</span>
            <span
              className={cn(
                'text-caption',
                state === 'reached'
                  ? 'text-text-danger'
                  : state === 'approaching'
                    ? 'text-text-warning'
                    : 'text-text-secondary',
              )}
            >
              {lossLimit.used !== null ? `${fmt(lossLimit.used)} / ` : ''}
              {fmt(lossLimit.limit)} DEMO
            </span>
            {lossLimit.used !== null && (
              <KitMeter value={lossLimit.share} label="Loss limit used" className="ml-auto w-24" />
            )}
          </div>
        )}
        {state === 'reached' && (
          <p role="status" className="text-caption text-text-danger">
            New bets are paused. Your history and withdrawals stay available.
          </p>
        )}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="px-4 pt-3 pb-8">
            <SheetTitle className="mb-1 text-h4">This session</SheetTitle>
            <SheetDescription className="mb-4 text-body-s text-text-secondary">
              DEMO credits · no cash value
            </SheetDescription>
            {details}
          </SheetContent>
        </Sheet>
      </section>
    );
  }

  return (
    <section
      aria-label="Your session"
      className={cn(
        'flex flex-col gap-4 rounded-xl border bg-surface-default px-5 py-4 laptop:flex-row laptop:items-center laptop:gap-6',
        border,
        className,
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-2">
          <Timer aria-hidden className="size-5 text-icon-muted" />
          <div className="flex flex-col">
            <span className="text-caption text-text-tertiary">Session</span>
            <span className="font-mono text-mono-m text-text-primary tabular-nums" data-testid="session-time">
              {session.startedAt ? formatDuration(elapsed) : 'Not playing'}
            </span>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-caption text-text-tertiary">Net this session</span>
          <span className="text-number-s" data-testid="session-net">
            <CreditsAmount value={session.net} signed tone="net" />
          </span>
        </div>
        {lossLimit ? (
          <div className="flex min-w-48 flex-col gap-1.5">
            <span className="text-caption text-text-tertiary">{PERIOD[lossLimit.period]} loss limit</span>
            <span
              className={cn(
                'text-body-s-strong tabular-nums',
                state === 'reached'
                  ? 'text-text-danger'
                  : state === 'approaching'
                    ? 'text-text-warning'
                    : 'text-text-primary',
              )}
            >
              {lossLimit.used !== null ? `${fmt(lossLimit.used)} / ` : ''}
              {fmt(lossLimit.limit)} DEMO
            </span>
            {lossLimit.used !== null && <KitMeter value={lossLimit.share} label="Loss limit used" />}
          </div>
        ) : (
          <div className="flex flex-col">
            <span className="text-caption text-text-tertiary">Loss limit</span>
            <Link
              href={GAMES_ROUTES.responsibleGaming}
              className="text-body-s-strong text-text-brand underline-offset-4 hover:underline"
            >
              Set a loss limit
            </Link>
          </div>
        )}
        <DemoBadge size="s" />
      </div>
      {state === 'reached' && (
        <p role="status" className="text-body-s text-text-danger">
          New bets are paused. Your history and withdrawals stay available.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <AgeBadge />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{detailsButton}</PopoverTrigger>
          <PopoverContent align="end" className="w-[400px] p-5">
            <p className="mb-3 text-h5 text-text-primary">This session</p>
            {details}
          </PopoverContent>
        </Popover>
        <Button variant="ghost" size="s" asChild>
          <Link href={GAMES_ROUTES.responsibleGaming}>
            <ShieldCheck aria-hidden />
            Responsible gaming
          </Link>
        </Button>
        <Button variant="secondary" size="s" asChild>
          <Link href={GAMES_ROUTES.coolingOff}>
            <PauseCircle aria-hidden />
            Take a break
          </Link>
        </Button>
      </div>
    </section>
  );
}
