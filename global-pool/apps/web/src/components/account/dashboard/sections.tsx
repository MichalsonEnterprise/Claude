'use client';

import { DEMO_VIP_TIERS } from '@gp/shared/demo';
import { formatCount, formatDateTimeUTC } from '@gp/shared/format';
import { formatUSDT, money } from '@gp/shared/money';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bell,
  CircleCheck,
  Coffee,
  HeartHandshake,
  IdCard,
  KeyRound,
  Mail,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Ticket,
  Timer,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { isGameArtKey } from '@/components/brand/game-art';
import { GameTile } from '@/components/domain/game-tile';
import { CrownArt } from '@/components/home/art';
import { ROUTES } from '@/components/shell/nav-config';
import { AgeBadge, VipBadge, type VipTierName } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import type {
  BalancesView,
  GameView,
  MeView,
  NotificationView,
  RgView,
  TxRow,
} from '@/lib/api/account';
import { useClaimOwed, useTransactions } from '@/lib/api/account';
import { cn } from '@/lib/utils';

import { ACCOUNT_ROUTES, HISTORY_ROUTES } from '../nav';
import { ArrowLinkText, Demo, IconTile, Meter, relative, type Tone } from '../primitives';

// ── VIP strip (active) ─────────────────────────────────────────────────────────────────────────

export function VipStrip({
  me,
  balances,
  demo,
}: {
  me: MeView;
  balances: BalancesView | undefined;
  demo: boolean;
}) {
  const claim = useClaimOwed();
  const tiers = DEMO_VIP_TIERS;
  const idx = Math.max(
    0,
    tiers.findIndex((t) => t.tier === me.vip.tier),
  );
  const current = tiers[idx];
  const next = tiers[idx + 1];
  const reward = balances?.breakdown.owed.find(
    (o) => /vip/i.test(o.label) || o.reference.startsWith('RW-VIP'),
  );
  const owed = balances?.owed ?? '0';
  const toNext = next ? Math.max(0, next.minPoints - me.vip.points) : 0;
  const progress = next ? Math.min(100, (me.vip.points / next.minPoints) * 100) : 100;
  return (
    <Card
      className="relative flex-col gap-5 overflow-hidden tablet:flex-row tablet:items-center"
      padding="none"
    >
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 hidden w-[200px] -skew-x-12 bg-gold-tint-strong tablet:-left-10 tablet:block"
      />
      <div className="relative flex flex-1 items-center gap-5 p-5">
        <CrownArt className="relative hidden w-[120px] shrink-0 tablet:block" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <p className="flex flex-wrap items-center gap-2 text-overline uppercase text-text-gold">
            VIP Club · Level {me.vip.level}
            <VipBadge tier={me.vip.tier as VipTierName} />
            <Demo show={demo} size="xs" />
          </p>
          <p className="text-h4">
            {next
              ? `${formatCount(toNext)} points to ${next.name}`
              : `Top tier — ${current?.name ?? ''}`}
          </p>
          <Meter
            value={progress}
            tone="gold"
            label="VIP points progress"
            className="max-w-[420px]"
          />
          <p className="text-caption text-text-tertiary">
            {formatCount(me.vip.points)}
            {next ? ` / ${formatCount(next.minPoints)}` : ''} points · 1 point per 100 USDT played.
            VIP status never changes odds or outcomes.
          </p>
        </div>
      </div>
      {reward && (
        <div className="m-5 mt-0 flex shrink-0 flex-col gap-2 rounded-md border border-border-subtle bg-bg-secondary p-4 tablet:mt-5 tablet:w-[260px]">
          <p className="flex items-center gap-2 text-caption text-text-tertiary">
            {reward.label} <Demo show={demo} size="xs" />
          </p>
          <p className="text-number-s tabular-nums">{formatUSDT(reward.amount)}</p>
          <p className="text-caption text-text-tertiary">
            In Owed · claiming moves all {formatUSDT(owed)} owed to Available
          </p>
          <Button
            size="m"
            loading={claim.isPending}
            disabled={money(owed).isZero()}
            onClick={() =>
              claim.mutate(undefined, {
                onSuccess: (r) =>
                  toast({
                    type: 'success',
                    title: 'Moved to Available',
                    description: `${formatUSDT(r.claimed)} claimed.`,
                  }),
                onError: (e) =>
                  toast({ type: 'error', title: 'Claim failed', description: e.message }),
              })
            }
          >
            Claim to Available
          </Button>
        </div>
      )}
    </Card>
  );
}

