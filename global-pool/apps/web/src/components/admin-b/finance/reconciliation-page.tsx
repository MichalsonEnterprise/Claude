'use client';

import { CircleCheck, CircleDashed, RefreshCw, Scale, TriangleAlert } from 'lucide-react';
import * as React from 'react';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useReconciliation, type ReconScope } from '@/lib/api/admin-b';

import { ExportCsvButton } from '../export-dialog';
import {
  DataTable,
  FilterChips,
  KpiGrid,
  KpiTile,
  ModuleHeader,
  Panel,
  PageStack,
  Pill,
  QueryView,
  Timeline,
  count,
  dt,
  usd,
  type Column,
} from '../primitives';

const GROUP: Record<ReconScope['group'], string> = {
  ledger: 'Ledger invariant',
  sub_ledger: 'Sub-ledger',
  pool: 'Round pool',
  custody: 'Custody',
  in_flight: 'In flight',
};

const isCount = (s: ReconScope) => s.key === 'postings_balanced' || s.key === 'no_negative_buckets';
const fmt = (s: ReconScope, v: string) => (isCount(s) ? v : usd(v));

function StatusCell({ s }: { s: ReconScope }) {
  if (s.status === 'match')
    return (
      <Pill tone="success" icon={CircleCheck}>
        Match
      </Pill>
    );
  if (s.status === 'mismatch')
    return (
      <Pill tone="danger" icon={TriangleAlert}>
        Mismatch
      </Pill>
    );
  return (
    <Pill tone="neutral" icon={CircleDashed}>
      Pending
    </Pill>
  );
}

