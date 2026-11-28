import * as React from 'react';

import { cn } from '@/lib/utils';

/** User/Avatar: initials on a deterministic token tint (no photos). Sizes XS 20 · S 24 · M 32 · L 40 · XL 56. */
const SIZE = {
  xs: 'size-5 text-[9px]',
  s: 'size-6 text-[10px]',
  m: 'size-8 text-label-s',
  l: 'size-10 text-label-m',
  xl: 'size-14 text-label-l',
} as const;

const TONES = [
  'bg-brand-tint text-text-brand border-border-brand',
  'bg-status-info-tint text-text-info border-sky-500/40',
  'bg-gold-tint-strong text-text-gold border-border-gold',
  'bg-status-pending-tint text-status-pending border-violet-400/40',
  'bg-status-danger-tint text-text-danger border-red-500/40',
] as const;

function toneFor(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length] ?? TONES[0];
}

export interface AvatarProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  initials: string;
  size?: keyof typeof SIZE;
  /** Online status dot. */
  status?: 'online' | 'away' | 'offline';
  /** Accessible name (e.g. "@nova.k"); omit when the name is shown next to it. */
  label?: string;
  /** Pin the colour (otherwise derived from the initials). */
  tone?: 'brand' | 'neutral';
}

export function Avatar({ initials, size = 'm', status, label, tone, className, ...props }: AvatarProps) {
  return (
    <span
      data-slot="avatar"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center rounded-full border font-semibold uppercase leading-none',
        SIZE[size],
        tone === 'brand'
          ? TONES[0]
          : tone === 'neutral'
            ? 'border-border-default bg-surface-raised text-text-secondary'
            : toneFor(initials),
        className,
      )}
      {...props}
    >
      {initials.slice(0, 2)}
      {status && (
        <span
          className={cn(
            'absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-bg-base',
            status === 'online' && 'bg-status-success',
            status === 'away' && 'bg-status-warning',
            status === 'offline' && 'bg-text-disabled',
          )}
        />
      )}
    </span>
  );
}
