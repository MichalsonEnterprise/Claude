'use client';

import { formatDateTimeUTC } from '@gp/shared/format';
import { formatUSDT, gte, money, sub } from '@gp/shared/money';
import Link from 'next/link';
import * as React from 'react';

import { Amount } from '@/components/domain/amount';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import type { RgLimitView, RgView, WalletStatus } from '@/lib/api/wallet';

import { ResponsiveModal } from './responsive-modal';
import { KeyValueList, WALLET_ROUTES } from './wallet-ui';

const RG_ROUTE = '/responsible-gaming';

export function depositLimit(rg: RgView | undefined): RgLimitView | undefined {
  return rg?.limits.find((l) => l.type === 'deposit');
}

function periodLabel(period: string): string {
  return period === 'day' ? 'daily' : period === 'week' ? 'weekly' : period === 'month' ? 'monthly' : period;
}

/**
 * WAL-24 banners in context: maintenance (operational kill switches from GET /wallet/status), responsible-gaming
 * deposit limit usage and pending increases. Withdrawals are never blocked by RG limits or self-exclusion.
 */
export function WalletStatusBanners({
  status,
  rg,
  context,
}: {
  status: WalletStatus | undefined;
  rg: RgView | undefined;
  context: 'overview' | 'deposit' | 'withdraw';
}) {
  const banners: React.ReactNode[] = [];
  if (status && !status.depositsEnabled && context !== 'withdraw') {
    banners.push(
      <Alert key="dep-maint" type="maintenance" title="Deposits are paused for maintenance">
        New deposit addresses are not issued right now. Transfers already on their way are still detected
        and credited once deposits resume. Your balance is not affected.
      </Alert>,
    );
  }
  if (status && !status.withdrawalsEnabled && context !== 'deposit') {
    banners.push(
      <Alert key="wd-maint" type="maintenance" title="Withdrawals are paused for maintenance">
        Requests can’t be sent for a short time. Your balance stays in your account and pending
        withdrawals keep their place — nothing is cancelled.
      </Alert>,
    );
  }
  const dep = depositLimit(rg);
  if (dep && context !== 'withdraw') {
    const near = gte(dep.used, money(dep.limit).times(0.8).toFixed(2));
    if (near) {
      banners.push(
        <Alert
          key="dep-limit"
          type="warning"
          title={`You’ve used ${formatUSDT(dep.used)} of your ${periodLabel(dep.period)} deposit limit`}
          actions={
            <Button asChild variant="secondary" size="s">
              <Link href={RG_ROUTE}>Manage limits</Link>
            </Button>
          }
        >
          {formatUSDT(dep.remaining)} left this period. Limits are set by you and checked on our side
          for every deposit.
        </Alert>,
      );
    }
    if (dep.pendingIncrease) {
      banners.push(
        <Alert key="dep-pending" type="info" title="Deposit limit increase pending">
          Your increase to {formatUSDT(dep.pendingIncrease.amount)} applies after the 24 h cool-down, on{' '}
          {formatDateTimeUTC(dep.pendingIncrease.effectiveAt)}. You can keep the current limit by
          cancelling it in Responsible gaming.
        </Alert>,
      );
    }
  }
  if (banners.length === 0) return null;
  return <div className="flex flex-col gap-3">{banners}</div>;
}

/** WAL-24 insufficient-funds modal: what you have, what the action needs, the shortfall — no pressure. */
export function InsufficientFundsModal({
  open,
  onOpenChange,
  available,
  required,
  action = 'this withdrawal',
  demo = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  available: string;
  required: string;
  action?: string;
  demo?: boolean;
}) {
  const shortfall = sub(required, available);
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="s"
      title="Not enough Available balance"
      description={`Only your Available balance can be used for ${action}.`}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Change amount
          </Button>
          <Button asChild>
            <Link href={WALLET_ROUTES.deposit}>Deposit USDT</Link>
          </Button>
        </>
      }
    >
      <KeyValueList
        rows={[
          {
            label: 'Available',
            value: (
              <span className="inline-flex items-center gap-2">
                <Amount value={available} />
                {demo && <DemoBadge size="xs" />}
              </span>
            ),
          },
          { label: 'Needed', value: <Amount value={required} /> },
          {
            label: 'Short by',
            value: <Amount value={shortfall.isNegative() ? '0' : shortfall.toFixed(2)} className="text-text-warning" />,
          },
        ]}
      />
      <p className="mt-3 text-caption text-text-tertiary">
        Pending deposits become Available after their confirmations; Locked funds are released when the
        round settles or a withdrawal completes. Only deposit what you can afford to lose.
      </p>
    </ResponsiveModal>
  );
}

/** WAL-24 deposit-limit modal: the player's own RG limit was reached (server-enforced). */
export function DepositLimitModal({
  open,
  onOpenChange,
  limit,
  attempted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limit: RgLimitView | undefined;
  attempted?: string;
}) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="s"
      title="This deposit would go over your limit"
      description="You set this limit to stay in control. We check it on our side for every deposit."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Change amount
          </Button>
          <Button asChild variant="ghost">
            <Link href={RG_ROUTE}>Manage limits</Link>
          </Button>
        </>
      }
    >
      {limit ? (
        <KeyValueList
          rows={[
            { label: `${periodLabel(limit.period)} limit`.replace(/^./, (c) => c.toUpperCase()), value: <Amount value={limit.limit} /> },
            { label: 'Used this period', value: <Amount value={limit.used} /> },
            { label: 'Left', value: <Amount value={limit.remaining} className="text-text-warning" /> },
            ...(attempted ? [{ label: 'You tried', value: <Amount value={attempted} /> }] : []),
          ]}
        />
      ) : (
        <p className="text-body-s text-text-secondary">Your deposit limit has been reached for this period.</p>
      )}
      <p className="mt-3 text-caption text-text-tertiary">
        Lowering a limit applies immediately. Raising it takes effect only after a 24 h cool-down.
      </p>
    </ResponsiveModal>
  );
}

/** WAL-24 maintenance modal (SERVICE_UNAVAILABLE from the API). */
export function MaintenanceModal({
  open,
  onOpenChange,
  what,
  message,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  what: 'Deposits' | 'Withdrawals';
  message?: string;
}) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="s"
      title={`${what} are paused for maintenance`}
      description={message}
      footer={
        <Button asChild>
          <Link href={WALLET_ROUTES.overview}>Back to wallet</Link>
        </Button>
      }
    >
      <p className="text-body-s text-text-secondary">
        Nothing was sent and your balance has not changed. Please try again later — we’ll show a notice on
        your wallet as soon as {what.toLowerCase()} resume.
      </p>
    </ResponsiveModal>
  );
}
