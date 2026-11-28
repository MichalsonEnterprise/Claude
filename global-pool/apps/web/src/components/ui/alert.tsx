'use client';

import { cva } from 'class-variance-authority';
import {
  Construction,
  Globe2,
  Info,
  Scale,
  ShieldAlert,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Alert/Banner (Figma): Info · Warning · Security · Regional restriction · Maintenance · Regulatory notice;
 * Inline (radius 14) or Full width (pinned under / above the top bar). Security, regional restriction and
 * regulatory notices are never dismissible.
 */
export type AlertType =
  'info' | 'warning' | 'security' | 'restricted' | 'maintenance' | 'regulatory';

const SPEC: Record<
  AlertType,
  { icon: LucideIcon; dismissible: boolean; role: 'status' | 'alert' }
> = {
  info: { icon: Info, dismissible: true, role: 'status' },
  warning: { icon: TriangleAlert, dismissible: true, role: 'status' },
  security: { icon: ShieldAlert, dismissible: false, role: 'alert' },
  restricted: { icon: Globe2, dismissible: false, role: 'alert' },
  maintenance: { icon: Construction, dismissible: true, role: 'status' },
  regulatory: { icon: Scale, dismissible: false, role: 'status' },
};

const alertVariants = cva('relative flex w-full gap-3 text-body-s', {
  variants: {
    type: {
      info: 'border-sky-500/30 bg-status-info-tint [&_[data-icon]]:text-text-info',
      warning: 'border-status-warning/30 bg-status-warning-tint [&_[data-icon]]:text-text-warning',
      security: 'border-status-danger/35 bg-status-danger-tint [&_[data-icon]]:text-text-danger',
      restricted: 'border-status-danger/35 bg-red-950 [&_[data-icon]]:text-text-danger',
      maintenance:
        'border-status-pending/30 bg-status-pending-tint [&_[data-icon]]:text-status-pending',
      regulatory: 'border-border-default bg-surface-default [&_[data-icon]]:text-icon-muted',
    },
    layout: {
      inline: 'rounded-lg border p-4',
      full: 'border-b px-4 py-3 tablet:px-6',
    },
  },
  defaultVariants: { type: 'info', layout: 'inline' },
});

export interface AlertProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  type?: AlertType;
  layout?: 'inline' | 'full';
  title?: React.ReactNode;
  /** Action buttons / links (right side on wide layouts). */
  actions?: React.ReactNode;
  /** Called when the close button is pressed; ignored for non-dismissible types. */
  onDismiss?: () => void;
}

export function Alert({
  type = 'info',
  layout = 'inline',
  title,
  actions,
  onDismiss,
  className,
  children,
  ...props
}: AlertProps) {
  const spec = SPEC[type];
  const Icon = spec.icon;
  const dismissible = spec.dismissible && onDismiss;
  return (
    <div
      role={spec.role}
      data-slot="alert"
      data-type={type}
      className={cn(alertVariants({ type, layout }), className)}
      {...props}
    >
      <Icon data-icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col gap-3',
          layout === 'full' && 'laptop:flex-row laptop:items-center laptop:justify-between',
        )}
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          {title && <p className="text-label-m text-text-primary">{title}</p>}
          {children && <div className="text-body-s text-text-secondary">{children}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-md text-icon-muted hover:bg-surface-hover hover:text-icon-default"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}