export function ReconciliationPage() {
  const q = useReconciliation();
  const [filter, setFilter] = React.useState<'all' | ReconScope['status']>('all');
  const columns: Column<ReconScope>[] = [
    {
      key: 'scope',
      header: 'Scope',
      cell: (s) => (
        <span className="flex flex-col">
          <span className="text-body-s-strong text-text-primary">{s.scope}</span>
          <span className="text-caption text-text-tertiary">{GROUP[s.group]}</span>
        </span>
      ),
    },
    {
      key: 'expected',
      header: 'Expected',
      align: 'right',
      cell: (s) => (
        <span className="flex flex-col items-end">
          <span>{fmt(s, s.expected)}</span>
          <span className="text-caption text-text-tertiary">{s.expectedLabel}</span>
        </span>
      ),
    },
    {
      key: 'actual',
      header: 'Actual',
      align: 'right',
      cell: (s) => (
        <span className="flex flex-col items-end">
          <span>{fmt(s, s.actual)}</span>
          <span className="text-caption text-text-tertiary">{s.actualLabel}</span>
        </span>
      ),
    },
    {
      key: 'diff',
      header: 'Difference',
      align: 'right',
      cell: (s) => (
        <span className={s.status === 'mismatch' ? 'text-text-danger' : 'text-text-secondary'}>
          {s.status === 'pending' ? '—' : fmt(s, s.difference)}
        </span>
      ),
    },
    { key: 'status', header: 'Status', cell: (s) => <StatusCell s={s} /> },
    {
      key: 'note',
      header: 'Note',
      hideBelow: 'desktop',
      className: 'whitespace-normal min-w-[220px]',
      cell: (s) => <span className="text-caption text-text-tertiary">{s.note}</span>,
    },
  ];
  return (
    <PageStack>
      <ModuleHeader
        module="Finance"
        title="Reconciliation"

        description="Ledger invariants, sub-ledgers, round pools and custody compared on every run. A mismatch opens an investigation — it is never fixed by editing the ledger."
        actions={
          <>
            <Button
              variant="secondary"
              size="s"
              leadingIcon={<RefreshCw aria-hidden />}
              onClick={() => void q.refetch()}
              loading={q.isFetching}
            >
              Run now
            </Button>
            <ExportCsvButton dataset="reconciliation" />
          </>
        }
      />
      <QueryView query={q}>
        {(d) => {
          const ORDER = { mismatch: 0, pending: 1, match: 2 } as const;
          const rows = (filter === 'all' ? d.scopes : d.scopes.filter((s) => s.status === filter))
            .slice()
            .sort((a, b) => ORDER[a.status] - ORDER[b.status]);
          return (
            <>
              {d.summary.mismatch > 0 ? (
                <Alert
                  type="warning"
                  layout="full"
                  title={`${count(d.summary.mismatch)} mismatch${d.summary.mismatch > 1 ? 'es' : ''} open`}
                >
                  Settlement of affected rounds is blocked until the difference is explained. Fix
                  with a reviewed correcting entry (four-eyes) — never a ledger edit.
                </Alert>
              ) : (
                <Alert type="info" title="All checked scopes match">
                  Pending scopes wait for external data (on-chain balance reads or confirmations)
                  and are not mismatches.
                </Alert>
              )}
              <KpiGrid>
                <KpiTile
                  label="Scopes checked"
                  icon={Scale}
                  value={count(d.summary.total)}
                  sub={`Run ${dt(d.runAt)}`}
                  demo
                />
                <KpiTile
                  label="Match"
                  icon={CircleCheck}
                  value={count(d.summary.match)}
                  subTone="success"
                  sub="Equal to the cent"
                />
                <KpiTile
                  label="Mismatch"
                  icon={TriangleAlert}
                  value={count(d.summary.mismatch)}
                  subTone={d.summary.mismatch > 0 ? 'danger' : 'neutral'}
                  sub={d.summary.mismatch > 0 ? 'Investigation required' : 'None open'}
                />
                <KpiTile
                  label="Pending"
                  icon={CircleDashed}
                  value={count(d.summary.pending)}
                  sub="Waiting for chain data"
                />
              </KpiGrid>
              <Panel
                flush
                title={`Run ${dt(d.runAt)} · ${count(d.summary.total)} scopes`}
                description="Problems first. Difference = actual − expected."
                demo
              >
                <div className="px-4 pb-3 tablet:px-5">
                  <FilterChips
                    label="Filter by status"
                    value={filter}
                    onChange={setFilter}
                    options={[
                      { value: 'all', label: 'All', count: d.summary.total },
                      { value: 'mismatch', label: 'Mismatch', count: d.summary.mismatch },
                      { value: 'pending', label: 'Pending', count: d.summary.pending },
                      { value: 'match', label: 'Match', count: d.summary.match },
                    ]}
                  />
                </div>
                <DataTable
                  caption="Reconciliation scopes"
                  columns={columns}
                  rows={rows}
                  rowKey={(s) => s.key}
                  empty={
                    <p className="px-5 py-8 text-center text-body-s text-text-tertiary">
                      No scopes with this status.
                    </p>
                  }
                  mobileCard={(s) => (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-body-s-strong text-text-primary">{s.scope}</span>
                        <StatusCell s={s} />
                      </div>
                      <p className="text-caption text-text-secondary tabular-nums">
                        {s.expectedLabel} {fmt(s, s.expected)} · {s.actualLabel} {fmt(s, s.actual)}
                      </p>
                      <p className="text-caption text-text-tertiary">{s.note}</p>
                    </div>
                  )}
                />
              </Panel>
              <div className="grid gap-4 laptop:grid-cols-2">
                <Panel title="When a scope does not match">
                  <Timeline
                    items={[
                      {
                        title: 'Mismatch detected',
                        detail: 'The run flags the scope; affected settlement stops automatically.',
                        tone: 'danger',
                      },
                      {
                        title: 'Investigation opened',
                        detail: 'Finance traces the difference to on-chain events and postings.',
                        tone: 'warning',
                      },
                      {
                        title: 'Correcting entry proposed',
                        detail: 'A new balanced posting with a written reason — never an edit.',
                        tone: 'neutral',
                      },
                      {
                        title: 'Second admin approves',
                        detail: 'Four-eyes + 2FA; both steps are in the audit log.',
                        tone: 'brand',
                      },
                      {
                        title: 'Next run matches',
                        detail: 'The scope closes once the totals are equal again.',
                        tone: 'success',
                      },
                    ]}
                  />
                </Panel>
                <Panel title="About these runs">
                  <p className="text-body-s text-text-secondary">{d.policy}</p>
                  <p className="mt-2 text-caption text-text-tertiary">
                    Runs are computed live from the ledger when you open the page or press “Run
                    now”. Run history is not stored in this build; exported reconciliation CSVs
                    carry a SHA-256 and an audit entry.
                  </p>
                </Panel>
              </div>
            </>
          );
        }}
      </QueryView>
    </PageStack>
  );
}
