import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import * as React from 'react';

import { Card } from '@/components/ui/card';
import { DemoBadge } from '@/components/ui/demo-badge';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  /** Pre-formatted value ('186,400.00', '41,206', '99.97%'). */
  value: string;
  unit?: string;
  delta?: { value: string; trend: 'up' | 'down' | 'neutral'; context?: string };
  /** Optional sparkline points (display only). */
  series?: readonly number[];
  icon?: React.ReactNode;
  size?: 'm' | 'l';
  demo?: boolean;
  className?: string;
}

function Sparkline({
  series,
  trend,
}: {
  series: readonly number[];
  trend: 'up' | 'down' | 'neutral';
}) {
  const w = 120;
  const h = 36;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pts = series.map((v, i) => [
    (i / Math.max(series.length - 1, 1)) * w,
    h - 2 - ((v - min) / span) * (h - 4),
  ]);
  const line = pts.map(([x, y]) => `${x?.toFixed(1)},${y?.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1] ?? [w, h / 2];
  const stroke =
    trend === 'down'
      ? 'stroke-status-danger'
      : trend === 'up'
        ? 'stroke-brand'
        : 'stroke-text-tertiary';
  const fill =
    trend === 'down' ? 'fill-status-danger' : trend === 'up' ? 'fill-brand' : 'fill-text-tertiary';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-28 overflow-visible" aria-hidden>
      <polyline
        points={line}
        className={cn('fill-none', stroke)}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r={3} className={fill} />
    </svg>
  );
}

/** Card/Stat (M 288 · L 400): label, value + unit, delta chip with context, optional sparkline. */
export function StatCard({
  label,
  value,
  unit,
  delta,
  series,
  icon,
  size = 'm',
  demo = false,
  className,
}: StatCardProps) {
  const TrendIcon =
    delta?.trend === 'up' ? ArrowUpRight : delta?.trend === 'down' ? ArrowDownRight : ArrowRight;
  return (
    <Card padding={size === 'l' ? 'l' : 'm'} className={cn('gap-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && size === 'l' && (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-tint text-icon-brand [&_svg]:size-5">
              {icon}
            </span>
          )}
          <p className="truncate text-body-s text-text-secondary">{label}</p>
        </div>
        {demo && <DemoBadge size="s" />}
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="flex min-w-0 items-baseline gap-1.5">
          <span className={cn('tabular-nums', size === 'l' ? 'text-number-l' : 'text-number-m')}>
            {value}
          </span>
          {unit && <span className="text-body-s text-text-secondary">{unit}</span>}
        </p>
        {series && series.length > 1 && (
          <Sparkline series={series} trend={delta?.trend ?? 'neutral'} />
        )}
      </div>
      {delta && (
        <p className="flex flex-wrap items-center gap-2 text-caption text-text-tertiary">
          <span
            className={cn(
              'inline-flex h-5 items-center gap-0.5 rounded-full px-1.5 font-medium',
              delta.trend === 'up' && 'bg-status-success-tint text-text-success',
              delta.trend === 'down' && 'bg-status-danger-tint text-text-danger',
              delta.trend === 'neutral' && 'bg-surface-pressed text-text-secondary',
            )}
          >
            <TrendIcon aria-hidden className="size-3.5" />
            {delta.value}
          </span>
          {delta.context}
        </p>
      )}
    </Card>
  );
}
