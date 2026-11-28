'use client';

import { ADMIN_REASON_CATEGORIES } from '@gp/shared/schemas';
import {
  CircleCheck,
  Cpu,
  FileCode2,
  Hourglass,
  Lock,
  Pause,
  Play,
  ShieldCheck,
  Timer,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import * as React from 'react';

import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/sonner';
import {
  useAdminMe,
  useBreaker,
  useDecideBreaker,
  useRefunds,
  useRequestBreaker,
  useVrf,
  type VrfResponse,
} from '@/lib/api/admin-b';

import { RefundRoundPanel } from '../finance/refunds-page';
import { ReasonDialog } from '../reason-dialog';
import {
  CopyHash,
  DataTable,
  KeyValues,
  KpiGrid,
  KpiTile,
  ModuleHeader,
  Pagination,
  Panel,
  PageStack,
  Pill,
  QueryView,
  Timeline,
  count,
  dt,
  roundLabel,
  time,
  type Column,
} from '../primitives';
import { useRoundParam } from './shared';

// ── P7 VRF status ─────────────────────────────────────────────────────────────────────────────

type VrfRow = VrfResponse['items'][number];

export function VrfPage() {
  const [page, setPage] = React.useState(1);
  const q = useVrf({ page, pageSize: 20 });
  const cols: Column<VrfRow>[] = [
    { key: 'r', header: 'Round', cell: (r) => roundLabel(r.roundNumber) },
    {
      key: 'id',
      header: 'Request ID',
      cell: (r) => <CopyHash value={r.requestId} label="request id" />,
    },
    {
      key: 's',
      header: 'Status',
      cell: (r) => (
        <StatusBadge
          status={
            r.status === 'fulfilled'
              ? 'confirmed'
              : r.status === 'requested'
                ? 'processing'
                : r.status === 'timed_out'
                  ? 'expired'
                  : 'failed'
          }
          label={r.status.replace('_', ' ')}
          size="s"
        />
      ),
    },
    {
      key: 'p',
      header: 'Provider',
      hideBelow: 'laptop',
      cell: (r) => (r.provider === 'mock' ? 'Mock (DEV)' : 'Chainlink VRF v2.5'),
    },
    {
      key: 'req',
      header: 'Requested',
      cell: (r) => <span className="text-caption">{dt(r.requestedAt)}</span>,
    },
    {
      key: 'lat',
      header: 'Latency',
      align: 'right',
      cell: (r) => (r.latencySeconds !== null ? `${r.latencySeconds} s` : '—'),
    },
    {
      key: 'conf',
      header: 'Confirmations',
      align: 'right',
      hideBelow: 'desktop',
      cell: (r) => (r.confirmations ?? '—') as React.ReactNode,
    },
    {
      key: 'w',
      header: 'Random word',
      hideBelow: 'laptop',
      cell: (r) => (r.randomWord ? <CopyHash value={r.randomWord} label="random word" /> : '—'),
    },
  ];
  return (
    <PageStack>
      <ModuleHeader
        module="Global Pool"
        title="VRF status"
        description="Randomness for every draw is requested automatically at close and verified before settlement. You can monitor requests; nobody can request, re-roll or override randomness."
      />
      <QueryView query={q}>
        {(d) => (
          <>
            <KpiGrid>
              <KpiTile
                label="Provider"
                icon={Cpu}
                value={d.config.provider === 'mock' ? 'Mock (DEV)' : 'Chainlink VRF v2.5'}
                sub={d.config.network}
              />
              <KpiTile
                label="Fulfilled"
                icon={CircleCheck}
                value={count(d.counts.fulfilled ?? 0)}
                sub={`${count(d.counts.requested ?? 0)} waiting · ${count((d.counts.failed ?? 0) + (d.counts.timed_out ?? 0))} failed/timed out`}
              />
              <KpiTile
                label="Timeout"
                icon={Timer}
                value={`${d.config.timeoutHours} h`}
                sub="Then the round is cancelled with full refunds"
              />
              <KpiTile
                label="Next draw"
                icon={Hourglass}
                value={d.nextDraw ? roundLabel(d.nextDraw.roundNumber) : '—'}
                sub={d.nextDraw ? `Request at close · ${dt(d.nextDraw.closesAt)}` : 'No open round'}
              />
            </KpiGrid>
            <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_360px]">
              <Panel
                flush
                title="Requests"
                description="One request per round (a retry after a failed request is a new attempt of the same round)."
              >
                <DataTable
                  caption="VRF requests"
                  columns={cols}
                  rows={d.items}
                  rowKey={(r) => r.id}
                  empty={
                    <EmptyState
                      type="no-data"
                      title="No randomness requests yet"
                      description={
                        d.nextDraw
                          ? `The first request is sent automatically when round ${roundLabel(d.nextDraw.roundNumber)} closes at ${time(d.nextDraw.closesAt)} UTC. DEMO history rounds carry no stored request.`
                          : 'Requests appear when a round closes.'
                      }
                      className="py-10"
                    />
                  }
                  mobileCard={(r) => (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-body-s-strong">{roundLabel(r.roundNumber)}</span>
                        <Pill tone={r.status === 'fulfilled' ? 'success' : 'warning'}>
                          {r.status}
                        </Pill>
                      </div>
                      <p className="text-caption text-text-tertiary">
                        {dt(r.requestedAt)} · {r.latencySeconds ?? '—'} s
                      </p>
                    </div>
                  )}
                  footer={
                    d.total > d.pageSize ? (
                      <Pagination
                        page={d.page}
                        totalPages={d.totalPages}
                        total={d.total}
                        pageSize={d.pageSize}
                        onPage={setPage}
                        noun="requests"
                      />
                    ) : undefined
                  }
                />
              </Panel>
              <Panel title="Configuration" icon={FileCode2}>
                <KeyValues
                  items={[
                    {
                      k: 'Provider',
                      v:
                        d.config.provider === 'mock'
                          ? 'MockVrfProvider (dev, labelled mock)'
                          : 'ChainlinkVrfProvider',
                    },
                    { k: 'Network', v: d.config.network },
                    {
                      k: 'Contract',
                      v: d.config.contract ? (
                        <CopyHash value={d.config.contract} label="contract" />
                      ) : (
                        'Not configured (DEMO)'
                      ),
                    },
                    { k: 'Winner algorithm', v: d.config.algorithm },
                    { k: 'Timeout', v: `${d.config.timeoutHours} h → cancel + refunds` },
                  ]}
                />
                <p className="mt-3 flex items-start gap-2 text-caption text-text-tertiary">
                  <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" /> There is no endpoint to
                  request, re-roll or set a random word.
                </p>
              </Panel>
            </div>
          </>
        )}
      </QueryView>
    </PageStack>
  );
}

