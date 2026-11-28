import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Card surfaces (Figma CMP-04): default (surface/default + hairline), raised, outline, gold (jackpot tint),
 * interactive (hover lift for clickable cards). Radius lg (14) by default, xl (20) for hero cards.
 */
export const cardVariants = cva('relative flex flex-col text-text-primary', {
  variants: {
    variant: {
      default: 'border border-border-subtle bg-surface-default shadow-inner-hairline',
      raised: 'border border-border-subtle bg-surface-raised shadow-elevation-1',
      outline: 'border border-border-default bg-transparent',
      sunken: 'border border-border-subtle bg-bg-secondary',
      gold: 'border border-border-gold bg-surface-default bg-gradient-gold-tint',
      interactive:
        'border border-border-subtle bg-surface-default shadow-inner-hairline transition-[border-color,background-color,transform] duration-150 ease-standard hover:border-border-strong hover:bg-surface-raised has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-border-focus',
    },
    radius: { lg: 'rounded-lg', xl: 'rounded-xl' },
    padding: { none: '', s: 'gap-3 p-4', m: 'gap-4 p-5', l: 'gap-5 p-6' },
  },
  defaultVariants: { variant: 'default', radius: 'lg', padding: 'm' },
});

export type CardProps = React.ComponentProps<'div'> & VariantProps<typeof cardVariants>;

export function Card({ className, variant, radius, padding, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant, radius, padding }), className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn('flex min-w-0 items-start justify-between gap-3', className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  as: Comp = 'h3',
  ...props
}: React.ComponentProps<'h3'> & { as?: 'h2' | 'h3' | 'h4' | 'p' }) {
  return (
    <Comp
      data-slot="card-title"
      className={cn('text-h5 text-text-primary', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-description"
      className={cn('text-body-s text-text-secondary', className)}
      {...props}
    />
  );
}

export function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn('flex shrink-0 items-center gap-2', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('min-w-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'mt-auto flex items-center gap-3 border-t border-border-subtle pt-4',
        className,
      )}
      {...props}
    />
  );
}

/** Overline label used across cards ("POOL BALANCE", "CATEGORY"). */
export function Overline({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-overline uppercase text-text-tertiary', className)} {...props} />;
}
