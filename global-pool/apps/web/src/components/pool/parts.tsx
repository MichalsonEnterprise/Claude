'use client';

import type { RoundStatus } from '@gp/shared/enums';
import { formatCount, formatRoundNumber, formatTimeUTC } from '@gp/shared/format';
import { formatUSDT, money } from '@gp/shared/money';
import { ROUND_THRESHOLDS, type PrizeTierAmount } from '@gp/shared/pool';
import {
  ArrowRight,
  Check,
  ChevronRight,
  CircleAlert,
  Info,
  Loader2,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { AgeBadge, CountBadge, StatusBadge, type BadgeStatus } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ApiRequestError } from '@/lib/api/client';
import { cn } from '@/lib/utils';

export const POOL_ROUTES = {
  hub: '/pool',
  entries: '/pool/entries',
  history: '/pool/history',
  prizes: '/pool/prizes',
  round: (n: number) => `/pool/rounds/${n}`,
  verify: (n: number) => `/pool/rounds/${n}/verify`,
  fairness: '/provably-fair',
  rg: '/responsible-gaming',
  wallet: '/wallet',
  deposit: '/wallet/deposit',
  restricted: '/legal/restricted-countries',
} as const;

export const cardCls = 'rounded-xl border border-border-subtle bg-surface-default';