// ── P9 refund status ──────────────────────────────────────────────────────────────────────────

export function PoolRefundsPage() {
  const q = useRefunds();
  const [round] = useRoundParam(null);
  return (
    <PageStack>
      <ModuleHeader
        module="Global Pool"
        title="Refund status"
        crumb="Refunds"
        description="Cancelled rounds refund every entry to the player who bought it (RefundOnCancel — 10.00 USDT per entry, to the entrant only). Players claim from Owed in the app. Amounts and recipients cannot be edited."
      />
      <QueryView query={q}>
        {(d) => {
          const rounds = round ? d.rounds.filter((r) => r.number === round) : d.rounds;
          return rounds.length === 0 ? (
            <Panel>
              <EmptyState
                type="no-data"
                title="No cancelled rounds"
                description="A round is cancelled only when its thresholds are not met at close or its randomness times out."
              />
            </Panel>
          ) : (
            <>
              {rounds.map((r) => (
                <RefundRoundPanel key={r.number} r={r} />
              ))}
              <p className="text-caption text-text-tertiary">{d.policy}</p>
            </>
          );
        }}
      </QueryView>
    </PageStack>
  );
}

// ── P10 policy + circuit breaker ──────────────────────────────────────────────────────────────

const DECIDES = [
  'Opening and closing each round at its scheduled time',
  'Requesting verifiable randomness (Chainlink VRF) at close and verifying it',
  'Deriving 13 winning entries from the random value',
  'Prize split 50 / 20 / 10 / 10 × 2% of the pool',
  'Cancelling below threshold and refunding every stake to Owed',
];
const ADMINS_MAY = [
  'Pause and resume NEW entries — reason, 2FA, four-eyes',
  'Remind players of unclaimed refunds (in-app notice only)',
  'Monitor rounds, pools, randomness and settlement (read-only)',
  'Export rounds, entries, allocations and audit logs',
];
const BREAKER_KEEPS = [
  'Existing entries stay valid',
  'Close time unchanged',
  'Draw + settlement run as scheduled',
  'Withdrawals unaffected',
];

