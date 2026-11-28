'use client';

import { money } from '@gp/shared/money';
import { Activity, Clock, Lock, Users } from 'lucide-react';
import * as React from 'react';

import { DemoBadge } from '@/components/ui/demo-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useActiveRound } from '@/lib/api/admin-b';

import { ExportCsvButton } from '../export-dialog';
import {
  BarChart,
  ImmutablePanel,
  KpiGrid,
  KpiTile,
  LiveDot,
  ModuleHeader,
  MoneyText,
  Panel,
  PageStack,
  ProgressBar,
  QueryView,
  count,
  dt,
  time,
  usd,
} from '../primitives';
import { ServerCountdown } from './shared';

export function ActiveRoundPage() {
  const q = useActiveRound();
  return (
    <QueryView query={q}>
      {(d) => {
        const r = d.round;
        if (!r)
          return (
            <PageStack>
              <ModuleHeader module="Global Pool" title="Active round" />
              <Panel>
                <EmptyState
                  type="no-data"
                  title="No round is open"
                  description="The next daily round opens automatically on schedule."
                />
              </Panel>
            </PageStack>
          );
        return (
          <PageStack>
            <ModuleHeader
              module="Global Pool"
              title={`Round ${r.numberLabel} — live monitoring`}
              crumb="Active round"
              badges={<LiveDot />}
              description={`Read-only view of the ${r.statusLabel.toLowerCase()} round. Entries close automatically at ${dt(r.closesAt)} and the contract then requests verifiable randomness. Nothing on this page can change the close time, the entries or the draw.`}
              actions={<ExportCsvButton dataset="rounds" label="Export CSV" />}
            />
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border-gold bg-gold-tint/30 px-4 py-3">
              <Clock aria-hidden className="size-5 text-icon-gold" />
              <span className="text-body-s text-text-secondary">Closes in</span>
              <span className="text-number-m text-text-gold">
                <ServerCountdown
                  closesAt={r.closesAt}
                  serverNow={d.serverNow}
                  receivedAt={q.dataUpdatedAt}
                />
              </span>
              <span className="text-caption text-text-tertiary">
                · {time(r.closesAt)} UTC · server clock
              </span>
            </div>
            <KpiGrid>
              <KpiTile
                label="Pool"
                value={usd(r.poolBalance)}
                unit="USDT"
                sub={`${count(r.entries)} entries × ${usd(r.entryPrice)}`}
                demo
              />
              <KpiTile
                label="Participants"
                icon={Users}
                value={count(r.participants)}
                sub={`min ${count(r.thresholds.minParticipants)}`}
                demo
              />
              <KpiTile
                label="Platform fees"
                value={usd(r.platformFees)}
                unit="USDT"
                sub="0.05 per entry · not in the pool"
                demo
              />
              <KpiTile
                label="Largest share"
                value={`${d.topParticipants?.[0]?.sharePercent ?? '0.00'}%`}
                sub={`${d.topParticipants?.[0]?.handle ?? '—'} · ${count(d.topParticipants?.[0]?.entries ?? 0)} entries`}
                demo
              />
            </KpiGrid>
            <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_380px]">
              <div className="flex min-w-0 flex-col gap-4">
                <Panel
                  title="Thresholds"
                  demo
                  description="Both must be met at close, otherwise the round is cancelled and every stake returns to Owed."
                >
                  <div className="flex flex-col gap-4">
                    <ProgressBar
                      label="Participants"
                      detail={`${count(r.participants)} / ${count(r.thresholds.minParticipants)}`}
                      value={d.progress?.participantsPercent ?? 0}
                      tone={(d.progress?.participantsPercent ?? 0) >= 100 ? 'success' : 'warning'}
                    />
                    <ProgressBar
                      label="Pool"
                      detail={`${usd(r.poolBalance)} / ${usd(r.thresholds.minPool)} USDT`}
                      value={d.progress?.poolPercent ?? 0}
                      tone={(d.progress?.poolPercent ?? 0) >= 100 ? 'success' : 'gold'}
                    />
                    <p className="text-caption text-text-tertiary">
                      Status: {r.thresholds.met ? 'both thresholds met' : 'not met yet'} · rules
                      copied into the round when it opened and immutable since.
                    </p>
                  </div>
                </Panel>
                <Panel title="Entries per hour" icon={Activity} demo>
                  {d.entriesPerHour && d.entriesPerHour.length > 0 ? (
                    <BarChart
                      label="Entries per hour"
                      data={d.entriesPerHour.map((h) => ({
                        key: h.hour,
                        label: time(h.hour).slice(0, 5),
                        value: h.entries,
                        display: `${count(h.entries)} entries`,
                      }))}
                      formatValue={(v) => count(v)}
                    />
                  ) : (
                    <p className="py-6 text-center text-body-s text-text-tertiary">
                      No entries yet.
                    </p>
                  )}
                </Panel>
                <Panel
                  title="Prize table at the current pool"
                  demo
                  description="Recomputed from the pool; final amounts come from the pool at close."
                >
                  <ul className="flex flex-col divide-y divide-border-subtle">
                    {r.prizeDistribution.map((t) => (
                      <li
                        key={t.tier}
                        className="flex items-center justify-between gap-2 py-2 text-body-s"
                      >
                        <span className="text-text-secondary">
                          {t.label} · {t.sharePercent}% {t.winners > 1 ? `× ${t.winners}` : ''}
                        </span>
                        <MoneyText value={t.winners > 1 ? t.amountEach : t.amountTotal} />
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>
              <div className="flex flex-col gap-4">
                <Panel title="Latest purchases" demo description="Read-only feed">
                  {d.feed && d.feed.length > 0 ? (
                    <ul className="flex flex-col divide-y divide-border-subtle">
                      {d.feed.map((f) => (
                        <li
                          key={f.id}
                          className="flex items-center justify-between gap-2 py-2 text-body-s"
                        >
                          <span className="flex flex-col">
                            <span className="text-text-primary">{f.handle}</span>
                            <span className="text-caption text-text-tertiary">
                              {time(f.at)} UTC · {count(f.entries)} entries
                            </span>
                          </span>
                          <MoneyText value={f.amount} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-body-s text-text-tertiary">No purchases yet.</p>
                  )}
                </Panel>
                <Panel title="Concentration" icon={Users} description="Top participants by entries">
                  <ul className="flex flex-col gap-3">
                    {(d.topParticipants ?? []).map((t) => (
                      <li key={t.handle ?? 'x'}>
                        <ProgressBar
                          label={t.handle ?? '—'}
                          detail={`${count(t.entries)} entries · ${t.sharePercent}%`}
                          value={money(t.sharePercent).times(10).toNumber()}
                        />
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-caption text-text-tertiary">
                    Bar scale: 10% of entries = full bar. Odds are always disclosed to players.
                  </p>
                </Panel>
                <p className="flex items-start gap-2 text-caption text-text-tertiary">
                  <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" /> Close time, entries and
                  the draw are fixed by the contract.
                  <DemoBadge size="xs" />
                </p>
              </div>
            </div>
            {d.policy ? (
              <ImmutablePanel cannot={d.policy.cannot} allowed={d.policy.allowed} />
            ) : null}
          </PageStack>
        );
      }}
    </QueryView>
  );
}
