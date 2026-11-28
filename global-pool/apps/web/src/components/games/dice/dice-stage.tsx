'use client';

import type { DiceCondition } from '@gp/shared/fair';
import { formatCount } from '@gp/shared/format';
import { CircleCheck, CircleX, Hash, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import * as React from 'react';

import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CreditsAmount, KitChip, shortHash } from '@/components/games/kit';
import { cn } from '@/lib/utils';

import { conditionLabel, fromHundredths, zones } from './dice-math';
import { DiceSlider, type RollMarker } from './dice-slider';

export type DiceStagePhase = 'loading' | 'idle' | 'rolling' | 'reconnecting' | 'settled';

export interface DiceStageProps {
  phase: DiceStagePhase;
  targetH: number;
  condition: DiceCondition;
  onTargetChange: (tH: number) => void;
  /** Valid target? (false = out of range → odds show "—"). */
  valid: boolean;
  chance: string;
  multiplier: string;
  /** Payout on win for the current stake (DEMO) or null when the stake is invalid. */
  payout: string | null;
  /** Shown roll (animated value while settling, final afterwards). */
  marker: RollMarker | null;
  /** Bet reference + nonce for the top line. */
  nextNonce: number | null;
  serverSeedHash: string | null;
  settledRef?: string | null;
  disabled?: boolean;
  instant?: boolean;
  /** Result banner (settled bets only). */
  result?: React.ReactNode;
}

function Zone({ win, from, to, count }: { win: boolean; from: number; to: number; count: number }) {
  return (
    <KitChip icon={win ? CircleCheck : CircleX} tone={win ? 'brand' : 'danger'}>
      {win ? 'Win' : 'Lose'} · {fromHundredths(from)} – {fromHundredths(to)} · {formatCount(count)} results
    </KitChip>
  );
}

