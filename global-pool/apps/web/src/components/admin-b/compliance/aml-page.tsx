'use client';

import { Flag, Gauge, ShieldAlert, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { SearchInput } from '@/components/ui/search-input';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from '@/components/ui/sonner';
import { useAmlAlerts, useCan, useResolveAml, type AmlRow } from '@/lib/api/admin-b';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';

import { ReasonDialog } from '../reason-dialog';
import {
  DataTable,
  FilterChips,
  KeyValues,
  KpiGrid,
  KpiTile,
  ModuleHeader,
  MoneyText,
  Pagination,
  Panel,
  PageStack,
  Pill,
  QueryView,
  RiskMeter,
  RiskPill,
  count,
  dt,
  usd,
  type Column,
} from '../primitives';

const STATUS_BADGE = {
  open: 'pending',
  under_review: 'under_review',
  escalated: 'restricted',
  resolved: 'approved',
  dismissed: 'expired',
} as const;
const ruleLabel = (r: string) =>
  r
    .split(',')
    .map((x) => x.replace(/_/g, ' '))
    .join(' · ');

function AlertPreview({ a, wide }: { a: AmlRow; wide?: boolean }) {
  const canResolve = useCan('aml.resolve');
  const resolve = useResolveAml(a.id);
  const [dialog, setDialog] = React.useState<'resolved' | 'dismissed' | 'escalated' | null>(null);
  const open = a.status === 'open' || a.status === 'under_review' || a.status === 'escalated';
  const why = (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-h5 text-text-primary">Why this alert fired</p>
      <p className="text-body-s text-text-secondary">
        {a.reason ?? `Rule ${ruleLabel(a.rule)} fired during transaction screening.`}
      </p>
      <KeyValues
        items={[
          {
            k: 'Player',
            v: a.user ? (
              <Link className="hover:underline" href={`/admin/users/${a.user.id}`}>
                {a.user.handle}
              </Link>
            ) : (
              '—'
            ),
          },
          { k: 'Raised', v: dt(a.createdAt) },
          { k: 'Provider', v: a.provider ?? '—' },
          {
            k: 'Status',
            v: (
              <StatusBadge
                status={STATUS_BADGE[a.status as keyof typeof STATUS_BADGE] ?? 'neutral'}
                label={a.status.replace('_', ' ')}
                size="s"
              />
            ),
          },
        ]}
      />
      {a.subject ? (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border-gold bg-gold-tint/20 p-3 text-body-s">
          <span className="flex flex-col">
            <span className="text-label-m text-text-primary">
              {a.subject.type === 'withdrawal' ? 'Withdrawal request' : 'Deposit'}{' '}
              {a.subject.reference}
            </span>
            <span className="text-caption text-text-tertiary">
              {a.subject.network} · {a.subject.status.replace('_', ' ')}
              {a.subject.address
                ? ` · to ${a.subject.address.slice(0, 6)}…${a.subject.address.slice(-4)}`
                : ''}
            </span>
          </span>
          <MoneyText value={a.subject.amount} />
        </div>
      ) : null}
      {a.resolution ? (
        <p className="text-caption text-text-secondary">Resolution: “{a.resolution}”</p>
      ) : null}
    </div>
  );
  const score = (
    <div className="flex flex-col gap-2 rounded-md border border-border-subtle bg-bg-secondary p-4">
      <p className="flex items-center justify-between text-caption text-text-secondary">
        AML risk score · {a.user?.handle ?? '—'} {a.isDemo ? <DemoBadge size="xs" /> : null}
      </p>
      <RiskMeter
        score={a.score}
        level={a.riskLevel}
        factors={a.rule.split(',').map((r) => r.replace(/_/g, ' '))}
      />
    </div>
  );
  const next = open ? (
    canResolve ? (
      <div className="flex flex-col gap-2">
        <p className="text-h5 text-text-primary">Next step</p>
        <Button leadingIcon={<Flag aria-hidden />} onClick={() => setDialog('escalated')}>
          Escalate to MLRO case
        </Button>
        <Button
          variant="secondary"
          leadingIcon={<ShieldCheck aria-hidden />}
          onClick={() => setDialog('resolved')}
        >
          Close — no issue
        </Button>
        <Button variant="ghost" onClick={() => setDialog('dismissed')}>
          Dismiss as false positive
        </Button>
        {a.user ? (
          <Button asChild variant="ghost">
            <Link href={`/admin/users/${a.user.id}`}>Request withdrawal hold</Link>
          </Button>
        ) : null}
        <p className="rounded-md bg-bg-secondary p-3 text-caption text-text-tertiary">
          Closing or escalating needs a reason and 2FA. A hold is an account restriction with
          four-eyes. Never mention the alert to the player (no tipping-off). Alerts never move
          funds.
        </p>
      </div>
    ) : (
      <p className="text-caption text-text-tertiary">
        Your role can view alerts but not act on them.
      </p>
    )
  ) : (
    <p className="text-body-s text-text-secondary">This alert is closed ({a.status}).</p>
  );
  return (
    <div
      className={
        wide
          ? 'grid gap-5 laptop:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)]'
          : 'flex flex-col gap-4'
      }
    >
      {why}
      {score}
      {next}
      <ReasonDialog
        open={dialog !== null}
        onOpenChange={(o) => setDialog(o ? dialog : null)}
        title={`${dialog === 'resolved' ? 'Clear' : dialog === 'dismissed' ? 'Dismiss' : 'Escalate'} ${a.reference}`}
        description={
          dialog === 'escalated'
            ? 'Escalates the alert to the MLRO. Do not tell the player (tipping-off).'
            : 'Closes the alert. The linked withdrawal still needs its own Finance decision.'
        }
        confirmVariant={dialog === 'escalated' ? 'danger' : 'primary'}
        confirmLabel={
          dialog === 'resolved'
            ? 'Clear alert'
            : dialog === 'dismissed'
              ? 'Dismiss alert'
              : 'Escalate'
        }
        onSubmit={async (v) => {
          const res = await resolve.mutateAsync({
            resolution: dialog ?? 'resolved',
            reason: v.reason,
            mfaCode: v.mfaCode ?? '',
          });
          toast({
            type: 'success',
            title: `${a.reference} ${res.status}`,
            description: 'Recorded in the audit log.',
          });
        }}
      />
    </div>
  );
}

export function AmlAlertsPage() {
  const [status, setStatus] = React.useState<
    'all' | 'open' | 'under_review' | 'escalated' | 'resolved' | 'dismissed'
  >('all');
  const [risk, setRisk] = React.useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [q, setQ] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [selected, setSelected] = React.useState<string | null>(null);
  const isLaptop = useMediaQuery(MQ.laptop, true);
  React.useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const alerts = useAmlAlerts({
    page,
    pageSize: 20,
    status: status === 'all' ? undefined : status,
    riskLevel: risk === 'all' ? undefined : risk,
    q: query || undefined,
  });
  const cols: Column<AmlRow>[] = [
    {
      key: 'ref',
      header: 'Alert',
      cell: (a) => <span className="font-mono text-mono-s">{a.reference}</span>,
    },
    {
      key: 'risk',
      header: 'Risk',
      cell: (a) => (
        <span className="flex items-center gap-1.5">
          <RiskPill level={a.riskLevel} />
          <span className="text-caption text-text-tertiary">{a.score}</span>
        </span>
      ),
    },
    {
      key: 'user',
      header: 'Player',
      cell: (a) => (
        <span className="flex items-center gap-1.5">
          {a.user?.handle ?? '—'} {a.isDemo ? <DemoBadge size="xs" /> : null}
        </span>
      ),
    },
    {
      key: 'rule',
      header: 'Rule',
      className: 'whitespace-normal',
      cell: (a) => <span className="text-caption text-text-secondary">{ruleLabel(a.rule)}</span>,
    },
    {
      key: 'subj',
      header: 'Subject',
      hideBelow: 'desktop',
      cell: (a) =>
        a.subject ? (
          <span className="text-caption">
            {a.subject.reference} · {usd(a.subject.amount)}
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'st',
      header: 'Status',
      cell: (a) => (
        <StatusBadge
          status={STATUS_BADGE[a.status as keyof typeof STATUS_BADGE] ?? 'neutral'}
          label={a.status.replace('_', ' ')}
          size="s"
        />
      ),
    },
    {
      key: 'age',
      header: 'Age',
      align: 'right',
      hideBelow: 'laptop',
      cell: (a) => (
        <span className="text-caption text-text-secondary">
          {a.ageHours <= 0 ? 'just now' : `${a.ageHours} h`}
        </span>
      ),
    },
  ];
  return (
    <PageStack>
      <ModuleHeader
        module="Compliance"
        title="AML alerts"
        description="Alerts raised by transaction screening (sanctions, destination history, amount and velocity). Clearing, dismissing or escalating needs a reason and 2FA; none of these actions moves funds."
      />
      <QueryView query={alerts}>
        {(d) => {
          const current = d.items.find((a) => a.id === selected) ?? d.items[0] ?? null;
          return (
            <>
              <KpiGrid className="laptop:grid-cols-3">
                <KpiTile
                  label="Open alerts"
                  icon={ShieldAlert}
                  value={count(d.summary.open)}
                  unit="alerts"
                  sub={`High/critical ${count(d.summary.highOrCritical)} · medium ${count(d.summary.byRisk.medium)} · low ${count(d.summary.byRisk.low)} · ${count(d.summary.escalated)} escalated`}
                  subTone={d.summary.highOrCritical > 0 ? 'danger' : 'neutral'}
                  demo
                />
                <KpiTile
                  label="Alerts closed (7 days)"
                  icon={ShieldCheck}
                  value={count(d.summary.resolved7d)}
                  unit="alerts"
                  sub="Cleared, dismissed or escalated"
                  demo
                />
                <KpiTile
                  label="Closed as no issue (30 days)"
                  icon={Gauge}
                  value={d.summary.noIssueRate30d === null ? '—' : `${d.summary.noIssueRate30d}%`}
                  sub={`False-positive rate · ${count(d.summary.closed30d)} closed in 30 days`}
                  demo
                />
              </KpiGrid>
              <div className="flex flex-col gap-4">
                <Panel
                  flush
                  title="Open alerts"
                  demo
                  actions={
                    <span className="text-caption text-text-tertiary">
                      Newest first · refreshes on load
                    </span>
                  }
                >
                  <div className="flex flex-col gap-3 px-4 pb-3 tablet:px-5">
                    <SearchInput
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      onClear={() => setQ('')}
                      placeholder="Search @handle or rule"
                      aria-label="Search AML alerts"
                    />
                    <FilterChips
                      label="Alert status"
                      value={status}
                      onChange={(v) => {
                        setStatus(v);
                        setPage(1);
                      }}
                      options={[
                        { value: 'all', label: 'All' },
                        { value: 'open', label: 'Open' },
                        { value: 'escalated', label: 'Escalated' },
                        { value: 'resolved', label: 'Cleared' },
                        { value: 'dismissed', label: 'Dismissed' },
                      ]}
                    />
                    <FilterChips
                      label="Risk level"
                      value={risk}
                      onChange={(v) => {
                        setRisk(v);
                        setPage(1);
                      }}
                      options={[
                        { value: 'all', label: 'Any risk' },
                        { value: 'critical', label: 'Critical' },
                        { value: 'high', label: 'High' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'low', label: 'Low' },
                      ]}
                    />
                  </div>
                  <DataTable
                    caption="AML alerts"
                    columns={cols}
                    rows={d.items}
                    rowKey={(a) => a.id}
                    selectedKey={current?.id ?? null}
                    onRowClick={(a) => setSelected(a.id)}
                    empty={
                      <EmptyState
                        type="no-results"
                        title="No alerts match"
                        description="Screening raises an alert when a rule fires."
                        className="py-10"
                      />
                    }
                    mobileCard={(a) => (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-mono-s">{a.reference}</span>
                          <RiskPill level={a.riskLevel} />
                        </div>
                        <p className="text-caption text-text-secondary">
                          {a.user?.handle} · {ruleLabel(a.rule)}
                        </p>
                        <Pill tone="neutral">{a.status.replace('_', ' ')}</Pill>
                      </div>
                    )}
                    footer={
                      <Pagination
                        page={d.page}
                        totalPages={d.totalPages}
                        total={d.total}
                        pageSize={d.pageSize}
                        onPage={setPage}
                        noun="alerts"
                        demo
                      />
                    }
                  />
                </Panel>
                {isLaptop && current ? (
                  <Panel
                    title={`${current.reference} · ${current.user?.handle ?? '—'} · ${ruleLabel(current.rule)}`}
                    icon={ShieldAlert}
                    demo={current.isDemo}
                    className="border-border-brand"
                    actions={
                      current.subject?.type === 'withdrawal' ? (
                        <Button asChild size="s" variant="ghost">
                          <Link href={`/admin/finance/withdrawals/${current.subject.id}`}>
                            Open {current.subject.reference}
                          </Link>
                        </Button>
                      ) : undefined
                    }
                  >
                    <AlertPreview a={current} wide />
                  </Panel>
                ) : null}
              </div>
              {!isLaptop ? (
                <Sheet
                  open={selected !== null && current !== null}
                  onOpenChange={(o) => !o && setSelected(null)}
                >
                  <SheetContent side="bottom" className="max-h-[90dvh]">
                    <SheetHeader>
                      <SheetTitle>Alert preview</SheetTitle>
                    </SheetHeader>
                    <SheetBody className="overflow-y-auto">
                      {current ? <AlertPreview a={current} /> : null}
                    </SheetBody>
                  </SheetContent>
                </Sheet>
              ) : null}
              <p className="text-caption text-text-tertiary">{d.actions.note}</p>
            </>
          );
        }}
      </QueryView>
    </PageStack>
  );
}
