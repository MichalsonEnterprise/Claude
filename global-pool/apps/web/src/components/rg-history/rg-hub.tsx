'use client';

import { formatDuration, formatTimeUTC, formatWeekdayDateUTC } from '@gp/shared/format';
import type { RgLimitView, RgStateView } from '@gp/shared/schemas';
import {
  ArrowDownToLine,
  ArrowRight,
  Ban,
  Bell,
  ChevronRight,
  CircleHelp,
  Hourglass,
  PauseCircle,
  Ticket,
  Timer,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DemoBadge } from '@/components/ui/demo-badge';

import { dateTime, minutesLabel, num, PERIOD_WORD, ratio, signed, toneOf } from './format';
import { HelpResources } from './help-resources';
import { LimitRulesCard, RG_BASE, RgPage } from './rg-common';
import { SelfCheckDialog } from './self-check';
import { SessionBar, useElapsed } from './session-bar';
import { Chip, IconTile, Meter, NoteBox, SectionHead } from './ui';

const SHORT_DAY = (iso: string) => {
  const s = formatWeekdayDateUTC(iso).split(' ');
  return `${s[0]} ${s[1]} ${s[2]}`;
};

/** USR-RG1 · Responsible gaming hub. */
export function RgHub() {
  return (
    <RgPage
      href={RG_BASE}
      mobileSub="Lowering a limit applies at once. Raising one waits 24 hours."
    >
      {(s) => <HubBody state={s} />}
    </RgPage>
  );
}

function pick(state: RgStateView, type: RgLimitView['type'], prefer?: RgLimitView['period']) {
  const rows = state.limits.filter((l) => l.type === type);
  return rows.find((l) => l.period === prefer) ?? rows[0];
}

