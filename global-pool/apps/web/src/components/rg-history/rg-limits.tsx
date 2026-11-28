'use client';

import { formatDateTimeUTC, formatWeekdayDateUTC } from '@gp/shared/format';
import { sum, toUSDTString } from '@gp/shared/money';
import type { RgLimitView, RgStateView } from '@gp/shared/schemas';
import {
  Bell,
  CircleCheck,
  Clock,
  Gamepad2,
  Hourglass,
  Layers,
  Lock,
  PauseCircle,
  Plus,
  Ticket,
  TrendingDown,
  Undo2,
  Wallet,
} from 'lucide-react';
import * as React from 'react';

import { ChainMark } from '@/components/brand/chain-mark';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { rgApi, useHistoryTransactions, useRgHistory, useRgMutation } from '@/lib/api/rg-history';

import { countdownWords, LimitSetter } from './limit-setter';
import { dateTime, minutesLabel, num, PERIOD_WORD, ratio, signed, toneOf } from './format';
import { HelpResources } from './help-resources';
import { RG_BASE, RgPage } from './rg-common';
import { Bullet, CardHead, Chip, Columns, KV, Meter, NoteBox } from './ui';

function weekStartIso(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d;
}

// ── RG2 · Deposit limits ──────────────────────────────────────────────────────────────────────

export function RgDepositLimits() {
  return (
    <RgPage
      href={`${RG_BASE}/deposit-limits`}
      title="Deposit limits"
      sub="Cap how much you can deposit each day, week or month. Lower it any time and it applies at once; a higher limit waits 24 hours."
      mobileSub="Lower it any time and it applies at once; a higher limit waits 24 hours."
    >
      {(s) => <DepositBody state={s} />}
    </RgPage>
  );
}

function PendingNotice({ limit, state }: { limit: RgLimitView; state: RgStateView }) {
  const cancel = useRgMutation(rgApi.cancelPending);
  void state;
  if (!limit.pendingIncrease) return null;
  const per = PERIOD_WORD[limit.period];
  return (
    <section
      aria-label="Pending increase"
      className="flex flex-col gap-4 rounded-lg border border-status-pending bg-status-pending-tint p-5 tablet:flex-row tablet:items-start"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-default text-status-pending">
        <Hourglass aria-hidden className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-body-m-strong">
          Your increase to {num(limit.pendingIncrease.amount)} USDT / {per} is in its 24-hour
          cool-down
        </p>
        <p className="text-body-s text-text-secondary">
          It starts on {dateTime(limit.pendingIncrease.effectiveAt)}. Until then your limit stays{' '}
          {num(limit.limit)} USDT / {per}. Changed your mind? Cancel and nothing changes.
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <DemoBadge size="s" />
          <Chip kind="pending" icon={Clock}>
            Starts in {countdownWords(limit.pendingIncrease.effectiveAt)}
          </Chip>
        </div>
      </div>
      <Button
        variant="secondary"
        size="s"
        className="min-h-11 self-start tablet:min-h-8"
        loading={cancel.isPending}
        leadingIcon={<Undo2 aria-hidden />}
        onClick={async () => {
          try {
            await cancel.mutateAsync({ type: limit.type, period: limit.period });
            toast({
              type: 'success',
              title: 'Increase cancelled',
              description: 'Your current limit stays.',
            });
          } catch {
            toast({ type: 'error', title: 'Could not cancel the increase' });
          }
        }}
      >
        Cancel increase
      </Button>
    </section>
  );
}

