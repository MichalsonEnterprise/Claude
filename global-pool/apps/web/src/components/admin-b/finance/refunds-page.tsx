'use client';

import { Bell, Ban, CircleCheck, Undo2, Users } from 'lucide-react';
import * as React from 'react';

import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/sonner';
import {
  useCan,
  useRefunds,
  useRemindRefunds,
  type RefundRound,
  type RefundsResponse,
} from '@/lib/api/admin-b';
import { money } from '@gp/shared/money';

import { ExportCsvButton } from '../export-dialog';
import { ReasonDialog } from '../reason-dialog';
import {
  DataTable,
  KeyValues,
  KpiGrid,
  KpiTile,
  ModuleHeader,
  MoneyText,
  Panel,
  PageStack,
  ProgressBar,
  QueryView,
  count,
  dt,
  roundLabel,
  usd,
  type Column,
} from '../primitives';

const REASON: Record<string, string> = {
  threshold_not_met: 'Thresholds not met at close',
  vrf_timeout: 'Randomness not fulfilled in time',
};

export function RefundRoundPanel({ r, compact }: { r: RefundRound; compact?: boolean }) {
  const canRemind = useCan('notifications.send');
  const remind = useRemindRefunds(r.number);
  const [open, setOpen] = React.useState(false);
  const refunded = money(r.refundedToOwed);
  const claimedPct = refunded.isZero() ? 0 : money(r.claimed).div(refunded).times(100).toNumber();
  return (
    <Panel
      title={`Round ${roundLabel(r.number)} · RefundOnCancel`}
      icon={Undo2}
      demo={r.isDemo}
      description={`${REASON[r.reason] ?? r.reason} · cancelled ${dt(r.cancelledAt)}`}
      actions={
        <>
          <Button
            variant="secondary"
            size="s"
            leadingIcon={<Bell aria-hidden />}
            disabled={!canRemind || r.outstandingPlayers === 0}
            title={!canRemind ? 'Your role cannot send player notifications' : undefined}
            onClick={() => setOpen(true)}
          >
            Remind players
          </Button>
          <Button
            variant="ghost"
            size="s"
            leadingIcon={<Ban aria-hidden />}
            disabled
            title="Refunds are contract-defined — no manual refunds exist"
          >
            Issue manual refund
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-3 tablet:grid-cols-2">
          <ProgressBar
            label="Participants vs threshold"
            detail={`${count(r.participants)} / ${count(r.minParticipants)}`}
            value={(r.participants / Math.max(1, r.minParticipants)) * 100}
            tone="warning"
          />
          <ProgressBar
            label="Pool vs threshold"
            detail={`${usd(r.stakes)} / ${usd(r.minPool)}`}
            value={
              money(r.minPool).isZero()
                ? 0
                : money(r.stakes).div(money(r.minPool)).times(100).toNumber()
            }
            tone="warning"
          />
        </div>
        <ProgressBar
          label="Claimed back to Available"
          detail={`${usd(r.claimed)} of ${usd(r.refundedToOwed)} USDT`}
          value={claimedPct}
          tone="success"
        />
        {!compact ? (
          <KeyValues
            columns={2}
            items={[
              { k: 'Stakes refunded to Owed', v: <MoneyText value={r.refundedToOwed} /> },
              { k: 'Outstanding', v: <MoneyText value={r.outstanding} /> },
              { k: 'Players refunded', v: count(r.players) },
              { k: 'Players yet to claim', v: count(r.outstandingPlayers) },
              { k: 'Entries', v: count(r.entries) },
              { k: 'Platform fees (not refunded)', v: <MoneyText value={r.platformFees} /> },
            ]}
          />
        ) : null}
        {r.topOutstanding.length > 0 ? (
          <div>
            <p className="mb-1 text-overline uppercase text-text-tertiary">
              Largest unclaimed refunds
            </p>
            <ul className="divide-y divide-border-subtle">
              {r.topOutstanding.map((t) => (
                <li
                  key={t.reference}
                  className="flex items-center justify-between gap-2 py-2 text-body-s"
                >
                  <span className="flex items-center gap-1.5 text-text-secondary">
                    {t.handle} · {count(t.entries)} entries{' '}
                    {t.isDemo ? <DemoBadge size="xs" /> : null}
                  </span>
                  <MoneyText value={t.amount} />
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-caption text-text-success">
            <CircleCheck aria-hidden className="size-3.5" /> Every refund of this round has been
            claimed.
          </p>
        )}
      </div>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        mfa={false}
        title={`Remind ${count(r.outstandingPlayers)} players — round ${roundLabel(r.number)}`}
        description="Sends an in-app notice that the refund is waiting in Owed. It never moves money. One reminder per round per 24 h."
        confirmLabel="Send reminder"
        onSubmit={async (v) => {
          const res = await remind.mutateAsync({ reason: v.reason });
          toast({
            type: 'success',
            title: `Reminder sent to ${count(res.players)} players`,
            description: `Audit entry #${res.auditSeq}`,
          });
        }}
      />
    </Panel>
  );
}

export function RefundsPage() {
  const q = useRefunds();
  const cols: Column<RefundsResponse['notRefunds'][number]>[] = [
    {
      key: 'ref',
      header: 'Reference',
      cell: (n) => <span className="font-mono text-mono-s">{n.reference}</span>,
    },
    {
      key: 'who',
      header: 'Player',
      cell: (n) => (
        <span className="flex items-center gap-1.5">
          {n.handle} {n.isDemo ? <DemoBadge size="xs" /> : null}
        </span>
      ),
    },
    { key: 'amt', header: 'Returned (USDT)', align: 'right', cell: (n) => usd(n.amount) },
    {
      key: 'st',
      header: 'Withdrawal',
      cell: (n) => (
        <StatusBadge
          status={
            n.status === 'rejected' ? 'rejected' : n.status === 'failed' ? 'failed' : 'expired'
          }
          label={n.status}
          size="s"
        />
      ),
    },
    {
      key: 'why',
      header: 'Reason',
      hideBelow: 'laptop',
      className: 'whitespace-normal',
      cell: (n) => <span className="text-caption text-text-tertiary">{n.reason ?? '—'}</span>,
    },
    {
      key: 'at',
      header: 'When',
      cell: (n) => <span className="text-caption text-text-secondary">{dt(n.at)}</span>,
    },
  ];
  return (
    <PageStack>
      <ModuleHeader
        module="Finance"
        title="Refunds"

        description="Cancelled rounds return every stake to the players’ Owed balance automatically (RefundOnCancel). Admins can remind players and export reports — there is no manual refund."
        actions={<ExportCsvButton dataset="refunds" />}
      />
      <QueryView query={q}>
        {(d) => (
          <>
            <KpiGrid className="laptop:grid-cols-3">
              <KpiTile
                label="Outstanding refunds"
                icon={Undo2}
                value={usd(d.totals.outstanding)}
                unit="USDT"
                sub={`${count(d.totals.outstandingPlayers)} players yet to claim`}
                demo
              />
              <KpiTile
                label="Claimed"
                icon={CircleCheck}
                value={usd(d.totals.claimed)}
                unit="USDT"
                sub="Moved Owed → Available by players"
                demo
              />
              <KpiTile
                label="Cancelled rounds"
                icon={Users}
                value={count(d.rounds.length)}
                sub="Stakes refunded in full"
                demo
              />
            </KpiGrid>
            {d.rounds.length === 0 ? (
              <Panel>
                <EmptyState
                  type="no-data"
                  title="No cancelled rounds"
                  description="Refunds appear here only when a round closes without meeting its thresholds or its draw times out."
                />
              </Panel>
            ) : (
              d.rounds.map((r) => <RefundRoundPanel key={r.number} r={r} />)
            )}
            <Panel
              flush
              title="Returns that are not refunds"
              demo
              description="Rejected, failed or cancelled withdrawals release Locked funds back to Available (withdrawal_release)."
            >
              <DataTable
                caption="Withdrawal releases"
                columns={cols}
                rows={d.notRefunds}
                rowKey={(n) => n.reference}
                empty={
                  <p className="px-5 py-8 text-center text-body-s text-text-tertiary">
                    No returned withdrawals.
                  </p>
                }
                mobileCard={(n) => (
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between">
                      <span className="font-mono text-mono-s">{n.reference}</span>
                      <span className="tabular-nums">{usd(n.amount)} USDT</span>
                    </div>
                    <p className="text-caption text-text-tertiary">
                      {n.handle} · {n.status} · {n.reason ?? '—'}
                    </p>
                  </div>
                )}
              />
            </Panel>
            <p className="text-caption text-text-tertiary">{d.policy}</p>
          </>
        )}
      </QueryView>
    </PageStack>
  );
}