function HubBody({ state }: { state: RgStateView }) {
  const [checkOpen, setCheckOpen] = React.useState(false);
  const deposit = pick(state, 'deposit', 'week');
  const participation = pick(state, 'participation', 'day');
  const loss = pick(state, 'loss', 'day');
  const time = pick(state, 'session_time', 'day');
  const elapsed = useElapsed(state.session.startedAt);
  const rc = state.session.realityCheck;

  const moneyCard = (
    l: RgLimitView | undefined,
    o: {
      icon: LucideIcon;
      title: string;
      href: string;
      cta: string;
      meta: (l: RgLimitView) => string;
    },
  ): ToolCardProps =>
    l
      ? {
          icon: o.icon,
          title: o.title,
          chip: l.pendingIncrease || l.pendingRemoval ? 'pending' : 'on',
          value: num(l.limit),
          unit: `USDT / ${PERIOD_WORD[l.period]}`,
          meter: ratio(l.used, l.limit),
          meta: o.meta(l),
          note: l.pendingIncrease
            ? `Increase to ${num(l.pendingIncrease.amount)} starts ${dateTime(l.pendingIncrease.effectiveAt)}. You can cancel it until then.`
            : l.pendingRemoval
              ? `Removal takes effect ${dateTime(l.pendingRemoval.effectiveAt)}. You can cancel it until then.`
              : undefined,
          href: o.href,
          cta: o.cta,
        }
      : {
          icon: o.icon,
          title: o.title,
          chip: 'off',
          value: 'Not set',
          meta: 'No limit set. Adding or lowering a limit applies immediately.',
          href: o.href,
          cta: o.cta.replace('Manage', 'Set'),
        };

  const cards1: ToolCardProps[] = [
    moneyCard(deposit, {
      icon: ArrowDownToLine,
      title: 'Deposit limit',
      href: `${RG_BASE}/deposit-limits`,
      cta: 'Manage deposit limit',
      meta: (l) =>
        `Deposited ${num(l.used)} this ${PERIOD_WORD[l.period]} · resets ${l.resetsAt ? `${SHORT_DAY(l.resetsAt)}, 00:00 UTC` : '00:00 UTC'}`,
    }),
    moneyCard(participation, {
      icon: Ticket,
      title: 'Participation limit',
      href: `${RG_BASE}/participation-limits`,
      cta: 'Manage participation limit',
      meta: (l) =>
        `Used ${num(l.used)} ${l.period === 'day' ? 'today' : `this ${PERIOD_WORD[l.period]}`} · ${num(l.remaining)} left · counts Global Pool entries (incl. platform fees) and game stakes`,
    }),
    moneyCard(loss, {
      icon: TrendingDown,
      title: 'Loss limit',
      href: `${RG_BASE}/participation-limits`,
      cta: 'Manage loss limit',
      meta: (l) =>
        `Net result today ${signed(state.session.netToday)} · ${num(l.remaining)} left before new bets pause until 00:00 UTC`,
    }),
  ];

  const timeCard: ToolCardProps = time
    ? {
        icon: Timer,
        title: 'Time limit',
        chip: time.pendingIncrease || time.pendingRemoval ? 'pending' : 'on',
        value: minutesLabel(time.minutes),
        unit: 'per day',
        meter: ratio(String(time.usedMinutes ?? 0), String(time.minutes ?? 0)),
        meta: `Played ${minutesLabel(time.usedMinutes ?? 0)} today · current session ${state.session.startedAt ? formatDuration(elapsed) : 'not started'}`,
        href: `${RG_BASE}/time-limits`,
        cta: 'Manage time limits',
      }
    : {
        icon: Timer,
        title: 'Time limit',
        chip: 'off',
        value: 'Not set',
        meta: `Played ${minutesLabel(Math.floor(state.session.playedTodaySeconds / 60))} today. Set a daily time limit or a session length.`,
        href: `${RG_BASE}/time-limits`,
        cta: 'Set time limits',
      };
  const realityCard: ToolCardProps = {
    icon: Bell,
    title: 'Reality checks',
    chip: 'on',
    value: `Every ${state.settings.realityCheckMinutes} min`,
    meta:
      rc.nextAt && state.session.startedAt
        ? `Next reminder at ${formatTimeUTC(rc.nextAt)} (session started ${formatTimeUTC(state.session.startedAt)}). Shows time played and your net result.`
        : 'Counted from the start of each session. Shows time played and your net result.',
    href: `${RG_BASE}/reality-checks`,
    cta: 'Change reminders',
  };

  const excluded = state.exclusion.active;

  return (
    <div className="flex flex-col gap-8">
      <SessionBar session={state.session} lossLimit={loss} className="hidden tablet:flex" />
      <MobileToday state={state} elapsed={elapsed} loss={loss} />

      <section aria-labelledby="rg-limits" className="flex flex-col gap-4">
        <SectionHead
          title={<span id="rg-limits">Your limits</span>}
          sub={
            <>
              <span className="hidden tablet:inline">
                One set of limits across the Global Pool, Originals, table, live and slot games.
                Daily limits reset at 00:00 UTC; weekly limits on Monday 00:00 UTC.
              </span>
              <span className="tablet:hidden">Daily limits reset at 00:00 UTC.</span>
            </>
          }
        />
        <div className="hidden grid-cols-1 gap-6 tablet:grid tablet:grid-cols-2 laptop:grid-cols-3">
          {[...cards1, timeCard, realityCard].map((c) => (
            <ToolCard key={c.title} {...c} />
          ))}
          <Card variant="raised" padding="m" className="gap-4">
            <div className="flex items-center gap-3">
              <IconTile icon={CircleHelp} tone="brand" className="bg-surface-default" />
              <h3 className="text-label-l">2-minute self-check</h3>
            </div>
            <p className="text-body-s text-text-secondary">
              Nine private questions based on recognised screening tools. Answers are not stored
              with your account and never used for marketing.
            </p>
            <p className="text-body-s text-text-tertiary">
              If gambling has stopped being fun, it is a good moment to set a limit or take a break.
            </p>
            <div className="flex-1" />
            <Button
              variant="secondary"
              size="s"
              className="self-start"
              onClick={() => setCheckOpen(true)}
            >
              Start self-check
              <ArrowRight aria-hidden />
            </Button>
          </Card>
        </div>
        <MobileLimitList rows={[...cards1, timeCard, realityCard]} />
        {deposit?.pendingIncrease && (
          <NoteBox icon={Hourglass} tone="pending" className="tablet:hidden">
            Deposit limit increase to {num(deposit.pendingIncrease.amount)} starts{' '}
            {dateTime(deposit.pendingIncrease.effectiveAt)}. Cancel any time before then.
          </NoteBox>
        )}
      </section>

      <section aria-labelledby="rg-pause" className="flex flex-col gap-4">
        <SectionHead
          title={<span id="rg-pause">Need a pause?</span>}
          sub={
            <>
              <span className="hidden tablet:inline">
                Both options keep withdrawals open. Neither can be shortened once it starts — that
                is what makes them work.
              </span>
              <span className="tablet:hidden">Withdrawals stay open during both.</span>
            </>
          }
        />
        <div className="grid grid-cols-1 gap-6 laptop:grid-cols-2">
          <PauseCard
            icon={PauseCircle}
            title="Take a short break"
            body="Pause games, Global Pool entries and deposits. You can still log in, check your history and withdraw."
            tags={['24 hours', '7 days', '30 days']}
            status={
              excluded && state.exclusion.kind === 'cooling_off'
                ? `Active until ${dateTime(state.exclusion.endsAt ?? '')}`
                : 'Not active'
            }
            href={`${RG_BASE}/cooling-off`}
            cta="Choose a break"
          />
          <PauseCard
            icon={Ban}
            title="Self-exclusion"
            body="Close access to every game and the Global Pool for a long period. Your balance stays withdrawable and all marketing stops."
            tags={['6 months', '1 year', '5 years', 'Permanent']}
            status={
              excluded && state.exclusion.kind === 'self_exclusion'
                ? state.exclusion.endsAt
                  ? `Active until ${dateTime(state.exclusion.endsAt)}`
                  : 'Active — permanent'
                : 'Not active'
            }
            href={`${RG_BASE}/self-exclusion`}
            cta="Learn about self-exclusion"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 laptop:grid-cols-[360px_minmax(0,1fr)] desktop:grid-cols-[440px_minmax(0,1fr)]">
        <HelpResources />
        <div className="hidden tablet:block">
          <LimitRulesCard />
        </div>
      </div>
      <SelfCheckDialog open={checkOpen} onOpenChange={setCheckOpen} />
    </div>
  );
}

