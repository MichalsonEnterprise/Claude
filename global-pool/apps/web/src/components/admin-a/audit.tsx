'use client';

/**
 * ADM-S3 Audit logs (+ ADM-U10 per-player history): the hash-chained, append-only audit log. Integrity banner runs
 * GET /admin/audit-logs/verify (recomputes the whole chain), filter bar, dense rows with actor, action, target,
 * reason, IP and hash; a row expands to its metadata, previous hash and request id. No edit or delete exists.
 */
import { formatCount, formatDateUTC, formatTimeUTC } from '@gp/shared/format';
import { useMutation } from '@tanstack/react-query';
import { ChevronDown, CircleCheck, CircleX, Filter, Link2, Lock, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

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
import { Skeleton } from '@/components/ui/skeleton';
import {
  verifyAuditChain,
  type AuditQuery,
  type AuditRow,
  type AuditVerification,
} from '@/lib/api/admin-a';
import { cn } from '@/lib/utils';

import { useAuditLogs } from './hooks';
import { AdminPageHeader, NoPermission, Pagination, QueryErrorPanel } from './primitives';
import { useAdminSession } from './session';

const TARGET_TYPES = [
  'user',
  'withdrawal',
  'aml_alert',
  'admin_role',
  'alert',
  'session',
  'round',
  'kyc_record',
];
const ALL = 'all';

function IntegrityBanner() {
  const verify = useMutation({ mutationFn: verifyAuditChain });
  const { mutate } = verify;
  React.useEffect(() => {
    mutate();
  }, [mutate]);
  const r: AuditVerification | undefined = verify.data;
  return (
    <section
      aria-label="Hash-chain integrity"
      aria-live="polite"
      data-testid="audit-integrity"
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-4 tablet:flex-row tablet:items-center',
        verify.isPending
          ? 'border-border-subtle bg-surface-default'
          : r?.ok
            ? 'border-status-success/30 bg-status-success-tint'
            : 'border-status-danger/40 bg-status-danger-tint',
      )}
    >
      {verify.isPending ? (
        <p className="flex items-center gap-2 text-body-s text-text-secondary">
          <RefreshCw aria-hidden className="size-4 animate-spin" /> Recomputing the hash chain…
        </p>
      ) : verify.isError ? (
        <p className="flex items-center gap-2 text-body-s text-text-danger">
          <CircleX aria-hidden className="size-4" /> Could not verify the chain:{' '}
          {verify.error.message}
        </p>
      ) : r ? (
        <div className="flex min-w-0 items-start gap-3">
          {r.ok ? (
            <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-status-success" />
          ) : (
            <CircleX aria-hidden className="mt-0.5 size-5 shrink-0 text-text-danger" />
          )}
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-label-l text-text-primary">
              {r.ok ? 'Hash chain intact' : `Chain break at entry #${String(r.firstBrokenSeq)}`}
            </p>
            <p className="text-body-s text-text-secondary">
              {r.ok
                ? `${formatCount(r.checked)} of ${formatCount(r.total)} entries re-hashed: every entry links to the previous one (sha256(prev_hash + entry)).`
                : (r.problem ?? 'An entry does not match its recorded hash.')}
            </p>
            <p className="truncate font-mono text-mono-s text-text-tertiary">Head {r.headHash}</p>
          </div>
        </div>
      ) : null}
      <Button
        variant="secondary"
        size="s"
        className="tablet:ml-auto"
        leadingIcon={<RefreshCw aria-hidden />}
        loading={verify.isPending}
        onClick={() => verify.mutate()}
      >
        Verify chain
      </Button>
    </section>
  );
}

function TargetCell({ r }: { r: AuditRow }) {
  if (!r.targetType) return <span className="text-text-tertiary">—</span>;
  const short = r.targetId
    ? r.targetId.length > 14
      ? `${r.targetId.slice(0, 8)}…`
      : r.targetId
    : '';
  return (
    <span className="flex flex-col">
      <span className="text-body-s text-text-primary">{r.targetType.replace(/_/g, ' ')}</span>
      {r.targetId &&
        (r.targetType === 'user' ? (
          <Link
            href={`/admin/users/${r.targetId}`}
            className="font-mono text-mono-s text-text-brand hover:underline"
            title={r.targetId}
          >
            {short}
          </Link>
        ) : (
          <span className="font-mono text-mono-s text-text-tertiary" title={r.targetId}>
            {short}
          </span>
        ))}
    </span>
  );
}

