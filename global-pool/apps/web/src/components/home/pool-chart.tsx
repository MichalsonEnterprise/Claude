'use client';

import { formatDateUTC, formatRoundNumber } from '@gp/shared/format';
import { formatUSDT } from '@gp/shared/money';
import * as React from 'react';

import type { PoolHistoryPoint } from '@/lib/data/types';
import { cn } from '@/lib/utils';

/**
 * Chart/Line-Area (pool balance per daily round). Lightweight inline SVG: one series (mint 2px line + tinted
 * area), recessive grid, dashed min-pool threshold, cancelled-round annotation, live endpoint label.
 * Hover / arrow keys move a crosshair + tooltip; a visually hidden table carries the same data.
 * Numbers are converted to JS numbers for geometry only — every label is formatted from the decimal string.
 */

const H = 260;
const PAD = { top: 18, right: 18, bottom: 30, left: 46 };

/** Monotone cubic (Fritsch–Carlson) path — no overshoot below 0 or above real values. */
export function monotonePath(pts: [number, number][]): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0]![0]},${pts[0]![1]}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const h = pts[i + 1]![0] - pts[i]![0];
    dx.push(h);
    m.push((pts[i + 1]![1] - pts[i]![1]) / h);
  }
  const t: number[] = [m[0]!];
  for (let i = 1; i < n - 1; i++) {
    const a = m[i - 1]!;
    const b = m[i]!;
    t.push(
      a * b <= 0
        ? 0
        : (3 * (dx[i - 1]! + dx[i]!)) /
            ((2 * dx[i]! + dx[i - 1]!) / a + (dx[i]! + 2 * dx[i - 1]!) / b),
    );
  }
  t.push(m[n - 2]!);
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[i + 1]!;
    const h = dx[i]! / 3;
    d += `C${x0 + h},${y0 + t[i]! * h} ${x1 - h},${y1 - t[i + 1]! * h} ${x1},${y1}`;
  }
  return d;
}

/** Ceiling to one significant digit (186,400 → 200,000; 3,412 → 4,000). Geometry only. */
export function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
}

const kLabel = (v: number) => (v === 0 ? '0' : `${v / 1000}K`);
const shortDate = (iso: string) => formatDateUTC(iso).replace(/ \d{4}$/, '');

