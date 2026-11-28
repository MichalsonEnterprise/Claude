'use client';

import { CHAIN_DISPLAY_ORDER, CHAINS } from '@gp/shared/chains';
import { formatCount, formatDateTimeUTC } from '@gp/shared/format';
import { formatUSDT, isZero, money } from '@gp/shared/money';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  ChevronRight,
  Coins,
  History,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { Amount } from '@/components/domain/amount';
import { NetworkPill } from '@/components/domain/network-pill';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { newIdempotencyKey } from '@/lib/api/client';
import {
  useBalances,
  useClaimOwed,
  useDeposits,
  useLifetime,
  useRg,
  useTransactions,
  useWalletStatus,
  useWithdrawals,
  type TxView,
  type WalletBalances,
} from '@/lib/api/wallet';
import { cn } from '@/lib/utils';

import { WalletStatusBanners } from './banners';
import { BalanceBreakdown, BalanceBreakdownSkeleton } from './balance-breakdown';
import { TxList, TxListSkeleton } from './tx-list';
import {
  ConfirmationBar,
  ConfirmationRing,
  KeyValueList,
  QueryError,
  SectionTitle,
  WALLET_ROUTES,
  WalletPageHeader,
  WalletTabs,
  chainName,
} from './wallet-ui';

/** WAL-01 Wallet overview (desktop) + MOB-05 (390): buckets, glossary, quick actions, in-progress, activity. */
export function WalletOverview() {
  const balances = useBalances();
  const status = useWalletStatus();
  const rg = useRg();
  const tx = useTransactions({ page: 1, pageSize: 5 });

  const empty =
    balances.data && isZero(balances.data.total) && tx.data !== undefined && tx.data.total === 0;

  return (
    <div className="flex flex-col gap-6">
      <WalletPageHeader
        title="Wallet"
        description="Your GLOBAL POOL platform balance in USDT. Deposit and withdraw on Arbitrum Sepolia (testnet); entries are paid from this balance."
        actions={
          <div className="hidden items-center gap-3 tablet:flex">
            <Button asChild variant="secondary" leadingIcon={<ArrowUpFromLine />}>
              <Link href={WALLET_ROUTES.withdraw}>Withdraw</Link>
            </Button>
            <Button asChild leadingIcon={<ArrowDownToLine />}>
              <Link href={WALLET_ROUTES.deposit}>Deposit</Link>
            </Button>
          </div>
        }
      />
      <WalletTabs className="hidden tablet:block" />
      <WalletStatusBanners status={status.data} rg={rg.data} context="overview" />

      {balances.isError ? (
        <Card radius="xl">
          <QueryError
            error={balances.error}
            onRetry={() => void balances.refetch()}
            title="We couldn’t load your balances"
          />
        </Card>
      ) : empty ? (
        <EmptyWallet />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 laptop:grid-cols-[minmax(0,0.78fr)_minmax(0,1fr)]">
            <div className="flex min-w-0 flex-col gap-6">
              {balances.data ? (
                <BalanceBreakdown balances={balances.data} updatedAt={balances.dataUpdatedAt} />
              ) : (
                <BalanceBreakdownSkeleton />
              )}
              <LifetimeCard className="hidden laptop:flex" />
            </div>
            <div className="flex min-w-0 flex-col gap-6">
              <MobileActions balances={balances.data} />
              <WithdrawableCard balances={balances.data} />
              <InProgressCard balances={balances.data} />
            </div>
          </div>
          <RecentActivity loading={tx.isPending} error={tx.error} items={tx.data?.items ?? []} />
          <LifetimeCard className="laptop:hidden" />
        </>
      )}

      <NetworksStrip />
      <p className="flex gap-2 text-caption text-text-tertiary">
        <ShieldCheck aria-hidden className="size-4 shrink-0" />
        Balances live on your GLOBAL POOL platform account and are computed from an append-only
        ledger. On-chain transfers happen only when you deposit or withdraw; pool entries are paid
        from Available with no network fee. DEMO / testnet — no real money.
      </p>
    </div>
  );
}