export function PolicyPage() {
  const q = useBreaker();
  const me = useAdminMe();
  const breakerRole = Boolean(
    me.data?.roles.some((r) => ['super_admin', 'finance', 'compliance'].includes(r)),
  );
  const request = useRequestBreaker();
  const decide = useDecideBreaker(q.data?.pending?.id ?? 'none');
  const [dialog, setDialog] = React.useState<'request' | 'approve' | 'decline' | null>(null);

  return (
    <PageStack>
      <ModuleHeader
        module="Global Pool"
        title="Immutable by design"
        crumb="Policy & circuit breaker"
        description="What the contract decides on its own, what admins may do, and what nobody can do. The only emergency control is a circuit breaker that pauses NEW entries — it needs a reason, 2FA and a second approver from another role."
      />
      <QueryView query={q}>
        {(b) => {
          const paused = b.state === 'paused';
          const pending = b.pending;
          const action = paused ? 'resume_new_entries' : 'pause_new_entries';
          const round = b.policy;
          return (
            <>
              <div className="grid gap-4 laptop:grid-cols-3">
                <Panel title="The contract decides" icon={FileCode2}>
                  <ul className="flex flex-col gap-2.5">
                    {DECIDES.map((t) => (
                      <li
                        key={t}
                        className="flex items-start gap-2 text-body-s text-text-secondary"
                      >
                        <CircleCheck
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0 text-text-success"
                        />{' '}
                        {t}
                      </li>
                    ))}
                  </ul>
                </Panel>
                <Panel title="Admins may — audited" icon={UserCheck}>
                  <ul className="flex flex-col gap-2.5">
                    {ADMINS_MAY.map((t) => (
                      <li
                        key={t}
                        className="flex items-start gap-2 text-body-s text-text-secondary"
                      >
                        <ShieldCheck
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0 text-text-brand"
                        />{' '}
                        {t}
                      </li>
                    ))}
                  </ul>
                </Panel>
                <section
                  aria-labelledby="nobody-h"
                  className="flex flex-col gap-3 rounded-lg border border-border-danger bg-status-danger-tint/40 p-5"
                >
                  <h2 id="nobody-h" className="flex items-center gap-2 text-h5 text-text-primary">
                    <XCircle aria-hidden className="size-[18px] text-text-danger" /> Nobody can — by
                    design
                  </h2>
                  <ul className="flex flex-col gap-2.5">
                    {round.cannot.map((t) => (
                      <li
                        key={t}
                        className="flex items-start gap-2 text-body-s text-text-secondary"
                      >
                        <XCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-text-danger" />
                        <span>
                          <span className="sr-only">Cannot: </span>
                          {t}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>

              <section
                aria-labelledby="breaker-h"
                className="grid gap-5 rounded-lg border border-border-subtle bg-surface-default p-5 laptop:grid-cols-[minmax(0,1fr)_300px]"
              >
                <div className="flex min-w-0 flex-col gap-4">
                  <h2
                    id="breaker-h"
                    className="flex flex-wrap items-center gap-2 text-h4 text-text-primary"
                  >
                    <Pause aria-hidden className="size-5 text-icon-muted" /> Circuit breaker — new
                    entries
                    <Pill tone={paused ? 'danger' : 'success'} icon={paused ? Pause : CircleCheck}>
                      {paused ? 'Entries paused' : 'Entries open'}
                    </Pill>
                  </h2>
                  <p className="text-body-m text-text-secondary">
                    Use only for an incident that could make new entries unsafe (e.g. RPC or relayer
                    failure, suspected exploit, regulator instruction). Pausing does not touch
                    existing entries, the scheduled close, the draw, settlement, refunds or
                    withdrawals.
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {BREAKER_KEEPS.map((t) => (
                      <li key={t}>
                        <Pill tone="success" icon={CircleCheck}>
                          {t}
                        </Pill>
                      </li>
                    ))}
                    <li>
                      <Pill tone="warning" icon={Pause}>
                        New purchases blocked with a player notice
                      </Pill>
                    </li>
                  </ul>
                  <KeyValues
                    items={[
                      { k: 'Who can request', v: b.rules.roles.join(' · ') },
                      { k: 'Second approver', v: b.rules.secondApprover },
                      { k: 'Re-authentication', v: b.rules.reauth },
                      { k: 'Request expires', v: `${b.rules.ttlMinutes} min if not approved` },
                      { k: 'Resume', v: b.rules.resume },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-3 rounded-md border border-border-subtle bg-bg-secondary p-4">
                  <p className="text-overline uppercase text-text-tertiary">Current state</p>
                  <p className="flex items-center gap-2 text-h5 text-text-primary">
                    {paused ? (
                      <Pause aria-hidden className="size-5 text-text-danger" />
                    ) : (
                      <Play aria-hidden className="size-5 text-text-success" />
                    )}
                    {paused ? 'New entries paused' : 'New entries open'}
                  </p>
                  <p className="text-caption text-text-tertiary">
                    {b.lastChange
                      ? `Last change ${dt(b.lastChange.at)} by ${b.lastChange.by ?? '—'} (audit #${b.lastChange.seq}).`
                      : 'The breaker has never been used.'}
                  </p>
                  {pending ? (
                    <div className="flex flex-col gap-2 rounded-md border border-border-gold bg-gold-tint/20 p-3">
                      <p className="flex items-center gap-1.5 text-label-m text-text-primary">
                        <Users aria-hidden className="size-4" /> {pending.reference} · 1 of 2
                      </p>
                      <p className="text-caption text-text-secondary">
                        {pending.action === 'pool.entries.pause' ? 'Pause' : 'Resume'} requested by{' '}
                        {pending.requestedBy}
                        {pending.reasonCategory ? ` · ${pending.reasonCategory}` : ''}: “
                        {pending.reason}”
                      </p>
                      <p className="text-caption text-text-tertiary">
                        Expires {time(pending.expiresAt)} UTC — then it changes nothing.
                      </p>
                      {pending.requestedByMe ? (
                        <p className="text-caption text-text-warning">
                          You requested this. A different person with a different role must approve.
                        </p>
                      ) : breakerRole ? (
                        <div className="flex flex-col gap-2">
                          <Button
                            variant={pending.action === 'pool.entries.pause' ? 'danger' : 'primary'}
                            onClick={() => setDialog('approve')}
                          >
                            Approve — {pending.action === 'pool.entries.pause' ? 'pause' : 'resume'}
                          </Button>
                          <Button variant="secondary" onClick={() => setDialog('decline')}>
                            Decline
                          </Button>
                        </div>
                      ) : (
                        <p className="text-caption text-text-tertiary">
                          Your role cannot approve breaker changes.
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <Button
                        variant={paused ? 'primary' : 'danger'}
                        size="l"
                        leadingIcon={paused ? <Play aria-hidden /> : <Pause aria-hidden />}
                        disabled={!breakerRole}
                        onClick={() => setDialog('request')}
                      >
                        {paused ? 'Request resume of new entries' : 'Request pause of new entries'}
                      </Button>
                      <p className="text-caption text-text-tertiary">
                        {breakerRole
                          ? 'Opens a request with reason and 2FA. Nothing changes until a second admin approves.'
                          : 'Only Super Admin, Finance or Compliance can request a change.'}
                      </p>
                    </>
                  )}
                </div>
              </section>

              <Panel
                flush
                title="Circuit-breaker history"
                demo
                actions={
                  <span className="inline-flex items-center gap-1 text-caption text-text-tertiary">
                    <Lock aria-hidden className="size-3.5" />
                    Immutable audit log · hash-chained
                  </span>
                }
              >
                <DataTable
                  caption="Circuit-breaker history"
                  columns={[
                    { key: 't', header: 'Time (UTC)', cell: (h) => dt(h.createdAt) },
                    {
                      key: 'a',
                      header: 'Action',
                      cell: (h) =>
                        h.action === 'pool.entries.pause' ? 'Pause new entries' : 'Resume entries',
                    },
                    {
                      key: 'r',
                      header: 'Request',
                      cell: (h) => <span className="font-mono text-mono-s">{h.reference}</span>,
                    },
                    {
                      key: 'w',
                      header: 'Requested → approved',
                      cell: (h) => `${h.requestedBy} → ${h.decidedBy ?? '—'}`,
                    },
                    {
                      key: 'why',
                      header: 'Reason',
                      hideBelow: 'laptop',
                      className: 'whitespace-normal',
                      cell: (h) => (
                        <span className="text-caption text-text-secondary">{h.reason}</span>
                      ),
                    },
                    {
                      key: 's',
                      header: 'Result',
                      cell: (h) => (
                        <StatusBadge
                          status={
                            h.status === 'approved'
                              ? 'approved'
                              : h.status === 'rejected'
                                ? 'rejected'
                                : 'expired'
                          }
                          label={
                            h.status === 'rejected'
                              ? 'Declined'
                              : h.status[0]!.toUpperCase() + h.status.slice(1)
                          }
                          size="s"
                        />
                      ),
                    },
                  ]}
                  rows={b.history}
                  rowKey={(h) => h.id}
                  empty={
                    <p className="px-5 py-8 text-center text-body-s text-text-tertiary">
                      The circuit breaker has never been used.
                    </p>
                  }
                  mobileCard={(h) => (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-body-s-strong">
                          {h.action === 'pool.entries.pause' ? 'Pause' : 'Resume'} · {h.reference}
                        </span>
                        <Pill tone={h.status === 'approved' ? 'success' : 'neutral'}>
                          {h.status}
                        </Pill>
                      </div>
                      <p className="text-caption text-text-tertiary">
                        {dt(h.createdAt)} · {h.requestedBy} → {h.decidedBy ?? '—'}
                      </p>
                    </div>
                  )}
                />
              </Panel>

              <Panel title="Contract governance — how rules can change" icon={FileCode2}>
                <Timeline
                  items={[
                    {
                      title: 'New audited version',
                      detail:
                        'Rule changes ship as a new contract version with a public audit report.',
                      tone: 'success',
                    },
                    {
                      title: '48 h timelock',
                      detail:
                        'The upgrade is queued on-chain and visible to everyone before it can execute.',
                      tone: 'success',
                    },
                    {
                      title: 'Multisig',
                      detail:
                        'Independent signers — no single admin, including Super Admin, can upgrade alone.',
                      tone: 'success',
                    },
                    {
                      title: 'Next round only',
                      detail: 'A live round always finishes under the rules it opened with.',
                      tone: 'success',
                    },
                  ]}
                />
                <p className="mt-3 text-caption text-text-tertiary">
                  DEMO / testnet: the GlobalPoolRounds contract on Arbitrum Sepolia mirrors rounds;
                  rules in this console are read from the round records.
                </p>
              </Panel>

              <ReasonDialog
                open={dialog === 'request'}
                onOpenChange={(o) => setDialog(o ? 'request' : null)}
                title={paused ? 'Request resume of new entries' : 'Request pause of new entries'}
                description="Global Pool · nothing changes until a second admin from another role approves."
                categories={ADMIN_REASON_CATEGORIES.circuit_breaker}
                confirmVariant={paused ? 'primary' : 'danger'}
                confirmLabel="Send for second approval"
                fourEyes={`A different person with a different role (${b.rules.roles.join(', ')}) must approve within ${b.rules.ttlMinutes} min. Existing entries, the draw, settlement, refunds, claims and withdrawals are never affected.`}
                summary={
                  <KeyValues
                    items={[
                      {
                        k: 'Change',
                        v: paused ? 'Resume NEW entry purchases' : 'Pause NEW entry purchases',
                      },
                      { k: 'Requested by', v: me.data?.name ?? '—' },
                    ]}
                  />
                }
                onSubmit={async (v) => {
                  const res = await request.mutateAsync({
                    action,
                    reason: v.reason,
                    reasonCategory: v.reasonCategory,
                    mfaCode: v.mfaCode ?? '',
                  });
                  toast({
                    type: 'success',
                    title: `${res.reference} sent for second approval`,
                    description: `Expires ${time(res.expiresAt)} UTC`,
                  });
                }}
              />
              <ReasonDialog
                open={dialog === 'approve' || dialog === 'decline'}
                onOpenChange={(o) => setDialog(o ? dialog : null)}
                title={
                  dialog === 'decline'
                    ? `Decline ${pending?.reference ?? ''}`
                    : `Second approval — ${pending?.reference ?? ''}`
                }
                description={
                  dialog === 'decline'
                    ? 'Nothing changes; the request is closed.'
                    : pending?.action === 'pool.entries.pause'
                      ? 'New entry purchases stop as soon as you confirm.'
                      : 'New entry purchases resume as soon as you confirm.'
                }
                confirmVariant={
                  dialog === 'decline'
                    ? 'secondary'
                    : pending?.action === 'pool.entries.pause'
                      ? 'danger'
                      : 'primary'
                }
                confirmLabel={dialog === 'decline' ? 'Decline request' : 'Approve and apply'}
                summary={
                  pending ? (
                    <p className="text-body-s text-text-secondary">
                      Requested by {pending.requestedBy}: “{pending.reason}”
                    </p>
                  ) : null
                }
                onSubmit={async (v) => {
                  const res = await decide.mutateAsync({
                    decision: dialog === 'decline' ? 'decline' : 'approve',
                    reason: v.reason,
                    mfaCode: v.mfaCode ?? '',
                  });
                  toast({
                    type: 'success',
                    title:
                      res.decision === 'approve'
                        ? res.entriesEnabled
                          ? 'New entries resumed'
                          : 'New entries paused'
                        : 'Request declined',
                    description: `Audit entry #${res.auditSeq}`,
                  });
                }}
              />
            </>
          );
        }}
      </QueryView>
    </PageStack>
  );
}
