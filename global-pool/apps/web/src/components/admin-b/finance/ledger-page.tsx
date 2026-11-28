'use client';

import {
  LEDGER_POSTING_KINDS,
  LEDGER_POSTING_KIND_LABEL,
  type LedgerPostingKindValue,
} from '@gp/shared/schemas';
import { ChevronRight, CircleCheck, Link2, Lock, ShieldCheck, TriangleAlert } from 'lucide-react';
import * as React from 'react';

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
import { Skeleton } from '@/components/ui/skeleton';
import {
  useLedger,
  useLedgerIntegrity,
  type JournalPosting,
  type LedgerIntegrity,
} from '@/lib/api/admin-b';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { ExportCsvButton } from '../export-dialog';
import {
  CopyHash,
  ModuleHeader,
  MoneyText,
  Pagination,
  Panel,
  PageStack,
  Pill,
  QueryError,
  QueryView,
  count,
  dt,
  usd,
} from '../primitives';

function IntegrityBanner({ i }: { i: LedgerIntegrity }) {
  const ok = i.appendOnly.ok && i.balanced.ok && i.auditChain.ok;
  return (
    <section
      aria-label="Ledger integrity"
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-4 tablet:p-5',
        ok
          ? 'border-border-success bg-status-success-tint/40'
          : 'border-border-danger bg-status-danger-tint',
      )}
    >
      <p
        className={cn(
          'flex items-center gap-2 text-h5',
          ok ? 'text-text-success' : 'text-text-danger',
        )}
      >
        {ok ? (
          <ShieldCheck aria-hidden className="size-5" />
        ) : (
          <TriangleAlert aria-hidden className="size-5" />
        )}
        {ok
          ? 'Ledger intact — append-only, balanced, hash chain verified'
          : 'Integrity check failed — escalate to Finance lead'}
      </p>
      <div className="grid gap-3 tablet:grid-cols-2 laptop:grid-cols-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-text-tertiary">Append-only</span>
          <span className="flex items-center gap-1 text-body-s-strong text-text-primary">
            <Lock aria-hidden className="size-3.5" />
            {i.appendOnly.triggers.filter((t) => t.present).length}/{i.appendOnly.triggers.length}{' '}
            DB triggers active
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-text-tertiary">Double entry</span>
          <span className="text-body-s-strong text-text-primary">
            Σ all lines = {usd(i.balanced.ledgerTotal)} · {count(i.balanced.unbalancedPostings)}{' '}
            unbalanced
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-text-tertiary">
            Journal digest · {count(i.journal.postings)} postings
          </span>
          <CopyHash value={i.journal.headHash} label="journal digest" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-text-tertiary">
            Audit hash chain · {count(i.auditChain.checked)} entries
          </span>
          <span className="flex items-center gap-1 text-body-s-strong text-text-primary">
            {i.auditChain.ok ? (
              <CircleCheck aria-hidden className="size-3.5 text-text-success" />
            ) : (
              <TriangleAlert aria-hidden className="size-3.5 text-text-danger" />
            )}
            {i.auditChain.ok
              ? 'Verified end-to-end'
              : `Break at #${i.auditChain.firstBrokenSeq ?? '?'}`}
          </span>
        </div>
      </div>
      <p className="flex items-start gap-2 text-caption text-text-tertiary">
        <Link2 aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        Digest = {i.journal.algorithm}, recomputed on every load. Database triggers reject UPDATE,
        DELETE and TRUNCATE on the ledger — a correction is always a new posting, reviewed by a
        second admin.
      </p>
    </section>
  );
}

const shortHash = (h: string | null) => (h ? `0x${h.slice(0, 4)}…${h.slice(-4)}` : '—');

