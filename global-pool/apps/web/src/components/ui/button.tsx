import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { Slot } from 'radix-ui';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Button (Figma Button/Primary · Secondary · Ghost · Danger · Gold · Icon).
 * Sizes S 32 / M 40 / L 48. States: hover, pressed (:active), focus-visible (2px mint outline + 2px offset),
 * disabled, loading. Gold is reserved for jackpot / Global Pool participation CTAs (decision #14).
 */
export const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md',
    'font-semibold transition-[background-color,color,border-color,box-shadow] duration-150 ease-standard',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus',
    'disabled:pointer-events-none aria-disabled:pointer-events-none',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-brand text-text-on-primary hover:bg-brand-hover active:bg-brand-pressed',
          'disabled:bg-brand-disabled disabled:text-text-disabled',
        ],
        secondary: [
          'border border-border-default bg-surface-raised text-text-primary hover:border-border-strong hover:bg-ink-600 active:bg-ink-550',
          'disabled:border-border-subtle disabled:bg-surface-default disabled:text-text-disabled',
        ],
        ghost: [
          'bg-transparent text-text-primary hover:bg-surface-hover active:bg-surface-pressed',
          'disabled:text-text-disabled',
        ],
        danger: [
          'bg-status-danger-strong text-text-on-danger hover:bg-status-danger-hover active:bg-red-700',
          'disabled:bg-red-950 disabled:text-text-disabled',
        ],
        gold: [
          'bg-gold text-text-on-gold hover:bg-gold-soft active:bg-gold-strong',
          'disabled:bg-gold-900 disabled:text-text-disabled',
        ],
        link: 'h-auto px-0 text-text-brand underline-offset-4 hover:underline disabled:text-text-disabled',
      },
      size: {
        s: 'h-8 px-3 text-label-m [&_svg:not([class*=size-])]:size-4',
        m: 'h-10 px-4 text-label-m [&_svg:not([class*=size-])]:size-[18px]',
        l: 'h-12 px-5 text-label-l [&_svg:not([class*=size-])]:size-5',
      },
      block: { true: 'w-full' },
    },
    compoundVariants: [{ variant: 'link', className: 'h-auto px-0' }],
    defaultVariants: { variant: 'primary', size: 'm' },
  },
);

/** While loading the button is disabled (no double submit) but keeps its colour, with a spinner. */
const LOADING_KEEPS_COLOUR: Record<
  NonNullable<VariantProps<typeof buttonVariants>['variant']>,
  string
> = {
  primary: 'disabled:bg-brand disabled:text-text-on-primary',
  secondary: 'disabled:border-border-default disabled:bg-surface-raised disabled:text-text-primary',
  ghost: 'disabled:text-text-primary',
  danger: 'disabled:bg-status-danger-strong disabled:text-text-on-danger',
  gold: 'disabled:bg-gold disabled:text-text-on-gold',
  link: '',
};

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

export interface ButtonProps
  extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  /** Render the child element (e.g. next/link) with button styles. */
  asChild?: boolean;
  /** Shows a spinner, sets aria-busy and disables the button. */
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  loading = false,
  leadingIcon,
  trailingIcon,
  disabled,
  children,
  type,
  ...props
}: ButtonProps) {
  const classes = cn(
    buttonVariants({ variant, size, block }),
    loading && LOADING_KEEPS_COLOUR[variant ?? 'primary'],
    className,
  );
  if (asChild) {
    // Icons are rendered inside the child element (e.g. <Link>) via Slottable; without icons this is unchanged.
    if (leadingIcon || trailingIcon) {
      return (
        <Slot.Root data-slot="button" className={classes} {...props}>
          {leadingIcon}
          <Slot.Slottable>{children}</Slot.Slottable>
          {trailingIcon}
        </Slot.Root>
      );
    }
    return (
      <Slot.Root data-slot="button" className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }
  return (
    <button
      data-slot="button"
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  );
}

const iconButtonVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center rounded-md text-icon-default transition-colors duration-150 ease-standard',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus',
    'disabled:pointer-events-none disabled:text-text-disabled [&_svg]:pointer-events-none [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        ghost: 'bg-transparent hover:bg-surface-hover active:bg-surface-pressed',
        secondary:
          'border border-border-default bg-surface-raised hover:border-border-strong hover:bg-ink-600 active:bg-ink-550 disabled:bg-surface-default',
      },
      size: {
        s: 'size-8 [&_svg:not([class*=size-])]:size-4',
        m: 'size-10 [&_svg:not([class*=size-])]:size-5',
        l: 'size-12 [&_svg:not([class*=size-])]:size-6',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'm' },
  },
);

export interface IconButtonProps
  extends
    Omit<React.ComponentProps<'button'>, 'aria-label'>,
    VariantProps<typeof iconButtonVariants> {
  /** Accessible name — required because the button has no visible text. */
  label: string;
  asChild?: boolean;
}

/** Icon-only button (Figma Button/Icon: Ghost | Secondary, S 32 / M 40 / L 48). */
export function IconButton({
  className,
  variant,
  size,
  label,
  asChild = false,
  type,
  children,
  ...props
}: IconButtonProps) {
  const classes = cn(iconButtonVariants({ variant, size }), className);
  if (asChild) {
    return (
      <Slot.Root data-slot="icon-button" aria-label={label} className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }
  return (
    <button
      data-slot="icon-button"
      type={type ?? 'button'}
      aria-label={label}
      title={label}
      className={classes}
      {...props}
    >
      {children}
    </button>
  );
}
