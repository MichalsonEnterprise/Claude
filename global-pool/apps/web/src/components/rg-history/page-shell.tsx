'use client';

import { ChevronLeft, ChevronRight, LogIn, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { AgeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

export interface SubNavItem {
  label: string;
  href: string;
}

/** Breadcrumb + title row + sub-navigation (desktop underline tabs, mobile scrolling pills). */
export function PageShell({
  crumbs,
  title,
  sub,
  mobileSub,
  backHref,
  backLabel,
  nav,
  activeHref,
  actions,
  demo = true,
  ageBadge = true,
  banner,
  children,
  navLabel,
}: {
  crumbs: { label: string; href?: string }[];
  title: string;
  sub?: React.ReactNode;
  mobileSub?: React.ReactNode;
  backHref: string;
  backLabel: string;
  nav: SubNavItem[];
  activeHref: string;
  actions?: React.ReactNode;
  demo?: boolean;
  ageBadge?: boolean;
  banner?: React.ReactNode;
  children: React.ReactNode;
  navLabel: string;
}) {
  const pillsRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    // keep the active pill visible on narrow screens (horizontal scroller)
    const el = pillsRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }, [activeHref]);

  return (
    <div className="flex flex-col gap-6 tablet:gap-6">
      {banner}
      <div className="flex flex-col gap-4">
        <nav aria-label="Breadcrumb" className="hidden tablet:block">
          <ol className="flex flex-wrap items-center gap-2 text-body-s">
            {crumbs.map((c, i) => (
              <li key={c.label} className="flex items-center gap-2">
                {i > 0 && <ChevronRight aria-hidden className="size-3.5 text-icon-muted" />}
                {c.href && i < crumbs.length - 1 ? (
                  <Link href={c.href} className="text-text-tertiary hover:text-text-primary">
                    {c.label}
                  </Link>
                ) : (
                  <span
                    aria-current={i === crumbs.length - 1 ? 'page' : undefined}
                    className="text-text-primary"
                  >
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <Button variant="ghost" size="s" asChild className="-ml-2 self-start tablet:hidden">
          <Link href={backHref}>
            <ChevronLeft aria-hidden />
            {backLabel}
          </Link>
        </Button>
        <div className="flex flex-col gap-4 tablet:flex-row tablet:items-end tablet:justify-between tablet:gap-6">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-h3 text-text-primary tablet:text-h2">{title}</h1>
              {ageBadge && <AgeBadge className="tablet:hidden" />}
              {demo && <DemoBadge size="m" className="tablet:hidden" />}
            </div>
            {sub && (
              <p
                className={cn(
                  'max-w-[720px] text-body-s text-text-secondary tablet:text-body-m',
                  mobileSub && 'hidden tablet:block',
                )}
              >
                {sub}
              </p>
            )}
            {mobileSub && (
              <p className="text-body-s text-text-secondary tablet:hidden">{mobileSub}</p>
            )}
          </div>
          <div className="hidden shrink-0 items-center gap-3 tablet:flex">
            {demo && <DemoBadge size="m" />}
            {ageBadge && <AgeBadge />}
            {actions ?? (
              <Button variant="secondary" size="m" asChild>
                <Link href="/support">
                  <MessageCircle aria-hidden />
                  Talk to support
                </Link>
              </Button>
            )}
          </div>
        </div>
        <nav aria-label={navLabel}>
          <ul className="hidden gap-1 border-b border-border-subtle tablet:flex tablet:flex-wrap">
            {nav.map((n) => {
              const active = n.href === activeHref;
              return (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex h-11 items-center px-2 text-label-m transition-colors',
                      'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full',
                      active
                        ? 'text-text-primary after:bg-brand'
                        : 'text-text-secondary hover:text-text-primary',
                    )}
                  >
                    {n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div
            ref={pillsRef}
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] tablet:hidden [&::-webkit-scrollbar]:hidden"
          >
            {nav.map((n) => {
              const active = n.href === activeHref;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-label-m whitespace-nowrap',
                    active
                      ? 'border-brand bg-brand-tint text-text-brand'
                      : 'border-border-subtle bg-surface-default text-text-secondary',
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
      {children}
    </div>
  );
}

/** Auth gate: skeleton while auth resolves, sign-in prompt for guests, children for members. */
export function MemberOnly({ children, what }: { children: React.ReactNode; what: string }) {
  const { status, signIn } = useAuth();
  if (status === 'loading') return <PageSkeleton />;
  if (status === 'guest') {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-default">
        <EmptyState
          title={`Sign in to see your ${what}`}
          description="Your limits and history are stored on your account, not in this browser."
          actions={
            <Button onClick={signIn} size="l">
              <LogIn aria-hidden />
              Sign in
            </Button>
          }
        />
      </div>
    );
  }
  return <>{children}</>;
}

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-6">
      <Skeleton className="h-16 w-full rounded-lg" />
      <div className="grid grid-cols-1 gap-6 laptop:grid-cols-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}

/** Error card with retry (shared `<ErrorState>`): readable reason per error kind + API request id. */
export function QueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-default">
      <ErrorState
        error={error}
        onRetry={onRetry}
        what="this page"
        note="Your limits and balance are not affected."
      />
    </div>
  );
}