function JournalTable({ items }: { items: JournalPosting[] }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-body-s">
        <caption className="sr-only">Ledger journals with their lines</caption>
        <thead className="bg-bg-secondary/60">
          <tr className="border-b border-border-subtle text-overline uppercase text-text-tertiary">
            <th scope="col" className="h-10 px-4 text-left tablet:px-5">
              Line
            </th>
            <th scope="col" className="h-10 px-3 text-left">
              Account
            </th>
            <th scope="col" className="h-10 px-3 text-right">
              Debit (USDT)
            </th>
            <th scope="col" className="h-10 px-3 text-right">
              Credit (USDT)
            </th>
            <th scope="col" className="h-10 px-4 text-left tablet:px-5">
              Reference
            </th>
          </tr>
        </thead>
        {items.map((p) => (
          <tbody key={p.id} className="border-b border-border-subtle last:border-0">
            <tr className="bg-surface-raised/40">
              <th
                scope="rowgroup"
                colSpan={5}
                className="px-4 py-2.5 text-left font-normal tablet:px-5"
              >
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-mono text-mono-s text-text-primary">
                    JE #{p.journalSeq ? count(p.journalSeq) : '—'}
                  </span>
                  <span className="text-caption text-text-tertiary">{dt(p.createdAt)}</span>
                  <span className="text-body-s-strong text-text-primary">
                    {p.kindLabel} — {p.description}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1.5 text-caption text-text-success">
                    <CircleCheck aria-hidden className="size-3.5" />
                    hash <span className="font-mono">{shortHash(p.chainHash)}</span> · prev{' '}
                    <span className="font-mono">{shortHash(p.prevHash)}</span>
                    {p.isDemo ? <DemoBadge size="xs" /> : null}
                  </span>
                </span>
              </th>
            </tr>
            {p.lines.map((l, i) => (
              <tr key={i} className="border-t border-border-subtle/60">
                <td className="h-10 px-4 font-mono text-mono-s text-text-tertiary tablet:px-5">
                  #{p.journalSeq ? count(p.journalSeq) : '—'}-{i + 1}
                </td>
                <td className="h-10 px-3 font-mono text-mono-s text-text-secondary">{l.account}</td>
                <td className="h-10 px-3 text-right tabular-nums">
                  {l.side === 'debit' ? (
                    usd(l.amount.replace('-', ''))
                  ) : (
                    <span className="text-text-tertiary">—</span>
                  )}
                </td>
                <td className="h-10 px-3 text-right tabular-nums">
                  {l.side === 'credit' ? (
                    usd(l.amount)
                  ) : (
                    <span className="text-text-tertiary">—</span>
                  )}
                </td>
                <td className="h-10 px-4 text-text-secondary tablet:px-5">{p.reference ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

export function LedgerPage() {
  const [kind, setKind] = React.useState<'all' | LedgerPostingKindValue>('all');
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
  const integrity = useLedgerIntegrity();
  const ledger = useLedger({
    page,
    pageSize: 10,
    kind: kind === 'all' ? undefined : kind,
    q: query || undefined,
  });
  return (
    <PageStack>
      <ModuleHeader
        module="Finance"
        title="Financial ledger"
        badges={
          integrity.data ? (
            <Pill
              tone={
                integrity.data.auditChain.ok && integrity.data.balanced.ok ? 'success' : 'danger'
              }
              icon={Link2}
            >
              {integrity.data.auditChain.ok && integrity.data.balanced.ok
                ? 'Hash chain intact'
                : 'Integrity alert'}
            </Pill>
          ) : null
        }
        description="Double-entry, append-only record of every balance movement. Each journal is chained to the previous one, so any change would break the chain. No one can edit or delete an entry — corrections are new entries that need four-eyes approval."
        actions={
          <>
            <Button
              variant="secondary"
              size="s"
              leadingIcon={<ShieldCheck aria-hidden />}
              loading={integrity.isFetching}
              onClick={() => void integrity.refetch()}
            >
              Verify chain now
            </Button>
            <ExportCsvButton dataset="ledger" />
          </>
        }
      />
      {integrity.isPending ? (
        <Skeleton className="h-36 rounded-lg" />
      ) : integrity.isError ? (
        <QueryError error={integrity.error} onRetry={() => void integrity.refetch()} />
      ) : (
        <IntegrityBanner i={integrity.data} />
      )}
      <div className="flex flex-col gap-2 tablet:flex-row">
        <SearchInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onClear={() => setQ('')}
          placeholder="Reference (WD-…, DP-…, round:1248) or @handle"
          aria-label="Search the journal"
          groupClassName="tablet:flex-1"
        />
        <Select
          value={kind}
          onValueChange={(v) => {
            setKind(v as 'all' | LedgerPostingKindValue);
            setPage(1);
          }}
        >
          <SelectTrigger className="tablet:w-56" aria-label="Journal type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Type: all journals</SelectItem>
            {LEDGER_POSTING_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {LEDGER_POSTING_KIND_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Panel
        flush
        title="Journals"
        description="Each journal balances (Σ debit = Σ credit). Read-only: rows can be viewed and copied only."
        actions={<DemoBadge size="s" />}
      >
        <QueryView
          query={ledger}
          skeleton={
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          }
        >
          {(data) =>
            data.items.length === 0 ? (
              <EmptyState
                type="no-results"
                title="No journals match"
                description="Try another reference or journal type."
                className="py-10"
              />
            ) : (
              <>
                <JournalTable items={data.items} />
                <p className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle px-4 py-3 text-body-s tablet:px-5">
                  <span>
                    Page totals: Σ debits <MoneyText value={data.pageTotals.debits} /> = Σ credits{' '}
                    <MoneyText value={data.pageTotals.credits} />
                  </span>
                  <span
                    className={data.pageTotals.balanced ? 'text-text-success' : 'text-text-danger'}
                  >
                    {data.pageTotals.balanced ? 'Balanced' : 'Not balanced'}
                  </span>
                </p>
                <Pagination
                  page={data.page}
                  totalPages={data.totalPages}
                  total={data.total}
                  pageSize={data.pageSize}
                  onPage={setPage}
                  noun="journals"
                  demo
                />
              </>
            )
          }
        </QueryView>
      </Panel>
      <div className="grid gap-4 laptop:grid-cols-2">
        <Panel
          title="How the hash chain works"
          demo
          description="hash = SHA-256(previous hash ‖ journal fields). Changing any old journal changes its hash and breaks every later link."
        >
          {ledger.data && ledger.data.items.length >= 1 ? (
            <ol className="flex flex-col gap-2 tablet:flex-row tablet:items-center">
              {[...ledger.data.items]
                .slice(0, 3)
                .reverse()
                .map((p, i, arr) => (
                  <React.Fragment key={p.id}>
                    <li
                      className={cn(
                        'flex flex-1 flex-col gap-1 rounded-md border p-3',
                        i === arr.length - 1 ? 'border-border-brand' : 'border-border-subtle',
                        'bg-bg-secondary',
                      )}
                    >
                      <span className="text-label-m text-text-primary">
                        Journal #{p.journalSeq ? count(p.journalSeq) : '—'}
                      </span>
                      <span className="font-mono text-mono-s text-text-tertiary">
                        prev {shortHash(p.prevHash)}
                      </span>
                      <span className="font-mono text-mono-s text-text-tertiary">
                        hash {shortHash(p.chainHash)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-caption text-text-success">
                        <CircleCheck aria-hidden className="size-3.5" /> link verified
                      </span>
                    </li>
                    {i < arr.length - 1 ? (
                      <ChevronRight
                        aria-hidden
                        className="hidden size-4 shrink-0 text-icon-muted tablet:block"
                      />
                    ) : null}
                  </React.Fragment>
                ))}
            </ol>
          ) : null}
          <p className="mt-3 text-caption text-text-tertiary">
            The chain is recomputed from the first journal on every load; the audit log keeps its
            own stored hash chain. Database triggers reject UPDATE, DELETE and TRUNCATE on every
            ledger table.
          </p>
        </Panel>
        <Panel
          title="Corrections (append-only)"
          description="Mistakes are fixed with a new, reviewed journal — never by changing an existing one."
        >
          <p className="text-body-s text-text-secondary">
            A correcting journal is a new balanced posting with a written reason, proposed by one
            admin and approved by a second one with 2FA. Both steps are written to the hash-chained
            audit log. No correction is pending.
          </p>
          <p className="mt-3 flex items-start gap-2 rounded-md bg-bg-secondary p-3 text-caption text-text-tertiary">
            <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            Edit entry · Delete entry · Back-date entry — not available to any role, including Super
            Admin.
          </p>
        </Panel>
      </div>
    </PageStack>
  );
}