// ── page header + module tabs ─────────────────────────────────────────────────────────────────

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-caption text-text-tertiary">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((c, i) => (
          <li key={c.label} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden>/</span>}
            {c.href ? (
              <Link href={c.href} className="hover:text-text-primary">
                {c.label}
              </Link>
            ) : (
              <span aria-current="page">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PoolPageHeader({
  crumbs,
  title,
  badges,
  actions,
  description,
}: {
  crumbs: { label: string; href?: string }[];
  title: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 tablet:flex-row tablet:items-end tablet:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <Breadcrumbs items={crumbs} />
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-h3 text-text-primary tablet:text-h2">{title}</h1>
          {badges}
        </div>
        {description && (
          <p className="max-w-[720px] text-body-s text-text-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

const TABS = [
  { id: 'overview', label: 'Overview', href: POOL_ROUTES.hub },
  { id: 'entries', label: 'My entries', href: POOL_ROUTES.entries },
  { id: 'history', label: 'Round history', href: POOL_ROUTES.history },
  { id: 'prizes', label: 'Prize distribution', href: POOL_ROUTES.prizes },
  { id: 'fairness', label: 'Fairness (VRF)', href: POOL_ROUTES.fairness },
] as const;
export type PoolTabId = (typeof TABS)[number]['id'];

/** Module sub-navigation (Figma Tabs/Underline Bar). Real links — each tab is its own route. */
export function PoolTabs({ active, entries }: { active: PoolTabId | null; entries?: number }) {
  return (
    <nav aria-label="Global Pool" className="-mx-4 overflow-x-auto px-4 tablet:mx-0 tablet:px-0">
      <ul className="flex min-w-max items-end gap-6 border-b border-border-subtle">
        {TABS.map((t) => (
          <li key={t.id}>
            <Link
              href={t.href}
              aria-current={active === t.id ? 'page' : undefined}
              className={cn(
                'relative flex h-11 items-center gap-2 text-label-l whitespace-nowrap text-text-secondary transition-colors hover:text-text-primary',
                active === t.id &&
                  'text-text-primary after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-brand',
              )}
            >
              {t.label}
              {t.id === 'entries' && entries !== undefined && entries > 0 && (
                <CountBadge count={entries} tone="brand" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ── small building blocks ─────────────────────────────────────────────────────────────────────

export function CardHeading({
  icon,
  title,
  demo,
  sub,
  action,
  as: As = 'h2',
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  demo?: boolean;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  as?: 'h2' | 'h3';
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <As className="flex flex-wrap items-center gap-2 text-h5 text-text-primary">
          {icon}
          {title}
          {demo && <DemoBadge size="xs" />}
        </As>
        {sub && <p className="text-caption text-text-tertiary">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Overline({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-overline text-text-tertiary uppercase', className)}>{children}</p>
  );
}

/** Horizontal meter (0–1). */
export function Meter({
  value,
  tone = 'brand',
  label,
  className,
}: {
  value: number;
  tone?: 'brand' | 'gold' | 'warning' | 'danger' | 'info';
  label: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-raised', className)}
    >
      <div
        className={cn(
          'h-full rounded-full',
          tone === 'brand' && 'bg-brand',
          tone === 'gold' && 'bg-accent-gold',
          tone === 'warning' && 'bg-status-warning',
          tone === 'danger' && 'bg-status-danger',
          tone === 'info' && 'bg-status-info',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Label/value row; `value` is right-aligned. */
export function KV({
  label,
  value,
  hint,
  className,
  valueClassName,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <dt className="flex min-w-0 flex-col text-body-s text-text-secondary">
        {label}
        {hint && <span className="text-caption text-text-tertiary">{hint}</span>}
      </dt>
      <dd
        className={cn(
          'shrink-0 text-right text-label-m text-text-primary tabular-nums',
          valueClassName,
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** "18+ · You can lose your stake…" line (shown next to every participation CTA). */
export function RiskLine({
  children = 'You can lose your stake. Your exact chance is shown before you confirm.',
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('flex items-start gap-2 text-caption text-text-tertiary', className)}>
      <AgeBadge className="mt-px shrink-0" />
      <span>{children}</span>
    </p>
  );
}

export const FEE_LINE =
  '10.00 USDT + 0.05 USDT platform fee per entry · Network fee 0.00 USDT — entries are paid from your platform balance';

export function LicenceCard({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <section
      aria-label="Licence and jurisdiction"
      className={cn(
        'flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-secondary/60',
        compact ? 'p-3' : 'p-4',
        className,
      )}
    >
      <p className="flex items-center gap-2 text-label-l text-text-primary">
        <ShieldCheck aria-hidden className="size-4 text-icon-brand" /> Licence &amp; jurisdiction
      </p>
      <p className="text-body-s text-text-secondary">
        Global Pool is offered only where an applicable gaming licence permits it. Access from
        restricted regions is blocked. Outcomes are determined by verifiable randomness; you can
        lose your stake.
      </p>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-label-s">
        <Link className="text-text-brand hover:underline" href={POOL_ROUTES.restricted}>
          Restricted countries
        </Link>
        <Link className="text-text-brand hover:underline" href={POOL_ROUTES.rg}>
          Responsible gaming
        </Link>
        <Link className="text-text-brand hover:underline" href="/legal/licence">
          Licence details
        </Link>
      </p>
    </section>
  );
}

export function LicenceStrip({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'flex flex-wrap items-center gap-2 text-caption text-text-tertiary',
        className,
      )}
    >
      <AgeBadge />
      Real-money games require an applicable licence and are available only in permitted
      jurisdictions. 18+. Play responsibly. This build is DEMO / testnet only — no real money.
    </p>
  );
}

// ── round status ──────────────────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<RoundStatus, { status: BadgeStatus; label: string }> = {
  scheduled: { status: 'pending', label: 'Scheduled' },
  open: { status: 'live', label: 'Open' },
  closed: { status: 'processing', label: 'Drawing' },
  drawing: { status: 'processing', label: 'Drawing' },
  settled: { status: 'confirmed', label: 'Settled' },
  cancelled: { status: 'expired', label: 'Cancelled' },
};

export function RoundStatusBadge({
  status,
  label,
  size = 's',
}: {
  status: RoundStatus;
  label?: string;
  size?: 's' | 'm';
}) {
  const spec = STATUS_BADGE[status];
  return <StatusBadge status={spec.status} label={label ?? spec.label} size={size} />;
}

// ── steps (VRF stepper / progress) ────────────────────────────────────────────────────────────

export type StepState = 'done' | 'current' | 'next' | 'failed' | 'warning';

export interface StepItem {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  state: StepState;
}

export function Steps({ steps, className }: { steps: StepItem[]; className?: string }) {
  return (
    <ol className={cn('flex flex-col', className)}>
      {steps.map((s, i) => (
        <li key={s.id} className="relative flex gap-3 pb-5 last:pb-0">
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={cn(
                'absolute top-8 bottom-1 left-[13px] w-0.5 rounded-full',
                s.state === 'done' ? 'bg-status-success/60' : 'bg-border-default',
              )}
            />
          )}
          <span
            className={cn(
              'relative flex size-7 shrink-0 items-center justify-center rounded-full',
              s.state === 'done' && 'bg-status-success-tint text-text-success',
              s.state === 'current' && 'bg-status-info-tint text-text-info',
              s.state === 'warning' && 'bg-status-warning-tint text-text-warning',
              s.state === 'failed' && 'bg-status-danger-tint text-text-danger',
              s.state === 'next' && 'border border-border-strong text-text-tertiary',
            )}
          >
            {s.state === 'done' && <Check aria-hidden className="size-4" />}
            {s.state === 'current' && (
              <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
            )}
            {s.state === 'warning' && <TriangleAlert aria-hidden className="size-4" />}
            {s.state === 'failed' && <X aria-hidden className="size-4" />}
            {s.state === 'next' && <span className="text-label-s">{i + 1}</span>}
            <span className="sr-only">
              {
                {
                  done: 'Done:',
                  current: 'In progress:',
                  next: 'Next:',
                  failed: 'Failed:',
                  warning: 'Delayed:',
                }[s.state]
              }
            </span>
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
            <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <span
                className={cn(
                  'text-label-l',
                  s.state === 'next' ? 'text-text-secondary' : 'text-text-primary',
                )}
              >
                {s.title}
              </span>
              {s.meta && (
                <span className="font-mono text-mono-s text-text-tertiary tabular-nums">
                  {s.meta}
                </span>
              )}
            </p>
            {s.description && (
              <div className="text-body-s break-words text-text-tertiary">{s.description}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ── prize distribution ────────────────────────────────────────────────────────────────────────

const PRIZE_TONE = ['bg-gold-300', 'bg-gold-400', 'bg-gold-500', 'bg-gold-600'] as const;

export function PrizeDistributionCard({
  roundNumber,
  pool,
  tiers,
  demo,
  platformFees,
  className,
  title = 'Prize distribution',
}: {
  roundNumber: number;
  pool: string;
  tiers: PrizeTierAmount[];
  demo?: boolean;
  platformFees?: string;
  className?: string;
  title?: string;
}) {
  return (
    <article className={cn(cardCls, 'flex min-w-0 flex-col gap-4 p-5 tablet:p-6', className)}>
      <CardHeading
        title={title}
        demo={demo}
        sub={`Round ${formatRoundNumber(roundNumber)} · pool ${formatUSDT(pool)} · 13 prizes`}
      />
      <ul className="flex flex-col gap-3.5">
        {tiers.map((t, i) => {
          const share = Number(t.sharePercent) * t.winners;
          return (
            <li key={t.tier} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-2 text-body-s text-text-secondary">
                  <span
                    className={cn(
                      'inline-flex h-5 min-w-9 items-center justify-center rounded-xs px-1.5 text-label-s text-ink-950',
                      PRIZE_TONE[Math.min(i, 3)],
                    )}
                  >
                    {t.winners > 1 ? `×${t.winners}` : ['1st', '2nd', '3rd'][i]}
                  </span>
                  {t.winners > 1 ? `Runner-up · ${t.sharePercent}% each` : `${t.sharePercent}%`}
                </span>
                <span className="text-label-l text-text-primary tabular-nums">
                  {formatUSDT(t.amountEach)}
                  {t.winners > 1 && <span className="text-caption text-text-tertiary"> each</span>}
                </span>
              </div>
              <Meter value={share / 50} tone="gold" label={`${t.label}: ${share}% of the pool`} />
            </li>
          );
        })}
      </ul>
      <div className="flex items-center justify-between gap-3 border-t border-border-subtle pt-3">
        <span className="text-label-l text-text-primary">Total · 100% of the pool</span>
        <span className="text-h5 text-text-gold tabular-nums">{formatUSDT(pool)}</span>
      </div>
      <p className="flex items-start gap-2 text-caption text-text-tertiary">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Platform fees{platformFees ? ` (${formatUSDT(platformFees)})` : ''} are separate and never
          taken from the pool. Every qualifying entry has an equal chance; one entry can win at most
          one prize.
        </span>
      </p>
    </article>
  );
}

// ── threshold ─────────────────────────────────────────────────────────────────────────────────

const timesMin = (v: string | number, min: string | number) =>
  `${money(v).div(min).toDecimalPlaces(1, 1).toFixed(1)}× the minimum`;

export function ThresholdCard({
  round,
  demo,
  className,
}: {
  round: {
    number: number;
    status: RoundStatus;
    closesAt: string;
    poolBalance: string;
    participants: number;
    thresholds: { minParticipants: number; minPool: string };
  };
  demo?: boolean;
  className?: string;
}) {
  const { minPool, minParticipants } = round.thresholds ?? ROUND_THRESHOLDS;
  const pool = round.poolBalance;
  const poolMet = money(pool).gte(minPool);
  const partMet = round.participants >= minParticipants;
  const both = poolMet && partMet;
  const open = round.status === 'open' || round.status === 'scheduled';
  const bar = (label: string, value: string, ratio: string, frac: number, met: boolean, min: string, missing: string) => (
    <div className="flex flex-col gap-1.5">
      <p className="flex items-center justify-between gap-2 text-caption text-text-secondary">
        {label}
        <span className={met ? 'text-text-success' : 'text-text-warning'}>{met ? ratio : missing}</span>
      </p>
      <p className="text-body-l text-text-primary tabular-nums">{value}</p>
      <Meter value={frac} tone={met ? 'brand' : 'warning'} label={`${label} ${value}, ${min}`} />
      <p className="text-caption text-text-tertiary">{min}</p>
    </div>
  );
  const poolFrac = money(pool).div(money(minPool).times(4)).toNumber();
  const partFrac = round.participants / (minParticipants * 8);
  return (
    <article className={cn(cardCls, 'flex min-w-0 flex-col gap-5 p-5 tablet:p-6', className)}>
      <CardHeading
        title="Draw threshold"
        demo={demo}
        sub={`Round ${formatRoundNumber(round.number)} · ${open ? 'closes' : 'closed'} ${formatTimeUTC(round.closesAt, { seconds: true })} UTC`}
        action={
          <StatusBadge
            status={both ? 'confirmed' : 'under_review'}
            label={both ? 'Both minimums met' : 'Minimum not met'}
          />
        }
      />
      {bar(
        'Pool balance',
        formatUSDT(pool),
        timesMin(pool, minPool),
        Math.max(poolFrac, poolMet ? 0.25 : 0),
        poolMet,
        `Min ${formatUSDT(minPool)}`,
        `${formatUSDT(money(minPool).minus(pool).toFixed(2))} to go`,
      )}
      {bar(
        'Participants',
        formatCount(round.participants),
        timesMin(round.participants, minParticipants),
        Math.max(partFrac, partMet ? 0.125 : 0),
        partMet,
        `Min ${formatCount(minParticipants)}`,
        `${formatCount(minParticipants - round.participants)} to go`,
      )}
      <p className="flex items-start gap-2 text-body-s text-text-secondary">
        <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-muted" />
        {open
          ? both
            ? `Both minimums are met, so this round will draw at ${formatTimeUTC(round.closesAt, { seconds: true })} UTC.`
            : 'If either minimum is not met at close, the round is cancelled and every stake is refunded to Owed.'
          : round.status === 'cancelled'
            ? 'The minimums were not met at close, so the round was cancelled and stakes went to Owed.'
            : `Round ${formatRoundNumber(round.number)} met both minimums and was drawn with verifiable randomness.`}
      </p>
    </article>
  );
}

// ── VRF explainer ─────────────────────────────────────────────────────────────────────────────

export function VrfExplainerCard({
  closesAt,
  verifyRound,
  className,
  layout = 'vertical',
}: {
  closesAt: string;
  verifyRound: number | null;
  className?: string;
  layout?: 'vertical' | 'horizontal';
}) {
  const close = formatTimeUTC(closesAt, { seconds: true });
  const steps: [string, string][] = [
    [
      `Entries freeze at ${close} UTC`,
      'The round closes at its fixed time. Nothing is added or removed after close.',
    ],
    [
      'Chainlink VRF returns a random number',
      'Requested on Arbitrum with a cryptographic proof anyone can check on-chain.',
    ],
    [
      'The contract picks 13 winning entries',
      'Prizes settle automatically. Nobody at GLOBAL POOL can choose or change winners.',
    ],
  ];
  return (
    <article className={cn(cardCls, 'flex min-w-0 flex-col gap-4 p-5 tablet:p-6', className)}>
      <CardHeading
        icon={<ShieldCheck aria-hidden className="size-5 text-icon-brand" />}
        title="How the winner is drawn"
        action={
          verifyRound ? (
            <Button variant="ghost" size="s" asChild>
              <Link href={POOL_ROUTES.verify(verifyRound)}>
                Verify round {formatRoundNumber(verifyRound)} <ArrowRight aria-hidden />
              </Link>
            </Button>
          ) : undefined
        }
      />
      <ol className={cn('grid gap-3', layout === 'horizontal' && 'laptop:grid-cols-3')}>
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-3 rounded-lg bg-surface-raised p-4">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-tint text-label-m text-text-brand">
              {i + 1}
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-label-l text-text-primary">{t}</span>
              <span className="text-body-s text-text-secondary">{d}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="text-caption text-text-tertiary">
        Each round publishes its VRF request ID, random word and settlement, and anyone can re-derive
        the winners in the browser.
      </p>
    </article>
  );
}

// ── async states ──────────────────────────────────────────────────────────────────────────────

export function errorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}

export function QueryError({
  error,
  onRetry,
  title = 'We couldn’t load this',
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  const ref = error instanceof ApiRequestError ? error.requestId : undefined;
  return (
    <div className={cn(cardCls, 'p-6', className)}>
      <EmptyState
        type="error"
        title={title}
        description={`${errorMessage(error)} Your balance and entries are not affected.`}
        reference={ref ? `Request ${ref}` : undefined}
        actions={
          onRetry ? (
            <Button variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

export function SectionTitle({
  title,
  demo,
  action,
  live,
  id,
}: {
  title: string;
  demo?: boolean;
  action?: React.ReactNode;
  live?: boolean;
  id?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="flex items-center gap-2 text-h4 text-text-primary">
        {title}
        {live && <StatusBadge status="live" uppercase />}
        {demo && <DemoBadge size="s" />}
      </h2>
      {action}
    </div>
  );
}

export function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button variant="ghost" size="s" asChild>
      <Link href={href}>
        {children} <ChevronRight aria-hidden />
      </Link>
    </Button>
  );
}

export function Callout({
  tone = 'info',
  title,
  children,
  icon,
  className,
}: {
  tone?: 'info' | 'warning' | 'success' | 'danger' | 'gold';
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg p-3.5 text-body-s',
        tone === 'info' && 'bg-status-info-tint',
        tone === 'warning' && 'bg-status-warning-tint',
        tone === 'success' && 'bg-status-success-tint',
        tone === 'danger' && 'bg-status-danger-tint',
        tone === 'gold' && 'bg-accent-gold-tint',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-0.5 shrink-0 [&_svg]:size-4',
          tone === 'info' && 'text-text-info',
          tone === 'warning' && 'text-text-warning',
          tone === 'success' && 'text-text-success',
          tone === 'danger' && 'text-text-danger',
          tone === 'gold' && 'text-text-gold',
        )}
      >
        {icon ?? <CircleAlert />}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        {title && <p className="text-label-l text-text-primary">{title}</p>}
        {children && <div className="text-text-secondary">{children}</div>}
      </div>
    </div>
  );
}