function DepositBody({ state }: { state: RgStateView }) {
  const limit =
    state.limits.find((l) => l.type === 'deposit' && l.period === 'week') ??
    state.limits.find((l) => l.type === 'deposit');
  const from = weekStartIso();
  const to = new Date(from.getTime() + 7 * 86_400_000 - 1000);
  const deposits = useHistoryTransactions({
    types: ['deposit'],
    from: from.toISOString(),
    pageSize: 20,
  });
  const counted = (deposits.data?.items ?? []).filter(
    (d) => !['failed', 'rejected', 'cancelled'].includes(d.status),
  );
  const total = toUSDTString(sum(counted.map((d) => d.amount)));
  return (
    <Columns
      main={
        <>
          {limit?.pendingIncrease && <PendingNotice limit={limit} state={state} />}
          <LimitSetter kind="deposit" limits={state.limits} defaultPeriod={limit?.period} />
          <Card padding="l" className="gap-0">
            <div className="flex items-start gap-3 pb-4">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h2 className="text-h5">Deposits counted this week</h2>
                <p className="text-body-s text-text-tertiary">
                  {formatWeekdayDateUTC(from).replace(/ \d{4}$/, '')} 00:00 UTC –{' '}
                  {formatWeekdayDateUTC(to).replace(/ \d{4}$/, '')} 23:59 UTC
                </p>
              </div>
              <DemoBadge size="s" />
            </div>
            {deposits.isPending ? (
              <Skeleton className="h-24 w-full" />
            ) : counted.length === 0 ? (
              <p className="border-t border-border-subtle py-4 text-body-s text-text-secondary">
                No deposits this week.
              </p>
            ) : (
              <ul>
                {counted.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 border-t border-border-subtle py-3"
                  >
                    {d.network && <ChainMark chain={d.network as 'arbitrum'} size={20} />}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="font-mono text-mono-s text-text-primary">
                        {d.id} · {d.description.replace('Deposit · ', '')}
                      </span>
                      <span className="text-caption text-text-tertiary">
                        {formatWeekdayDateUTC(d.createdAt)},{' '}
                        {formatDateTimeUTC(d.createdAt).split(', ')[1]}
                        {d.confirmations && d.status !== 'completed'
                          ? ` · ${d.confirmations.current} / ${d.confirmations.required} confirmations`
                          : ''}
                      </span>
                    </div>
                    <Chip
                      kind={d.status === 'completed' ? 'on' : 'info'}
                      icon={d.status === 'completed' ? CircleCheck : Clock}
                    >
                      {d.status === 'completed' ? 'Credited' : 'Confirming'}
                    </Chip>
                    <span className="text-number-s whitespace-nowrap tabular-nums">
                      {num(d.amount)} USDT
                    </span>
                    {d.isDemo && <DemoBadge size="xs" />}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-3 border-t border-border-default pt-4">
              <span className="flex-1 text-body-s-strong text-text-secondary">
                Counted toward your limit
              </span>
              <span className="text-number-s tabular-nums">
                {num(total)}
                {limit ? ` of ${num(limit.limit)}` : ''} USDT
              </span>
              <DemoBadge size="xs" />
            </div>
            {limit && (
              <p className="pt-1 text-caption text-text-tertiary">
                {num(limit.remaining)} USDT left this {PERIOD_WORD[limit.period]}. Pending deposits
                count from the moment the transfer is detected on-chain.
              </p>
            )}
          </Card>
          <LimitHistory />
        </>
      }
      rail={
        <>
          <Card padding="l" className="gap-5">
            <h2 className="text-h5">How deposit limits work</h2>
            <Bullet
              icon={TrendingDown}
              title="Lower it: applies immediately"
              body="The new, lower limit counts deposits already made this week."
            />
            <Bullet
              icon={Hourglass}
              tone="pending"
              title="Raise or remove it: waits 24 hours"
              body="You can cancel during the cool-down. We email you when it starts and when it ends."
            />
            <Bullet
              icon={Layers}
              title="Every network counts"
              body="Deposits on every supported network are added together (MVP: Arbitrum Sepolia test-USDT)."
            />
            <Bullet
              icon={Lock}
              tone="muted"
              title="Over-limit transfers are held, not played"
              body="Blockchain transfers cannot be stopped once sent. Any amount above your limit is held and can only be withdrawn."
            />
          </Card>
          <HelpResources />
        </>
      }
    />
  );
}

/** Limit history from the hash-chained audit log (real changes only). */
export function LimitHistory() {
  const history = useRgHistory('limits', 10);
  return (
    <Card padding="l" className="gap-0">
      <div className="flex items-center gap-3 pb-4">
        <h2 className="flex-1 text-h5">Limit history</h2>
      </div>
      {history.isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : !history.data?.length ? (
        <p className="border-t border-border-subtle py-4 text-body-s text-text-secondary">
          No changes yet. Every change you make is listed here with when it took effect.
        </p>
      ) : (
        <ul>
          {history.data.map((h) => (
            <li
              key={`${h.at}-${h.label}`}
              className="flex flex-col gap-2 border-t border-border-subtle py-3 tablet:flex-row tablet:items-center tablet:gap-4"
            >
              <span className="text-body-s text-text-secondary tablet:w-48">{dateTime(h.at)}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-body-s-strong">{h.label}</span>
                {h.detail && (
                  <span className="font-mono text-mono-s text-text-tertiary">{h.detail}</span>
                )}
              </span>
              <span className="self-start tablet:self-center">
                {h.action === 'pending' ? (
                  <Chip kind="pending" icon={Hourglass}>
                    Waits 24 h
                  </Chip>
                ) : h.action === 'cancelled' ? (
                  <Chip kind="off">Cancelled</Chip>
                ) : (
                  <Chip kind="on">Applied immediately</Chip>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ── RG3 · Participation limits ────────────────────────────────────────────────────────────────

export function RgParticipationLimits() {
  return (
    <RgPage
      href={`${RG_BASE}/participation-limits`}
      title="Participation limits"
      sub="Cap what you spend on Global Pool entries and game stakes, and how much you can lose, each day. When a limit is reached, new entries and bets pause until it resets."
      mobileSub="When a limit is reached, new entries and bets pause until it resets."
    >
      {(s) => <ParticipationBody state={s} />}
    </RgPage>
  );
}

function ParticipationBody({ state }: { state: RgStateView }) {
  const part = state.limits.find((l) => l.type === 'participation' && l.period === 'day');
  const loss = state.limits.find((l) => l.type === 'loss' && l.period === 'day');
  const otherLoss = state.limits.filter((l) => l.type === 'loss' && l.period !== 'day');
  const [editLoss, setEditLoss] = React.useState(false);
  const resetsIn = countdownWords(nextUtcMidnight());
  return (
    <Columns
      main={
        <>
          <LimitSetter kind="participation" limits={state.limits} defaultPeriod="day" />
          {editLoss || !loss ? (
            <LimitSetter kind="loss" limits={state.limits} defaultPeriod="day" />
          ) : (
            <Card padding="l" className="gap-5">
              <CardHead
                icon={TrendingDown}
                tone="default"
                title="Daily loss limit"
                sub="Net result = winnings minus stakes and entry costs, since 00:00 UTC"
                aside={
                  <Chip kind={loss.pendingIncrease ? 'pending' : 'on'}>
                    {loss.pendingIncrease ? 'Increase pending' : 'On'}
                  </Chip>
                }
              />
              <dl className="grid grid-cols-1 gap-4 tablet:grid-cols-3">
                <Stat label="Limit" value={`${num(loss.limit)} USDT / day`} />
                <Stat
                  label="Net result today"
                  value={`${signed(state.session.netToday)} USDT`}
                  className={toneOf(state.session.netToday)}
                />
                <Stat label="Left before pause" value={`${num(loss.remaining)} USDT`} />
              </dl>
              <Meter value={ratio(loss.used, loss.limit)} label="Daily loss limit used" />
              <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center">
                <p className="flex-1 text-body-s text-text-secondary">
                  {otherLoss.length
                    ? `Also set: ${otherLoss.map((l) => `${num(l.limit)} USDT / ${PERIOD_WORD[l.period]}`).join(', ')}.`
                    : 'Weekly and monthly loss limits are not set.'}
                </p>
                <Button
                  variant="ghost"
                  size="s"
                  className="min-h-11 tablet:min-h-8"
                  onClick={() => setEditLoss(true)}
                >
                  <Plus aria-hidden />
                  Add weekly limit
                </Button>
                <Button
                  variant="secondary"
                  size="s"
                  className="min-h-11 tablet:min-h-8"
                  onClick={() => setEditLoss(true)}
                >
                  Change daily limit
                </Button>
              </div>
            </Card>
          )}
          <Card padding="l" className="gap-5">
            <h2 className="text-h5">What counts toward participation</h2>
            <Bullet
              icon={Ticket}
              title="Global Pool entries"
              body="10.00 USDT per entry plus the 0.05 USDT platform fee per qualifying entry. Network fees never apply to entries — they are paid from your balance."
            />
            <Bullet
              icon={Gamepad2}
              title="Game stakes"
              body="Every stake in Originals, table, live, slot, draw and bingo games — including stakes placed with bonus funds."
            />
            <Bullet
              icon={PauseCircle}
              tone="muted"
              title="When you reach a limit"
              body="New entries and bets are blocked until 00:00 UTC. Entries you already hold stay in their round, and withdrawals are never blocked."
            />
          </Card>
        </>
      }
      rail={
        <>
          <Card padding="l" className="gap-0">
            <div className="flex items-center gap-3 pb-2">
              <h2 className="flex-1 text-h5">Today at a glance</h2>
              <DemoBadge size="s" />
            </div>
            <KV
              label="Participation used"
              value={part ? `${num(part.used)} of ${num(part.limit)} USDT` : 'No limit set'}
              demo={false}
            />
            <KV
              label="Participation left"
              value={part ? `${num(part.remaining)} USDT` : '—'}
              demo={false}
            />
            <KV
              label="Net result"
              value={
                loss
                  ? `${signed(state.session.netToday)} of −${num(loss.limit)} USDT`
                  : `${signed(state.session.netToday)} USDT`
              }
              demo={false}
            />
            <KV
              label="Limits reset"
              value={`00:00 UTC · in ${resetsIn}`}
              demo={false}
              divider={false}
            />
          </Card>
          <HelpResources />
        </>
      }
    />
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-caption text-text-tertiary">{label}</dt>
      <dd className="flex items-center gap-2">
        <span className={`text-number-m tabular-nums ${className ?? 'text-text-primary'}`}>
          {value}
        </span>
        <DemoBadge size="xs" />
      </dd>
    </div>
  );
}

function nextUtcMidnight() {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1)).toISOString();
}

// ── RG4 · Time limits ─────────────────────────────────────────────────────────────────────────

export function RgTimeLimits() {
  return (
    <RgPage
      href={`${RG_BASE}/time-limits`}
      title="Time limits"
      sub="Decide how long you play. When time is up we let the current round finish, then pause new bets — no mid-round cut-offs and nothing placed for you."
      mobileSub="When time is up the current round finishes, then new bets pause."
    >
      {(s) => <TimeBody state={s} />}
    </RgPage>
  );
}

const SESSION_OPTIONS = [30, 45, 60, 90, 120, 180, 240];

function TimeBody({ state }: { state: RgStateView }) {
  const sessionLimit = useRgMutation(rgApi.sessionLimit);
  const quiet = useRgMutation(rgApi.quietHours);
  const cancelSetting = useRgMutation(rgApi.cancelSetting);
  const s = state.settings;
  const session = state.session;
  const sessionMinutes = Math.floor(session.durationSeconds / 60);
  const [pick, setPick] = React.useState<number>(s.sessionLimit.minutes ?? 90);
  const daily = state.limits.find((l) => l.type === 'session_time');
  const run = async (p: Promise<unknown>, ok: string, desc?: string) => {
    try {
      await p;
      toast({ type: 'success', title: ok, description: desc });
    } catch (e) {
      toast({
        type: 'error',
        title: 'Could not save',
        description: e instanceof Error ? e.message : undefined,
      });
    }
  };
  return (
    <Columns
      main={
        <>
          <LimitSetter kind="session_time" limits={state.limits} defaultPeriod="day" />
          <Card padding="l" className="gap-5">
            <CardHead
              icon={Hourglass}
              title="Session length limit"
              sub="A session ends after 15 minutes without play."
              aside={
                s.sessionLimit.pending ? (
                  <Chip kind="pending">Change pending</Chip>
                ) : s.sessionLimit.minutes ? (
                  <Chip kind="on">On</Chip>
                ) : (
                  <Chip kind="off">Off</Chip>
                )
              }
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-number-m tabular-nums">
                {minutesLabel(s.sessionLimit.minutes)}
              </span>
              {s.sessionLimit.minutes && (
                <span className="text-body-s text-text-secondary">per session</span>
              )}
              <DemoBadge size="s" />
            </div>
            {s.sessionLimit.minutes && (
              <Meter
                value={ratio(String(sessionMinutes), String(s.sessionLimit.minutes))}
                label="Session length used"
              />
            )}
            <p className="text-body-s text-text-secondary">
              {session.startedAt
                ? `Current session ${minutesLabel(sessionMinutes)} · started ${dateTime(session.startedAt).split(', ')[1]}${
                    s.sessionLimit.minutes
                      ? ` · ${minutesLabel(Math.max(0, s.sessionLimit.minutes - sessionMinutes))} left`
                      : ''
                  }`
                : 'No session in progress.'}
            </p>
            {s.sessionLimit.pending && (
              <NoteBox icon={Hourglass} tone="pending">
                {s.sessionLimit.pending.minutes
                  ? `Increase to ${minutesLabel(s.sessionLimit.pending.minutes)}`
                  : 'Removal'}{' '}
                takes effect {dateTime(s.sessionLimit.pending.effectiveAt)}.{' '}
                <button
                  type="button"
                  className="text-text-brand underline underline-offset-2"
                  onClick={() =>
                    void run(cancelSetting.mutateAsync('session_limit'), 'Change cancelled')
                  }
                >
                  Cancel change
                </button>
              </NoteBox>
            )}
            <div className="flex flex-col gap-3 tablet:flex-row tablet:items-end">
              <label className="flex flex-1 flex-col gap-2 text-label-m text-text-secondary">
                Limit per session
                <select
                  value={pick}
                  onChange={(e) => setPick(Number(e.target.value))}
                  className="h-11 rounded-md border border-border-default bg-surface-raised px-3 text-body-m text-text-primary"
                >
                  {SESSION_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {minutesLabel(m)}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                size="m"
                className="min-h-11"
                loading={sessionLimit.isPending}
                onClick={() =>
                  void run(
                    sessionLimit.mutateAsync(pick),
                    s.sessionLimit.minutes && pick > s.sessionLimit.minutes
                      ? 'Increase requested'
                      : 'Session limit saved',
                    s.sessionLimit.minutes && pick > s.sessionLimit.minutes
                      ? 'It starts after the 24-hour cool-down.'
                      : 'Applied immediately.',
                  )
                }
              >
                {s.sessionLimit.minutes ? 'Change' : 'Set session limit'}
              </Button>
              {s.sessionLimit.minutes && !s.sessionLimit.pending && (
                <Button
                  variant="ghost"
                  size="m"
                  className="min-h-11"
                  onClick={() =>
                    void run(
                      sessionLimit.mutateAsync(null),
                      'Removal requested',
                      'It waits 24 hours.',
                    )
                  }
                >
                  Remove
                </Button>
              )}
            </div>
          </Card>
          <Card padding="l" className="gap-5">
            <CardHead
              icon={Clock}
              tone="default"
              title="Quiet hours"
              sub="Block games and Global Pool entries at set times every day — useful for late nights."
              aside={s.quietHours.enabled ? <Chip kind="on">On</Chip> : <Chip kind="off">Off</Chip>}
            />
            <QuietHoursControl
              enabled={s.quietHours.enabled}
              start={s.quietHours.start}
              end={s.quietHours.end}
              pendingOffAt={s.quietHours.pendingOffAt}
              busy={quiet.isPending || cancelSetting.isPending}
              onToggle={(on, start, end) =>
                void run(
                  quiet.mutateAsync({ enabled: on, start, end }),
                  on ? 'Quiet hours on' : 'Switch-off requested',
                  on ? 'Applied immediately.' : 'Quiet hours stay on for 24 hours.',
                )
              }
              onCancel={() =>
                void run(cancelSetting.mutateAsync('quiet_hours'), 'Quiet hours stay on')
              }
            />
          </Card>
          <Card padding="l" className="gap-5">
            <h2 className="text-h5">When time is up</h2>
            <Bullet
              icon={Bell}
              title="10 minutes before"
              body="A banner shows the time left. Nothing interrupts your game."
            />
            <Bullet
              icon={PauseCircle}
              title="At the limit"
              body="Your current round finishes, then new bets and entries pause until the limit resets at 00:00 UTC."
            />
            <Bullet
              icon={Wallet}
              tone="muted"
              title="Always available"
              body="You can still view your account, check results and withdraw."
            />
          </Card>
        </>
      }
      rail={
        <>
          <Card padding="l" className="gap-0">
            <div className="flex items-center gap-3 pb-2">
              <h2 className="flex-1 text-h5">Your time today</h2>
              <DemoBadge size="s" />
            </div>
            <KV
              label="Played today"
              value={`${minutesLabel(Math.floor(session.playedTodaySeconds / 60))}${daily ? ` of ${minutesLabel(daily.minutes)}` : ''}`}
              demo={false}
            />
            <KV
              label="Current session"
              value={session.startedAt ? minutesLabel(sessionMinutes) : '—'}
              demo={false}
            />
            <KV label="Sessions today" value={String(session.sessionsToday)} demo={false} />
            <KV label="Daily time resets" value="00:00 UTC" demo={false} divider={false} />
          </Card>
          <HelpResources />
        </>
      }
    />
  );
}

function QuietHoursControl({
  enabled,
  start,
  end,
  pendingOffAt,
  busy,
  onToggle,
  onCancel,
}: {
  enabled: boolean;
  start: string;
  end: string;
  pendingOffAt: string | null;
  busy: boolean;
  onToggle: (on: boolean, start: string, end: string) => void;
  onCancel: () => void;
}) {
  const [from, setFrom] = React.useState(start);
  const [until, setUntil] = React.useState(end);
  const id = React.useId();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={busy || (enabled && pendingOffAt !== null)}
          onClick={() => onToggle(!enabled, from, until)}
          className="relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-border-default bg-surface-raised transition-colors aria-checked:border-brand aria-checked:bg-brand disabled:opacity-60"
        >
          <span
            aria-hidden
            className="block size-[18px] translate-x-0.5 rounded-full bg-ink-100 transition-transform aria-checked:translate-x-5"
            style={{ transform: enabled ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </button>
        <label htmlFor={id} className="flex flex-col gap-0.5">
          <span className="text-body-s text-text-primary">
            Block play between {from} and {until}
          </span>
          <span className="text-caption text-text-tertiary">
            Times in UTC. Turning this on applies at once; turning it off waits 24 hours.
          </span>
        </label>
      </div>
      {!enabled && (
        <div className="grid grid-cols-2 gap-3 tablet:max-w-sm">
          <label className="flex flex-col gap-1 text-label-m text-text-secondary">
            From (UTC)
            <input
              type="time"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-11 rounded-md border border-border-default bg-surface-raised px-3 text-body-m text-text-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-label-m text-text-secondary">
            Until (UTC)
            <input
              type="time"
              value={until}
              onChange={(e) => setUntil(e.target.value)}
              className="h-11 rounded-md border border-border-default bg-surface-raised px-3 text-body-m text-text-primary"
            />
          </label>
        </div>
      )}
      {pendingOffAt && (
        <NoteBox icon={Hourglass} tone="pending">
          Quiet hours switch off {dateTime(pendingOffAt)}.{' '}
          <button
            type="button"
            className="text-text-brand underline underline-offset-2"
            onClick={onCancel}
          >
            Keep them on
          </button>
        </NoteBox>
      )}
    </div>
  );
}
