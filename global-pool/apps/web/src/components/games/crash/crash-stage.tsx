'use client';

import { formatDateTimeUTC } from '@gp/shared/format';
import { money } from '@gp/shared/money';
import { CircleCheck, CircleX, Clock, RefreshCw, ShieldCheck, WifiOff } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { CreditsAmount } from '@/components/games/kit';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import type { CrashMyBet } from '@/lib/api/orbit-rush';
import { cn } from '@/lib/utils';

import { fmtX, secondsLeft } from './crash-math';
import { CardShell, PhasePill, type PhasePillKind } from './crash-parts';
import { CRASH_ROUTES } from './routes';

/** Big multiplier readout (Game/Multiplier Readout): phase pill, value, sub line, caption. */
export function ReadoutCard({
  pill,
  value,
  tone,
  line,
  caption,
  compact = false,
  highlight = false,
}: {
  pill: PhasePillKind;
  value: string;
  tone: 'neutral' | 'brand' | 'danger' | 'muted';
  line: React.ReactNode;
  caption?: React.ReactNode;
  compact?: boolean;
  highlight?: boolean;
}) {
  return (
    <CardShell
      as="div"
      className={cn(
        'items-center gap-2 px-4 pt-4 pb-5 text-center tablet:px-6',
        highlight ? 'border-border-brand' : undefined,
        tone === 'danger' && 'border-border-danger/60',
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-overline text-text-tertiary uppercase">Orbit Rush</span>
        <PhasePill kind={pill} />
        <DemoBadge size="s" />
      </div>
      <p
        aria-live="off"
        data-testid="crash-multiplier"
        className={cn(
          'font-bold leading-none tracking-tight tabular-nums',
          compact ? 'text-[56px]' : 'text-[64px] laptop:text-[76px]',
          tone === 'brand' && 'text-text-brand',
          tone === 'danger' && 'text-text-danger',
          tone === 'muted' && 'text-text-tertiary',
          tone === 'neutral' && 'text-text-primary',
        )}
      >
        {value}
      </p>
      <div className="flex flex-col items-center gap-1" aria-live="polite">
        <p className={cn('flex flex-wrap items-center justify-center gap-1.5 text-text-primary', compact ? 'text-body-s' : 'text-body-m')}>{line}</p>
        {caption && <p className="text-caption text-text-tertiary">{caption}</p>}
      </div>
    </CardShell>
  );
}

/** CR-01 "Round starts in 4.2 s" — from the server's startedAt, never a local fake timer. */
export function BettingOverlay({ msLeft, totalMs, compact = false }: { msLeft: number; totalMs: number; compact?: boolean }) {
  const share = Math.max(0, Math.min(1, msLeft / totalMs));
  return (
    <div className="flex w-full max-w-[300px] flex-col items-center gap-2 rounded-xl border border-border-default bg-surface-overlay/95 px-5 py-4 text-center shadow-elevation-3">
      <PhasePill kind="open" />
      <p className="text-h5 text-text-primary tabular-nums" data-testid="betting-countdown">
        {msLeft > 0 ? `Round starts in ${secondsLeft(msLeft)} s` : 'Starting…'}
      </p>
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-border-default" aria-hidden>
        <div className="h-full rounded-full bg-brand-primary" style={{ width: `${share * 100}%` }} />
      </div>
      {!compact && <p className="text-caption text-text-tertiary">Place your bet until the window closes</p>}
    </div>
  );
}

/** Between rounds: "Next round opens in 2.4 s" (server nextRoundAt). */
export function NextRoundOverlay({ msLeft }: { msLeft: number | null }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border-default bg-surface-overlay/95 px-4 py-2 text-label-m text-text-secondary shadow-elevation-2">
      <Clock aria-hidden className="size-4" />
      {msLeft !== null && msLeft > 0 ? `Next round opens in ${secondsLeft(msLeft)} s` : 'Next round opening…'}
    </div>
  );
}

/** CR-08 chart overlay while the live connection is down. */
export function ReconnectOverlay({
  attempt,
  max,
  nextInMs,
  offline,
  onRetry,
}: {
  attempt: number;
  max: number;
  nextInMs: number | null;
  offline: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex w-full max-w-[260px] flex-col items-center gap-2 rounded-xl border border-border-default bg-surface-overlay px-5 py-4 text-center shadow-elevation-3" role="status">
      <span className="flex size-10 items-center justify-center rounded-full bg-status-warning-tint text-text-warning">
        <WifiOff aria-hidden className="size-5" />
      </span>
      <p className="text-h5 text-text-primary">{offline ? 'Connection lost' : 'Reconnecting…'}</p>
      <p className="text-caption text-text-secondary">
        {offline
          ? 'Automatic retries stopped.'
          : `Attempt ${Math.max(1, attempt)} of ${max}${nextInMs !== null && nextInMs > 0 ? ` · next try in ${Math.ceil(nextInMs / 1000)} s` : ''}`}
      </p>
      <Button variant="secondary" size="s" className="min-h-11 tablet:min-h-9" onClick={onRetry} leadingIcon={<RefreshCw aria-hidden />}>
        Retry now
      </Button>
    </div>
  );
}

/** CR-04 result card — only from my settled bet as the server reported it (no fabricated wins). */
export function ResultCard({ bet, crashPoint, at }: { bet: CrashMyBet; crashPoint: string | null; at: string | null }) {
  const win = bet.status === 'cashed_out';
  return (
    <div
      role="status"
      data-testid="crash-result"
      data-result={win ? 'win' : 'lose'}
      className={cn(
        'flex flex-col gap-3 rounded-xl border p-4',
        win ? 'border-border-brand bg-brand-tint-subtle' : 'border-border-danger bg-status-danger-tint',
      )}
    >
      <div className="flex items-start gap-3">
        {win ? (
          <CircleCheck aria-hidden className="size-7 shrink-0 text-icon-brand" />
        ) : (
          <CircleX aria-hidden className="size-7 shrink-0 text-text-danger" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-body-l font-semibold text-text-primary">
            {win ? (
              <>
                You won <CreditsAmount value={bet.net} />
              </>
            ) : (
              'No win this round'
            )}
          </p>
          <p className="text-body-s text-text-secondary">
            {win
              ? `${bet.cashOutKind === 'auto' ? 'Auto cash-out' : bet.cashOutKind === 'cap' ? 'Max-multiplier cash-out' : 'You cashed out'} at ${fmtX(bet.cashOutMultiplier)}${crashPoint ? ` before the crash at ${fmtX(crashPoint)}` : ''} · paid ${bet.payout} DEMO to your DEMO balance`
              : `Crashed at ${fmtX(crashPoint)}${bet.autoCashOut ? ` before your ${fmtX(bet.autoCashOut)} target` : ' before you cashed out'} · stake ${bet.stake} DEMO lost`}
          </p>
        </div>
        <div className="flex flex-col items-end">
          <span className={cn('text-number-m tabular-nums', money(bet.net).gt(0) ? 'text-text-success' : 'text-text-danger')}>
            <CreditsAmount value={bet.net} signed unit={false} />
          </span>
          <span className="text-caption text-text-tertiary">Net</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-2 text-caption text-text-tertiary">
        <DemoBadge size="xs" />
        <span>
          Round CR-{bet.round.number}
          {at ? ` · ${formatDateTimeUTC(at)}` : ''}
        </span>
        <Button variant="link" size="s" asChild className="ml-auto">
          <Link href={CRASH_ROUTES.verify(bet.round.number)}>
            <ShieldCheck aria-hidden /> Verify result
          </Link>
        </Button>
      </div>
    </div>
  );
}