// ── New-user checklist + welcome offer ─────────────────────────────────────────────────────────

export interface ChecklistState {
  emailVerified: boolean;
  emailMasked: string | null;
  twoFactor: boolean;
  kycLevel: string;
  hasDeposit: boolean;
}

export function SetupChecklist({ s, restricted }: { s: ChecklistState; restricted: boolean }) {
  const steps = [
    {
      done: s.emailVerified,
      icon: Mail,
      title: 'Verify your email',
      body: s.emailVerified
        ? `${s.emailMasked ?? 'Your email'} is verified. We use it for receipts and security alerts.`
        : 'Confirm your email so we can send receipts and security alerts.',
      cta: null as React.ReactNode,
    },
    {
      done: s.twoFactor,
      icon: KeyRound,
      title: 'Turn on two-factor authentication',
      body: 'Protects withdrawals and sign-ins from new devices. Takes about 2 minutes with an authenticator app.',
      cta: (
        <Button size="m" asChild>
          <Link href={`/2fa/setup?next=${encodeURIComponent(ACCOUNT_ROUTES.dashboard)}`}>
            Set up 2FA
          </Link>
        </Button>
      ),
    },
    {
      done: s.kycLevel !== 'none',
      icon: IdCard,
      title: 'Verify your identity (KYC)',
      body: 'Level 1 (basic details) unlocks deposits and play. Level 2 (ID + liveness) raises withdrawals to 25,000.00 USDT per day.',
      cta: (
        <Button size="m" variant="secondary" leadingIcon={<IdCard aria-hidden />} asChild>
          <Link href={ACCOUNT_ROUTES.kycVerify}>Start verification</Link>
        </Button>
      ),
    },
    {
      done: s.hasDeposit,
      icon: ArrowDownToLine,
      title: 'Make your first deposit',
      body: 'USDT on Arbitrum Sepolia (testnet, DEMO). Minimum 10.00 USDT; the network fee is shown before you send.',
      cta: restricted ? null : (
        <Button size="m" variant="secondary" leadingIcon={<ArrowDownToLine aria-hidden />} asChild>
          <Link href={ROUTES.deposit}>Deposit USDT</Link>
        </Button>
      ),
    },
  ];
  const done = steps.filter((x) => x.done).length;
  const nextIdx = steps.findIndex((x) => !x.done);
  return (
    <Card className="gap-5" padding="l">
      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-end tablet:justify-between">
        <div>
          <p className="text-overline uppercase text-text-brand">Get started</p>
          <h2 className="text-h4">Finish setting up your account</h2>
          <p className="text-body-s text-text-secondary">
            Four quick steps unlock deposits, games and Global Pool entries.
          </p>
        </div>
        <div className="flex w-full max-w-[200px] flex-col gap-1.5">
          <p className="text-caption text-text-secondary tablet:text-right">
            {done} of {steps.length} complete
          </p>
          <Meter value={(done / steps.length) * 100} label="Setup progress" />
        </div>
      </div>
      <ol className="flex flex-col">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <li
              key={step.title}
              className="flex flex-col gap-3 border-t border-border-subtle py-4 first:border-t-0 tablet:flex-row tablet:items-center"
            >
              <div className="flex flex-1 items-start gap-3">
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full text-label-m',
                    step.done
                      ? 'bg-status-success-tint text-text-success'
                      : i === nextIdx
                        ? 'bg-brand-tint text-text-brand'
                        : 'bg-surface-raised text-text-tertiary',
                  )}
                >
                  {step.done ? <CircleCheck aria-label="Done" className="size-4" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-body-m-strong">
                    <Icon aria-hidden className="size-4 text-icon-muted" /> {step.title}
                  </p>
                  <p className="text-body-s text-text-secondary">{step.body}</p>
                </div>
              </div>
              <div className="pl-11 tablet:pl-0">
                {step.done ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-status-success-tint px-2 py-0.5 text-label-s text-text-success">
                    <CircleCheck aria-hidden className="size-3.5" /> Done
                  </span>
                ) : (
                  step.cta
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="flex items-start gap-2 text-caption text-text-tertiary">
        <ShieldAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        Why we ask: licensing rules require identity checks before real-money play. You can withdraw
        your own funds at any time.
      </p>
    </Card>
  );
}