function WithdrawableCard({ balances }: { balances: WalletBalances | undefined }) {
  const status = useWalletStatus();
  const s = status.data?.withdrawal;
  return (
    <Card radius="xl" padding="l" className="hidden gap-5 tablet:flex">
      <div className="flex flex-col gap-1">
        <p className="text-overline text-text-tertiary uppercase">Withdrawable now</p>
        {balances ? (
          <div className="flex items-center gap-2">
            <Amount value={balances.available} className="text-number-l text-balance-available" />
            <DemoBadge size="s" />
          </div>
        ) : (
          <Skeleton className="h-10 w-48" />
        )}
        <p className="text-body-s text-text-secondary">
          Equals your Available balance. Locked, pending and owed funds become withdrawable as soon
          as they settle.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 tablet:gap-3">
        <QuickAction
          href={WALLET_ROUTES.deposit}
          icon={<ArrowDownToLine />}
          label="Deposit"
          primary
        />
        <QuickAction href={WALLET_ROUTES.withdraw} icon={<ArrowUpFromLine />} label="Withdraw" />
        <QuickAction href={WALLET_ROUTES.history} icon={<History />} label="History" />
      </div>
      <div className="flex flex-col gap-2 rounded-md border border-border-subtle bg-bg-secondary p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-body-s">
          <span className="flex items-center gap-1.5 text-text-secondary">
            <ShieldCheck aria-hidden className="size-4 text-icon-muted" />
            Daily withdrawal limit
            {status.data && <span>· KYC {status.data.kycLevel.replace('level_', 'Level ')}</span>}
          </span>
          {s ? (
            <span className="inline-flex items-center gap-2 tabular-nums text-text-primary">
              {formatUSDT(s.usedToday, { symbol: false })} / {formatUSDT(s.dailyLimit)}
              <DemoBadge size="xs" />
            </span>
          ) : (
            <Skeleton className="h-4 w-32" />
          )}
        </div>
        {s && (
          <div
            className="h-1.5 overflow-hidden rounded-full bg-surface-pressed"
            role="meter"
            aria-label="Daily withdrawal limit used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              isZero(s.dailyLimit) ? 0 : money(s.usedToday).div(s.dailyLimit).times(100).toNumber()
            }
          >
            <div
              className="h-full rounded-full bg-status-info"
              style={{
                width: `${isZero(s.dailyLimit) ? 0 : Math.min(100, money(s.usedToday).div(s.dailyLimit).times(100).toNumber())}%`,
              }}
            />
          </div>
        )}
        {s && (
          <p className="text-caption text-text-tertiary">
            Resets {formatDateTimeUTC(s.resetsAt)} · platform withdrawal fee{' '}
            {formatUSDT(s.platformFee)} · the network fee is shown before you confirm
          </p>
        )}
      </div>
    </Card>
  );
}

