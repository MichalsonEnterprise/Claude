'use client';

import { CHAIN_KEYS, type ChainKey } from '@gp/shared/chains';
import { ArrowRight, Lock, ShieldAlert, User } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { ChainMark } from '@/components/brand/chain-mark';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge, type BadgeStatus } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/search-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDeposits, type DepositRow, type DepositsResponse } from '@/lib/api/admin-b';
import { cn } from '@/lib/utils';

import { ExportCsvButton } from '../export-dialog';
import {
  CopyHash,
  DataTable,
  FilterChips,
  KeyValues,
  KpiGrid,
  KpiTile,
  LiveDot,
  ModuleHeader,
  MoneyText,
  Pagination,
  Panel,
  PageStack,
  Pill,
  QueryView,
  count,
  dt,
  usd,
  type Column,
} from '../primitives';

const STATUS: Record<DepositRow['status'], { s: BadgeStatus; label: string }> = {
  detected: { s: 'pending', label: 'Detected' },
  confirming: { s: 'processing', label: 'Confirming' },
  credited: { s: 'confirmed', label: 'Credited' },
  rejected: { s: 'rejected', label: 'Unsupported' },
};
const initials = (h: string | null | undefined) =>
  (h ?? '??').replace('@', '').slice(0, 2).toUpperCase();

function StatusCell({ d }: { d: DepositRow }) {
  if (d.amlAlert && d.status !== 'credited')
    return (
      <Pill tone="warning" icon={ShieldAlert}>
        Held · AML
      </Pill>
    );
  return <StatusBadge status={STATUS[d.status].s} label={STATUS[d.status].label} size="s" />;
}