/** Welcome offer — information only: the opt-in happens in the deposit flow, never pre-selected. */
export function WelcomeOfferCard({ demo }: { demo: boolean }) {
  return (
    <Card variant="gold" className="gap-4" padding="l">
      <p className="flex items-center gap-2 text-overline uppercase text-text-gold">
        Welcome offer <Demo show={demo} size="xs" />
      </p>
      <p className="text-h4">100% up to 500 USDT</p>
      <p className="-mt-2 text-body-s text-text-secondary">on your first deposit — opt-in only</p>
      <ul className="flex flex-col gap-2 text-caption text-text-secondary">
        {[
          'Minimum deposit 20.00 USDT',
          '30× wagering on bonus funds, within 14 days',
          'Withdrawing early forfeits the bonus — never your deposit',
          'Games contribute differently to wagering',
        ].map((t) => (
          <li key={t} className="flex items-start gap-2">
            <CircleCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-icon-muted" /> {t}
          </li>
        ))}
      </ul>
      <p className="text-caption text-text-tertiary">
        You choose whether to add it when you make your first deposit — it is never added
        automatically.
      </p>
      <div className="flex items-center gap-3">
        <Link href={ROUTES.promotions} className="text-label-m text-text-brand hover:underline">
          Full terms
        </Link>
        <span className="text-caption text-text-tertiary">Terms apply · opt-in only</span>
        <AgeBadge className="ml-auto" />
      </div>
    </Card>
  );
}

// ── Games + notifications preview ──────────────────────────────────────────────────────────────

export function GamesPreview({
  games,
  restricted,
  title,
  demo,
}: {
  games: GameView[] | undefined;
  restricted: boolean;
  title: string;
  demo: boolean;
}) {
  const list = (games ?? [])
    .filter((g) => g.slug !== 'global-pool' && isGameArtKey(g.slug))
    .slice(0, 4);
  return (
    <Card className="gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-h5">{title}</h2>
        <p className="text-caption text-text-tertiary">
          Simulation mode · house edge shown on every game
        </p>
        <ArrowLinkText href={HISTORY_ROUTES.games} className="ml-auto">
          Game history
        </ArrowLinkText>
      </div>
      {!games ? (
        <div className="grid grid-cols-2 gap-3 laptop:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4] rounded-md" />
          ))}
        </div>
      ) : (
        <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 tablet:mx-0 tablet:grid tablet:grid-cols-4 tablet:overflow-visible tablet:px-0">
          {list.map((g) => (
            <li
              key={g.id}
              className="flex w-[140px] shrink-0 snap-start flex-col gap-2 tablet:w-auto"
            >
              <GameTile
                game={g.slug}
                name={g.name}
                href={ROUTES.game(g.slug)}
                edgeLabel={g.edgeLabel}
                players={g.players}
                demo={demo}
                restricted={restricted}
                className="w-full"
              />
              <p className="text-caption text-text-tertiary">
                <span className="text-text-secondary">{g.name}</span> · {g.mechanic} · {g.edgeLabel}
              </p>
            </li>
          ))}
        </ul>
      )}
      {restricted && <p className="text-caption text-text-tertiary">Paused in your region.</p>}
    </Card>
  );
}

