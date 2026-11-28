'use client';

import { money } from '@gp/shared/money';
import * as React from 'react';

import { cn } from '@/lib/utils';

import {
  curveSamples,
  fmtX,
  multiplierTicks,
  niceAxisMax,
  timeAt,
  timeAxisMax,
  timeTicks,
} from './crash-math';

export type CurveMode = 'betting' | 'running' | 'crashed' | 'idle';

export interface CrashCurveProps {
  mode: CurveMode;
  /** Last server frame multiplier (or the crash point). */
  multiplier: string;
  /** ms after take-off of that frame. */
  elapsedMs: number;
  /** Armed auto cash-out of my bet (dashed line). */
  target?: string | null;
  /** My cash-out (point + vertical marker + callout). */
  cashOut?: { multiplier: string; payout: string; net: string } | null;
  /** Live data paused (connection lost): greyed curve. */
  paused?: boolean;
  /** Compact (mobile): no axis labels, shorter. */
  compact?: boolean;
  height: number;
  /** Overlay content (betting countdown, reconnecting card). */
  overlay?: React.ReactNode;
  className?: string;
}

const pct = (v: number) => `${Math.max(0, Math.min(100, v)).toFixed(3)}%`;

/**
 * Game/Crash Curve: m(t) = e^(0.1117·t) on the server's own 100 ms frames (shared maths, `crash.multiplierAt`) up to
 * the last frame received — the drawing never runs ahead of the server. Mint while running, red once crashed.
 * Lines live in a stretchable SVG (non-scaling strokes); dots, labels and pills are HTML placed in percentages, so the
 * chart needs no measuring and renders the same on the server and the client.
 */
