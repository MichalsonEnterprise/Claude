'use client';

import { formatDateTimeUTC, formatTimeUTC } from '@gp/shared/format';
import {
  ArrowDownToLine,
  Ban,
  CircleAlert,
  Clock,
  Globe2,
  History,
  LifeBuoy,
  LogIn,
  PauseCircle,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  WifiOff,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

import { CreditsAmount, credits as fmt } from './parts';
import { GAMES_ROUTES } from './registry';
import type { DemoLossLimit } from './use-game-gate';

type Tone = 'info' | 'warning' | 'danger';

const TONE: Record<Tone, string> = {
  info: 'bg-status-info-tint text-text-info',
  warning: 'bg-status-warning-tint text-text-warning',
  danger: 'bg-status-danger-tint text-text-danger',
};

export interface NoticeFact {
  label: string;
  value: React.ReactNode;
  demo?: boolean;
}

/** Floating prompt card (DI-07): icon tile, title, body, facts, note, actions. */
export function PromptCard({
  icon: Icon,
  tone = 'info',
  title,
  body,
  facts,
  note,
  actions,
  className,
  live = 'polite',
}: {
  icon: LucideIcon;
  tone?: Tone;
  title: string;
  body: React.ReactNode;
  facts?: NoticeFact[];
  note?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  live?: 'polite' | 'assertive';
}) {
  return (
    <div
      role={live === 'assertive' ? 'alert' : 'status'}
      className={cn(
        'flex w-full max-w-[440px] flex-col gap-4 rounded-xl border border-border-subtle bg-surface-overlay p-5 shadow-elevation-4 tablet:p-6',
        className,
      )}
    >
      <span className={cn('flex size-12 items-center justify-center rounded-lg', TONE[tone])}>
        <Icon aria-hidden className="size-6" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="text-h4 text-text-primary">{title}</h2>
        <div className="text-body-s text-text-secondary">{body}</div>
      </div>
      {facts && facts.length > 0 && (
        <dl className="flex flex-col gap-2 rounded-md bg-bg-secondary p-3">
          {facts.map((f) => (
            <div key={f.label} className="flex items-center justify-between gap-3 text-body-s">
              <dt className="text-text-secondary">{f.label}</dt>
              <dd className="flex items-center gap-1.5 text-body-s-strong text-text-primary tabular-nums">
                {f.value}
                {f.demo && <DemoBadge size="xs" />}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {note && <p className="text-caption text-text-tertiary">{note}</p>}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export type GameNoticeKind =
  | 'guest'
  | 'onboarding'
  | 'region'
  | 'self_excluded'
  | 'blocked'
  | 'time_limit'
  | 'loss_limit'
  | 'offline'
  | 'reconnecting';

export interface GameNoticeProps {
  kind: GameNoticeKind;
  gameName: string;
  regionName?: string | null;
  exclusionEndsAt?: string | null;
  lossLimit?: DemoLossLimit | null;
  /** reconnecting: attempt n of max, bet ref / stake, retry handler. */
  reconnect?: { attempt: number; max: number; stake?: string; sentAt?: string | null; onRetry: () => void };
  onRetry?: () => void;
  className?: string;
}

const ACTION = 'min-h-11 tablet:min-h-10';

/** The blocking states every game shows over its stage (guest, region, self-exclusion, limits, connection). */
export function GameNotice({
  kind,
  gameName,
  regionName,
  exclusionEndsAt,
  lossLimit,
  reconnect,
  onRetry,
  className,
}: GameNoticeProps) {
  const auth = useAuth();
  const here = typeof window !== 'undefined' ? window.location.pathname : '/games';
  switch (kind) {
    case 'guest':
      return (
        <PromptCard
          className={className}
          icon={LogIn}
          title={`Sign in to play ${gameName}`}
          body="Signed-in players get 1,000.00 DEMO credits to try every original game. DEMO credits have no cash value — they can’t be bought, withdrawn or exchanged."
          note="18+ · permitted jurisdictions only · you can lose your stake."
          actions={
            <>
              <Button className={ACTION} onClick={() => (auth.openAuth ? auth.openAuth('sign-in', { next: here }) : auth.signIn())} leadingIcon={<LogIn aria-hidden />}>
                Sign in
              </Button>
              <Button variant="secondary" className={ACTION} onClick={() => (auth.openAuth ? auth.openAuth('sign-up', { next: here }) : auth.signUp())}>
                Create account
              </Button>
            </>
          }
        />
      );
    case 'onboarding':
      return (
        <PromptCard
          className={className}
          icon={UserCheck}
          title="Finish setting up your account"
          body="Confirm your age, jurisdiction and the terms before any game. Nothing is pre-ticked."
          actions={
            <Button asChild className={ACTION}>
              <Link href={`/onboarding?next=${encodeURIComponent(here)}`}>Continue setup</Link>
            </Button>
          }
        />
      );
    case 'region':
      return (
        <PromptCard
          className={className}
          icon={Globe2}
          tone="warning"
          live="assertive"
          title={`${gameName} isn’t available in your region`}
          body={`You appear to be in ${regionName ?? 'a restricted region'}, where GLOBAL POOL games aren’t offered. You can still sign in, see your history and withdraw your balance.`}
          facts={[{ label: 'Detected region', value: regionName ?? 'Restricted' }]}
          note="Please don’t use a VPN or proxy to get around this — it breaks our licence terms. If you think the region is wrong, contact support."
          actions={
            <>
              <Button asChild className={ACTION}>
                <Link href={GAMES_ROUTES.wallet}>
                  <ArrowDownToLine aria-hidden />
                  Withdraw funds
                </Link>
              </Button>
              <Button variant="ghost" asChild className={ACTION}>
                <Link href={GAMES_ROUTES.restrictedCountries}>
                  <Globe2 aria-hidden />
                  Restricted countries
                </Link>
              </Button>
              <Button variant="ghost" asChild className={ACTION}>
                <Link href={GAMES_ROUTES.support}>
                  <LifeBuoy aria-hidden />
                  Contact support
                </Link>
              </Button>
            </>
          }
        />
      );
    case 'self_excluded':
      return (
        <PromptCard
          className={className}
          icon={ShieldCheck}
          live="assertive"
          title="You’re on a break from play"
          body={
            exclusionEndsAt
              ? `New bets are blocked in every game until ${formatDateTimeUTC(exclusionEndsAt)}. The break can’t be shortened.`
              : 'New bets are blocked in every game. Your history and withdrawals stay available.'
          }
          note="Free, confidential help is available any time in Responsible gaming."
          actions={
            <>
              <Button variant="secondary" asChild className={ACTION}>
                <Link href={GAMES_ROUTES.responsibleGaming}>Responsible gaming</Link>
              </Button>
              <Button variant="ghost" asChild className={ACTION}>
                <Link href={GAMES_ROUTES.wallet}>Wallet & withdrawals</Link>
              </Button>
            </>
          }
        />
      );
    case 'blocked':
      return (
        <PromptCard
          className={className}
          icon={Ban}
          tone="warning"
          live="assertive"
          title="Games are paused on your account"
          body="New bets are paused while your account is restricted or under review. Your balance, history and withdrawals are not affected."
          actions={
            <>
              <Button variant="secondary" asChild className={ACTION}>
                <Link href="/restricted">See why</Link>
              </Button>
              <Button variant="ghost" asChild className={ACTION}>
                <Link href={GAMES_ROUTES.support}>Contact support</Link>
              </Button>
            </>
          }
        />
      );
    case 'time_limit':
      return (
        <PromptCard
          className={className}
          icon={Clock}
          live="assertive"
          title="Your play-time limit is reached"
          body="New bets are paused by a time limit, session limit or quiet hours you set. Play resumes when the limit resets."
          actions={
            <>
              <Button variant="secondary" asChild className={ACTION}>
                <Link href={GAMES_ROUTES.responsibleGaming}>
                  <SlidersHorizontal aria-hidden />
                  View limits
                </Link>
              </Button>
              <Button variant="ghost" asChild className={ACTION}>
                <Link href={GAMES_ROUTES.coolingOff}>
                  <PauseCircle aria-hidden />
                  Take a break
                </Link>
              </Button>
            </>
          }
        />
      );
    case 'loss_limit':
      return (
        <PromptCard
          className={className}
          icon={ShieldCheck}
          live="assertive"
          title="You’ve reached your loss limit"
          body={`Play is paused in every game${lossLimit?.resetsAt ? ` until ${formatDateTimeUTC(lossLimit.resetsAt)}` : ''}. Your balance and withdrawals aren’t affected.`}
          facts={
            lossLimit
              ? [
                  ...(lossLimit.used !== null
                    ? [{ label: 'Lost in this period', value: <CreditsAmount value={lossLimit.used} />, demo: true }]
                    : []),
                  { label: 'Loss limit', value: <CreditsAmount value={lossLimit.limit} />, demo: true },
                ]
              : undefined
          }
          note="You can lower the limit now. Raising it only takes effect after a 24-hour cooling-off period. DEMO play is counted separately, in DEMO credits."
          actions={
            <>
              <Button variant="secondary" asChild className={ACTION}>
                <Link href={GAMES_ROUTES.responsibleGaming}>
                  <SlidersHorizontal aria-hidden />
                  View limits
                </Link>
              </Button>
              <Button variant="ghost" asChild className={ACTION}>
                <Link href={GAMES_ROUTES.coolingOff}>
                  <PauseCircle aria-hidden />
                  Take a break
                </Link>
              </Button>
            </>
          }
        />
      );
    case 'offline':
      return (
        <PromptCard
          className={className}
          icon={WifiOff}
          tone="warning"
          title="Connection lost"
          body="We can’t reach the game server. Nothing is staked while you’re offline — betting resumes when the connection is back."
          actions={
            onRetry && (
              <Button variant="secondary" className={ACTION} onClick={onRetry} leadingIcon={<RefreshCw aria-hidden />}>
                Retry now
              </Button>
            )
          }
        />
      );
    case 'reconnecting':
      return (
        <PromptCard
          className={className}
          icon={WifiOff}
          tone="warning"
          live="assertive"
          title="Connection lost — reconnecting"
          body={`Your ${gameName} bet reached the server or will be sent again with the same request key, so it settles exactly once whatever happens to your connection. The result appears here and in My bets.`}
          facts={[
            ...(reconnect ? [{ label: 'Reconnect attempt', value: `${reconnect.attempt} of ${reconnect.max}` }] : []),
            ...(reconnect?.stake
              ? [{ label: 'Stake', value: <><CreditsAmount value={reconnect.stake} /> · locked</>, demo: true }]
              : []),
            ...(reconnect?.sentAt ? [{ label: 'Sent', value: `${formatTimeUTC(reconnect.sentAt, { seconds: true })}` }] : []),
          ]}
          note="If we can’t reconnect, refresh the page — your balance and this bet are safe."
          actions={
            <>
              {reconnect && (
                <Button variant="secondary" className={ACTION} onClick={reconnect.onRetry} leadingIcon={<RefreshCw aria-hidden />}>
                  Retry now
                </Button>
              )}
              <Button variant="ghost" asChild className={ACTION}>
                <a href="#my-bets">
                  <History aria-hidden />
                  View my bets
                </a>
              </Button>
            </>
          }
        />
      );
  }
}

/** Inline notice in the bet panel (insufficient DEMO credits, bet limits, refusals). */
export function PanelNotice({
  tone = 'info',
  title,
  children,
  actions,
}: {
  tone?: Tone;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-3',
        tone === 'danger'
          ? 'border-border-danger bg-status-danger-tint'
          : tone === 'warning'
            ? 'border-status-warning bg-status-warning-tint'
            : 'border-sky-500/30 bg-status-info-tint',
      )}
    >
      <p className="flex items-start gap-2 text-body-s-strong text-text-primary">
        <CircleAlert
          aria-hidden
          className={cn(
            'mt-0.5 size-4 shrink-0',
            tone === 'danger' ? 'text-text-danger' : tone === 'warning' ? 'text-text-warning' : 'text-text-info',
          )}
        />
        {title}
      </p>
      {children && <div className="pl-6 text-caption text-text-secondary">{children}</div>}
      {actions && <div className="flex flex-wrap gap-2 pl-6">{actions}</div>}
    </div>
  );
}

/** Loading skeleton for a whole game screen (DI-07 "Loading game"). */
export function GameSkeleton({ label = 'Loading game…' }: { label?: string }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <span className="sr-only" role="status">
        {label}
      </span>
      <div className="flex items-center gap-4">
        <Skeleton className="size-12 rounded-lg" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-7 w-64" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Skeleton className="h-[520px] rounded-xl" />
        <Skeleton className="h-[520px] rounded-xl" />
      </div>
      <Skeleton className="h-20 rounded-xl" />
    </div>
  );
}

export function insufficientCopy(balance: string | null | undefined): string {
  return balance
    ? `Your DEMO balance is ${fmt(balance)}. Lower your bet, or reset your DEMO credits (once per hour). DEMO credits can’t be bought.`
    : 'Lower your bet, or reset your DEMO credits (once per hour). DEMO credits can’t be bought.';
}