interface ToolCardProps {
  icon: LucideIcon;
  title: string;
  chip: 'on' | 'off' | 'pending';
  value: string;
  unit?: string;
  meter?: number;
  meta: string;
  note?: string;
  href: string;
  cta: string;
}

function ToolCard({ icon, title, chip, value, unit, meter, meta, note, href, cta }: ToolCardProps) {
  return (
    <Card padding="m" className="gap-4">
      <div className="flex items-center gap-3">
        <IconTile icon={icon} tone="brand" />
        <h3 className="flex-1 text-label-l">{title}</h3>
        <Chip kind={chip}>
          {chip === 'pending' ? 'Increase pending' : chip === 'on' ? 'On' : 'Off'}
        </Chip>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-number-m text-text-primary tabular-nums">{value}</span>
        {unit && <span className="text-body-s text-text-secondary">{unit}</span>}
        {chip !== 'off' && <DemoBadge size="s" />}
      </div>
      {meter !== undefined && <Meter value={meter} label={`${title} used`} />}
      <p className="text-body-s text-text-secondary">{meta}</p>
      {note && (
        <NoteBox icon={Hourglass} tone="pending">
          {note}
        </NoteBox>
      )}
      <div className="flex-1" />
      <Button variant="ghost" size="s" asChild className="-ml-2 self-start">
        <Link href={href}>
          {cta}
          <ChevronRight aria-hidden />
        </Link>
      </Button>
    </Card>
  );
}

function PauseCard({
  icon,
  title,
  body,
  tags,
  status,
  href,
  cta,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  tags: string[];
  status: string;
  href: string;
  cta: string;
}) {
  return (
    <Card padding="l" className="gap-4">
      <div className="flex items-start gap-4">
        <IconTile icon={icon} tone="default" size={48} />
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-h5">{title}</h3>
          <p className="text-body-s text-text-secondary">{body}</p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label={`${title} options`}>
        {tags.map((t) => (
          <li
            key={t}
            className="rounded-sm border border-border-subtle px-2 py-1 text-caption text-text-secondary"
          >
            {t}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
        <span className="text-body-s text-text-tertiary">{status}</span>
        <Button variant="secondary" size="m" asChild className="min-h-12 tablet:min-h-10">
          <Link href={href}>{cta}</Link>
        </Button>
      </div>
    </Card>
  );
}

function MobileToday({
  state,
  elapsed,
  loss,
}: {
  state: RgStateView;
  elapsed: number;
  loss: RgLimitView | undefined;
}) {
  return (
    <Card padding="s" className="tablet:hidden">
      <div className="flex items-center gap-2">
        <Timer aria-hidden className="size-4 text-icon-brand" />
        <span className="flex-1 text-label-m">
          This session {state.session.startedAt ? formatDuration(elapsed) : '—'}
        </span>
        <DemoBadge size="xs" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-body-s text-text-secondary">Net today</span>
        <span className={`text-number-s ${toneOf(state.session.netToday)}`}>
          {signed(state.session.netToday)} USDT
        </span>
      </div>
      {loss && (
        <>
          <Meter value={ratio(loss.used, loss.limit)} label="Daily loss limit used" />
          <span className="text-caption text-text-tertiary">
            Daily loss limit {num(loss.used)} of {num(loss.limit)} USDT used
          </span>
        </>
      )}
    </Card>
  );
}

function MobileLimitList({ rows }: { rows: ToolCardProps[] }) {
  return (
    <ul className="flex flex-col rounded-lg border border-border-subtle bg-surface-default px-4 tablet:hidden">
      {rows.map((r, i) => (
        <li
          key={r.title}
          className={i < rows.length - 1 ? 'border-b border-border-subtle' : undefined}
        >
          <Link href={r.href} className="flex min-h-16 items-center gap-3 py-3">
            <IconTile icon={r.icon} size={36} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span className="text-body-s-strong">{r.title}</span>
                {r.chip === 'pending' && <Chip kind="pending">Pending</Chip>}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="truncate text-caption text-text-secondary">
                  {r.value}
                  {r.unit ? ` ${r.unit.replace('USDT ', '')}` : ''}
                </span>
                {r.chip !== 'off' && <DemoBadge size="xs" />}
              </span>
            </span>
            <ChevronRight aria-hidden className="size-5 text-icon-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
