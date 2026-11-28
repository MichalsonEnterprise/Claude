import { Info, TriangleAlert } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * DEMO marker (Figma Badge/DEMO): dashed amber outline. XS inline in table cells, S beside values / cards,
 * M "DEMO DATA" in section headers. Every DEMO value in the UI carries one (DEV_CONVENTIONS guardrail).
 */
export function DemoBadge({
  size = 's',
  label,
  className,
  ...props
}: Omit<React.ComponentProps<'span'>, 'children'> & {
  size?: 'xs' | 's' | 'm';
  /** Override the text (e.g. "Dev mock"). */
  label?: string;
}) {
  return (
    <span
      data-slot="demo-badge"
      title="Illustrative DEMO value — not real"
      className={cn(
        'inline-flex shrink-0 select-none items-center gap-1 rounded-xs border border-dashed border-status-warning bg-status-warning-tint font-semibold uppercase leading-none tracking-[0.06em] text-text-warning',
        size === 'xs' && 'h-4 px-1 text-[9px]',
        size === 's' && 'h-5 px-1.5 text-[10px]',
        size === 'm' && 'h-6 px-2 text-[11px] [&_svg]:size-3',
        className,
      )}
      {...props}
    >
      {size === 'm' && <Info aria-hidden />}
      {label ?? (size === 'm' ? 'Demo data' : 'Demo')}
    </span>
  );
}

export const DEMO_NOTICE_FULL =
  'DEMO DATA — every figure, name, address, hash and result on this page is illustrative only and not real.';
export const DEMO_NOTICE_SHORT = 'DEMO DATA — illustrative values only';

/**
 * Page-level DEMO notice (Figma Notice/Demo Data): first element of every screen, full width.
 * Below 768 px the short message is shown (decision #29) so it never clips.
 */
export function DemoBar({
  message = DEMO_NOTICE_FULL,
  shortMessage = DEMO_NOTICE_SHORT,
  className,
}: {
  message?: string;
  shortMessage?: string;
  className?: string;
}) {
  return (
    <div
      role="note"
      aria-label="Demo data notice"
      data-slot="demo-bar"
      className={cn(
        'flex h-9 w-full items-center justify-center gap-2 overflow-hidden border-b border-status-warning/25 bg-amber-950 px-4 text-center text-caption whitespace-nowrap text-text-warning',
        className,
      )}
    >
      <TriangleAlert aria-hidden className="size-4 shrink-0" />
      <span className="hidden truncate tablet:inline">{message}</span>
      <span className="truncate tablet:hidden">{shortMessage}</span>
    </div>
  );
}
