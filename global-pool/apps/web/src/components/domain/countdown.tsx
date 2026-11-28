'use client';

import { formatDateTimeUTC } from '@gp/shared/format';
import * as React from 'react';

import { cn } from '@/lib/utils';

export interface CountdownParts {
  totalMs: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function partsUntil(targetMs: number, nowMs: number): CountdownParts {
  const totalMs = Math.max(0, targetMs - nowMs);
  const totalSec = Math.floor(totalMs / 1000);
  return {
    totalMs,
    hours: Math.floor(totalSec / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
    done: totalMs === 0,
  };
}

/**
 * Ticks once a second toward an absolute ISO time. Never a fake timer (DEV_CONVENTIONS): the remaining time
 * is always derived from the real close time. `demoNow` anchors the clock at a DEMO "now" (e.g. the demo
 * sheet's 16:42:18 UTC) and then advances in real time — only for DEMO screens.
 */
export function useCountdown(target: string | Date, demoNow?: string | Date): CountdownParts {
  const targetMs = new Date(target).getTime();
  const anchorMs = demoNow ? new Date(demoNow).getTime() : null;
  const [mountedAt] = React.useState(() => Date.now());
  const compute = React.useCallback(
    () => partsUntil(targetMs, anchorMs !== null ? anchorMs + (Date.now() - mountedAt) : Date.now()),
    [targetMs, anchorMs, mountedAt],
  );
  const [parts, setParts] = React.useState<CountdownParts>(compute);
  React.useEffect(() => {
    setParts(compute());
    const id = window.setInterval(() => setParts(compute()), 1000);
    return () => window.clearInterval(id);
  }, [compute]);
  return parts;
}

const pad = (n: number) => String(n).padStart(2, '0');

export interface CountdownProps {
  /** Absolute close time (ISO 8601, UTC), e.g. '2026-11-27T20:00:00Z'. */
  closesAt: string;
  /** DEMO clock anchor — see useCountdown. */
  demoNow?: string;
  size?: 's' | 'm' | 'l';
  /** Caption under the boxes. Default "Draw at 27 Nov 2026, 20:00 UTC". Pass null to hide. */
  caption?: React.ReactNode | null;
  /** Text shown when the time has passed. */
  doneLabel?: string;
  className?: string;
}

/** h : m : s boxes (Figma Card/Jackpot + Card/Draw Countdown) derived from an absolute close time. */
export function Countdown({
  closesAt,
  demoNow,
  size = 'm',
  caption,
  doneLabel = 'Round closed — drawing',
  className,
}: CountdownProps) {
  const p = useCountdown(closesAt, demoNow);
  const absolute = formatDateTimeUTC(closesAt);
  const units: [number, string, string][] = [
    [p.hours, 'h', 'hours'],
    [p.minutes, 'm', 'minutes'],
    [p.seconds, 's', 'seconds'],
  ];
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        role="timer"
        aria-live="off"
        suppressHydrationWarning
        aria-label={p.done ? doneLabel : `Closes in ${p.hours} hours ${p.minutes} minutes — at ${absolute}`}
        className="flex items-center gap-1.5"
      >
        {units.map(([value, short, long], i) => (
          <React.Fragment key={short}>
            {i > 0 && (
              <span aria-hidden className={cn('font-semibold text-text-tertiary', size === 'l' ? 'text-h3' : 'text-h5')}>
                :
              </span>
            )}
            <span
              aria-hidden
              className={cn(
                'flex flex-1 items-center justify-center rounded-md border border-border-default bg-bg-secondary tabular-nums',
                size === 's' && 'h-9 min-w-11 px-2 text-number-s',
                size === 'm' && 'h-12 min-w-16 px-3 text-number-m',
                size === 'l' && 'h-14 min-w-20 px-4 text-number-l',
                p.done && 'text-text-tertiary',
              )}
              title={long}
            >
              <span className="flex items-baseline gap-0.5">
                <span suppressHydrationWarning>{pad(value)}</span>
                <span className="text-caption text-text-tertiary">{short}</span>
              </span>
            </span>
          </React.Fragment>
        ))}
      </div>
      {caption !== null && (
        <p className="text-caption text-text-tertiary">
          {p.done ? doneLabel : (caption ?? <>Draw at {absolute}</>)}
        </p>
      )}
    </div>
  );
}
