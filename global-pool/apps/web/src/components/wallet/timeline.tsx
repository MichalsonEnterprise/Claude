import { Check, Circle, ScanSearch, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

export type TimelineState = 'done' | 'current' | 'todo' | 'review' | 'error';

export interface TimelineItem {
  id: string;
  title: React.ReactNode;
  detail?: React.ReactNode;
  /** Right-aligned time, e.g. "18:40:12 UTC". */
  time?: React.ReactNode;
  state: TimelineState;
  /** Extra content under the detail (progress bar, hash…). */
  extra?: React.ReactNode;
}

const DOT: Record<TimelineState, string> = {
  done: 'border-status-success bg-status-success-tint text-text-success',
  current: 'border-brand bg-brand-tint text-text-brand',
  todo: 'border-border-default bg-transparent text-icon-muted',
  review: 'border-status-warning bg-status-warning-tint text-text-warning',
  error: 'border-status-danger bg-status-danger-tint text-text-danger',
};

const STATE_LABEL: Record<TimelineState, string> = {
  done: 'Done',
  current: 'In progress',
  todo: 'Not yet',
  review: 'Under review',
  error: 'Failed',
};

/** Tx/Status Timeline: vertical steps with done / current / to-do / review / error states (icon + text, not colour only). */
export function StatusTimeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn('flex flex-col', className)}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <li key={it.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className={cn(
                  'absolute top-7 bottom-0 left-[11px] w-0.5 rounded-full',
                  it.state === 'done' ? 'bg-status-success/60' : 'bg-border-default',
                )}
              />
            )}
            <span
              className={cn(
                'relative z-[1] flex size-6 shrink-0 items-center justify-center rounded-full border-2 [&_svg]:size-3.5',
                DOT[it.state],
              )}
            >
              {it.state === 'done' && <Check aria-hidden strokeWidth={3} />}
              {it.state === 'current' && <Circle aria-hidden className="fill-current" />}
              {it.state === 'review' && <ScanSearch aria-hidden />}
              {it.state === 'error' && <X aria-hidden strokeWidth={3} />}
              <span className="sr-only">{STATE_LABEL[it.state]}:</span>
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-start justify-between gap-3">
                <p
                  className={cn(
                    'text-body-s-strong',
                    it.state === 'todo' ? 'text-text-tertiary' : 'text-text-primary',
                  )}
                >
                  {it.title}
                </p>
                {it.time && (
                  <span className="shrink-0 text-caption tabular-nums text-text-tertiary">{it.time}</span>
                )}
              </div>
              {it.detail && <p className="text-caption text-text-tertiary">{it.detail}</p>}
              {it.extra && <div className="mt-2">{it.extra}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
