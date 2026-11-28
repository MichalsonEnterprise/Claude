'use client';

import { explorerTxUrl, type ChainKey } from '@gp/shared/chains';
import { TX_TYPE_LABEL } from '@gp/shared/enums';
import { formatTimeUTC } from '@gp/shared/format';
import { formatUSDT } from '@gp/shared/money';
import { ArrowRight, ExternalLink, Hash } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { AddressChip } from '@/components/domain/address-chip';
import { Amount } from '@/components/domain/amount';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransaction, type TxDetail } from '@/lib/api/wallet';

import { ResponsiveModal } from './responsive-modal';
import { StatusTimeline, type TimelineItem } from './timeline';
import { signedAmount, txTitle } from './tx-list';
import {
  ConfirmationBar,
  ConfirmationRing,
  KeyValueList,
  QueryError,
  TxStatusBadge,
  WALLET_ROUTES,
  chainName,
  when,
} from './wallet-ui';

/** Tx/Hash: mono hash + copy + explorer link (testnet explorer; DEMO hashes are illustrative, so no link). */
export function TxHash({
  hash,
  network,
  demo,
}: {
  hash: string;
  network: ChainKey | null;
  demo: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-icon-muted">
        <Hash aria-hidden className="size-3.5" />
      </span>
      <AddressChip address={hash} size="s" />
      {network && !demo ? (
        <a
          href={explorerTxUrl(network, hash)}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex min-h-8 items-center gap-1 text-caption text-text-brand hover:underline"
        >
          View on explorer <ExternalLink aria-hidden className="size-3.5" />
        </a>
      ) : (
        demo && (
          <span className="inline-flex items-center gap-1.5 text-caption text-text-tertiary">
            <DemoBadge size="xs" /> illustrative hash — no explorer link
          </span>
        )
      )}
    </div>
  );
}

function timelineFor(tx: TxDetail): TimelineItem[] {
  if (tx.type === 'withdrawal') {
    const items: TimelineItem[] = tx.timeline.map((s, i) => ({
      id: `${s.status}-${i}`,
      title: s.label,
      time: formatTimeUTC(s.at),
      state:
        s.status === 'rejected' || s.status === 'failed'
          ? 'error'
          : s.status === 'under_review' && i === tx.timeline.length - 1
            ? 'review'
            : 'done',
    }));
    const st = tx.withdrawalStatus;
    if (st && ['requested', 'risk_check', 'under_review', 'queued', 'broadcast'].includes(st)) {
      if (st !== 'broadcast')
        items.push({ id: 'sent', title: 'Sent to the network', detail: 'The transaction hash appears here', state: 'todo' });
      items.push({ id: 'confirmed', title: 'Confirmed on-chain', state: st === 'broadcast' ? 'current' : 'todo' });
    }
    return items;
  }
  if (tx.type === 'deposit') {
    const c = tx.confirmations;
    const credited = tx.status === 'completed';
    return [
      { id: 'detected', title: 'Detected', detail: `On ${chainName(tx.network)}`, time: formatTimeUTC(tx.createdAt), state: 'done' },
      {
        id: 'confirming',
        title: 'Confirming',
        detail: c ? `${c.current} / ${c.required} confirmations` : undefined,
        state: credited ? 'done' : tx.status === 'failed' || tx.status === 'rejected' ? 'error' : 'current',
        extra: c && !credited ? <ConfirmationBar current={c.current} required={c.required} /> : undefined,
      },
      {
        id: 'credited',
        title: credited ? 'Credited to Available' : 'Credited',
        detail: credited ? undefined : `Shown as Pending until ${c?.required ?? 'all'} confirmations`,
        time: tx.completedAt ? formatTimeUTC(tx.completedAt) : undefined,
        state: credited ? 'done' : 'todo',
      },
    ];
  }
  return tx.timeline.map((s, i) => ({
    id: `${i}`,
    title: s.label,
    time: formatTimeUTC(s.at),
    state: tx.status === 'failed' || tx.status === 'rejected' ? 'error' : tx.status === 'pending' ? 'current' : 'done',
  }));
}