function AuditEntry({ r }: { r: AuditRow }) {
  const [open, setOpen] = React.useState(false);
  const failed = r.outcome !== 'success';
  return (
    <li
      className={cn(
        'border-b border-border-subtle last:border-0',
        failed && 'bg-status-danger-tint/40',
      )}
    >
      <div className="grid grid-cols-[88px_minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)_32px] items-start gap-3 px-4 py-2.5 laptop:grid-cols-[96px_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1.6fr)_110px_minmax(0,0.9fr)_32px]">
        <span className="flex flex-col">
          <span className="font-mono text-mono-s text-text-primary">
            {formatTimeUTC(r.createdAt, { seconds: true }).replace(' UTC', '')}
          </span>
          <span className="text-caption text-text-tertiary">{formatDateUTC(r.createdAt)}</span>
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-body-s text-text-primary">
            {r.actorLabel ?? (r.actorType === 'system' ? 'System' : '—')}
          </span>
          <span className="text-caption capitalize text-text-tertiary">{r.actorType}</span>
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-mono-s text-text-primary">{r.action}</span>
          {failed && (
            <span className="text-caption text-text-danger">{r.outcome.replace(/_/g, ' ')}</span>
          )}
          {!failed && r.outcome !== 'success' && (
            <span className="text-caption text-text-tertiary">{r.outcome}</span>
          )}
        </span>
        <TargetCell r={r} />
        <span className="hidden min-w-0 text-body-s text-text-secondary laptop:line-clamp-2">
          {r.reason ?? '—'}
        </span>
        <span className="hidden font-mono text-mono-s text-text-tertiary laptop:block">
          {r.ip ?? '—'}
        </span>
        <span className="hidden min-w-0 flex-col laptop:flex">
          <span className="inline-flex items-center gap-1 text-caption text-text-success">
            <Link2 aria-hidden className="size-3.5" /> #{formatCount(Number(r.seq))}
          </span>
          <span className="truncate font-mono text-mono-s text-text-tertiary">
            {r.hash.slice(0, 12)}…
          </span>
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`${open ? 'Hide' : 'Show'} details of entry ${r.seq}`}
          className="flex size-8 items-center justify-center rounded-md text-icon-muted hover:bg-surface-hover"
        >
          <ChevronDown
            aria-hidden
            className={cn('size-4 transition-transform', open && 'rotate-180')}
          />
        </button>
      </div>
      {open && (
        <div className="grid gap-3 border-t border-border-subtle bg-bg-secondary px-4 py-3 laptop:grid-cols-2">
          <dl className="flex flex-col gap-1.5 text-caption">
            <div className="laptop:hidden">
              <dt className="text-text-tertiary">Reason</dt>
              <dd className="text-body-s text-text-primary">{r.reason ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-text-tertiary">Entry</dt>
              <dd className="font-mono text-mono-s text-text-primary">
                #{r.seq} · {r.id}
              </dd>
            </div>
            <div>
              <dt className="text-text-tertiary">Hash</dt>
              <dd className="font-mono text-mono-s break-all text-text-secondary">{r.hash}</dd>
            </div>
            <div>
              <dt className="text-text-tertiary">Previous hash</dt>
              <dd className="font-mono text-mono-s break-all text-text-secondary">{r.prevHash}</dd>
            </div>
            <div>
              <dt className="text-text-tertiary">IP · request id</dt>
              <dd className="font-mono text-mono-s text-text-secondary">
                {r.ip ?? '—'} · {r.requestId ?? '—'}
              </dd>
            </div>
          </dl>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-caption text-text-tertiary">Metadata (secrets redacted)</span>
            <pre className="max-h-48 overflow-auto rounded-md bg-surface-default p-3 font-mono text-mono-s text-text-secondary">
              {JSON.stringify(r.metadata, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </li>
  );
}

/** Reusable audit list (S3 page and the U10 tab). `fixed` filters cannot be changed by the viewer. */
export function AuditTable({
  fixed = {},
  compactFilters = false,
}: {
  fixed?: AuditQuery;
  compactFilters?: boolean;
}) {
  const { can, admin } = useAdminSession();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [page, setPage] = React.useState(1);
  const [action, setAction] = React.useState(params.get('action') ?? '');
  const [debounced, setDebounced] = React.useState(action);
  const [targetType, setTargetType] = React.useState(params.get('targetType') ?? ALL);
  const actorId = fixed.actorId ?? params.get('actorId') ?? undefined;

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setDebounced(action.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [action]);

  const query: AuditQuery = {
    page,
    pageSize: 25,
    ...(debounced ? { action: debounced } : {}),
    ...(targetType !== ALL && !fixed.targetType ? { targetType } : {}),
    ...(actorId ? { actorId } : {}),
    ...fixed,
  };
  const logs = useAuditLogs(query, can('audit.read'));

  if (!can('audit.read')) {
    return <NoPermission permissions={['audit.read']} role={admin?.roles[0] ?? null} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <section
        aria-label="Audit filters"
        className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-default p-4 laptop:flex-row laptop:items-center"
      >
        <SearchInput
          size="m"
          aria-label="Filter by action"
          placeholder="Action starts with… (e.g. user.restriction, approval.)"
          groupClassName="laptop:max-w-[420px]"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          onClear={() => setAction('')}
        />
        {!fixed.targetType && !compactFilters && (
          <Select
            value={targetType}
            onValueChange={(v) => {
              setTargetType(v);
              setPage(1);
            }}
          >
            <SelectTrigger aria-label="Target type" className="laptop:w-52">
              <Filter aria-hidden className="size-4 text-icon-muted" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All targets</SelectItem>
              {TARGET_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {actorId && !fixed.actorId && (
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border-default bg-surface-raised pr-1 pl-3 text-label-s">
            Actor {actorId === admin?.id ? '· you' : actorId.slice(0, 8)}
            <button
              type="button"
              aria-label="Clear actor filter"
              className="flex size-6 items-center justify-center rounded-full hover:bg-surface-hover"
              onClick={() => router.replace(pathname)}
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </span>
        )}
        <span className="flex items-center gap-2 text-caption text-text-tertiary laptop:ml-auto">
          {logs.data ? `${formatCount(logs.data.total)} entries` : '…'} <DemoBadge size="xs" /> ·
          newest first
        </span>
      </section>
      {logs.isPending ? (
        <div className="flex flex-col gap-1.5" aria-busy>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : logs.isError ? (
        <QueryErrorPanel
          error={logs.error}
          onRetry={() => void logs.refetch()}
          role={admin?.roles[0]}
          what="the audit log"
        />
      ) : !logs.data || logs.data.items.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface-default">
          <EmptyState
            type={debounced ? 'no-results' : 'no-data'}
            title="No audit entries"
            description="Nothing matches these filters yet."
          />
        </div>
      ) : (
        <div
          className={cn(
            'overflow-hidden rounded-lg border border-border-subtle bg-surface-default',
            logs.isFetching && 'opacity-80',
          )}
        >
          <div
            aria-hidden
            className="hidden grid-cols-[88px_minmax(0,1.1fr)_minmax(0,1.4fr)_minmax(0,1fr)_32px] gap-3 border-b border-border-subtle bg-bg-secondary/60 px-4 py-2.5 text-overline uppercase text-text-tertiary tablet:grid laptop:grid-cols-[96px_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,1.6fr)_110px_minmax(0,0.9fr)_32px]"
          >
            <span>Time</span>
            <span>Actor</span>
            <span>Action</span>
            <span>Target</span>
            <span className="hidden laptop:block">Reason</span>
            <span className="hidden laptop:block">IP</span>
            <span className="hidden laptop:block">Integrity</span>
            <span />
          </div>
          <ol aria-label="Audit entries">
            {logs.data.items.map((r) => (
              <AuditEntry key={r.id} r={r} />
            ))}
          </ol>
          <div className="px-4 pb-3">
            <Pagination
              page={logs.data.page}
              totalPages={logs.data.totalPages}
              total={logs.data.total}
              label="entries"
              onPage={setPage}
            />
          </div>
        </div>
      )}
      <p className="flex items-center gap-2 text-caption text-text-tertiary">
        <Lock aria-hidden className="size-3.5" />
        Append-only: the database rejects UPDATE / DELETE on audit_logs. Every entry stores
        sha256(prev_hash + entry).
      </p>
    </div>
  );
}

export function AuditLogPage() {
  const { can, admin } = useAdminSession();
  return (
    <div className="flex flex-col gap-5" data-testid="admin-audit">
      <AdminPageHeader
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'System' }, { label: 'Audit logs' }]}
        title="Audit logs"
        description="Every sign-in, personal-data view, decision and system event — hash-chained and immutable. Filters never hide failed attempts."
      />
      {can('audit.read') ? (
        <>
          <IntegrityBanner />
          <AuditTable />
        </>
      ) : (
        <NoPermission permissions={['audit.read']} role={admin?.roles[0] ?? null} />
      )}
    </div>
  );
}