const NOTE_TONE: Record<string, { tone: Tone; icon: typeof Bell }> = {
  security: { tone: 'danger', icon: ShieldAlert },
  transactions: { tone: 'info', icon: ArrowDownToLine },
  rounds: { tone: 'brand', icon: Ticket },
  promotions: { tone: 'gold', icon: Trophy },
  account: { tone: 'neutral', icon: IdCard },
};

export function notificationVisual(category: string) {
  return NOTE_TONE[category] ?? { tone: 'neutral' as Tone, icon: Bell };
}

export function NotificationsPreview({
  items,
  unread,
  demo,
}: {
  items: NotificationView[] | undefined;
  unread: number;
  demo: boolean;
}) {
  return (
    <Card className="gap-4">
      <div className="flex items-center gap-2">
        <h2 className="text-h5">Notifications</h2>
        {unread > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-status-danger px-1.5 text-[11px] font-semibold text-text-on-danger">
            {unread}
          </span>
        )}
        <ArrowLinkText href={ACCOUNT_ROUTES.notifications} className="ml-auto">
          View all
        </ArrowLinkText>
      </div>
      {!items ? (
        <Skeleton className="h-40 w-full" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell aria-hidden />}
          title="That’s everything for now"
          description="Deposits, withdrawals, round results and security alerts will appear here."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((n) => {
            const v = notificationVisual(n.category);
            return (
              <li
                key={n.id}
                className="flex gap-3 rounded-md border border-border-subtle bg-bg-secondary p-3"
              >
                <IconTile icon={v.icon} tone={v.tone} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-body-s-strong">{n.title}</p>
                    {!n.read && (
                      <span
                        aria-label="Unread"
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-brand"
                      />
                    )}
                  </div>
                  <p className="text-caption text-text-secondary">{n.body}</p>
                  <p className="mt-1 flex items-center gap-2 text-caption text-text-tertiary">
                    {relative(n.createdAt)}
                    {n.isDemo && demo && <Demo size="xs" />}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ── Recent activity ────────────────────────────────────────────────────────────────────────────

const TX_FILTERS = [
  { id: 'all', label: 'All', type: undefined },
  { id: 'deposit', label: 'Deposits', type: 'deposit' },
  { id: 'withdrawal', label: 'Withdrawals', type: 'withdrawal' },
  { id: 'entry_purchase', label: 'Entries', type: 'entry_purchase' },
] as const;

function txIcon(type: string) {
  if (type === 'deposit') return ArrowDownToLine;
  if (type === 'withdrawal') return ArrowUpFromLine;
  if (type.includes('refund')) return RotateCcw;
  return Ticket;
}

function statusTone(status: string): Tone {
  if (['completed', 'confirmed', 'credited', 'settled'].includes(status)) return 'success';
  if (['failed', 'rejected', 'cancelled'].includes(status)) return 'danger';
  if (status === 'under_review') return 'warning';
  return 'pending';
}

export function RecentActivity({ demo, isNew }: { demo: boolean; isNew: boolean }) {
  const [filter, setFilter] = React.useState<(typeof TX_FILTERS)[number]['id']>('all');
  const type = TX_FILTERS.find((f) => f.id === filter)?.type;
  const tx = useTransactions({ pageSize: 5, ...(type ? { type } : {}) });
  return (
    <Card className="gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-h5">Recent activity</h2>
        <Demo show={demo} size="m" />
        {!isNew && (
          <div
            role="group"
            aria-label="Filter activity"
            className="ml-auto flex gap-1 rounded-md bg-bg-secondary p-1"
          >
            {TX_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'h-9 rounded-sm px-3 text-label-m transition-colors',
                  filter === f.id
                    ? 'bg-surface-raised text-text-primary'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
        <ArrowLinkText href={HISTORY_ROUTES.transactions} className={isNew ? 'ml-auto' : ''}>
          All transactions
        </ArrowLinkText>
      </div>
      {tx.isPending ? (
        <Skeleton className="h-60 w-full" />
      ) : tx.isError ? (
        <EmptyState
          type="error"
          title="We couldn’t load your activity"
          description="Try again in a moment."
        />
      ) : tx.data.items.length === 0 ? (
        <EmptyState
          title="No transactions yet"
          description="Deposits, withdrawals, pool entries, prizes and refunds will appear here. Start with a USDT deposit on any supported network — minimum 10.00 USDT."
          actions={
            <>
              <Button size="m" leadingIcon={<ArrowDownToLine aria-hidden />} asChild>
                <Link href={ROUTES.deposit}>Make a deposit</Link>
              </Button>
              <Button size="m" variant="ghost" asChild>
                <Link href={ROUTES.wallet}>How deposits work</Link>
              </Button>
            </>
          }
        />
      ) : (
        <ul className="flex flex-col">
          {tx.data.items.map((t) => (
            <TxLine key={t.id} t={t} demo={demo} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function TxLine({ t, demo }: { t: TxRow; demo: boolean }) {
  const Icon = txIcon(t.type);
  const signed = `${t.direction === 'in' ? '+' : '−'}${formatUSDT(t.direction === 'out' ? t.amount : t.netAmount, { symbol: false })}`;
  const tone = statusTone(t.status);
  return (
    <li className="border-t border-border-subtle first:border-t-0">
      <Link
        href={`${HISTORY_ROUTES.transactions}?q=${encodeURIComponent(t.id)}`}
        className="grid grid-cols-[40px_1fr_auto] items-center gap-3 py-3 hover:bg-surface-hover/40 tablet:grid-cols-[40px_1fr_auto_auto_auto]"
      >
        <IconTile icon={Icon} tone={t.direction === 'in' ? 'success' : 'neutral'} size={36} />
        <div className="min-w-0">
          <p className="truncate text-body-s-strong">{t.description}</p>
          <p className="truncate text-caption text-text-tertiary">
            {t.id}
            {t.statusDetail ? ` · ${t.statusDetail}` : ''}
            {t.platformFee && money(t.platformFee).gt(0)
              ? ` · platform fee ${formatUSDT(t.platformFee)} billed separately`
              : ''}
          </p>
        </div>
        <span
          className={cn(
            'text-number-s tabular-nums',
            t.direction === 'in' ? 'text-text-success' : 'text-text-primary',
          )}
        >
          {signed} <span className="text-caption text-text-tertiary">USDT</span>
        </span>
        <span
          className={cn(
            'hidden rounded-full px-2 py-0.5 text-label-s capitalize tablet:inline-flex',
            {
              success: 'bg-status-success-tint text-text-success',
              danger: 'bg-status-danger-tint text-text-danger',
              warning: 'bg-status-warning-tint text-text-warning',
              pending: 'bg-status-pending-tint text-status-pending',
            }[tone as 'success' | 'danger' | 'warning' | 'pending'],
          )}
        >
          {t.status.replace(/_/g, ' ')}
        </span>
        <span className="hidden items-center gap-2 text-caption text-text-tertiary tablet:flex">
          {formatDateTimeUTC(t.createdAt)}
          {t.isDemo && <Demo show={demo} size="xs" />}
        </span>
      </Link>
    </li>
  );
}

// ── Responsible gaming module ──────────────────────────────────────────────────────────────────

export function RgModule({ rg, isNew }: { rg: RgView | undefined; isNew: boolean }) {
  const loss = rg?.limits.find((l) => l.type === 'loss');
  const deposit = rg?.limits.find((l) => l.type === 'deposit');
  const tiles = [
    {
      label: `${loss?.period === 'week' ? 'Weekly' : 'Daily'} loss limit`,
      value: loss?.limit
        ? `${formatUSDT(loss.used ?? '0', { symbol: false })} / ${formatUSDT(loss.limit)}`
        : 'Not set',
      pct: loss?.limit
        ? Math.min(
            100,
            money(loss.used ?? '0')
              .div(money(loss.limit))
              .times(100)
              .toNumber(),
          )
        : 0,
      note: loss?.limit ? 'Resets 00:00 UTC' : 'Recommended for new players',
    },
    {
      label: `${deposit?.period === 'week' ? 'Weekly' : deposit?.period === 'month' ? 'Monthly' : 'Daily'} deposit limit`,
      value: deposit?.limit
        ? `${formatUSDT(deposit.used ?? '0', { symbol: false })} / ${formatUSDT(deposit.limit)}`
        : 'Not set',
      pct: deposit?.limit
        ? Math.min(
            100,
            money(deposit.used ?? '0')
              .div(money(deposit.limit))
              .times(100)
              .toNumber(),
          )
        : 0,
      note: deposit?.pendingIncrease
        ? `Increase to ${formatUSDT(deposit.pendingIncrease.amount ?? '0')} starts ${formatDateTimeUTC(deposit.pendingIncrease.effectiveAt)}`
        : deposit?.limit
          ? 'Decreases apply now; increases wait 24 h'
          : 'Caps how much you can add per week',
    },
    {
      label: 'Reality check',
      value: `Every ${rg?.realityCheckMinutes ?? 60} min${isNew ? ' (default)' : ''}`,
      pct: 0,
      note: 'Shows time played and net result',
    },
  ];
  return (
    <Card className="gap-5" padding="l">
      <div className="flex flex-col gap-3 laptop:flex-row laptop:items-center">
        <div className="flex flex-1 items-start gap-3">
          <Timer aria-hidden className="mt-1 size-6 text-icon-brand" />
          <div>
            <h2 className="flex items-center gap-2 text-h4">
              {isNew ? 'Set your limits before you play' : 'Play within your limits'} <AgeBadge />
            </h2>
            <p className="text-body-s text-text-secondary">
              Limits cover Global Pool and every game. Decreases apply immediately; increases take
              effect after 24 h.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={ROUTES.responsibleGaming}
            className="inline-flex min-h-11 items-center px-2 text-label-m text-text-brand hover:underline"
          >
            Self-exclusion &amp; help organisations
          </Link>
          <Button
            size="m"
            variant="secondary"
            leadingIcon={<SlidersHorizontal aria-hidden />}
            asChild
          >
            <Link href={ROUTES.responsibleGaming}>Set limits</Link>
          </Button>
          <Button size="m" variant="ghost" leadingIcon={<Coffee aria-hidden />} asChild>
            <Link href={ROUTES.responsibleGaming}>Take a break</Link>
          </Button>
        </div>
      </div>
      {!rg ? (
        <Skeleton className="h-20 w-full" />
      ) : (
        <dl className="grid gap-4 tablet:grid-cols-3">
          {tiles.map((t) => (
            <div key={t.label} className="flex flex-col gap-1.5">
              <dt className="text-caption text-text-tertiary">{t.label}</dt>
              <dd className="text-number-s tabular-nums">{t.value}</dd>
              <Meter
                value={t.pct}
                tone={t.pct >= 90 ? 'danger' : t.pct >= 70 ? 'warning' : 'brand'}
                label={t.label}
              />
              <dd className="text-caption text-text-tertiary">{t.note}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="flex items-center gap-2 text-caption text-text-tertiary">
        <HeartHandshake aria-hidden className="size-4" /> Need to talk? Free, confidential help is
        listed on the Responsible gaming page.
      </p>
    </Card>
  );
}

export function LicenceLine() {
  return (
    <p className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-4 text-caption text-text-tertiary">
      <AgeBadge /> Real-money games require an applicable licence and are available only in
      permitted jurisdictions. 18+ only. Play responsibly. DEMO / testnet build — no real money.
    </p>
  );
}

export { formatCount };
