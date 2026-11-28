'use client';

import { CircleAlert, CircleCheck, CircleX, ExternalLink, Info, Loader2, X } from 'lucide-react';
import * as React from 'react';
import { Toaster as Sonner, toast as sonnerToast, type ToasterProps } from 'sonner';

import { cn } from '@/lib/utils';

/**
 * Toasts (Figma Toast: Success · Error · Warning · Info · Tx pending). 400 wide, surface/overlay, radius 14,
 * elevation 3, 4px status accent bar. Top-right stack on desktop, bottom-centre above the tab bar on mobile.
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      gap={12}
      offset={24}
      mobileOffset={{ bottom: 'calc(var(--gp-tabbar-h) + 16px)', left: 16, right: 16 }}
      visibleToasts={4}
      toastOptions={{ unstyled: true }}
      {...props}
    />
  );
}

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'tx';

const TYPE: Record<ToastType, { icon: React.ReactNode; bar: string; iconClass: string }> = {
  success: { icon: <CircleCheck />, bar: 'bg-status-success', iconClass: 'text-text-success' },
  error: { icon: <CircleX />, bar: 'bg-status-danger', iconClass: 'text-text-danger' },
  warning: { icon: <CircleAlert />, bar: 'bg-status-warning', iconClass: 'text-text-warning' },
  info: { icon: <Info />, bar: 'bg-status-info', iconClass: 'text-text-info' },
  tx: {
    icon: <Loader2 className="animate-spin" />,
    bar: 'bg-status-info',
    iconClass: 'text-text-info',
  },
};

export interface ToastCardProps {
  type: ToastType;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Tx pending progress (e.g. 7 of 12 confirmations). */
  progress?: { current: number; total: number; label?: string };
  action?: { label: string; href?: string; onClick?: () => void };
  onDismiss?: () => void;
  className?: string;
}

/** The visual toast card (also rendered statically on /design-system). */
export function ToastCard({
  type,
  title,
  description,
  progress,
  action,
  onDismiss,
  className,
}: ToastCardProps) {
  const t = TYPE[type];
  return (
    <div
      className={cn(
        'relative flex w-[min(400px,calc(100vw-32px))] gap-3 overflow-hidden rounded-lg border border-border-subtle bg-surface-overlay py-3.5 pr-4 pl-5 text-text-primary shadow-elevation-3',
        className,
      )}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', t.bar)} />
      <span aria-hidden className={cn('mt-0.5 [&_svg]:size-5', t.iconClass)}>
        {t.icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-label-m">{title}</p>
        {description && <p className="text-body-s text-text-secondary">{description}</p>}
        {progress && (
          <div className="mt-1 flex flex-col gap-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full bg-status-info"
                style={{
                  width: `${Math.round((progress.current / Math.max(progress.total, 1)) * 100)}%`,
                }}
              />
            </div>
            <p className="text-caption text-text-tertiary tabular-nums">
              {progress.label ?? `${progress.current} / ${progress.total} confirmations`}
            </p>
          </div>
        )}
        {action &&
          (action.href ? (
            <a
              href={action.href}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex w-fit items-center gap-1 text-label-s text-text-brand hover:underline"
            >
              {action.label}
              <ExternalLink aria-hidden className="size-3.5" />
            </a>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="mt-1 w-fit text-label-s text-text-brand hover:underline"
            >
              {action.label}
            </button>
          ))}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="-mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-md text-icon-muted hover:bg-surface-hover hover:text-icon-default"
        >
          <X aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}

/** Show a styled toast. Returns the sonner id (use `toast.dismiss(id)` / pass `id` to update in place). */
export function toast(
  props: Omit<ToastCardProps, 'onDismiss'> & { id?: string | number; duration?: number },
): string | number {
  const { id, duration, ...card } = props;
  return sonnerToast.custom(
    (tid) => <ToastCard {...card} onDismiss={() => sonnerToast.dismiss(tid)} />,
    {
      id,
      duration: duration ?? (card.type === 'tx' ? Infinity : card.type === 'error' ? 8000 : 5000),
    },
  );
}

toast.dismiss = sonnerToast.dismiss;
