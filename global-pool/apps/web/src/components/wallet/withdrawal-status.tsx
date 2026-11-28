'use client';

import { CHAINS } from '@gp/shared/chains';
import { WITHDRAWAL_STATUS_LABEL } from '@gp/shared/enums';
import { formatDateTimeUTC, formatTimeUTC } from '@gp/shared/format';
import { formatUSDT } from '@gp/shared/money';
import {
  Check,
  ChevronRight,
  CircleCheck,
  Clock,
  Eye,
  History,
  LifeBuoy,
  Lock,
  Mail,
  MessageSquare,
  ShieldAlert,
  Undo2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { useMutation } from '@tanstack/react-query';

import { AddressChip } from '@/components/domain/address-chip';
import { Amount } from '@/components/domain/amount';
import { Alert } from '@/components/ui/alert';
import { StatusBadge, type BadgeStatus } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { publicEnv } from '@/lib/env';
import {
  useInvalidateWallet,
  useWithdrawal,
  walletApi,
  type WithdrawalDetail,
  type WithdrawalView,
} from '@/lib/api/wallet';
import { cn } from '@/lib/utils';

import { ResponsiveModal } from './responsive-modal';
import { StatusTimeline, type TimelineItem } from './timeline';
import { TxHash } from './tx-detail';
import { KeyValueList, QueryError, WALLET_ROUTES, chainName } from './wallet-ui';

type Phase = 'processing' | 'queued' | 'review' | 'success' | 'failed' | 'cancelled';
const OPEN = ['requested', 'risk_check', 'under_review', 'queued'] as const;

export function phaseOf(w: Pick<WithdrawalView, 'status'>): Phase {
  switch (w.status) {
    case 'queued':
      return 'queued';
    case 'under_review':
      return 'review';
    case 'confirmed':
      return 'success';
    case 'failed':
    case 'rejected':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
    case 'requested':
    case 'risk_check':
    case 'broadcast':
      return 'processing';
  }
}

const PHASE_BADGE: Record<Phase, { status: BadgeStatus; label: string }> = {
  processing: { status: 'processing', label: 'Processing' },
  queued: { status: 'pending', label: 'Queued' },
  review: { status: 'under_review', label: 'Under review' },
  success: { status: 'confirmed', label: 'Completed' },
  failed: { status: 'failed', label: 'Failed' },
  cancelled: { status: 'expired', label: 'Cancelled' },
};

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const addHours = (iso: string, h: number) =>
  new Date(new Date(iso).getTime() + h * 3_600_000).toISOString();

function headline(w: WithdrawalView): { title: string; body: string } {
  const net = CHAINS[w.network].testnet.name;
  switch (phaseOf(w)) {
    case 'processing':
      return w.status === 'broadcast'
        ? {
            title: 'Sending your withdrawal',
            body: `It’s being confirmed on ${net}. You can leave this page — it updates by itself.`,
          }
        : {
            title: 'Running security checks',
            body: 'Automatic checks usually take a few seconds. You can leave this page.',
          };
    case 'queued':
      return {
        title: 'Approved — waiting to be sent',
        body: `It passed every check and is queued for sending on ${net}. You can still cancel until it’s sent.`,
      };
    case 'review':
      return {
        title: 'Under review — usually under 4 h',
        body: 'We’ll send it as soon as the review is done. You don’t need to do anything — we’ll notify you here.',
      };
    case 'success':
      return {
        title: 'Withdrawal complete',
        body: `Your USDT has arrived. The transaction is final on ${net}.`,
      };
    case 'cancelled':
      return {
        title: 'Withdrawal cancelled — your funds are back',
        body: 'Nothing was sent and no fee was charged.',
      };
    case 'failed':
      return w.status === 'rejected'
        ? {
            title: 'Withdrawal rejected — your funds are back',
            body: 'We couldn’t send this withdrawal after our checks. Nothing left GLOBAL POOL, so no network fee was charged.',
          }
        : {
            title: 'Withdrawal couldn’t be sent — your funds are back',
            body: 'The network didn’t accept the transaction, so nothing left GLOBAL POOL and no network fee was charged.',
          };
  }
}

/** Progress steps for the tracker / timeline (status events from the API + what comes next). */
export function withdrawalTimeline(w: WithdrawalView): TimelineItem[] {
  const ev = (s: string) => w.timeline.find((e) => e.status === s);
  const items: TimelineItem[] = [];
  const req = ev('requested');
  items.push({
    id: 'requested',
    title: 'Withdrawal requested',
    detail: req
      ? `${formatDateTimeUTC(req.at)} · confirmed with your authenticator code`
      : undefined,
    state: 'done',
  });
  const risk = ev('risk_check');
  const review = ev('under_review');
  const rejected = ev('rejected');
  items.push({
    id: 'checks',
    title: 'Security & risk checks',
    detail: risk ? risk.label : 'Automatic checks — a few seconds',
    time: risk ? formatTimeUTC(risk.at) : undefined,
    state: risk ? 'done' : w.status === 'requested' ? 'current' : 'todo',
  });
  if (review || w.status === 'under_review') {
    const cleared = ['queued', 'broadcast', 'confirmed'].includes(w.status);
    items.push({
      id: 'review',
      title: 'Manual AML review',
      detail: review
        ? `${review.label}${w.status === 'under_review' ? ` · decision expected by ${formatTimeUTC(addHours(review.at, 4))}` : ''}`
        : undefined,
      time: review ? formatTimeUTC(review.at) : undefined,
      state: rejected ? 'error' : cleared ? 'done' : 'review',
    });
  }
  if (rejected) {
    items.push({
      id: 'rejected',
      title: 'Rejected',
      detail: rejected.label,
      time: formatTimeUTC(rejected.at),
      state: 'error',
    });
    items.push({
      id: 'returned',
      title: 'Returned to Available',
      detail: `${formatUSDT(w.amount)} · no fees charged`,
      state: 'done',
    });
    return items;
  }
  const cancelled = ev('cancelled');
  if (cancelled) {
    items.push({
      id: 'cancelled',
      title: 'Cancelled by you',
      detail: cancelled.label,
      time: formatTimeUTC(cancelled.at),
      state: 'done',
    });
    return items;
  }
  const queued = ev('queued');
  if (queued || w.status === 'queued') {
    items.push({
      id: 'queued',
      title: w.status === 'queued' ? 'Waiting to be sent' : 'Queued for sending',
      detail: w.status === 'queued' ? 'You can cancel until it is sent' : queued?.label,
      time: queued ? formatTimeUTC(queued.at) : undefined,
      state: w.status === 'queued' ? 'current' : 'done',
    });
  }
  const sent = ev('broadcast');
  const failed = ev('failed');
  items.push({
    id: 'sent',
    title: `Sent to ${CHAINS[w.network].testnet.name}`,
    detail: sent ? sent.label : 'The transaction hash appears here',
    time: sent ? formatTimeUTC(sent.at) : undefined,
    state: failed ? 'error' : sent ? 'done' : w.status === 'broadcast' ? 'current' : 'todo',
  });
  if (failed) {
    items.push({
      id: 'failed',
      title: 'Network failure',
      detail: failed.label,
      time: formatTimeUTC(failed.at),
      state: 'error',
    });
    items.push({
      id: 'returned',
      title: 'Returned to Available',
      detail: `${formatUSDT(w.amount)} · network fee not charged`,
      state: 'done',
    });
    return items;
  }
  const confirmed = ev('confirmed');
  items.push({
    id: 'confirmed',
    title: 'Confirmed on-chain',
    detail: confirmed ? confirmed.label : `${CHAINS[w.network].confirmations} confirmations`,
    time: confirmed ? formatTimeUTC(confirmed.at) : undefined,
    state: confirmed ? 'done' : 'todo',
  });
  return items;
}

/** Cancel (before broadcast) — funds return to Available straight away. */
function useCancel(w: WithdrawalView) {
  const invalidate = useInvalidateWallet();
  return useMutation({
    mutationFn: () => walletApi.cancelWithdrawal(w.id),
    onSuccess: () => {
      void invalidate();
      toast({
        type: 'success',
        title: 'Withdrawal cancelled',
        description: `${formatUSDT(w.amount)} is back in Available.`,
      });
    },
    onError: (e) => toast({ type: 'error', title: 'Couldn’t cancel', description: e.message }),
  });
}

/**
 * Status body for one withdrawal: WAL-17 Pending (processing / queued / manual review), WAL-18 Successful,
 * WAL-19 Failed (rejected / network failure), plus cancelled. Live: polled while open.
 */
export function WithdrawalOutcome({
  w,
  compact = false,
}: {
  w: WithdrawalDetail | WithdrawalView;
  compact?: boolean;
}) {
  const phase = phaseOf(w);
  const h = headline(w);
  const cancel = useCancel(w);
  const invalidate = useInvalidateWallet();
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const simulate = useMutation({
    mutationFn: () => walletApi.simulateWithdrawalConfirm(w.id),
    onSuccess: () => void invalidate(),
    onError: (e) =>
      toast({ type: 'error', title: 'DEMO simulation failed', description: e.message }),
  });
  const cancellable = (OPEN as readonly string[]).includes(w.status);
  const done = phase === 'success';
  const back = phase === 'failed' || phase === 'cancelled';
  const reason =
    'screening' in w && w.screening?.reason
      ? w.screening.reason
      : w.timeline.find((e) => e.status === 'under_review')?.label;
  const reviewAt = w.timeline.find((e) => e.status === 'under_review')?.at;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge size="m" status={PHASE_BADGE[phase].status} label={PHASE_BADGE[phase].label} />
        <span className="text-caption text-text-tertiary">
          {w.reference} · {formatDateTimeUTC(w.updatedAt > w.createdAt ? w.updatedAt : w.createdAt)}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <h2 className={cn('text-text-primary', compact ? 'text-h4' : 'text-h3')}>{h.title}</h2>
        <p className="text-body-m text-text-secondary">{h.body}</p>
      </div>

      <div className="flex flex-col gap-1 rounded-lg border border-border-subtle bg-bg-secondary p-4">
        <p className="text-overline text-text-tertiary uppercase">
          {done ? 'You received' : back ? 'Returned to Available' : 'You receive'}
        </p>
        <div className="flex items-center gap-2">
          <Amount
            value={back ? w.amount : w.youReceive}
            className={cn(
              'text-number-xl',
              done || back ? 'text-text-success' : 'text-text-primary',
            )}
          />
          {w.isDemo && <DemoBadge size="s" />}
        </div>
        <p className="text-caption text-text-tertiary">
          {back
            ? 'No network fee or platform fee was charged.'
            : `to ${short(w.toAddress)} on ${CHAINS[w.network].testnet.name} · network fee ${formatUSDT(w.networkFee)} · platform fee ${formatUSDT(w.platformFee)}`}
        </p>
      </div>

      {!compact && (
        <ul className="grid grid-cols-1 gap-2 tablet:grid-cols-3">
          {[
            ['Requested', formatTimeUTC(w.createdAt)],
            phase === 'review' && reviewAt
              ? ['Decision expected', `by ${formatTimeUTC(addHours(reviewAt, 4))}`]
              : phase === 'success'
                ? ['Completed', formatTimeUTC(w.updatedAt)]
                : ['Network', chainName(w.network)],
            ['Reference', w.reference],
          ].map((t) =>
            t ? (
              <li
                key={t[0]}
                className="flex flex-col gap-0.5 rounded-md border border-border-subtle p-3"
              >
                <span className="text-caption text-text-tertiary">{t[0]}</span>
                <span
                  className={cn(
                    'text-body-s-strong',
                    t[0] === 'Decision expected' ? 'text-text-warning' : 'text-text-primary',
                  )}
                >
                  {t[1]}
                </span>
              </li>
            ) : null,
          )}
        </ul>
      )}

      {phase === 'review' && (
        <Alert type="warning" title={`Why: ${reason ?? 'manual review'}`}>
          A compliance analyst checks the destination before anything is sent. You won’t be asked
          for documents unless something is unclear — and we’d tell you here first.
        </Alert>
      )}
      {phase === 'failed' && (
        <Alert
          type="security"
          title={
            w.status === 'rejected' ? 'Reason' : 'Reason: the network didn’t accept the transaction'
          }
        >
          {w.rejectionReason ?? w.failureReason ?? 'The withdrawal could not be completed.'} The
          full {formatUSDT(w.amount)} is back in Available.
        </Alert>
      )}
      {w.txHash && (
        <div className="flex flex-col gap-2">
          <p className="text-caption text-text-tertiary">Transaction hash</p>
          <TxHash hash={w.txHash} network={w.network} demo={w.isDemo} />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="text-body-m-strong text-text-primary">
          {back ? 'What happened' : 'Withdrawal progress'}
        </h3>
        <StatusTimeline items={withdrawalTimeline(w)} />
      </div>

      {cancellable && (
        <Alert type="info" title={`${formatUSDT(w.amount)} is held in Locked until it’s sent`}>
          You can cancel until it’s sent — the full amount goes straight back to Available.
        </Alert>
      )}
      {w.status === 'broadcast' && (
        <Alert type="info" title="It can’t be cancelled now">
          It’s already being sent. The amount stays in Locked until the transaction confirms.
        </Alert>
      )}
      {done && (
        <p className="text-caption text-text-tertiary">
          A receipt is kept in your transaction history. Genuine GLOBAL POOL emails always show your
          anti-phishing code.
        </p>
      )}

      {w.status === 'queued' && publicEnv.demoMode && (
        <div className="flex flex-col gap-2 rounded-md border border-dashed border-status-warning bg-status-warning-tint p-3">
          <p className="flex items-center gap-2 text-body-s-strong text-text-warning">
            <DemoBadge size="xs" /> DEMO control — no testnet signer is connected
          </p>
          <p className="text-caption text-text-secondary">
            In this DEMO build queued withdrawals wait for a signer. Simulate the broadcast and
            on-chain confirmation (same ledger postings as a real one; nothing is sent).
          </p>
          <Button
            variant="secondary"
            size="s"
            className="self-start"
            loading={simulate.isPending}
            onClick={() => simulate.mutate()}
          >
            Simulate testnet confirmation
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-border-subtle pt-4 tablet:flex-row tablet:items-center">
        {cancellable && (
          <Button variant="secondary" leadingIcon={<X />} onClick={() => setConfirmCancel(true)}>
            Cancel withdrawal
          </Button>
        )}
        <Button asChild variant="ghost" leadingIcon={<History />}>
          <Link href={WALLET_ROUTES.tx(w.reference)}>View in history</Link>
        </Button>
        {(phase === 'review' || phase === 'failed') && (
          <Button asChild variant="ghost" leadingIcon={<LifeBuoy />}>
            <Link href="/support">Contact support</Link>
          </Button>
        )}
        <span className="flex-1" />
        <Button asChild>
          <Link href={WALLET_ROUTES.overview}>Back to wallet</Link>
        </Button>
      </div>

      <ResponsiveModal
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        size="s"
        title="Cancel this withdrawal?"
        description={`${formatUSDT(w.amount)} goes straight back to Available. No fee is charged.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
              Keep withdrawal
            </Button>
            <Button
              variant="danger"
              loading={cancel.isPending}
              onClick={() => cancel.mutate(undefined, { onSettled: () => setConfirmCancel(false) })}
            >
              Cancel withdrawal
            </Button>
          </>
        }
      >
        <p className="text-body-s text-text-secondary">
          You can start a new withdrawal any time. If it was under review, the review stops too.
        </p>
      </ResponsiveModal>
    </div>
  );
}

/** WAL-22 tracker steps: Requested · Security checks · AML review · Sent · Completed (with times + notes). */
function trackerSteps(w: WithdrawalView) {
  const ev = (st: string) => w.timeline.find((e) => e.status === st);
  const net = CHAINS[w.network].name;
  const reviewed = Boolean(ev('under_review'));
  const bad = w.status === 'rejected' || w.status === 'failed';
  const sent = ev('broadcast');
  const done = ev('confirmed');
  type S = {
    key: string;
    title: string;
    time: string;
    note: string;
    state: 'done' | 'current' | 'review' | 'todo' | 'error';
  };
  const steps: S[] = [
    {
      key: 'req',
      title: 'Requested',
      time: formatTimeUTC(w.createdAt),
      note: 'Confirmed with 2FA',
      state: 'done',
    },
    {
      key: 'chk',
      title: 'Security checks',
      time: ev('risk_check') ? formatTimeUTC(ev('risk_check')!.at) : 'running',
      note: ev('risk_check') ? 'Automatic checks done' : 'A few seconds',
      state: ev('risk_check') ? 'done' : 'current',
    },
    {
      key: 'aml',
      title: reviewed ? 'AML review' : 'Approval',
      time: reviewed
        ? `since ${formatTimeUTC(ev('under_review')!.at)}`
        : ev('queued')
          ? formatTimeUTC(ev('queued')!.at)
          : 'pending',
      note:
        w.status === 'under_review'
          ? 'Manual review in progress'
          : w.status === 'rejected'
            ? 'Not approved'
            : reviewed || ev('queued')
              ? 'Cleared'
              : 'Automatic',
      state:
        w.status === 'rejected'
          ? 'error'
          : w.status === 'under_review'
            ? 'review'
            : ev('queued') || sent
              ? 'done'
              : 'todo',
    },
    {
      key: 'sent',
      title: `Sent to ${net}`,
      time: sent ? formatTimeUTC(sent.at) : 'pending',
      note: sent ? 'Transaction broadcast' : 'You get a tx hash here',
      state:
        w.status === 'failed'
          ? 'error'
          : sent
            ? 'done'
            : w.status === 'queued'
              ? 'current'
              : 'todo',
    },
    {
      key: 'done',
      title: 'Completed',
      time: done ? formatTimeUTC(done.at) : bad ? '—' : 'pending',
      note: `${CHAINS[w.network].confirmations} confirmations, then done`,
      state: done ? 'done' : w.status === 'broadcast' ? 'current' : 'todo',
    },
  ];
  return steps;
}

const STEP_DOT = {
  done: 'border-status-success bg-status-success-tint text-text-success',
  current: 'border-brand bg-brand-tint text-text-brand',
  review: 'border-status-warning bg-status-warning-tint text-text-warning',
  todo: 'border-border-default text-icon-muted',
  error: 'border-status-danger bg-status-danger-tint text-text-danger',
} as const;

function StepTracker({ w }: { w: WithdrawalView }) {
  const steps = trackerSteps(w);
  return (
    <ol
      className="grid grid-cols-1 gap-4 tablet:grid-cols-5 tablet:gap-0"
      aria-label="Withdrawal progress"
    >
      {steps.map((st, i) => (
        <li key={st.key} className="relative flex gap-3 tablet:flex-col tablet:gap-2 tablet:pr-4">
          {i < steps.length - 1 && (
            <span
              aria-hidden
              className={cn(
                'absolute hidden h-0.5 tablet:top-3.5 tablet:right-0 tablet:left-9 tablet:block',
                st.state === 'done' ? 'bg-status-success/70' : 'bg-border-default',
              )}
            />
          )}
          <span
            className={cn(
              'relative z-[1] flex size-7 shrink-0 items-center justify-center rounded-full border-2',
              STEP_DOT[st.state],
            )}
          >
            {st.state === 'done' ? (
              <Check aria-hidden className="size-3.5" strokeWidth={3} />
            ) : st.state === 'review' ? (
              <Eye aria-hidden className="size-3.5" />
            ) : st.state === 'error' ? (
              <X aria-hidden className="size-3.5" />
            ) : (
              <Clock aria-hidden className="size-3.5" />
            )}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p
              className={cn(
                'text-body-m-strong',
                st.state === 'todo' ? 'text-text-tertiary' : 'text-text-primary',
              )}
            >
              {st.title}
              <span className="sr-only">
                {' '}
                —{' '}
                {st.state === 'done'
                  ? 'done'
                  : st.state === 'todo'
                    ? 'not yet'
                    : st.state === 'review'
                      ? 'under review'
                      : st.state === 'error'
                        ? 'failed'
                        : 'in progress'}
              </span>
            </p>
            <p
              className={cn(
                'text-caption',
                st.state === 'review' ? 'text-text-warning' : 'text-text-tertiary',
              )}
            >
              {st.time}
            </p>
            <p className="text-caption text-text-tertiary">{st.note}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** WAL-22 Withdrawal status tracker page (/wallet/withdraw/[reference]). */
export function WithdrawalTracker({ reference }: { reference: string }) {
  const q = useWithdrawal(reference);
  const w = q.data;
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  return (
    <div className="flex flex-col gap-6">
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-body-s text-text-secondary"
      >
        <Link href={WALLET_ROUTES.overview} className="hover:text-text-primary">
          Wallet
        </Link>
        <ChevronRight aria-hidden className="size-4 text-icon-muted" />
        <Link href={WALLET_ROUTES.history} className="hover:text-text-primary">
          Transaction history
        </Link>
        <ChevronRight aria-hidden className="size-4 text-icon-muted" />
        <span className="text-text-primary" aria-current="page">
          {reference}
        </span>
      </nav>
      {q.isPending ? (
        <Card radius="xl" padding="l" className="gap-4" aria-busy="true">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </Card>
      ) : q.isError ? (
        <Card radius="xl">
          <QueryError
            error={q.error}
            onRetry={() => void q.refetch()}
            title="We couldn’t find this withdrawal"
          />
        </Card>
      ) : w ? (
        <TrackerBody
          w={w}
          onCancel={() => setConfirmCancel(true)}
          confirmCancel={confirmCancel}
          setConfirmCancel={setConfirmCancel}
        />
      ) : null}
    </div>
  );
}

function TrackerBody({
  w,
  onCancel,
  confirmCancel,
  setConfirmCancel,
}: {
  w: WithdrawalDetail;
  onCancel: () => void;
  confirmCancel: boolean;
  setConfirmCancel: (o: boolean) => void;
}) {
  const phase = phaseOf(w);
  const h = headline(w);
  const cancel = useCancel(w);
  const cancellable = (OPEN as readonly string[]).includes(w.status);
  const reviewAt = w.timeline.find((e) => e.status === 'under_review')?.at;
  const eta = phase === 'review' && reviewAt ? addHours(reviewAt, 4) : null;
  const minutesIn = reviewAt
    ? Math.max(0, Math.round((Date.now() - new Date(reviewAt).getTime()) / 60_000))
    : 0;
  const reason = w.screening?.reason ?? w.timeline.find((e) => e.status === 'under_review')?.label;
  const net = CHAINS[w.network];
  const log = [...w.timeline].reverse();
  return (
    <>
      <div className="flex flex-col gap-4 laptop:flex-row laptop:items-start laptop:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="flex flex-wrap items-center gap-3 text-h3 text-text-primary tablet:text-h2">
            Withdrawal {w.reference}
            <StatusBadge
              size="m"
              status={PHASE_BADGE[phase].status}
              label={PHASE_BADGE[phase].label}
            />
            {w.isDemo && <DemoBadge size="m" />}
          </h1>
          <p className="text-body-s text-text-secondary tablet:text-body-m">
            Requested {formatDateTimeUTC(w.createdAt)} · {formatUSDT(w.amount)} to{' '}
            {short(w.toAddress)} on {net.testnet.name}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild variant="ghost" leadingIcon={<MessageSquare />}>
            <Link href="/support">Contact support</Link>
          </Button>
          {cancellable && (
            <Button variant="secondary" leadingIcon={<X />} onClick={onCancel}>
              Cancel withdrawal
            </Button>
          )}
        </div>
      </div>

      <Card radius="xl" padding="l" className="gap-6">
        <div className="flex flex-col gap-6 laptop:flex-row laptop:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p
              className={cn(
                'flex items-center gap-2 text-overline uppercase',
                phase === 'review'
                  ? 'text-text-warning'
                  : phase === 'failed'
                    ? 'text-text-danger'
                    : 'text-text-tertiary',
              )}
            >
              {phase === 'review' && <Eye aria-hidden className="size-4" />}
              {phase === 'review'
                ? 'Under manual review · AML screening'
                : PHASE_BADGE[phase].label}
            </p>
            <h2 className="text-h3 text-text-primary tablet:text-h2">
              {phase === 'review' ? 'A compliance analyst is checking this withdrawal' : h.title}
            </h2>
            <p className="text-body-m text-text-secondary">
              {phase === 'review'
                ? `${reason ? `${reason}. ` : ''}This is routine — you don’t need to do anything. If we need more information we’ll contact you in the app; genuine messages show your anti-phishing code.`
                : h.body}
            </p>
          </div>
          {(eta || phase === 'success' || phase === 'queued') && (
            <div className="flex w-full flex-col gap-2 rounded-lg border border-border-subtle bg-surface-raised p-4 laptop:w-80">
              <p className="text-overline text-text-tertiary uppercase">
                {phase === 'success' ? 'Completed' : 'Estimated completion'}
              </p>
              <p className="flex items-center gap-2 text-h3 text-text-primary">
                {phase === 'success'
                  ? formatTimeUTC(w.updatedAt)
                  : eta
                    ? `by ${formatTimeUTC(eta)}`
                    : 'next batch'}
                {w.isDemo && <DemoBadge size="s" />}
              </p>
              <p className="text-caption text-text-tertiary">
                {phase === 'review'
                  ? `${formatDateUTCShort(eta!)} · usually under 4 h`
                  : phase === 'queued'
                    ? 'Sent as soon as a signer is available'
                    : `${net.confirmations} / ${net.confirmations} confirmations`}
              </p>
              {phase === 'review' && (
                <>
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-surface-pressed"
                    aria-hidden
                  >
                    <div
                      className="h-full rounded-full bg-status-warning"
                      style={{ width: `${Math.min(100, (minutesIn / 240) * 100)}%` }}
                    />
                  </div>
                  <p className="text-caption text-text-tertiary">
                    In review for {minutesIn} min · started {formatTimeUTC(reviewAt!)}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
        <StepTracker w={w} />
        {(phase === 'failed' || phase === 'cancelled') && (
          <Alert
            type={phase === 'failed' ? 'security' : 'info'}
            title={
              phase === 'failed'
                ? 'Funds returned to Available'
                : 'Cancelled — funds returned to Available'
            }
          >
            {w.rejectionReason ?? w.failureReason ?? 'Nothing was sent.'} {formatUSDT(w.amount)} is
            back in Available; no fees were charged.
          </Alert>
        )}
        {w.txHash && <TxHash hash={w.txHash} network={w.network} demo={w.isDemo} />}
        {w.status === 'queued' && <DemoSimulateConfirm w={w} />}
      </Card>

      <div className="grid grid-cols-1 gap-6 laptop:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card radius="xl" padding="l" className="gap-4">
          <h2 className="flex items-center gap-2 text-h5">
            Amount &amp; fees {w.isDemo && <DemoBadge size="s" />}
          </h2>
          <div className="flex flex-col gap-1 rounded-lg border border-border-subtle bg-bg-secondary p-4">
            <KeyValueList
              rows={[
                { label: 'Withdrawal amount', value: formatUSDT(w.amount) },
                {
                  label: (
                    <span>
                      Network fee · {net.name}
                      <span className="block text-caption text-text-tertiary">
                        Paid to the network, not to GLOBAL POOL
                      </span>
                    </span>
                  ),
                  value: `−${formatUSDT(w.networkFee)}`,
                },
                {
                  label: (
                    <span>
                      Platform fee
                      <span className="block text-caption text-text-tertiary">
                        No platform fee on withdrawals
                      </span>
                    </span>
                  ),
                  value: formatUSDT(w.platformFee),
                },
              ]}
            />
            <div className="mt-2 flex items-center justify-between gap-3 rounded-md border border-border-brand bg-brand-tint-subtle p-3">
              <div>
                <p className="text-body-m-strong text-text-primary">
                  {phase === 'success' ? 'You received' : 'You receive'}
                </p>
                <p className="text-caption text-text-tertiary">
                  to {short(w.toAddress)} on {net.testnet.name}
                </p>
              </div>
              <Amount value={w.youReceive} className="text-number-m text-text-primary" />
            </div>
          </div>
          {cancellable && (
            <p className="flex gap-2 text-caption text-text-tertiary">
              <Lock aria-hidden className="size-4 shrink-0" />
              {formatUSDT(w.amount)} stays in Locked until this completes or you cancel it.
              Cancelling returns it to Available right away.
            </p>
          )}
        </Card>
        <Card radius="xl" padding="l" className="gap-4">
          <h2 className="flex items-center gap-2 text-h5">
            Destination {w.isDemo && <DemoBadge size="s" />}
          </h2>
          <div className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-secondary p-4 tablet:flex-row tablet:items-center tablet:justify-between">
            <div className="flex flex-col gap-1.5">
              <p className="text-body-s-strong">
                {net.testnet.name} · {net.usdtStandard}
              </p>
              <AddressChip address={w.toAddress} chain={w.network} size="s" demo={w.isDemo} />
            </div>
          </div>
          <h3 className="text-body-m-strong">What happens next</h3>
          <ul className="flex flex-col gap-3 text-body-s">
            <li className="flex gap-3">
              <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-text-success" />
              <span>
                <span className="text-text-primary">Approved</span>
                <span className="block text-caption text-text-tertiary">
                  We send it to {net.testnet.name} and add the tx hash here. You receive{' '}
                  {formatUSDT(w.youReceive)}.
                </span>
              </span>
            </li>
            <li className="flex gap-3">
              <Mail aria-hidden className="mt-0.5 size-5 shrink-0 text-text-info" />
              <span>
                <span className="text-text-primary">More information needed</span>
                <span className="block text-caption text-text-tertiary">
                  We contact you in the app. The request waits — nothing is lost.
                </span>
              </span>
            </li>
            <li className="flex gap-3">
              <Undo2 aria-hidden className="mt-0.5 size-5 shrink-0 text-icon-muted" />
              <span>
                <span className="text-text-primary">Not approved</span>
                <span className="block text-caption text-text-tertiary">
                  The full {formatUSDT(w.amount)} returns to Available. No fees are charged.
                </span>
              </span>
            </li>
          </ul>
        </Card>
      </div>

      <Card radius="xl" padding="l" className="gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-h5">
            Activity log {w.isDemo && <DemoBadge size="s" />}
          </h2>
          <span className="text-caption text-text-tertiary">All times UTC · newest first</span>
        </div>
        <ol className="flex flex-col">
          {log.map((e, i) => (
            <li
              key={`${e.status}-${i}`}
              className="flex gap-4 border-b border-border-subtle py-3 last:border-b-0"
            >
              <span className="w-12 shrink-0 font-mono text-mono-s text-text-tertiary">
                {formatTimeUTC(e.at).replace(' UTC', '')}
              </span>
              <span className="min-w-0">
                <span className="block text-body-s-strong text-text-primary">
                  {WITHDRAWAL_STATUS_LABEL[e.status]}
                </span>
                <span className="block text-caption text-text-tertiary">{e.label}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>
      <p className="flex gap-2 text-caption text-text-tertiary">
        <ShieldAlert aria-hidden className="size-4 shrink-0" />
        Status updates by itself. Reviewers can approve or reject per the published withdrawal
        policy but can never change the amount or the destination. Support will never ask for your
        codes.
      </p>

      <ResponsiveModal
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        size="s"
        title="Cancel this withdrawal?"
        description={`${formatUSDT(w.amount)} goes straight back to Available. No fee is charged.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
              Keep withdrawal
            </Button>
            <Button
              variant="danger"
              loading={cancel.isPending}
              onClick={() => cancel.mutate(undefined, { onSettled: () => setConfirmCancel(false) })}
            >
              Cancel withdrawal
            </Button>
          </>
        }
      >
        <p className="text-body-s text-text-secondary">
          If it was under review, the review stops too.
        </p>
      </ResponsiveModal>
    </>
  );
}

function formatDateUTCShort(iso: string): string {
  return formatDateTimeUTC(iso).split(',')[0]!;
}

/** DEMO control: no testnet signer is connected, so a queued withdrawal can be confirmed by simulation. */
function DemoSimulateConfirm({ w }: { w: WithdrawalView }) {
  const invalidate = useInvalidateWallet();
  const simulate = useMutation({
    mutationFn: () => walletApi.simulateWithdrawalConfirm(w.id),
    onSuccess: () => void invalidate(),
    onError: (e) =>
      toast({ type: 'error', title: 'DEMO simulation failed', description: e.message }),
  });
  if (!publicEnv.demoMode) return null;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-status-warning bg-status-warning-tint p-3">
      <p className="flex items-center gap-2 text-body-s-strong text-text-warning">
        <DemoBadge size="xs" /> DEMO control — no testnet signer is connected
      </p>
      <p className="text-caption text-text-secondary">
        Simulate the broadcast and on-chain confirmation (same ledger postings as a real one;
        nothing is sent).
      </p>
      <Button
        variant="secondary"
        size="s"
        className="self-start"
        loading={simulate.isPending}
        onClick={() => simulate.mutate()}
      >
        Simulate testnet confirmation
      </Button>
    </div>
  );
}