function ConfRing({ d, size = 56 }: { d: DepositRow; size?: number }) {
  const pct = Math.min(1, d.confirmations / Math.max(1, d.requiredConfirmations));
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      className="shrink-0 -rotate-90"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth="5"
        className="stroke-surface-raised"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${pct * c} ${c}`}
        className={pct >= 1 ? 'stroke-status-success' : 'stroke-status-info'}
      />
    </svg>
  );
}

function SelectedDeposit({ d }: { d: DepositRow }) {
  const segments = Math.min(d.requiredConfirmations, 24);
  const lit = Math.round((d.confirmations / Math.max(1, d.requiredConfirmations)) * segments);
  return (
    <Panel
      title={`${d.reference} · ${STATUS[d.status].label.toLowerCase()}`}
      demo={d.isDemo}
      description="Selected row · refreshes every 30 s"
      actions={<StatusCell d={d} />}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4 rounded-md border border-border-subtle bg-bg-secondary p-4">
          <span className="relative flex items-center justify-center">
            <ConfRing d={d} />
            <span className="absolute text-label-s text-text-primary">
              {d.confirmations}/{d.requiredConfirmations}
            </span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-label-l text-text-primary">
              {d.confirmations} / {d.requiredConfirmations} confirmations
            </span>
            <span className="text-caption text-text-tertiary">
              {d.networkName} · {d.reference}
            </span>
            <span className="flex gap-0.5" aria-hidden>
              {Array.from({ length: segments }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1 flex-1 rounded-full',
                    i < lit ? 'bg-status-info' : 'bg-surface-raised',
                  )}
                />
              ))}
            </span>
          </span>
        </div>
        <KeyValues
          items={[
            { k: 'User', v: `${d.user.handle ?? '—'} · ${d.user.publicId}` },
            { k: 'Amount', v: <MoneyText value={d.amount} /> },
            { k: 'Network', v: `${d.networkName} (testnet)` },
            { k: 'Tx hash', v: <CopyHash value={d.txHash} label="transaction hash" /> },
            {
              k: 'Crediting rule',
              v:
                d.status === 'credited'
                  ? `Credited ${dt(d.creditedAt)}`
                  : `Pending now; moves to Available automatically at ${d.requiredConfirmations} / ${d.requiredConfirmations} confirmations`,
            },
          ]}
        />
        <Button
          asChild
          variant="secondary"
          size="s"
          leadingIcon={<User aria-hidden />}
          className="w-fit"
        >
          <Link href={`/admin/users/${d.user.id}`}>Open user profile</Link>
        </Button>
      </div>
    </Panel>
  );
}

function HeldPanel({ held }: { held: DepositsResponse['held'] }) {
  return (
    <Panel
      title="Held deposits → Compliance"
      demo
      description="Holds are placed by screening rules, not by Finance. Release or return is decided in AML alerts."
    >
      {held.length === 0 ? (
        <p className="text-body-s text-text-tertiary">No deposit is held for review.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {held.map((h) => (
            <li
              key={h.id}
              className="flex items-center gap-3 rounded-md border border-border-subtle bg-bg-secondary p-3"
            >
              <ShieldAlert aria-hidden className="size-4 shrink-0 text-text-warning" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-label-m text-text-primary">
                  <span className="font-mono">{h.reference}</span> · {h.handle} · {h.networkName}
                </span>
                <span className="truncate text-caption text-text-tertiary">
                  {h.alert ? h.alert.rule.replace(/_/g, ' ') : 'Screening hold'}
                </span>
              </span>
              <MoneyText value={h.amount} />
            </li>
          ))}
        </ul>
      )}
      <Button
        asChild
        variant="secondary"
        size="s"
        className="mt-3 w-fit"
        trailingIcon={<ArrowRight aria-hidden />}
      >
        <Link href="/admin/compliance/aml">Open in AML alerts</Link>
      </Button>
    </Panel>
  );
}

export function DepositsPage() {
  const [status, setStatus] = React.useState<'all' | DepositRow['status']>('all');
  const [network, setNetwork] = React.useState<'all' | ChainKey>('all');
  const [q, setQ] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<string | null>(null);
  React.useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const deposits = useDeposits({
    page,
    pageSize: 20,
    status: status === 'all' ? undefined : status,
    network: network === 'all' ? undefined : network,
    q: query || undefined,
  });

  const columns: Column<DepositRow>[] = [
    {
      key: 'ref',
      header: 'Deposit',
      cell: (d) => <span className="font-mono text-mono-s text-text-primary">{d.reference}</span>,
    },
    {
      key: 'user',
      header: 'User',
      cell: (d) => (
        <span className="flex items-center gap-2">
          <Avatar size="xs" initials={initials(d.user.handle)} label="" />
          {d.user.handle ?? d.user.publicId}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount (USDT)',
      align: 'right',
      cell: (d) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="text-body-s-strong">{usd(d.amount)}</span>
          {d.isDemo ? <DemoBadge size="xs" /> : null}
        </span>
      ),
    },
    {
      key: 'network',
      header: 'Network',
      cell: (d) => (
        <span className="inline-flex items-center gap-1.5 text-text-secondary">
          <ChainMark chain={d.network as ChainKey} size={16} label="" />
          {d.networkName}
        </span>
      ),
    },
    {
      key: 'tx',
      header: 'Tx hash',
      hideBelow: 'laptop',
      cell: (d) => <CopyHash value={d.txHash} label="transaction hash" />,
    },
    {
      key: 'conf',
      header: 'Conf.',
      align: 'right',
      cell: (d) => (
        <span
          className={
            d.confirmations < d.requiredConfirmations ? 'text-text-info' : 'text-text-primary'
          }
        >
          {d.confirmations} / {d.requiredConfirmations}
        </span>
      ),
    },
    { key: 'status', header: 'Status', cell: (d) => <StatusCell d={d} /> },
    {
      key: 'at',
      header: 'Received (UTC)',
      hideBelow: 'desktop',
      cell: (d) => <span className="text-text-secondary">{dt(d.detectedAt)}</span>,
    },
  ];

  return (
    <PageStack>
      <ModuleHeader
        module="Finance"
        title="Deposits"
        badges={<LiveDot label="LIVE" />}
        description="Incoming test-USDT deposits. Funds are credited automatically once the required confirmations are reached — admins can monitor and route holds to Compliance, but can never edit, re-credit or reverse a deposit."
        actions={<ExportCsvButton dataset="deposits" />}
      />
      <QueryView query={deposits}>
        {(data) => {
          const current =
            data.items.find((d) => d.id === selected) ??
            data.items.find((d) => d.status === 'confirming') ??
            data.items[0] ??
            null;
          return (
            <>
              <KpiGrid>
                <KpiTile
                  label="Credited · 24 h"
                  value={usd(data.summary.credited24h.amount)}
                  unit="USDT"
                  sub={`${count(data.summary.credited24h.count)} deposits · Σ all networks`}
                  demo
                />
                <KpiTile
                  label="Confirming now"
                  value={count(data.summary.confirming.count)}
                  unit="deposits"
                  sub={`${usd(data.summary.confirming.amount)} USDT in flight · below confirmation threshold`}
                  subTone="info"
                  demo
                />
                <KpiTile
                  label="Held for review"
                  value={count(data.summary.heldForCompliance)}
                  unit="deposits"
                  sub="Screening holds — not credited"
                  subTone={data.summary.heldForCompliance > 0 ? 'warning' : 'neutral'}
                  demo
                />
                <KpiTile
                  label="Unsupported · 24 h"
                  value={count(data.summary.unsupported24h.count)}
                  unit="deposits"
                  sub="Wrong token — never credited"
                  demo
                />
              </KpiGrid>

              <Panel
                title="Network watchers"
                demo
                description="Required confirmations before a deposit is credited."
              >
                <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 tablet:mx-0 tablet:grid tablet:grid-cols-3 tablet:px-0 laptop:grid-cols-5">
                  {data.networks.map((n) => (
                    <li
                      key={n.network}
                      className="flex min-w-[170px] flex-col gap-1 rounded-md border border-border-subtle bg-bg-secondary p-3"
                    >
                      <span className="flex flex-wrap items-center gap-1.5 text-label-s text-text-primary">
                        <ChainMark chain={n.network as ChainKey} size={16} label="" />
                        {n.name}
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-caption',
                            n.watcher === 'running'
                              ? 'text-text-success'
                              : n.watcher === 'not_configured'
                                ? 'text-text-warning'
                                : 'text-text-tertiary',
                          )}
                        >
                          <span
                            aria-hidden
                            className={cn(
                              'size-1.5 rounded-full',
                              n.watcher === 'running'
                                ? 'bg-status-success'
                                : n.watcher === 'not_configured'
                                  ? 'bg-status-warning'
                                  : 'bg-ink-400',
                            )}
                          />
                          {n.watcher === 'running'
                            ? 'Operational'
                            : n.watcher === 'not_configured'
                              ? 'No RPC (DEMO)'
                              : 'Coming soon'}
                        </span>
                      </span>
                      <span className="text-body-s-strong text-text-primary">
                        {n.requiredConfirmations} confirmations
                      </span>
                      <span
                        className={cn(
                          'text-caption',
                          n.confirming > 0 ? 'text-text-warning' : 'text-text-tertiary',
                        )}
                      >
                        {count(n.creditedToday)} credited today
                        {n.confirming > 0 ? ` · ${count(n.confirming)} confirming` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>

              <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-default p-3 tablet:p-4">
                <div className="flex flex-col gap-2 tablet:flex-row">
                  <SearchInput
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onClear={() => setQ('')}
                    placeholder="Search user, handle, DP- ID, tx hash…"
                    aria-label="Search deposits"
                    groupClassName="tablet:flex-1"
                  />
                  <Select
                    value={network}
                    onValueChange={(v) => {
                      setNetwork(v as 'all' | ChainKey);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="tablet:w-48" aria-label="Network">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All networks</SelectItem>
                      {CHAIN_KEYS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {data.networks.find((n) => n.network === k)?.name ?? k}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FilterChips
                  label="Deposit status"
                  value={status}
                  onChange={(v) => {
                    setStatus(v);
                    setPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'All' },
                    {
                      value: 'confirming',
                      label: 'Confirming',
                      count: data.summary.confirming.count,
                    },
                    { value: 'detected', label: 'Detected', count: data.summary.detected.count },
                    { value: 'credited', label: 'Credited', count: data.summary.credited.count },
                    { value: 'rejected', label: 'Unsupported', count: data.summary.rejected.count },
                  ]}
                />
                <p className="flex flex-wrap items-center justify-between gap-2 text-caption text-text-tertiary">
                  <span className="inline-flex items-center gap-1.5">
                    {count(data.total)} results <DemoBadge size="xs" /> · sorted by newest first ·
                    refreshes every 30 s
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Lock aria-hidden className="size-3" /> Exports are watermarked with your admin
                    ID and recorded in the audit log
                  </span>
                </p>
              </div>

              <Panel
                flush
                title="Deposit activity"
                description="Newest first · select a row to open its detail panel"
                actions={
                  <span className="flex items-center gap-2">
                    <LiveDot label="LIVE" />
                    <DemoBadge size="s" />
                  </span>
                }
              >
                <DataTable
                  caption="Deposits"
                  columns={columns}
                  rows={data.items}
                  rowKey={(d) => d.id}
                  selectedKey={current?.id ?? null}
                  onRowClick={(d) => setSelected(d.id)}
                  empty={
                    <EmptyState
                      type={
                        query || status !== 'all' || network !== 'all' ? 'no-results' : 'no-data'
                      }
                      title={
                        query || status !== 'all' || network !== 'all'
                          ? 'No deposits match these filters'
                          : 'No deposits yet'
                      }
                      description="Deposits appear here as soon as a watcher sees the transfer on-chain."
                      className="py-10"
                    />
                  }
                  mobileCard={(d) => (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-mono-s text-text-primary">
                          {d.reference}
                        </span>
                        <StatusCell d={d} />
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-h5 text-text-primary tabular-nums">
                          {usd(d.amount)}{' '}
                          <span className="text-caption text-text-tertiary">USDT</span>
                        </span>
                        <span className="text-caption text-text-secondary tabular-nums">
                          {d.confirmations}/{d.requiredConfirmations} conf.
                        </span>
                      </div>
                      <p className="text-caption text-text-secondary">
                        {d.user.handle} · {d.networkName} · {dt(d.detectedAt)}
                      </p>
                    </div>
                  )}
                  footer={
                    <Pagination
                      page={data.page}
                      totalPages={data.totalPages}
                      total={data.total}
                      pageSize={data.pageSize}
                      onPage={setPage}
                      noun="deposits"
                      demo
                    />
                  }
                />
              </Panel>

              <div className="grid gap-4 laptop:grid-cols-2">
                {current ? <SelectedDeposit d={current} /> : null}
                <HeldPanel held={data.held} />
              </div>
              <p className="text-caption text-text-tertiary">
                All times UTC. Exports are recorded in the audit log. Deposits cannot be edited or
                reversed by any admin role.
              </p>
            </>
          );
        }}
      </QueryView>
    </PageStack>
  );
}
