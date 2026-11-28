'use client';

import type { RoundStatus } from '@gp/shared/enums';
import { CircleCheck, Hourglass, Search, ShieldCheck, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/search-input';
import {
  useParticipants,
  usePoolOverview,
  usePrizes,
  useRoundHistory,
  type ParticipantRow,
  type PrizesResponse,
} from '@/lib/api/admin-b';

import { ExportCsvButton } from '../export-dialog';
import {
  DataTable,
  FilterChips,
  ImmutablePanel,
  KeyValues,
  KpiGrid,
  KpiTile,
  ModuleHeader,
  MoneyText,
  Pagination,
  Panel,
  PageSkeleton,
  PageStack,
  Pill,
  QueryView,
  Timeline,
  count,
  dt,
  roundLabel,
  usd,
  type Column,
} from '../primitives';
import { ROUND_TONE, roundColumns } from './overview-page';
import { RoundPicker, useRoundParam } from './shared';

// ── P4 historical rounds ──────────────────────────────────────────────────────────────────────

export function RoundHistoryPage() {
  const [status, setStatus] = React.useState<'all' | RoundStatus>('all');
  const [page, setPage] = React.useState(1);
  const q = useRoundHistory({ page, pageSize: 20, status: status === 'all' ? undefined : status });
  return (
    <PageStack>
      <ModuleHeader
        module="Global Pool"
        title="Historical rounds"
        description="Every closed round with its pool, fees and settlement or refund progress. Results come only from verifiable randomness and are final — rows are read-only."
        actions={<ExportCsvButton dataset="rounds" />}
      />
      <FilterChips
        label="Round status"
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        options={[
          { value: 'all', label: 'All' },
          { value: 'settled', label: 'Settled' },
          { value: 'cancelled', label: 'Cancelled' },
          { value: 'drawing', label: 'Drawing' },
          { value: 'closed', label: 'Closed' },
        ]}
      />
      <QueryView query={q}>
        {(d) => (
          <Panel flush title="Rounds" demo>
            <DataTable
              caption="Historical rounds"
              columns={[
                ...roundColumns,
                {
                  key: 'first',
                  header: '1st prize',
                  align: 'right',
                  hideBelow: 'desktop',
                  cell: (r) => (r.firstPrize ? usd(r.firstPrize) : '—'),
                },
              ]}
              rows={d.items}
              rowKey={(r) => r.id}
              rowHref={(r) =>
                r.status === 'cancelled'
                  ? `/admin/pool/refunds?round=${r.number}`
                  : `/admin/pool/prizes?round=${r.number}`
              }
              empty={
                <EmptyState
                  type="no-results"
                  title="No rounds with this status"
                  className="py-10"
                />
              }
              mobileCard={(r) => (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-body-s-strong">
                      {roundLabel(r.number)} {r.isDemo ? <DemoBadge size="xs" /> : null}
                    </span>
                    <Pill tone={ROUND_TONE[r.status] ?? 'neutral'}>{r.statusLabel}</Pill>
                  </div>
                  <p className="text-caption text-text-secondary">
                    {dt(r.closesAt).slice(0, 11)} · {count(r.entries)} entries · {usd(r.pool)} USDT
                  </p>
                  <p className="text-caption text-text-tertiary">{r.settlement?.label}</p>
                </div>
              )}
              footer={
                <Pagination
                  page={d.page}
                  totalPages={d.totalPages}
                  total={d.total}
                  pageSize={d.pageSize}
                  onPage={setPage}
                  noun="rounds"
                  demo
                />
              }
            />
          </Panel>
        )}
      </QueryView>
    </PageStack>
  );
}

// ── P5 participants ───────────────────────────────────────────────────────────────────────────

export function ParticipantsPage() {
  const overview = usePoolOverview();
  const [round, setRound] = useRoundParam(overview.data?.round?.number ?? null);
  const [q, setQ] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  React.useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const parts = useParticipants(round, { page, pageSize: 20, q: query || undefined });
  const cols: Column<ParticipantRow>[] = [
    {
      key: 'p',
      header: 'Participant',
      cell: (p) => (
        <span className="flex flex-col">
          <span className="flex items-center gap-1.5">
            <Link href={`/admin/users/${p.userId}`} className="hover:underline">
              {p.handle ?? p.publicId}
            </Link>
            {p.isDemo ? <DemoBadge size="xs" /> : null}
            {p.restricted ? <Pill tone="danger">Restricted</Pill> : null}
          </span>
          <span className="text-caption text-text-tertiary">{p.publicId}</span>
        </span>
      ),
    },
    { key: 'e', header: 'Entries', align: 'right', cell: (p) => count(p.entries) },
    { key: 's', header: 'Stake (USDT)', align: 'right', cell: (p) => usd(p.stake) },
    {
      key: 'f',
      header: 'Fees (USDT)',
      align: 'right',
      hideBelow: 'desktop',
      cell: (p) => usd(p.fees),
    },
    { key: 'sh', header: 'Share', align: 'right', cell: (p) => `${p.sharePercent}%` },
    {
      key: 'ids',
      header: 'Entry IDs',
      hideBelow: 'laptop',
      cell: (p) => (
        <span className="font-mono text-mono-s text-text-secondary">
          {p.firstEntry === p.lastEntry
            ? p.firstEntry
            : `${p.firstEntry} … ${p.lastEntry.split('-').at(-1)}`}
        </span>
      ),
    },
    {
      key: 'k',
      header: 'KYC',
      hideBelow: 'laptop',
      cell: (p) => (
        <span className="text-caption text-text-secondary">
          {p.kycLevel.replace('level_', 'L')} · {p.country ?? '—'}
        </span>
      ),
    },
    {
      key: 'at',
      header: 'First entry (UTC)',
      hideBelow: 'desktop',
      cell: (p) => <span className="text-caption text-text-secondary">{dt(p.firstAt)}</span>,
    },
  ];
  return (
    <PageStack>
      <ModuleHeader
        module="Global Pool"
        title="Participant list"
        crumb="Participants"
        description="Who holds entries in a round, grouped by player — from the canonical entry list (ordered by sequence, which the draw uses). Read-only: entries cannot be added, removed or moved."
        actions={
          <>
            <RoundPicker
              value={round}
              onChange={(n) => {
                setRound(n);
                setPage(1);
              }}
            />
            <ExportCsvButton dataset="rounds" />
          </>
        }
      />
      {round === null ? (
        overview.isPending ? (
          <PageSkeleton />
        ) : (
          <Panel>
            <EmptyState type="no-data" title="Choose a round" />
          </Panel>
        )
      ) : (
        <QueryView query={parts}>
          {(d) => (
            <>
              <KpiGrid>
                <KpiTile
                  label={`Participants · ${roundLabel(d.round.number)}`}
                  icon={Users}
                  value={count(d.round.participants)}
                  sub={`${count(d.round.entries)} entries`}
                  demo={d.round.isDemo}
                />
                <KpiTile
                  label="Pool"
                  value={usd(d.round.pool)}
                  unit="USDT"
                  sub={d.round.status}
                  demo={d.round.isDemo}
                />
                <KpiTile
                  label="Median entries / player"
                  value={count(d.stats.medianEntries)}
                  sub={`${count(d.stats.singleEntryPlayers)} players with one entry`}
                  demo={d.round.isDemo}
                />
                <KpiTile
                  label="Largest holding"
                  value={`${d.stats.maxSharePercent}%`}
                  sub={`${count(d.stats.maxEntries)} entries`}
                  demo={d.round.isDemo}
                />
              </KpiGrid>
              <Panel
                flush
                title="Participants"
                demo={d.round.isDemo}
                actions={<span className="text-caption text-text-tertiary">Sorted by entries</span>}
              >
                <div className="px-4 pb-3 tablet:px-5">
                  <SearchInput
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onClear={() => setQ('')}
                    placeholder="Search @handle or GP-ID"
                    aria-label="Search participants"
                  />
                </div>
                <DataTable
                  caption={`Participants of round ${round}`}
                  columns={cols}
                  rows={d.items}
                  rowKey={(p) => p.userId}
                  empty={
                    <EmptyState
                      type={query ? 'no-results' : 'no-data'}
                      title={query ? 'No participant matches' : 'No entries in this round'}
                      className="py-10"
                    />
                  }
                  mobileCard={(p) => (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-body-s-strong">{p.handle}</span>
                        <span className="text-body-s tabular-nums">{count(p.entries)} entries</span>
                      </div>
                      <p className="text-caption text-text-secondary">
                        Stake {usd(p.stake)} USDT · {p.sharePercent}% ·{' '}
                        {p.kycLevel.replace('level_', 'L')}
                      </p>
                    </div>
                  )}
                  footer={
                    <Pagination
                      page={d.page}
                      totalPages={d.totalPages}
                      total={d.total}
                      pageSize={d.pageSize}
                      onPage={setPage}
                      noun="participants"
                      demo={d.round.isDemo}
                    />
                  }
                />
              </Panel>
            </>
          )}
        </QueryView>
      )}
    </PageStack>
  );
}

// ── P6 prize distribution + P8 settlement ─────────────────────────────────────────────────────

const CLAIM: Record<string, { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  owed: { label: 'Credited · in Owed', tone: 'warning' },
  claimed: { label: 'Claimed to Available', tone: 'success' },
  not_materialised: { label: 'DEMO history (no claim row)', tone: 'neutral' },
};

function WinnersTable({ d }: { d: PrizesResponse }) {
  if (d.winners.length === 0)
    return (
      <EmptyState
        type="no-data"
        title={
          d.round.status === 'cancelled'
            ? 'No winners — round cancelled'
            : 'Winners are drawn after close'
        }
        description={
          d.round.status === 'cancelled'
            ? 'Every stake was refunded to Owed.'
            : 'The fulfilled random word selects 13 distinct entries. No admin can choose or replace a winner.'
        }
        className="py-10"
      />
    );
  return (
    <DataTable
      caption="Winners"
      columns={[
        {
          key: 'r',
          header: 'Rank',
          cell: (w) => <span className="text-body-s-strong">#{w.place}</span>,
        },
        {
          key: 't',
          header: 'Prize',
          cell: (w) => (
            <span className="capitalize text-text-secondary">{w.tier.replace('_', '-')}</span>
          ),
        },
        { key: 'h', header: 'Winner', cell: (w) => w.handle ?? '—' },
        {
          key: 'e',
          header: 'Entry',
          hideBelow: 'laptop',
          cell: (w) => (
            <span className="font-mono text-mono-s">
              {w.entryId ?? (w.entrySeq ? `seq ${w.entrySeq}` : '—')}
            </span>
          ),
        },
        { key: 'a', header: 'Amount (USDT)', align: 'right', cell: (w) => usd(w.amount) },
        {
          key: 'c',
          header: 'Claim',
          cell: (w) =>
            w.claimStatus ? (
              <Pill tone={CLAIM[w.claimStatus]?.tone ?? 'neutral'}>
                {CLAIM[w.claimStatus]?.label ?? w.claimStatus}
              </Pill>
            ) : (
              '—'
            ),
        },
      ]}
      rows={d.winners}
      rowKey={(w) => String(w.place)}
      mobileCard={(w) => (
        <div className="flex items-center justify-between gap-2">
          <span className="flex flex-col">
            <span className="text-body-s-strong">
              #{w.place} · {w.handle}
            </span>
            <span className="text-caption text-text-tertiary">
              {w.claimStatus ? CLAIM[w.claimStatus]?.label : ''}
            </span>
          </span>
          <MoneyText value={w.amount} />
        </div>
      )}
    />
  );
}

export function PrizeDistributionPage() {
  const overview = usePoolOverview();
  const [round, setRound] = useRoundParam(overview.data?.round?.number ?? null);
  const q = usePrizes(round);
  return (
    <PageStack>
      <ModuleHeader
        module="Global Pool"
        title="Prize distribution"
        description="1st 50% · 2nd 20% · 3rd 10% · 10 runners-up 2% each = 100% of the pool. The split is copied into a round when it opens and can never change; platform fees are not part of it."
        actions={<RoundPicker value={round} onChange={setRound} />}
      />
      {round === null ? (
        <PageSkeleton />
      ) : (
        <QueryView query={q}>
          {(d) => (
            <>
              <KpiGrid>
                <KpiTile
                  label={`Pool · ${d.round.numberLabel}`}
                  icon={Trophy}
                  value={usd(d.breakdown.pool)}
                  unit="USDT"
                  sub={d.round.statusLabel}
                  demo={d.round.isDemo}
                />
                <KpiTile label="Prizes" value="13" sub="1 + 1 + 1 + 10 runners-up" />
                <KpiTile
                  label="Paid out (sum of prizes)"
                  value={usd(d.breakdown.totalPaid)}
                  unit="USDT"
                  sub={`Rounding remainder ${usd(d.breakdown.remainder)}`}
                  demo={d.round.isDemo}
                />
                <KpiTile
                  label="Winners recorded"
                  icon={CircleCheck}
                  value={`${d.settlement.winnersRecorded} / 13`}
                  sub={
                    d.round.status === 'settled'
                      ? 'From the fulfilled random word'
                      : 'After the draw'
                  }
                />
              </KpiGrid>
              <div className="grid gap-4 laptop:grid-cols-[380px_minmax(0,1fr)]">
                <Panel title="Split" demo={d.round.isDemo}>
                  <ul className="flex flex-col gap-3">
                    {d.breakdown.tiers.map((t) => (
                      <li key={t.tier} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-body-s">
                          <span className="text-text-secondary">
                            {t.label} · {t.sharePercent}%{t.winners > 1 ? ` × ${t.winners}` : ''}
                          </span>
                          <MoneyText value={t.amountTotal} />
                        </div>
                        <div
                          className="h-2 overflow-hidden rounded-full bg-surface-raised"
                          aria-hidden
                        >
                          <div
                            className="h-full rounded-full bg-gold"
                            style={{ width: `${Number(t.sharePercent) * t.winners}%` }}
                          />
                        </div>
                        {t.winners > 1 ? (
                          <span className="text-caption text-text-tertiary">
                            {usd(t.amountEach)} USDT each
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </Panel>
                <Panel
                  flush
                  title="Winners"
                  demo={d.round.isDemo}
                  description="Read-only — results come only from verifiable randomness."
                >
                  <WinnersTable d={d} />
                </Panel>
              </div>
              <ImmutablePanel cannot={d.policy.cannot} allowed={d.policy.allowed} compact />
            </>
          )}
        </QueryView>
      )}
    </PageStack>
  );
}

export function SettlementPage() {
  const history = useRoundHistory({ page: 1, pageSize: 1, status: 'settled' });
  const [round, setRound] = useRoundParam(history.data?.items[0]?.number ?? null);
  const q = usePrizes(round);
  return (
    <PageStack>
      <ModuleHeader
        module="Global Pool"
        title="Settlement status"
        crumb="Settlement"
        description="Settlement runs only inside the round lifecycle, from the fulfilled random word and the canonical entry list. Prizes are credited to winners’ Owed balances in one transaction; winners claim them to Available."
        actions={<RoundPicker value={round} onChange={setRound} include="settled" />}
      />
      {round === null ? (
        history.isPending ? (
          <PageSkeleton />
        ) : (
          <Panel>
            <EmptyState type="no-data" title="No settled round yet" />
          </Panel>
        )
      ) : (
        <QueryView query={q}>
          {(d) => {
            const s = d.settlement;
            return (
              <>
                <KpiGrid>
                  <KpiTile
                    label={`Round ${d.round.numberLabel}`}
                    icon={ShieldCheck}
                    value={d.round.statusLabel}
                    sub={d.round.settledAt ? `Settled ${dt(d.round.settledAt)}` : 'Not settled'}
                    demo={d.round.isDemo}
                  />
                  <KpiTile
                    label="Winners recorded"
                    icon={Trophy}
                    value={`${s.winnersRecorded} / ${s.prizes}`}
                    sub="Distinct entries from the random word"
                  />
                  <KpiTile
                    label="Credited to Owed"
                    icon={CircleCheck}
                    value={`${s.creditedToOwed}`}
                    sub={`${s.claimed} claimed · ${s.owed} still owed`}
                  />
                  <KpiTile
                    label="Owed amount"
                    icon={Hourglass}
                    value={usd(s.owedAmount)}
                    unit="USDT"
                    sub="Waiting for winners to claim"
                    demo={d.round.isDemo}
                  />
                </KpiGrid>
                <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_380px]">
                  <Panel flush title="Allocations" demo={d.round.isDemo}>
                    <WinnersTable d={d} />
                  </Panel>
                  <Panel title="Settlement steps">
                    <Timeline
                      items={[
                        {
                          title: 'Round closed',
                          at: d.round.closedAt ?? d.round.closesAt,
                          tone: 'success',
                        },
                        {
                          title: 'Randomness requested',
                          at: d.round.draw?.requestedAt ?? null,
                          detail: d.round.draw
                            ? `${d.round.draw.provider} · ${d.round.draw.requestIdDisplay}`
                            : 'DEMO history round — no stored VRF request',
                          tone: d.round.draw ? 'success' : 'neutral',
                        },
                        {
                          title: 'Randomness fulfilled',
                          at: d.round.draw?.fulfilledAt ?? null,
                          tone: d.round.draw?.fulfilledAt ? 'success' : 'neutral',
                        },
                        {
                          title: 'Winners selected + prizes credited',
                          at: d.round.settledAt,
                          detail: `${s.winnersRecorded} winners · prizes sum to the pool`,
                          tone: s.status === 'settled' ? 'success' : 'neutral',
                        },
                        {
                          title: 'Claims',
                          detail: `${s.claimed} claimed · ${s.owed} owed`,
                          tone: s.owed > 0 ? 'warning' : 'success',
                        },
                      ]}
                    />
                    {s.postings.length > 0 ? (
                      <KeyValues
                        className="mt-4"
                        items={s.postings.map((p) => ({
                          k: p.kind.replace(/_/g, ' '),
                          v: dt(p.at),
                        }))}
                      />
                    ) : (
                      <p className="mt-4 text-caption text-text-tertiary">
                        No settlement postings stored for this round (DEMO history snapshot).
                      </p>
                    )}
                    <p className="mt-3 text-caption text-text-tertiary">{s.note}</p>
                  </Panel>
                </div>
                <p className="flex items-center gap-2 text-caption text-text-tertiary">
                  <Search aria-hidden className="size-3.5" /> Anyone can recompute the winners:{' '}
                  <Button asChild variant="link" size="s">
                    <Link href={`/pool/rounds/${d.round.number}/verify`}>
                      public verification page
                    </Link>
                  </Button>
                </p>
              </>
            );
          }}
        </QueryView>
      )}
    </PageStack>
  );
}