export function CrashCurve({
  mode,
  multiplier,
  elapsedMs,
  target,
  cashOut,
  paused = false,
  compact = false,
  height,
  overlay,
  className,
}: CrashCurveProps) {
  const cur = Number(multiplier) || 1; // geometry only (pixels) — amounts never use floats
  const showing = mode === 'running' || mode === 'crashed';
  const elapsed = showing ? elapsedMs : 0;
  const targetNum = target ? Number(target) : null;
  const yMax = niceAxisMax(Math.max(cur * 1.15, targetNum && targetNum <= 10 ? targetNum * 1.2 : 0), compact ? 2.4 : 4);
  const xMaxS = timeAxisMax(elapsed);
  /** x / y in percent of the plot box. */
  const X = (ms: number) => (Math.min(ms / 1000, xMaxS) / xMaxS) * 100;
  const Y = (m: number) => (1 - (Math.min(m, yMax) - 1) / (yMax - 1)) * 100;

  const pts = showing ? curveSamples(elapsed) : [];
  if (mode === 'crashed' && pts.length) pts[pts.length - 1] = { t: elapsed, m: multiplier };
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(3)},${Y(Number(p.m)).toFixed(3)}`).join(' ');
  const last = pts[pts.length - 1];
  const area = last ? `${line} L${X(last.t).toFixed(3)},100 L0,100 Z` : '';
  const crashed = mode === 'crashed';
  const stroke = paused ? 'var(--color-border-strong)' : crashed ? 'var(--color-status-danger)' : 'var(--color-brand-primary)';
  const fill = paused ? 'var(--color-surface-raised)' : crashed ? 'var(--color-status-danger-tint)' : 'var(--color-brand-tint-subtle)';

  const yTicks = multiplierTicks(yMax);
  const xTicks = timeTicks(xMaxS);
  const headX = last ? X(last.t) : 0;
  const headY = last ? Y(Number(last.m)) : 100;
  const cashT = cashOut ? timeAt(cashOut.multiplier) : null;
  const cashShown = !!cashOut && cashT !== null && cashT <= elapsed;
  const cashX = cashShown ? X(cashT) : 0;
  const cashY = cashShown ? Y(Number(cashOut.multiplier)) : 0;
  // the callout sits above-left of the cash-out point unless the head / crash pill is right there → plot corner
  const calloutCorner = cashShown && Math.abs(headY - cashY) < 22 && headX - cashX < 45;
  const targetShown = targetNum !== null && targetNum <= yMax;
  const targetY = targetShown ? Y(targetNum) : 0;

  return (
    <div className={cn('relative w-full select-none', className)} style={{ height }}>
      <div
        className={cn('absolute', compact ? 'inset-x-3 top-4 bottom-3' : 'top-5 right-5 bottom-8 left-14')}
        role="img"
        aria-label={curveLabel(mode, multiplier, target, cashOut)}
        data-testid="crash-curve"
      >
        {/* grid + axis labels */}
        {yTicks.map((m) => (
          <div key={`y${m}`} className="absolute inset-x-0 border-t border-border-subtle" style={{ top: pct(Y(m)) }}>
            {!compact && (
              <span className="absolute -top-2 right-full mr-2.5 text-[11px] leading-none whitespace-nowrap text-text-tertiary tabular-nums">
                {m.toFixed(2)}×
              </span>
            )}
          </div>
        ))}
        {!compact &&
          xTicks.map((t) => (
            <span
              key={`x${t}`}
              className="absolute top-full mt-2 -translate-x-1/2 text-[11px] leading-none text-text-tertiary tabular-nums"
              style={{ left: pct(X(t * 1000)) }}
            >
              {t}s
            </span>
          ))}

        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full overflow-visible">
          {targetShown && (
            <line
              x1={0}
              x2={100}
              y1={targetY}
              y2={targetY}
              stroke="var(--color-brand-primary)"
              strokeWidth={1.5}
              strokeDasharray="6 6"
              vectorEffect="non-scaling-stroke"
              opacity={paused ? 0.4 : 0.9}
            />
          )}
          {area && <path d={area} fill={fill} opacity={0.85} />}
          {line && (
            <path
              d={line}
              fill="none"
              stroke={stroke}
              strokeWidth={compact ? 2.5 : 3}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {cashShown && (
            <line
              x1={cashX}
              x2={cashX}
              y1={cashY}
              y2={100}
              stroke="var(--color-brand-primary)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* dots */}
        {cashShown && <Dot x={cashX} y={cashY} color="var(--color-brand-primary)" />}
        {(showing || mode === 'betting') && <Dot x={headX} y={headY} color={stroke} size={compact ? 8 : 10} />}

        {/* pills */}
        {targetShown && (
          <span
            className="pointer-events-none absolute right-1 flex items-center gap-1 rounded-full border border-border-brand bg-bg-secondary/90 px-2.5 py-0.5 text-label-s whitespace-nowrap text-text-brand"
            style={{
              top: pct(targetY),
              transform: targetNum > cur && headY - targetY < 12 ? 'translateY(6px)' : 'translateY(calc(-100% - 6px))',
            }}
          >
            <TargetDot /> {compact ? 'Auto' : 'Auto cash-out'} {fmtX(target)}
          </span>
        )}
        {cashShown && !compact && (
          <span
            className="pointer-events-none absolute flex flex-col rounded-md border border-border-brand bg-bg-secondary/95 px-3 py-1.5 text-caption whitespace-nowrap text-text-brand"
            style={
              calloutCorner
                ? { left: 8, top: 4 }
                : { left: `max(0px, calc(${pct(cashX)} - 12rem))`, top: pct(cashY), transform: 'translateY(calc(-100% - 10px))' }
            }
            data-testid="curve-cashout"
          >
            <span className="text-label-s">You cashed out {fmtX(cashOut.multiplier)}</span>
            <span className="text-text-secondary tabular-nums">
              {cashOut.payout} DEMO · {money(cashOut.net).gte(0) ? '+' : ''}
              {cashOut.net} net
            </span>
          </span>
        )}
        {showing && !paused && (
          <span
            className={cn(
              'pointer-events-none absolute rounded-full px-2.5 py-0.5 text-label-m whitespace-nowrap tabular-nums',
              crashed ? 'bg-status-danger text-text-on-danger' : 'bg-brand-primary text-text-on-primary',
            )}
            style={{
              left: `clamp(${crashed ? '8rem' : '2.5rem'}, ${pct(headX)}, calc(100% - ${crashed ? '1.5rem' : '2.5rem'}))`,
              top: pct(headY),
              transform: `translate(${crashed ? '-85%' : '-50%'}, calc(-100% - 10px))`,
            }}
            data-testid="curve-head"
          >
            {crashed ? `Crashed @ ${fmtX(multiplier)}` : fmtX(multiplier)}
          </span>
        )}
        {mode === 'betting' && (
          <span
            className="pointer-events-none absolute rounded-full border border-border-default bg-surface-raised px-2.5 py-0.5 text-label-m text-text-primary tabular-nums"
            style={{ left: 10, top: '100%', transform: 'translateY(calc(-100% - 12px))' }}
          >
            1.00×
          </span>
        )}
      </div>
      {overlay && <div className="absolute inset-0 flex items-center justify-center p-3">{overlay}</div>}
    </div>
  );
}

function Dot({ x, y, color, size = 10 }: { x: number; y: number; color: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="absolute rounded-full border-2 border-bg-secondary"
      style={{ left: pct(x), top: pct(y), width: size + 4, height: size + 4, background: color, transform: 'translate(-50%, -50%)' }}
    />
  );
}

function TargetDot() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden className="size-3">
      <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="6" r="2" fill="currentColor" />
    </svg>
  );
}

function curveLabel(
  mode: CurveMode,
  multiplier: string,
  target?: string | null,
  cashOut?: { multiplier: string } | null,
): string {
  const parts = [
    mode === 'betting'
      ? 'Multiplier curve — waiting for take-off at 1.00×'
      : mode === 'crashed'
        ? `Multiplier curve — crashed at ${fmtX(multiplier)}`
        : mode === 'running'
          ? `Multiplier curve — now ${fmtX(multiplier)}`
          : 'Multiplier curve',
  ];
  if (target) parts.push(`auto cash-out line at ${fmtX(target)}`);
  if (cashOut) parts.push(`you cashed out at ${fmtX(cashOut.multiplier)}`);
  return parts.join(', ');
}