export function PoolBalanceChart({
  points,
  minPool,
  className,
}: {
  points: PoolHistoryPoint[];
  minPool: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(640);
  const [hover, setHover] = React.useState<number | null>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(
      ([e]) => e && setWidth(Math.max(280, Math.round(e.contentRect.width))),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const values = points.map((p) => Number(p.pool));
  const min = Number(minPool);
  const yMax = niceCeil(Math.max(...values, min) * 1.02);
  const tickStep = yMax / 4;
  const ticks = [0, 1, 2, 3, 4].map((i) => i * tickStep);
  const plotW = width - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length <= 1 ? 0 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - (v / yMax) * plotH;
  const xy: [number, number][] = values.map((v, i) => [x(i), y(v)]);
  const line = monotonePath(xy);
  const baseY = y(0);
  const area = xy.length ? `${line}L${x(points.length - 1)},${baseY}L${x(0)},${baseY}Z` : '';
  const lastIdx = points.length - 1;
  const last = points[lastIdx];
  const cancelledIdx = points.findIndex((p) => p.status === 'cancelled');
  const labelStep = width < 440 ? 4 : width < 560 ? 3 : 2;
  const showLabel = (i: number) =>
    i === lastIdx || (i % labelStep === 0 && lastIdx - i >= Math.max(2, labelStep));
  const gradId = `${titleId}-area`;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - box.left) / box.width;
    setHover(Math.max(0, Math.min(lastIdx, Math.round(rel * lastIdx))));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const d = e.key === 'ArrowRight' ? 1 : -1;
      setHover((h) => Math.max(0, Math.min(lastIdx, (h ?? lastIdx) + d)));
    } else if (e.key === 'Escape') setHover(null);
  };
  const hp = hover !== null ? points[hover] : undefined;

  return (
    <div ref={ref} className={cn('relative w-full', className)}>
      <div
        role="slider"
        tabIndex={0}
        aria-labelledby={titleId}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, lastIdx)}
        aria-valuenow={hover ?? lastIdx}
        aria-valuetext={
          points[hover ?? lastIdx]
            ? `Round ${formatRoundNumber(points[hover ?? lastIdx]!.roundNumber)}, ${formatDateUTC(points[hover ?? lastIdx]!.closesAt)}: ${formatUSDT(points[hover ?? lastIdx]!.pool)}${points[hover ?? lastIdx]!.status === 'cancelled' ? ', cancelled' : ''}`
            : undefined
        }
        onKeyDown={onKey}
        onBlur={() => setHover(null)}
        className="rounded-md outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus"
      >
        <span id={titleId} className="sr-only">
          Closing pool per daily round, {points[0] ? shortDate(points[0].closesAt) : ''} to{' '}
          {last ? formatDateUTC(last.closesAt) : ''}. Latest {last ? formatUSDT(last.pool) : ''}.
          Use left and right arrow keys to read each round.
        </span>
        <svg
          width={width}
          height={H}
          viewBox={`0 0 ${width} ${H}`}
          aria-hidden
          className="block max-w-full"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.26} />
              <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          {/* grid + y labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(t)}
                y2={y(t)}
                className="stroke-ink-50/[0.07]"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 10}
                y={y(t) + 4}
                textAnchor="end"
                className="fill-text-tertiary text-[12px]"
              >
                {kLabel(t)}
              </text>
            </g>
          ))}
          {/* min pool threshold */}
          <line
            x1={PAD.left}
            x2={width - PAD.right}
            y1={y(min)}
            y2={y(min)}
            className="stroke-ink-400/60"
            strokeWidth={1}
            strokeDasharray="4 4"
          />
          <text
            x={width - PAD.right - 2}
            y={y(min) - 7}
            textAnchor="end"
            className="fill-text-tertiary text-[12px]"
          >
            Min pool {kLabel(min)}
          </text>
          {/* series */}
          <path d={area} fill={`url(#${gradId})`} />
          <path
            d={line}
            className="fill-none stroke-brand"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* x labels */}
          {points.map((p, i) =>
            showLabel(i) ? (
              <text
                key={p.roundNumber}
                x={x(i)}
                y={H - 8}
                textAnchor={i === lastIdx ? 'end' : i === 0 ? 'start' : 'middle'}
                className="fill-text-tertiary text-[12px]"
              >
                {shortDate(p.closesAt)}
              </text>
            ) : null,
          )}
          {/* cancelled round marker */}
          {cancelledIdx >= 0 && (
            <circle
              cx={x(cancelledIdx)}
              cy={y(values[cancelledIdx]!)}
              r={4}
              className="fill-surface-default stroke-red-400"
              strokeWidth={2}
            />
          )}
          {/* live / last endpoint */}
          {last && (
            <g>
              <circle cx={x(lastIdx)} cy={y(values[lastIdx]!)} r={8} className="fill-brand/25" />
              <circle
                cx={x(lastIdx)}
                cy={y(values[lastIdx]!)}
                r={4.5}
                className="fill-brand stroke-surface-default"
                strokeWidth={2}
              />
              <text
                x={x(lastIdx) - 14}
                y={y(values[lastIdx]!) - 10}
                textAnchor="end"
                className="fill-text-primary text-[12px] font-medium"
              >
                {last.status === 'open' ? 'Live · ' : ''}
                {formatUSDT(last.pool, { symbol: false })}
              </text>
            </g>
          )}
          {/* crosshair */}
          {hp && hover !== null && (
            <g>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={PAD.top}
                y2={baseY}
                className="stroke-ink-50/30"
                strokeWidth={1}
              />
              <circle
                cx={x(hover)}
                cy={y(values[hover]!)}
                r={5}
                className={cn(
                  'stroke-surface-default',
                  hp.status === 'cancelled' ? 'fill-red-400' : 'fill-brand',
                )}
                strokeWidth={2}
              />
            </g>
          )}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      </div>
      {cancelledIdx >= 0 && (
        <span
          className="pointer-events-none absolute inline-flex -translate-x-1/2 items-center gap-1.5 rounded-sm border border-border-default bg-surface-raised px-2 py-1 text-caption whitespace-nowrap text-text-secondary"
          style={{
            left: Math.min(Math.max(x(cancelledIdx), 110), width - 110),
            top: Math.min(y(values[cancelledIdx]!) + 14, baseY - 26),
          }}
        >
          <span
            aria-hidden
            className="flex size-3.5 items-center justify-center rounded-full border border-red-400 text-[9px] leading-none text-text-danger"
          >
            ×
          </span>
          {formatRoundNumber(points[cancelledIdx]!.roundNumber)} cancelled · refunded
        </span>
      )}
      {hp && hover !== null && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 flex min-w-40 flex-col gap-0.5 rounded-md border border-border-default bg-surface-overlay px-3 py-2 shadow-elevation-3"
          style={{
            left: Math.min(Math.max(x(hover) - 80, 0), width - 168),
            top: Math.max(y(values[hover]!) - 74, 0),
          }}
        >
          <span className="text-caption text-text-tertiary">
            Round {formatRoundNumber(hp.roundNumber)} · {formatDateUTC(hp.closesAt)}
          </span>
          <span className="text-label-m text-text-primary tabular-nums">{formatUSDT(hp.pool)}</span>
          <span
            className={cn(
              'text-caption',
              hp.status === 'cancelled'
                ? 'text-text-danger'
                : hp.status === 'open'
                  ? 'text-text-brand'
                  : 'text-text-secondary',
            )}
          >
            {hp.status === 'cancelled'
              ? 'Cancelled — threshold not met, refunded'
              : hp.status === 'open'
                ? 'Open — live pool'
                : 'Settled'}
          </span>
        </div>
      )}
      <table className="sr-only">
        <caption>Closing pool per daily round</caption>
        <thead>
          <tr>
            <th scope="col">Round</th>
            <th scope="col">Date</th>
            <th scope="col">Pool</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.roundNumber}>
              <td>{formatRoundNumber(p.roundNumber)}</td>
              <td>{formatDateUTC(p.closesAt)}</td>
              <td>{formatUSDT(p.pool)}</td>
              <td>{p.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