/** Pool Dice stage (DI-01…04): top line, readout, slider + roll marker, zone legend, result, odds tiles. */
export function DiceStage(p: DiceStageProps) {
  const z = zones(p.targetH, p.condition);
  const settled = p.phase === 'settled' && p.marker && p.marker.state !== 'rolling';
  const won = p.marker?.state === 'win';
  const rolling = p.phase === 'rolling' || (p.phase === 'settled' && p.marker?.state === 'rolling');

  if (p.phase === 'loading') {
    return (
      <div className="flex h-full flex-col items-center gap-6 rounded-xl border border-border-subtle bg-surface-default p-6" aria-busy="true">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-16 w-56" />
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="flex w-full justify-between">
          <Skeleton className="h-7 w-56 rounded-full" />
          <Skeleton className="h-7 w-56 rounded-full" />
        </div>
        <Skeleton className="h-24 w-full" />
        <p role="status" className="flex items-center gap-2 text-caption text-text-secondary">
          <Loader2 aria-hidden className="size-4 animate-spin text-icon-brand" />
          Connecting to the game server · loading your seed pair
        </p>
      </div>
    );
  }

  const label =
    p.phase === 'reconnecting'
      ? `ROLL ${p.settledRef ?? ''} · WAITING FOR CONNECTION`
      : rolling
        ? 'ROLLING…'
        : settled
          ? `SETTLED · ${p.settledRef ?? ''}`
          : 'NEXT ROLL';
  const meta =
    p.nextNonce !== null
      ? settled
        ? `Next roll uses nonce ${p.nextNonce} · server seed hash ${shortHash(p.serverSeedHash)} committed`
        : `Nonce ${p.nextNonce} · server seed hash ${shortHash(p.serverSeedHash)} committed before you bet`
      : 'Sign in to see your seed pair';

  const readLabel = settled ? 'RESULT' : rolling ? 'ROLLING…' : p.condition === 'over' ? 'ROLL OVER TO WIN' : 'ROLL UNDER TO WIN';
  const readValue = settled || (rolling && p.marker) ? fromHundredths(p.marker!.valueH) : fromHundredths(p.targetH);

  return (
    <div className="flex h-full flex-col items-stretch justify-center gap-5 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:gap-6 tablet:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p
            className={cn(
              'text-overline uppercase',
              p.phase === 'reconnecting' ? 'text-text-warning' : rolling ? 'text-text-brand' : 'text-text-tertiary',
            )}
          >
            {label}
          </p>
          <p className="flex flex-wrap items-center gap-1.5 text-caption text-text-secondary">
            {meta}
            <DemoBadge size="xs" />
          </p>
        </div>
        <KitChip icon={Hash} className="hidden tablet:inline-flex">
          10,000 possible results
        </KitChip>
      </div>

      <div className="flex flex-col items-center gap-2 text-center" aria-live="polite">
        <p className="text-overline uppercase text-text-tertiary">{readLabel}</p>
        <p
          data-testid="dice-readout"
          className={cn(
            'text-display-m tabular-nums tablet:text-display-l',
            settled ? (won ? 'text-text-success' : 'text-text-danger') : rolling ? 'text-text-tertiary' : 'text-text-primary',
          )}
        >
          {readValue}
        </p>
        {settled && p.marker ? (
          <KitChip icon={won ? CircleCheck : CircleX} tone={won ? 'brand' : 'danger'}>
            {won
              ? `Win · ${readValue} is inside your ${fromHundredths(z.win.from)} – ${fromHundredths(z.win.to)} range`
              : `Lose · ${readValue} is ${p.condition === 'over' ? 'below' : 'above'} your ${fromHundredths(p.targetH)} target`}
          </KitChip>
        ) : rolling ? (
          <KitChip icon={p.phase === 'reconnecting' ? WifiOff : RefreshCw}>
            {p.phase === 'reconnecting' ? 'Waiting for the server' : 'Settling on the server'}
          </KitChip>
        ) : (
          <p className="text-body-s text-text-secondary">
            {p.valid
              ? `Any result from ${fromHundredths(z.win.from)} to ${fromHundredths(z.win.to)} wins · ${formatCount(z.win.count)} of 10,000 possible results`
              : 'Targets are limited to 0.01% – 98.00% win chance'}
          </p>
        )}
      </div>

      <DiceSlider
        targetH={p.targetH}
        condition={p.condition}
        onChange={p.onTargetChange}
        marker={p.marker}
        disabled={p.disabled || rolling}
        locked={rolling || p.disabled}
        instant={p.instant}
      />

      <div className="flex flex-col gap-2 tablet:flex-row tablet:justify-between">
        {p.condition === 'under' ? (
          <>
            <Zone win {...z.win} />
            <Zone win={false} {...z.lose} />
          </>
        ) : (
          <>
            <Zone win={false} {...z.lose} />
            <Zone win {...z.win} />
          </>
        )}
      </div>

      {p.result}

      <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-secondary p-3 tablet:p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-label-m text-text-secondary">
            Pool Dice · {conditionLabel(p.condition, fromHundredths(p.targetH))}
          </p>
          <DemoBadge size="xs" />
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {[
            ['Win chance', p.valid ? `${p.chance}%` : '—', p.valid ? '' : 'text-text-danger'],
            ['Multiplier', p.valid ? `${p.multiplier}×` : '—', ''],
            ['Payout on win', p.valid && p.payout ? <CreditsAmount key="p" value={p.payout} /> : '—', 'text-text-success'],
          ].map(([l, v, tone]) => (
            <div key={l as string} className="flex min-w-0 flex-col gap-1 rounded-md border border-border-subtle bg-surface-default p-2.5 tablet:p-3">
              <dt className="text-[10px] font-semibold tracking-[0.06em] uppercase text-text-tertiary tablet:text-overline">{l}</dt>
              <dd className={cn('text-body-s-strong break-words text-text-primary tablet:text-number-m', tone as string)}>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-caption text-text-tertiary">
          Multiplier = 99 ÷ win chance (truncated to 4 decimals) · house edge 1.00% · every result is provably fair.
        </p>
      </div>
    </div>
  );
}
