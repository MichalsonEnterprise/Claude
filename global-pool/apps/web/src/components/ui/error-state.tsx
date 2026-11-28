'use client';

import {
  Clock,
  Construction,
  Hourglass,
  Lock,
  RefreshCw,
  SearchX,
  ServerCrash,
  TriangleAlert,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import * as React from 'react';

import { describeError, type ErrorKind } from '@/lib/api/errors';
import { cn } from '@/lib/utils';

import { Button } from './button';
import { EmptyState } from './empty-state';

const KIND_ICON: Record<ErrorKind, LucideIcon> = {
  network: WifiOff,
  timeout: Clock,
  'rate-limited': Hourglass,
  maintenance: Construction,
  server: ServerCrash,
  'not-found': SearchX,
  forbidden: Lock,
  unauthenticated: Lock,
  validation: TriangleAlert,
  client: TriangleAlert,
  unknown: TriangleAlert,
};

/** Seconds left before a 429 retry is allowed (restarts whenever `error` changes). */
export function useRetryCountdown(seconds: number | undefined, error: unknown): number {
  const [left, setLeft] = React.useState(seconds ?? 0);
  React.useEffect(() => {
    if (!seconds) {
      setLeft(0);
      return;
    }
    const until = Date.now() + seconds * 1000;
    setLeft(seconds);
    const id = window.setInterval(() => {
      const s = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) window.clearInterval(id);
    }, 1000);
    return () => window.clearInterval(id);
  }, [seconds, error]);
  return left;
}

export interface ErrorStateProps {
  /** Whatever the query / mutation threw (ApiRequestError, ApiNetworkError, ApiTimeoutError, …). */
  error: unknown;
  /** Retry handler (usually `query.refetch`). Shown for retryable kinds; a 429 counts down Retry-After first. */
  onRetry?: () => unknown;
  /** True while the retry is in flight (button spinner). */
  retrying?: boolean;
  /** What failed to load, for the default title: "We couldn’t load {what}". */
  what?: string;
  /** Overrides the derived title / description. */
  title?: string;
  description?: React.ReactNode;
  /** Extra reassurance line under the description (e.g. "Your balance and entries are not affected."). */
  note?: React.ReactNode;
  /** Extra actions next to Try again (e.g. a Support link). */
  actions?: React.ReactNode;
  /** `panel` = centred Table/Empty State (Error); `inline` = compact row for cards and widgets. */
  variant?: 'panel' | 'inline';
  className?: string;
}

/**
 * ERR-02 error state for a failed query or action: readable title + next step per error kind (offline, timeout,
 * 429 with a Retry-After countdown, maintenance 503, server 5xx, not found, no access, validation), the API
 * request id as reference, and Try again. Never shows raw transport text. Use it (or a module wrapper around it)
 * wherever a query can fail — never fall back to a skeleton or an empty state for a failed request.
 */
export function ErrorState({
  error,
  onRetry,
  retrying,
  what = 'this',
  title,
  description,
  note,
  actions,
  variant = 'panel',
  className,
}: ErrorStateProps) {
  const d = describeError(error, what);
  const Icon = KIND_ICON[d.kind];
  const wait = useRetryCountdown(
    d.kind === 'rate-limited' ? d.retryAfterSeconds : undefined,
    error,
  );
  const canRetry = Boolean(onRetry) && d.retryable;
  const retry = canRetry ? (
    <Button
      variant="secondary"
      size="s"
      leadingIcon={<RefreshCw aria-hidden />}
      onClick={() => void onRetry?.()}
      disabled={wait > 0}
      loading={retrying}
    >
      {wait > 0 ? `Try again in ${wait} s` : 'Try again'}
    </Button>
  ) : null;

  if (variant === 'inline') {
    return (
      <div
        role="alert"
        data-error-kind={d.kind}
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-lg border border-status-danger/35 bg-status-danger-tint px-4 py-3',
          className,
        )}
      >
        <Icon aria-hidden className="size-5 shrink-0 text-text-danger" />
        {/* min width: on phones the actions wrap under the text instead of squeezing it into a narrow column */}
        <div className="flex min-w-[12rem] flex-1 flex-col gap-0.5">
          <p className="text-label-m text-text-primary">{title ?? d.title}</p>
          <p className="text-body-s text-text-secondary">
            {description ?? d.description}
            {note ? <> {note}</> : null}
          </p>
          {d.reference && (
            <p className="font-mono text-mono-s text-text-tertiary">Ref {d.reference}</p>
          )}
        </div>
        {(retry || actions) && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {retry}
            {actions}
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-error-kind={d.kind} className={className}>
      <EmptyState
        type="error"
        icon={<Icon aria-hidden />}
        title={title ?? d.title}
        description={
          <>
            {description ?? d.description}
            {note ? <span className="mt-1 block">{note}</span> : null}
          </>
        }
        reference={d.reference}
        actions={
          retry || actions ? (
            <>
              {retry}
              {actions}
            </>
          ) : undefined
        }
      />
    </div>
  );
}