/** MOB-05: action tiles + a compact "Withdrawable now" strip (< 768 px). */
function MobileActions({ balances }: { balances: WalletBalances | undefined }) {
  const status = useWalletStatus();
  const s = status.data?.withdrawal;
  return (
    <div className="flex flex-col gap-3 tablet:hidden">
      <div className="grid grid-cols-3 gap-2">
        <QuickAction
          href={WALLET_ROUTES.deposit}
          icon={<ArrowDownToLine />}
          label="Deposit"
          primary
        />
        <QuickAction href={WALLET_ROUTES.withdraw} icon={<ArrowUpFromLine />} label="Withdraw" />
        <QuickAction href={WALLET_ROUTES.history} icon={<History />} label="History" />
      </div>
      <div className="flex flex-col gap-1 rounded-lg border border-border-subtle bg-surface-default p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-body-s text-text-secondary">Withdrawable now</span>
          {balances ? (
            <span className="flex items-center gap-1.5">
              <Amount
                value={balances.available}
                className="text-body-m-strong text-balance-available"
              />
              <DemoBadge size="xs" />
            </span>
          ) : (
            <Skeleton className="h-5 w-28" />
          )}
        </div>
        {s && (
          <p className="text-caption text-text-tertiary">
            Daily limit {formatUSDT(s.usedToday, { symbol: false })} / {formatUSDT(s.dailyLimit)}{' '}
            used
            {status.data ? ` (KYC ${status.data.kycLevel.replace('level_', 'L')})` : ''} · resets
            00:00 UTC · platform fee {formatUSDT(s.platformFee, { symbol: false })}
          </p>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  primary,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-lg px-2 py-3 text-label-m transition-colors tablet:min-h-12 tablet:flex-row tablet:gap-2 tablet:rounded-md tablet:py-2 [&_svg]:size-[18px]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus',
        primary
          ? 'bg-brand text-text-on-primary hover:bg-brand-hover'
          : 'border border-border-default bg-surface-raised text-text-primary hover:bg-surface-hover',
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

/** Exported for the close-out test: a failed deposits / withdrawals list is an error, never "Nothing in progress". */
export function InProgressCard({ balances }: { balances: WalletBalances | undefined }) {
  const router = useRouter();
  const deposits = useDeposits();
  const withdrawals = useWithdrawals();
  const claim = useClaimOwed();
  const claimKey = React.useRef<string | null>(null);

  const pendingDeposits = (deposits.data?.items ?? []).filter(
    (d) => d.status === 'confirming' || d.status === 'detected',
  );
  const openWithdrawals = (withdrawals.data?.items ?? []).filter((w) =>
    ['requested', 'risk_check', 'under_review', 'queued', 'broadcast'].includes(w.status),
  );
  const entries = balances?.breakdown.locked.filter((l) => l.reference.startsWith('round:')) ?? [];
  const owed = balances?.breakdown.owed ?? [];
  const loading = !balances || deposits.isPending || withdrawals.isPending;
  // A failed list is not "nothing in progress" (e.g. a deposit still confirming must never disappear silently).
  const failed = deposits.isError ? deposits : withdrawals.isError ? withdrawals : null;
  const nothing =
    !loading &&
    !failed &&
    pendingDeposits.length === 0 &&
    openWithdrawals.length === 0 &&
    entries.length === 0 &&
    owed.length === 0;

  const onClaim = () => {
    claimKey.current ??= newIdempotencyKey();
    claim.mutate(claimKey.current, {
      onSuccess: (r) => {
        claimKey.current = null;
        toast({
          type: 'success',
          title: 'Moved to Available',
          description: `${formatUSDT(r.claimed)} is now Available.`,
        });
      },
      onError: (e) => toast({ type: 'error', title: 'Couldn’t claim', description: e.message }),
    });
  };

  return (
    <Card radius="xl" padding="l" className="gap-4">
      <SectionTitle
        demo
        action={
          balances && (
            <span className="hidden text-caption text-text-tertiary tablet:block">
              Locked {formatUSDT(balances.locked, { symbol: false })} · Pending{' '}
              {formatUSDT(balances.pending, { symbol: false })} · Owed {formatUSDT(balances.owed)}
            </span>
          )
        }
      >
        In progress
      </SectionTitle>
      {failed && !loading && (
        <QueryError error={failed.error} onRetry={() => void failed.refetch()} />
      )}
      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : nothing ? (
        <p className="rounded-md border border-dashed border-border-default p-4 text-body-s text-text-secondary">
          Nothing in progress. Deposits waiting for confirmations, pending withdrawals, active
          entries and refunds show up here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {pendingDeposits.map((d) => (
            <li
              key={d.id}
              className="flex flex-col gap-2 rounded-md border border-border-subtle bg-bg-secondary p-3"
            >
              <div className="flex items-center gap-3">
                <ConfirmationRing
                  current={d.confirmations.current}
                  required={d.confirmations.required}
                  size={44}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-body-s-strong text-text-primary">
                    {d.confirmations.current} / {d.confirmations.required} confirmations
                  </p>
                  <p className="truncate text-caption text-text-tertiary">
                    {formatUSDT(d.amount)} · {chainName(d.network)} · {d.reference}
                  </p>
                </div>
                {d.isDemo && <DemoBadge size="xs" />}
              </div>
              <ConfirmationBar
                current={d.confirmations.current}
                required={d.confirmations.required}
              />
            </li>
          ))}
          {openWithdrawals.map((w) => (
            <InProgressRow
              key={w.id}
              icon={<ArrowUpFromLine />}
              title={`Withdrawal ${w.reference} · ${formatUSDT(w.amount)} locked`}
              detail={`To ${w.toAddress.slice(0, 6)}…${w.toAddress.slice(-4)} on ${chainName(w.network)} · you receive ${formatUSDT(w.youReceive)}`}
              badge={
                <StatusBadge
                  status={w.status === 'under_review' ? 'under_review' : 'processing'}
                  label={w.statusLabel}
                />
              }
              action={
                <Button
                  variant="ghost"
                  size="s"
                  trailingIcon={<ChevronRight />}
                  onClick={() => router.push(WALLET_ROUTES.withdrawal(w.reference))}
                >
                  Track
                </Button>
              }
            />
          ))}
          {entries.map((e) => (
            <InProgressRow
              key={e.reference}
              icon={<Ticket />}
              title={`${e.label.replace('Active entries — ', 'Entries · ')} · ${formatUSDT(e.amount)} locked`}
              detail="Unlocks when the round is drawn (or returns to Owed if the round is cancelled)."
              action={
                <Button asChild variant="ghost" size="s" trailingIcon={<ChevronRight />}>
                  <Link href="/pool/entries">My entries</Link>
                </Button>
              }
            />
          ))}
          {owed.length > 0 && (
            <InProgressRow
              icon={<Coins />}
              title={`${formatUSDT(balances?.owed ?? '0')} owed to you`}
              detail={owed
                .map((o) => `${o.label} ${formatUSDT(o.amount, { symbol: false })}`)
                .join(' · ')}
              action={
                <Button variant="secondary" size="s" loading={claim.isPending} onClick={onClaim}>
                  Claim to Available
                </Button>
              }
            />
          )}
        </ul>
      )}
    </Card>
  );
}

function InProgressRow({
  icon,
  title,
  detail,
  badge,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-md border border-border-subtle bg-bg-secondary p-3 tablet:flex-row tablet:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-raised text-icon-default [&_svg]:size-4"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-s-strong text-text-primary">{title}</p>
          <p className="text-caption text-text-tertiary">{detail}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2">
        {badge}
        {action}
      </div>
    </li>
  );
}

function RecentActivity({
  loading,
  error,
  items,
}: {
  loading: boolean;
  error: Error | null;
  items: TxView[];
}) {
  const router = useRouter();
  return (
    <Card radius="xl" padding="l" className="gap-4">
      <SectionTitle
        demo
        action={
          <Button asChild variant="ghost" size="s" trailingIcon={<ArrowRight />}>
            <Link href={WALLET_ROUTES.history}>All transactions</Link>
          </Button>
        }
      >
        Recent activity
      </SectionTitle>
      {loading ? (
        <TxListSkeleton rows={5} />
      ) : error ? (
        <QueryError error={error} />
      ) : items.length === 0 ? (
        <p className="text-body-s text-text-secondary">No transactions yet.</p>
      ) : (
        <TxList items={items} onSelect={(t) => router.push(WALLET_ROUTES.tx(t.id))} />
      )}
    </Card>
  );
}

function LifetimeCard({ className }: { className?: string }) {
  const lifetime = useLifetime();
  const l = lifetime.data;
  return (
    <Card radius="xl" padding="l" className={cn('gap-2', className)}>
      <SectionTitle demo>Lifetime totals</SectionTitle>
      {l ? (
        <KeyValueList
          rows={[
            { label: 'Deposited', value: formatUSDT(l.deposits) },
            { label: 'Withdrawn', value: formatUSDT(l.withdrawals) },
            {
              label: 'Entries purchased',
              value: `${formatCount(l.entries)} entries · ${formatUSDT(money(l.entries).times('10.00').toFixed(2))}`,
            },
            {
              label: 'Platform fees paid',
              value: `${formatUSDT(l.platformFeesPaid)} · ${formatCount(l.entries)} entries × 0.05`,
            },
            { label: 'Rewards received', value: formatUSDT(l.rewards) },
          ]}
        />
      ) : lifetime.isError ? (
        <QueryError error={lifetime.error} onRetry={() => void lifetime.refetch()} />
      ) : (
        <div className="flex flex-col gap-3 pt-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      )}
    </Card>
  );
}

function NetworksStrip() {
  return (
    <Card radius="xl" padding="m" className="gap-4 laptop:flex-row laptop:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-token-usdt text-white"
        >
          <Coins className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-h5 text-text-primary">Deposit test USDT on Arbitrum Sepolia</p>
          <p className="text-caption text-text-tertiary">
            Min. deposit {formatUSDT(CHAINS.arbitrum.minDeposit)} · network fees go to the chain,
            not to us · more networks coming soon
          </p>
        </div>
      </div>
      <ul className="flex flex-wrap items-center gap-2">
        {CHAIN_DISPLAY_ORDER.map((k) => (
          <li key={k} className="flex items-center gap-1">
            <NetworkPill chain={k} size="s" className={cn(!CHAINS[k].enabled && 'opacity-60')} />
            {!CHAINS[k].enabled && <span className="text-caption text-text-tertiary">Soon</span>}
          </li>
        ))}
      </ul>
      <Button asChild leadingIcon={<ArrowDownToLine />} className="hidden laptop:inline-flex">
        <Link href={WALLET_ROUTES.deposit}>Deposit</Link>
      </Button>
    </Card>
  );
}

/** WAL-01 / MOB-05 Empty: new account, no balance and no transactions yet. */
function EmptyWallet() {
  return (
    <>
      <Card radius="xl" padding="none" className="overflow-hidden">
        <EmptyState
          title="Your wallet is empty"
          description="Deposit test USDT on Arbitrum Sepolia to enter Global Pool rounds. Deposits are credited after 20 network confirmations — there is no deposit fee. You can lose your stake: only use money you can afford to lose."
          actions={
            <>
              <Button asChild leadingIcon={<ArrowDownToLine />}>
                <Link href={WALLET_ROUTES.deposit}>Deposit USDT</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/responsible-gaming">Set a deposit limit first</Link>
              </Button>
            </>
          }
          className="py-16"
        />
      </Card>
      <div className="sticky bottom-[calc(var(--gp-tabbar-h,56px)+12px)] z-10 tablet:hidden">
        <Button asChild block size="l" leadingIcon={<ArrowDownToLine />}>
          <Link href={WALLET_ROUTES.deposit}>Deposit USDT</Link>
        </Button>
      </div>
    </>
  );
}
