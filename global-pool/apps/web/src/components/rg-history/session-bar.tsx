'use client';

import type { RgLimitView, RgSessionView } from '@gp/shared/schemas';
import { formatDuration } from '@gp/shared/format';
import { PauseCircle, ShieldCheck, Timer } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { AgeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { cn } from '@/lib/utils';

import { num, ratio, signed, toneOf } from './format';
import { Meter } from './ui';

/** Seconds since an absolute ISO time, ticking every second (real clock — never a fake timer). */
export function useElapsed(startedAt: string | null): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
}

/** RG/Session Bar: session time · net this session · daily loss limit meter · 18+ · RG · Take a break. */
export function SessionBar({
  session,
  lossLimit,
  demo = true,
  className,
}: {
  session: RgSessionView;
  lossLimit?: RgLimitView;
  demo?: boolean;
  className?: string;
}) {
  const elapsed = useElapsed(session.startedAt);
  const share = lossLimit ? ratio(lossLimit.used, lossLimit.limit) : 0;
  const reached = share >= 1 || session.blockedReason !== null;
  const approaching = !reached && share >= 0.8;
  return (
    <section
      aria-label="Your session"
      className={cn(
        'flex flex-col gap-4 rounded-lg border bg-surface-default p-4 laptop:flex-row laptop:items-center laptop:gap-6 laptop:px-5',
        reached
          ? 'border-border-danger'
          : approaching
            ? 'border-status-warning'
            : 'border-border-subtle',
        className,
      )}
    >
      <div className="grid flex-1 grid-cols-2 gap-4 tablet:flex tablet:items-center tablet:gap-8">
        <div className="flex items-center gap-2">
          <Timer aria-hidden className="size-4 text-icon-muted" />
          <div className="flex flex-col">
            <span className="text-caption text-text-tertiary">Session</span>
            {session.startedAt ? (
              <span className="font-mono text-mono-m text-text-primary tabular-nums">
                {formatDuration(elapsed)}
              </span>
            ) : (
              <span className="text-body-s-strong whitespace-nowrap text-text-secondary">
                Not playing
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-caption text-text-tertiary">Net this session</span>
          <span className={cn('text-number-s tabular-nums', toneOf(session.netSession))}>
            {signed(session.netSession)} USDT
          </span>
        </div>
        {lossLimit && (
          <div className="col-span-2 flex min-w-0 flex-col gap-1.5 tablet:w-64">
            <span className="text-caption text-text-tertiary">Daily loss limit</span>
            <div className="flex items-center gap-2">
              <span className="text-body-s-strong whitespace-nowrap text-text-primary tabular-nums">
                {num(lossLimit.used)} / {num(lossLimit.limit)} USDT
              </span>
              {demo && <DemoBadge size="xs" />}
            </div>
            <Meter value={share} label="Daily loss limit used" />
          </div>
        )}
      </div>
      {reached && (
        <p role="status" className="text-body-s text-text-danger">
          New bets are paused until 00:00 UTC.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <AgeBadge />
        {reached ? (
          <Button variant="secondary" size="s" asChild className="min-h-11 tablet:min-h-8">
            <Link href="/responsible-gaming">View limits</Link>
          </Button>
        ) : (
          <Button variant="ghost" size="s" asChild className="min-h-11 tablet:min-h-8">
            <Link href="/responsible-gaming">
              <ShieldCheck aria-hidden />
              Responsible gaming
            </Link>
          </Button>
        )}
        <Button variant="secondary" size="s" asChild className="min-h-11 tablet:min-h-8">
          <Link href="/responsible-gaming/cooling-off">
            <PauseCircle aria-hidden />
            Take a break
          </Link>
        </Button>
      </div>
    </section>
  );
}
