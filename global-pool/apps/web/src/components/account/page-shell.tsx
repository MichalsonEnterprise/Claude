'use client';

import { ChevronLeft, ChevronRight, LayoutGrid, LogIn, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { CountBadge } from '@/components/ui/badge';
import { Button, IconButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe, useNotifications } from '@/lib/api/account';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

import {
  ACCOUNT_ROUTES,
  ACCOUNT_TABS,
  DASHBOARD_TABS,
  isTabActive,
  type AccountTabId,
  type DashboardTabId,
} from './nav';
import { Demo } from './primitives';

export interface Crumb {
  label: string;
  href?: string;
}

export interface DashboardPageProps {
  /** Active in-page dashboard section (USR-00 sub-nav). */
  tab: DashboardTabId;
  /** Active account pill (USR-A1…A10) — shows the Account & security pills row. */
  accountTab?: AccountTabId;
  crumbs: Crumb[];
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Chips under the title (VIP, KYC, 2FA …). */
  chips?: React.ReactNode;
  actions?: React.ReactNode;
  /** Shows the "DEMO DATA" marker next to the title. */
  demo?: boolean;
  /** Full-width banner above the header (e.g. restricted region). */
  banner?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Dashboard page frame (USR-00): breadcrumb, title row, in-page dashboard sub-nav (underline tabs; a "Dashboard
 * sections" bottom sheet on mobile) and, for account pages, the Account & security pills. Guests get a sign-in
 * prompt; the page body renders only for members (every query is member-only).
 */
export function DashboardPage({
  tab,
  accountTab,
  crumbs,
  title,
  description,
  chips,
  actions,
  demo = false,
  banner,
  children,
  className,
}: DashboardPageProps) {
  const auth = useAuth();
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const unread = useNotifications({ page: 1, pageSize: 1 }).data?.unread ?? 0;
  const me = useMe();

  React.useEffect(() => setSheetOpen(false), [pathname]);

  if (auth.status === 'loading') return <PageSkeleton />;
  if (auth.status === 'guest') return <SignInGate />;

  return (
    <div className={cn('flex flex-col gap-6 tablet:gap-8', className)}>
      {banner}
      <header className="flex flex-col gap-4">
        <nav aria-label="Breadcrumb" className="hidden tablet:block">
          <ol className="flex flex-wrap items-center gap-2 text-body-s">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={`${c.label}-${i}`} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight aria-hidden className="size-3.5 text-icon-muted" />}
                  {c.href && !last ? (
                    <Link
                      href={c.href}
                      className="rounded-sm text-text-tertiary hover:text-text-primary"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={last ? 'page' : undefined}
                      className={last ? 'text-text-primary' : 'text-text-tertiary'}
                    >
                      {c.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
        {accountTab ? (
          <Link
            href={accountTab === 'profile' ? ACCOUNT_ROUTES.dashboard : ACCOUNT_ROUTES.profile}
            className="-ml-1 inline-flex min-h-11 items-center gap-1 self-start rounded-sm text-body-s text-text-secondary hover:text-text-primary tablet:hidden"
          >
            <ChevronLeft aria-hidden className="size-4" />
            {accountTab === 'profile' ? 'Dashboard' : 'Account & security'}
          </Link>
        ) : (
          <p className="text-overline uppercase text-text-tertiary tablet:hidden">
            {crumbs[crumbs.length - 2]?.label ?? 'Dashboard'}
          </p>
        )}
        <div className="flex flex-col gap-4 laptop:flex-row laptop:items-end laptop:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-h3 text-text-primary tablet:text-h2">{title}</h1>
              {demo && <Demo size="m" className="hidden tablet:inline-flex" />}
            </div>
            {chips && <div className="flex flex-wrap items-center gap-2">{chips}</div>}
            {description && (
              <p className="max-w-[720px] text-body-m text-text-secondary">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2 max-tablet:[&>*]:flex-1 laptop:shrink-0 laptop:justify-end">
              {actions}
            </div>
          )}
        </div>
      </header>

      <div className={cn('-mt-2 items-center gap-2', accountTab ? 'hidden tablet:flex' : 'flex')}>
        <nav aria-label="Dashboard sections" className="min-w-0 flex-1">
          <ul className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mb-px flex gap-6 overflow-x-auto border-b border-border-subtle">
            {DASHBOARD_TABS.map((t) => {
              const active = t.id === tab || (tab === undefined && isTabActive(t, pathname));
              return (
                <li key={t.id} className="shrink-0">
                  <Link
                    href={t.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative inline-flex h-11 items-center gap-1.5 text-body-s-strong whitespace-nowrap transition-colors',
                      active ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary',
                    )}
                  >
                    {t.label}
                    {t.id === 'notifications' && unread > 0 && (
                      <CountBadge count={unread} aria-label={`${unread} unread`} />
                    )}
                    {active && (
                      <span
                        aria-hidden
                        className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand"
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <IconButton
          label="All dashboard sections"
          variant="secondary"
          size="l"
          className="size-11 shrink-0 laptop:hidden"
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
        >
          <LayoutGrid aria-hidden />
        </IconButton>
      </div>

      {accountTab && (
        <div className="-mt-2 flex items-center gap-2">
          <nav aria-label="Account and security" className="min-w-0 flex-1">
            <ul className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex gap-2 overflow-x-auto pb-1">
              {ACCOUNT_TABS.map((t) => {
                const active = t.id === accountTab;
                return (
                  <li key={t.id} className="shrink-0">
                    <Link
                      href={t.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'inline-flex h-10 items-center rounded-full px-4 text-label-m whitespace-nowrap transition-colors',
                        active
                          ? 'border border-border-brand bg-brand-tint text-text-brand'
                          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                      )}
                    >
                      {t.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <IconButton
            label="All dashboard sections"
            variant="secondary"
            size="l"
            className="size-11 shrink-0 tablet:hidden"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
          >
            <LayoutGrid aria-hidden />
          </IconButton>
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-6">{children}</div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[88dvh]">
          <SheetHeader>
            <SheetTitle>Dashboard</SheetTitle>
            <SheetDescription>
              {me.data
                ? `${me.data.displayHandle ?? ''} · ${me.data.publicId}`
                : 'Your account sections'}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-1 pb-6">
            {DASHBOARD_TABS.map((t) => {
              const active = t.id === tab;
              const Icon = t.icon;
              return (
                <Link
                  key={t.id}
                  href={t.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative flex min-h-12 items-center gap-3 rounded-md px-4 text-body-m-strong transition-colors',
                    active
                      ? 'bg-brand-tint text-text-brand'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-y-2 left-0 w-1 rounded-full bg-brand"
                    />
                  )}
                  <Icon aria-hidden className="size-5" />
                  <span className="flex-1">{t.label}</span>
                  {t.id === 'notifications' && unread > 0 && (
                    <CountBadge count={unread} tone="danger" />
                  )}
                </Link>
              );
            })}
            {accountTab && (
              <>
                <p className="mt-4 px-4 text-overline uppercase text-text-tertiary">
                  Account &amp; security
                </p>
                {ACCOUNT_TABS.map((t) => {
                  const Icon = t.icon;
                  const active = t.id === accountTab;
                  return (
                    <Link
                      key={t.id}
                      href={t.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-11 items-center gap-3 rounded-md px-4 text-body-s-strong',
                        active
                          ? 'text-text-brand'
                          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                      )}
                    >
                      <Icon aria-hidden className="size-[18px]" />
                      {t.title}
                    </Link>
                  );
                })}
              </>
            )}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading your dashboard">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-9 w-80 max-w-full" />
      <Skeleton className="h-11 w-full" />
      <div className="grid gap-4 tablet:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

function SignInGate() {
  const auth = useAuth();
  const pathname = usePathname();
  return (
    <Card className="mx-auto mt-6 w-full max-w-[560px]" padding="l">
      <EmptyState
        icon={<UserRound aria-hidden />}
        title="Sign in to see your dashboard"
        description="Your balances, entries, security settings and verification live here. No password needed — sign in with your email, a social login or a wallet. 18+ only."
        actions={
          <Button
            size="l"
            leadingIcon={<LogIn aria-hidden />}
            onClick={() =>
              auth.openAuth ? auth.openAuth('sign-in', { next: pathname }) : auth.signIn()
            }
          >
            Sign in
          </Button>
        }
      />
    </Card>
  );
}
