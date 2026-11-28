'use client';

import type { DiceCondition } from '@gp/shared/fair';
import { Check, Dices, Lock, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { clampTargetH, fromHundredths, targetRange } from './dice-math';

export interface RollMarker {
  /** Hundredths 0 … 9999. */
  valueH: number;
  state: 'rolling' | 'win' | 'lose';
}

const pct = (h: number) => `${(h / 100).toFixed(2)}%`;

/**
 * Dice slider (DI-01/02): win zone mint, lose zone danger, scale 0–100, draggable thumb (role="slider": ← → / ↑ ↓
 * move the target by 1.00, Shift by 0.01, PageUp/PageDown by 10.00, Home/End to the limits) and the roll marker.
 */
export function DiceSlider({
  targetH,
  condition,
  onChange,
  marker,
  disabled = false,
  locked = false,
  instant = false,
  className,
}: {
  targetH: number;
  condition: DiceCondition;
  onChange: (tH: number) => void;
  marker?: RollMarker | null;
  disabled?: boolean;
  /** Shows a lock on the thumb (rolling / blocked). */
  locked?: boolean;
  /** Reduced motion: no transitions. */
  instant?: boolean;
  className?: string;
}) {
  const track = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const range = targetRange(condition);
  const leftWins = condition === 'under';

  const fromPointer = (clientX: number) => {
    const el = track.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ratio = r.width > 0 ? (clientX - r.left) / r.width : 0;
    onChange(clampTargetH(ratio * 10_000, condition));
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const step = e.shiftKey ? 1 : 100;
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = targetH + step;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = targetH - step;
    else if (e.key === 'PageUp') next = targetH + 1000;
    else if (e.key === 'PageDown') next = targetH - 1000;
    else if (e.key === 'Home') next = range.min;
    else if (e.key === 'End') next = range.max;
    if (next !== null) {
      e.preventDefault();
      onChange(clampTargetH(next, condition));
    }
  };

  const markerWin = marker?.state === 'win';
  const markerLose = marker?.state === 'lose';
  const winColour = disabled ? 'bg-border-strong' : 'bg-brand';
  const loseColour = disabled ? 'bg-border-strong' : 'bg-status-danger';
  const transition = instant ? '' : 'transition-[left] duration-700 ease-decelerate';

  return (
    <div className={cn('relative w-full select-none px-5 pt-14 pb-8', className)}>
      {/* roll marker */}
      {marker && (
        <div
          aria-hidden
          className={cn('absolute top-0 flex -translate-x-1/2 flex-col items-center', transition)}
          style={{ left: `calc(20px + (100% - 40px) * ${marker.valueH} / 10000)` }}
        >
          <span
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-label-l tabular-nums shadow-elevation-2',
              markerWin && 'bg-brand text-text-on-primary',
              markerLose && 'bg-status-danger-strong text-text-on-danger',
              marker.state === 'rolling' && 'border border-border-strong bg-surface-raised text-text-secondary',
            )}
          >
            {markerWin ? <Check className="size-4" /> : markerLose ? <X className="size-4" /> : <Dices className="size-4" />}
            {fromHundredths(marker.valueH)}
          </span>
          <span
            className={cn(
              'h-5 w-0.5',
              markerWin ? 'bg-brand' : markerLose ? 'bg-status-danger' : 'bg-border-strong',
            )}
          />
        </div>
      )}
      <div
        ref={track}
        className={cn('relative h-3 rounded-full', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
        onPointerDown={(e) => {
          if (disabled) return;
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          setDragging(true);
          fromPointer(e.clientX);
        }}
        onPointerMove={(e) => dragging && fromPointer(e.clientX)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <div
          aria-hidden
          className={cn('absolute inset-y-0 left-0 rounded-l-full', leftWins ? winColour : loseColour)}
          style={{ width: pct(targetH) }}
        />
        <div
          aria-hidden
          className={cn('absolute inset-y-0 right-0 rounded-r-full', leftWins ? loseColour : winColour)}
          style={{ left: pct(targetH) }}
        />
        <div
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={`Target — roll ${condition}`}
          aria-valuemin={range.min / 100}
          aria-valuemax={range.max / 100}
          aria-valuenow={targetH / 100}
          aria-valuetext={`${fromHundredths(targetH)} — roll ${condition} wins on ${
            condition === 'over' ? `${fromHundredths(targetH)} to 99.99` : `0.00 to ${fromHundredths(Math.max(0, targetH - 1))}`
          }`}
          aria-disabled={disabled || undefined}
          onKeyDown={onKey}
          className={cn(
            'absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-1 rounded-md border bg-surface-raised shadow-elevation-2 outline-none tablet:size-10',
            'focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-border-focus',
            dragging ? 'border-border-focus' : 'border-border-strong',
            disabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing',
          )}
          style={{ left: pct(targetH) }}
        >
          {locked ? (
            <Lock aria-hidden className="size-4 text-icon-muted" />
          ) : (
            Array.from({ length: 3 }, (_, i) => (
              <span key={i} aria-hidden className={cn('h-3.5 w-0.5', dragging ? 'bg-icon-brand' : 'bg-icon-muted')} />
            ))
          )}
          {dragging && (
            <span className="absolute -top-11 rounded-sm border border-border-focus bg-surface-overlay px-2.5 py-1 text-label-m text-text-primary tabular-nums shadow-elevation-3">
              {fromHundredths(targetH)}
            </span>
          )}
        </div>
      </div>
      {/* scale */}
      <div aria-hidden className="relative mt-3 h-6">
        {[0, 25, 50, 75, 100].map((v) => (
          <span
            key={v}
            className="absolute flex -translate-x-1/2 flex-col items-center gap-1 text-caption text-text-tertiary"
            style={{ left: `${v}%` }}
          >
            <span className="h-1.5 w-0.5 bg-border-strong" />
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}
