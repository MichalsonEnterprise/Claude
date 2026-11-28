'use client';

/**
 * MOB-11 Alerts (also at desktop widths): live operational and compliance alerts computed by the API from real
 * state (ledger invariants, services, queues, kill switches, VRF, failed withdrawals, AML, reviews, KYC). Role-
 * filtered server-side. Acknowledging is audit-logged and changes nothing else — alerts never offer result edits,
 * winner selection or balance adjustments.
 */
import { formatDateTimeUTC, formatTimeUTC } from '@gp/shared/format';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronRight, CircleAlert, Info, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ackAlert, type AdminAlert } from '@/lib/api/admin-a';
import { cn } from '@/lib/utils';

import { actionErrorMessage } from './four-eyes';
import { adminKeys, useAlerts } from './hooks';
import { AdminPageHeader, QueryErrorPanel } from './primitives';
import { useAdminSession } from './session';

const SEV = {
  high: { label: 'High', icon: CircleAlert, chip: 'bg-status-danger-tint text-text-danger' },
  warning: {
    label: 'Warning',
    icon: TriangleAlert,
    chip: 'bg-status-warning-tint text-text-warning',
  },
  info: { label: 'Info', icon: Info, chip: 'bg-status-info-tint text-text-info' },
} as const;

function AlertCard({ a }: { a: AdminAlert }) {
  const qc = useQueryClient();
  const ack = useMutation({
    mutationFn: () => ackAlert(a.key),
    onSuccess: (r) => {
      toast({
        type: 'success',
        title: 'Alert acknowledged',
        description: `Audit entry #${Number(r.auditSeq).toLocaleString('en-US')}`,
      });
      void qc.invalidateQueries({ queryKey: adminKeys.alerts });
    },
    onError: (err) =>
      toast({
        type: 'error',
        title: 'Not acknowledged',
        description: actionErrorMessage(err).message,
      }),
  });
  const s = SEV[a.severity];
  return (
    <li
      className="flex flex-col gap-2.5 rounded-lg border border-border-subtle bg-surface-default p-4"
      data-testid="admin-alert"
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex h-6 items-center gap-1 rounded-full px-2 text-label-s',
            s.chip,
          )}
        >
          <s.icon aria-hidden className="size-3.5" />
          {s.label}
        </span>
        <span className="text-caption capitalize text-text-tertiary">{a.category}</span>
        <DemoBadge size="xs" className="ml-auto" />
      </div>
      <p className="text-label-l text-text-primary">{a.title}</p>
      <p className="text-body-s text-text-secondary">{a.body}</p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {a.acknowledged ? (
          <span className="inline-flex items-center gap-1.5 text-caption text-text-tertiary">
            <Check aria-hidden className="size-4" />
            Acknowledged by {a.acknowledged.by ?? 'an admin'} · {formatTimeUTC(a.acknowledged.at)}
          </span>
        ) : (
          <Button variant="secondary" size="m" loading={ack.isPending} onClick={() => ack.mutate()}>
            Acknowledge
          </Button>
        )}
        {a.href && (
          <Button
            asChild
            variant="ghost"
            size="m"
            className="ml-auto"
            trailingIcon={<ChevronRight aria-hidden />}
          >
            <Link href={a.href}>Open</Link>
          </Button>
        )}
      </div>
    </li>
  );
}

export function AlertsPage() {
  const { admin } = useAdminSession();
  const alerts = useAlerts();
  const [tab, setTab] = React.useState<'all' | 'compliance' | 'operations'>('all');
  const items = (alerts.data?.items ?? []).filter((a) => tab === 'all' || a.category === tab);
  return (
    <div className="flex flex-col gap-5" data-testid="admin-alerts">
      <AdminPageHeader
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Alerts' }]}
        title="Alerts"
        description={`Live alerts computed from the platform's real state, filtered to your role. Acknowledging is logged; it never changes balances, rounds or results.${alerts.data ? ` As of ${formatDateTimeUTC(alerts.data.generatedAt)}.` : ''}`}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList variant="segmented" aria-label="Alert categories">
          <TabsTrigger value="all">All · {alerts.data?.counts.total ?? '…'}</TabsTrigger>
          <TabsTrigger value="compliance">
            Compliance · {alerts.data?.counts.compliance ?? '…'}
          </TabsTrigger>
          <TabsTrigger value="operations">
            Operations · {alerts.data?.counts.operations ?? '…'}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {alerts.isPending ? (
        <div className="grid gap-3 laptop:grid-cols-2" aria-busy>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : alerts.isError ? (
        <QueryErrorPanel
          error={alerts.error}
          onRetry={() => void alerts.refetch()}
          role={admin?.roles[0]}
          what="alerts"
        />
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-border-subtle bg-surface-default">
          <EmptyState
            title="No live alerts"
            description="Everything your role can see is operating normally."
          />
        </div>
      ) : (
        <ul className="grid gap-3 laptop:grid-cols-2">
          {items.map((a) => (
            <AlertCard key={a.key} a={a} />
          ))}
        </ul>
      )}
      <p className="text-caption text-text-tertiary">
        Alerts never offer result edits, winner selection or balance adjustments. Escalations go to
        the platform on-call rota.
      </p>
    </div>
  );
}