/** WAL-21 Transaction detail — right drawer on desktop, bottom sheet on mobile (pending / failed / successful). */
export function TxDetailDrawer({
  reference,
  onOpenChange,
}: {
  reference: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const q = useTransaction(reference, { poll: true });
  const tx = q.data;
  return (
    <ResponsiveModal
      open={Boolean(reference)}
      onOpenChange={onOpenChange}
      desktop="drawer"
      title={
        tx ? (
          <span className="flex flex-wrap items-center gap-2">
            {txTitle(tx)}
            <TxStatusBadge status={tx.status} type={tx.type} size="m" />
          </span>
        ) : (
          'Transaction'
        )
      }
      description={tx ? `${tx.id} · ${when(tx.createdAt)}` : reference ?? undefined}
      footer={
        tx?.type === 'withdrawal' ? (
          <Button asChild block variant="secondary" trailingIcon={<ArrowRight />}>
            <Link href={WALLET_ROUTES.withdrawal(tx.id)}>Open withdrawal tracker</Link>
          </Button>
        ) : undefined
      }
    >
      {q.isPending ? (
        <div className="flex flex-col gap-4" aria-busy="true">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : q.isError ? (
        <QueryError error={q.error} onRetry={() => void q.refetch()} />
      ) : tx ? (
        <TxDetailBody tx={tx} />
      ) : null}
    </ResponsiveModal>
  );
}

function TxDetailBody({ tx }: { tx: TxDetail }) {
  const failed = tx.status === 'failed' || tx.status === 'rejected';
  const pending = !failed && tx.status !== 'completed' && tx.status !== 'cancelled';
  const c = tx.confirmations;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <Amount value={signedAmount(tx)} tone="signed" className="text-number-l" />
        {tx.isDemo && <DemoBadge size="s" />}
      </div>

      {tx.type === 'deposit' && pending && c && (
        <div className="flex items-center gap-3 rounded-md border border-border-subtle bg-bg-secondary p-3">
          <ConfirmationRing current={c.current} required={c.required} />
          <div className="min-w-0 flex-1">
            <p className="text-body-s-strong">
              {c.current} / {c.required} confirmations
            </p>
            <p className="text-caption text-text-tertiary">
              Shown as Pending — credited to Available automatically at {c.required} / {c.required}.
            </p>
            <ConfirmationBar current={c.current} required={c.required} className="mt-2" />
          </div>
        </div>
      )}

      {failed && (
        <Alert type="security" title={tx.type === 'withdrawal' ? 'Withdrawal not sent — funds returned' : 'Not completed'}>
          {tx.statusDetail ?? 'This transaction did not complete.'}
          {tx.type === 'withdrawal' && ' Nothing left GLOBAL POOL, so no network fee was charged.'}
        </Alert>
      )}
      {tx.type === 'withdrawal' && tx.withdrawalStatus === 'under_review' && (
        <Alert type="warning" title="Under review">
          {tx.statusDetail ?? 'A compliance analyst checks this withdrawal before it is sent.'} You can cancel it
          from the withdrawal tracker until it is sent.
        </Alert>
      )}

      <KeyValueList
        rows={[
          { label: 'Type', value: TX_TYPE_LABEL[tx.type] },
          { label: 'Amount', value: formatUSDT(tx.amount) },
          ...(tx.networkFee !== null
            ? [{ label: 'Network fee', value: tx.type === 'withdrawal' ? `−${formatUSDT(tx.networkFee)}` : formatUSDT(tx.networkFee) }]
            : []),
          { label: 'Platform fee', value: formatUSDT(tx.platformFee) },
          {
            label: tx.direction === 'in' ? 'Credited' : tx.type === 'withdrawal' ? 'You receive' : 'Total paid',
            value: <span className="text-body-s-strong">{formatUSDT(tx.netAmount)}</span>,
          },
          ...(tx.network ? [{ label: 'Network', value: chainName(tx.network) }] : []),
          ...(tx.addressDisplay ? [{ label: tx.direction === 'out' ? 'To' : 'Address', value: <span className="font-mono text-mono-s">{tx.addressDisplay}</span> }] : []),
          { label: 'Reference', value: <span className="font-mono text-mono-s">{tx.id}</span> },
          { label: 'Created', value: when(tx.createdAt) },
          ...(tx.completedAt ? [{ label: failed ? 'Closed' : 'Completed', value: when(tx.completedAt) }] : []),
        ]}
      />

      {tx.txHash && (
        <div className="flex flex-col gap-2">
          <p className="text-caption text-text-tertiary">Transaction hash</p>
          <TxHash hash={tx.txHash} network={tx.network} demo={tx.isDemo} />
        </div>
      )}

      <div className="flex flex-col gap-3">
        <h3 className="text-body-m-strong text-text-primary">Status timeline</h3>
        <StatusTimeline items={timelineFor(tx)} />
      </div>
    </div>
  );
}
