'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  SELF_EXCLUSION_DURATION_LABEL,
  type CoolingOffDuration,
  type LongSelfExclusionDuration,
} from '@gp/shared/enums';
import { formatDateUTC } from '@gp/shared/format';
import { SELF_EXCLUSION_CONFIRM_PHRASE } from '@gp/shared/limits';
import {
  SELF_EXCLUSION_CODE_PATTERN,
  selfExclusionConfirmFormSchema,
  type RgStateView,
} from '@gp/shared/schemas';
import {
  ArrowLeft,
  ArrowUpFromLine,
  Ban,
  CalendarDays,
  CircleCheck,
  Lock,
  Mail,
  Megaphone,
  PauseCircle,
  ShieldCheck,
  SlidersHorizontal,
  Ticket,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckboxField } from '@/components/ui/checkbox';
import { DemoBadge } from '@/components/ui/demo-badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/input';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { ApiRequestError } from '@/lib/api/client';
import {
  rgApi,
  useActiveRounds,
  useRgMutation,
  useWalletBalances,
  type WalletBalancesView,
} from '@/lib/api/rg-history';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

import { dateTime, num } from './format';
import { HelpResources } from './help-resources';
import { RG_BASE, RgPage } from './rg-common';
import { Bullet, IconTile, KV, NoteBox } from './ui';

const COOLING: { d: CoolingOffDuration; ms: number }[] = [
  { d: '24h', ms: 86_400_000 },
  { d: '7d', ms: 7 * 86_400_000 },
  { d: '30d', ms: 30 * 86_400_000 },
];

function addMonths(now: Date, months: number) {
  const d = new Date(now);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}
const LONG: { d: LongSelfExclusionDuration; end: (n: Date) => Date | null; hint?: string }[] = [
  { d: '6m', end: (n) => addMonths(n, 6) },
  { d: '1y', end: (n) => addMonths(n, 12) },
  { d: '5y', end: (n) => addMonths(n, 60) },
  { d: 'permanent', end: () => null, hint: 'At least 5 years; reopening needs a support review' },
];

const label = (d: string) => SELF_EXCLUSION_DURATION_LABEL[d as CoolingOffDuration] ?? d;
const breakTitle = (d: CoolingOffDuration) =>
  d === '24h' ? '24-hour' : d === '7d' ? '7-day' : '30-day';

function errorText(e: unknown) {
  return e instanceof ApiRequestError ? e.message : 'Something went wrong — nothing was changed.';
}

/** Radio rows used by the break / self-exclusion choosers (none pre-selected). */
function OptionRows<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: { value: T; title: string; hint: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex flex-col gap-2">
      {options.map((o) => {
        const id = `${name}-${o.value}`;
        const checked = value === o.value;
        return (
          <label
            key={o.value}
            htmlFor={id}
            className={cn(
              'grid min-h-14 cursor-pointer grid-cols-[20px_minmax(0,1fr)] items-center gap-x-3 rounded-md border px-3 py-2 transition-colors',
              checked
                ? 'border-brand bg-brand-tint'
                : 'border-border-subtle bg-surface-raised/40 hover:bg-surface-hover',
            )}
          >
            <input
              id={id}
              type="radio"
              name={name}
              value={o.value}
              checked={checked}
              onChange={() => onChange(o.value)}
              className="row-span-2 size-5 shrink-0 accent-[var(--color-brand)]"
            />
            <span className="text-body-m text-text-primary">{o.title}</span>
            <span className="text-caption text-text-tertiary">{o.hint}</span>
          </label>
        );
      })}
    </div>
  );
}

function ExclusionBanner({
  state,
  kind,
}: {
  state: RgStateView;
  kind: 'cooling_off' | 'self_exclusion';
}) {
  const e = state.exclusion;
  if (!e.active || e.kind !== kind) return null;
  const until = e.endsAt ? dateTime(e.endsAt) : null;
  return (
    <Alert
      type="info"
      layout="full"
      title={
        kind === 'cooling_off'
          ? `Your ${breakTitle((e.duration ?? '24h') as CoolingOffDuration)} break is on until ${until}`
          : e.reopen
            ? `Self-exclusion ended ${until} — your account stays closed until you reopen it`
            : until
              ? `Self-exclusion is active until ${until}`
              : 'Permanent self-exclusion is active'
      }
      actions={
        <>
          <DemoBadge size="s" />
          <Button size="s" variant={kind === 'cooling_off' ? 'secondary' : 'primary'} asChild>
            <Link href="/wallet/withdraw">
              <ArrowUpFromLine aria-hidden />
              Withdraw funds
            </Link>
          </Button>
        </>
      }
    >
      {kind === 'cooling_off'
        ? 'Games, Global Pool entries, deposits and promotions are paused. Withdrawals, history and support stay open. The break cannot be ended early.'
        : e.reopen
          ? 'Games, the Global Pool, deposits and all marketing stay closed — nothing reopens automatically. You can still withdraw, view your history and contact support.'
          : 'Games, the Global Pool, deposits and all marketing are closed for this account. You can still log in to withdraw, view your history and contact support. This cannot be reversed before the end date.'}
    </Alert>
  );
}

function OpenEntriesCard() {
  const rounds = useActiveRounds();
  const open = rounds.data ?? [];
  return (
    <Card padding="l" className="gap-3">
      <div className="flex items-center gap-3">
        <IconTile icon={Ticket} tone="gold" />
        <h2 className="flex-1 text-h5">Entries you already hold</h2>
        <DemoBadge size="s" />
      </div>
      {rounds.isPending ? (
        <Skeleton className="h-10 w-full" />
      ) : open.length === 0 ? (
        <p className="text-body-s text-text-secondary">You hold no entries in an open round.</p>
      ) : (
        open.map((r) => (
          <p key={r.round.id} className="text-body-s text-text-secondary">
            Your {r.entries} entries in Global Pool round #{r.round.number.toLocaleString('en-US')}{' '}
            ({num(r.stake)} USDT) stay in the draw, which closes {dateTime(r.round.closesAt)}. Any
            prize is credited to your balance and can be withdrawn during the break.
          </p>
        ))
      )}
    </Card>
  );
}

function WithdrawCard({
  balances,
  title = 'Available to withdraw',
}: {
  balances?: WalletBalancesView;
  title?: string;
}) {
  return (
    <Card padding="l" className="gap-4 tablet:flex-row tablet:items-center">
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-body-s text-text-secondary">{title}</span>
        <span className="flex items-center gap-2">
          <span className="text-number-l text-balance-available tabular-nums">
            {balances ? `${num(balances.available)} USDT` : '—'}
          </span>
          <DemoBadge size="s" />
        </span>
      </div>
      <Button size="l" asChild>
        <Link href="/wallet/withdraw">
          <ArrowUpFromLine aria-hidden />
          Withdraw funds
        </Link>
      </Button>
      <Button size="l" variant="ghost" asChild>
        <Link href="/history/transactions">View history</Link>
      </Button>
    </Card>
  );
}

// ── RG6 · Cooling-off ─────────────────────────────────────────────────────────────────────────

export function RgCoolingOff() {
  return (
    <RgPage
      href={`${RG_BASE}/cooling-off`}
      title="Cooling-off period"
      sub="Step away for 24 hours, 7 days or 30 days. Your account stays open so you can withdraw and check your history, but you cannot play until the break ends."
      mobileSub="Step away for 24 hours, 7 days or 30 days. Withdrawals stay open."
      banner={(s) => <ExclusionBanner state={s} kind="cooling_off" />}
    >
      {(s) => <CoolingBody state={s} />}
    </RgPage>
  );
}

function CoolingBody({ state }: { state: RgStateView }) {
  const [choice, setChoice] = React.useState<CoolingOffDuration | null>(null);
  const [confirming, setConfirming] = React.useState(false);
  const start = useRgMutation(rgApi.coolingOff);
  const balances = useWalletBalances();
  const desktop = useMediaQuery(MQ.tablet, true);
  const active = state.exclusion.active;
  const isBreak = active && state.exclusion.kind === 'cooling_off';
  const now = new Date();
  const ends = choice ? new Date(now.getTime() + COOLING.find((c) => c.d === choice)!.ms) : null;

  const confirm = async () => {
    if (!choice) return;
    try {
      await start.mutateAsync({ duration: choice, confirm: true });
      setConfirming(false);
      toast({
        type: 'success',
        title: 'Your break has started',
        description: 'Withdrawals stay open.',
      });
    } catch (e) {
      toast({ type: 'error', title: 'The break did not start', description: errorText(e) });
    }
  };

  const summary = (
    <div className="rounded-lg bg-surface-raised px-4">
      <KV label="Starts" value={`Now · ${dateTime(now.toISOString())}`} demo={false} />
      <KV label="Ends" value={ends ? dateTime(ends.toISOString()) : '—'} demo={false} />
      <KV label="Paused" value="Games, Global Pool, deposits, promotions" demo={false} />
      <KV label="Still open" value="Withdrawals, history, support" demo={false} divider={false} />
    </div>
  );
  const confirmTitle = choice ? `Start a ${breakTitle(choice)} break?` : '';
  const confirmButtons = (
    <>
      <Button
        variant="secondary"
        size="l"
        onClick={() => setConfirming(false)}
        disabled={start.isPending}
      >
        Go back
      </Button>
      <Button size="l" onClick={() => void confirm()} loading={start.isPending}>
        Start {choice ? breakTitle(choice) : ''} break
      </Button>
    </>
  );

  return (
    <div className="grid grid-cols-1 items-start gap-6 laptop:grid-cols-[400px_minmax(0,1fr)] desktop:grid-cols-[440px_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <Card padding="l" className="gap-5">
          <div className="flex items-center gap-3">
            <IconTile icon={PauseCircle} />
            <h2 className="flex-1 text-h5">{isBreak ? 'Your break is on' : 'Take a break'}</h2>
            <DemoBadge size="s" />
          </div>
          {active ? (
            <>
              <p className="text-body-s text-text-secondary">
                {isBreak
                  ? `Ends ${state.exclusion.endsAt ? dateTime(state.exclusion.endsAt) : ''}. It cannot be shortened or cancelled. Withdrawals stay open throughout.`
                  : 'Self-exclusion is active on this account, so a break is not needed. Withdrawals stay open.'}
              </p>
              <NoteBox icon={CircleCheck} tone="success">
                Withdrawals, history and support remain available.
              </NoteBox>
            </>
          ) : (
            <>
              <p className="text-body-s text-text-secondary">How long do you want to step away?</p>
              <OptionRows
                name="break-length"
                value={choice}
                onChange={setChoice}
                options={COOLING.map((c) => ({
                  value: c.d,
                  title: label(c.d),
                  hint: `Ends ${dateTime(new Date(now.getTime() + c.ms).toISOString())}`,
                }))}
              />
              <Button
                size="l"
                disabled={!choice}
                onClick={() => setConfirming(true)}
                className="self-start"
              >
                Start break
              </Button>
              <p className="text-caption text-text-tertiary">
                Once started, a break cannot be shortened. Withdrawals stay open.
              </p>
            </>
          )}
        </Card>
        <Card variant="raised" padding="m" className="gap-3">
          <div className="flex items-center gap-3">
            <IconTile icon={Ban} tone="default" size={32} className="bg-surface-default" />
            <p className="flex-1 text-body-m-strong">Need longer than 30 days?</p>
          </div>
          <p className="text-body-s text-text-secondary">
            Self-exclusion closes access for 6 months, 1 year, 5 years or permanently.
          </p>
          <Button variant="ghost" size="s" asChild className="-ml-2 self-start">
            <Link href={`${RG_BASE}/self-exclusion`}>About self-exclusion</Link>
          </Button>
        </Card>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        {active && <WithdrawCard balances={balances.data} />}
        <Card padding="l" className="gap-5">
          <h2 className="text-h5">{isBreak ? 'While your break is on' : 'During your break'}</h2>
          <div className="grid grid-cols-1 gap-6 tablet:grid-cols-2">
            <BreakList
              title="Paused"
              tone="warning"
              items={[
                ['Games and the Global Pool', 'No new bets or entries in any game.'],
                ['Deposits', 'Deposit addresses are hidden until the break ends.'],
                ['Promotions and marketing', 'No bonus offers, emails or push messages.'],
              ]}
            />
            <BreakList
              title="Still available"
              tone="success"
              items={[
                ['Withdrawals', 'Withdraw your available balance at any time.'],
                ['History and statements', 'Entries, results and transactions stay visible.'],
                ['Support and help', 'Chat with support or reach a help organisation.'],
              ]}
            />
          </div>
        </Card>
        <OpenEntriesCard />
        <HelpResources />
      </div>
      {confirming &&
        choice &&
        (desktop ? (
          <Dialog open onOpenChange={(o) => !o && setConfirming(false)}>
            <DialogContent size="m">
              <DialogHeader>
                <DialogTitle>{confirmTitle}</DialogTitle>
                <DialogDescription>
                  Please read this first. Once it starts, a break cannot be shortened or cancelled.
                </DialogDescription>
              </DialogHeader>
              <DialogBody className="flex flex-col gap-4">
                {summary}
                <NoteBox icon={Mail} tone="info">
                  We will email you when the break starts and when it ends. Your limits stay exactly
                  as they are.
                </NoteBox>
              </DialogBody>
              <DialogFooter>{confirmButtons}</DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Sheet open onOpenChange={(o) => !o && setConfirming(false)}>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>{confirmTitle}</SheetTitle>
                <SheetDescription>
                  Once it starts, it cannot be shortened or cancelled.
                </SheetDescription>
              </SheetHeader>
              <SheetBody className="flex flex-col gap-4">
                {summary}
                <NoteBox icon={Mail} tone="info">
                  We will email you when it starts and ends.
                </NoteBox>
              </SheetBody>
              <SheetFooter className="flex flex-col-reverse gap-2">{confirmButtons}</SheetFooter>
            </SheetContent>
          </Sheet>
        ))}
    </div>
  );
}

function BreakList({
  title,
  tone,
  items,
}: {
  title: string;
  tone: 'warning' | 'success';
  items: [string, string][];
}) {
  const Icon = tone === 'warning' ? PauseCircle : CircleCheck;
  return (
    <div className="flex flex-col gap-3">
      <p
        className={cn(
          'flex items-center gap-2 text-label-m',
          tone === 'warning' ? 'text-text-warning' : 'text-text-success',
        )}
      >
        <Icon aria-hidden className="size-4" />
        {title}
      </p>
      <ul className="flex flex-col">
        {items.map(([t, b]) => (
          <li key={t} className="flex flex-col gap-0.5 border-t border-border-subtle py-3">
            <span className="text-body-s-strong">{t}</span>
            <span className="text-body-s text-text-secondary">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── RG7 · Self-exclusion (4 steps) ────────────────────────────────────────────────────────────

export function RgSelfExclusion() {
  return (
    <RgPage
      href={`${RG_BASE}/self-exclusion`}
      title="Self-exclusion"
      sub="If you want a long break from gambling, self-exclusion closes your access for the period you choose. We will not ask you to come back, and it cannot be undone early."
      mobileSub="Closes your access for the period you choose. It cannot be undone early."
      banner={(s) => <ExclusionBanner state={s} kind="self_exclusion" />}
    >
      {(s) => <SelfExclusionBody state={s} />}
    </RgPage>
  );
}

function Progress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full',
              i <= step ? 'bg-status-info' : 'bg-surface-raised',
            )}
          />
        ))}
      </div>
      <p className="text-caption text-text-tertiary">
        Step {step} of 3 · {step === 1 ? 'Choose period' : step === 2 ? 'Consequences' : 'Confirm'}
      </p>
    </div>
  );
}

function MoneyCard({
  balances,
  title,
}: {
  balances?: WalletBalancesView & { breakdown?: Breakdown };
  title: string;
}) {
  const b = balances?.breakdown;
  return (
    <Card padding="l" className="gap-0">
      <div className="flex items-center gap-3 pb-2">
        <h2 className="flex-1 text-h5">{title}</h2>
        <DemoBadge size="s" />
      </div>
      {!balances ? (
        <Skeleton className="h-32 w-full" />
      ) : (
        <>
          <KV
            label="Available balance · stays withdrawable"
            value={`${num(balances.available)} USDT`}
            demo={false}
          />
          {b?.lockedEntries && b.lockedEntries !== '0.00' && (
            <KV
              label="Open Global Pool entries · stay in their draw; prizes are credited"
              value={`${num(b.lockedEntries)} USDT`}
              demo={false}
            />
          )}
          {balances.owed !== '0.00' && (
            <KV
              label="Owed (refunds, prizes, rewards) · credited as usual"
              value={`+${num(balances.owed)} USDT`}
              demo={false}
            />
          )}
          {balances.pending !== '0.00' && (
            <KV
              label="Pending deposits · withdrawable once confirmed"
              value={`${num(balances.pending)} USDT`}
              demo={false}
            />
          )}
          {b?.lockedWithdrawals && b.lockedWithdrawals !== '0.00' && (
            <KV
              label="Withdrawals in progress · keep processing"
              value={`${num(b.lockedWithdrawals)} USDT`}
              demo={false}
            />
          )}
          <div className="flex items-center gap-3 pt-4">
            <span className="flex-1 text-body-s-strong">Total — all of it remains yours</span>
            <span className="text-number-s tabular-nums">{num(balances.total)} USDT</span>
            <DemoBadge size="xs" />
          </div>
        </>
      )}
    </Card>
  );
}

interface Breakdown {
  lockedEntries?: string;
  lockedWithdrawals?: string;
}

function ChangesCard() {
  return (
    <Card padding="l" className="gap-5">
      <h2 className="text-h5">Also changes straight away</h2>
      <Bullet
        icon={Ban}
        title="Games, Global Pool and deposits close"
        body="Deposit addresses are hidden; transfers sent to old addresses are held for withdrawal, never played."
      />
      <Bullet
        icon={Megaphone}
        title="All marketing stops"
        body="No bonus offers, emails, push messages or VIP contact for the whole period."
      />
      <Bullet
        icon={Lock}
        tone="muted"
        title="No reversal until the end date"
        body="Support cannot lift it early. When it ends, you must ask to reopen — nothing reopens automatically."
      />
    </Card>
  );
}

const confirmForm = selfExclusionConfirmFormSchema.extend({
  totpCode: z.string().optional(),
});

function SelfExclusionBody({ state }: { state: RgStateView }) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [choice, setChoice] = React.useState<LongSelfExclusionDuration | null>(null);
  const balances = useWalletBalances();
  const exclude = useRgMutation(rgApi.selfExclude);
  const now = React.useMemo(() => new Date(), []);
  const end = choice ? LONG.find((o) => o.d === choice)!.end(now) : null;
  const needsCode = state.twoFactorEnabled;
  const topRef = React.useRef<HTMLDivElement>(null);
  const go = (s: 1 | 2 | 3) => {
    setStep(s);
    topRef.current?.focus();
  };

  const form = useForm<z.input<typeof confirmForm>>({
    resolver: zodResolver(confirmForm),
    mode: 'onChange',
    defaultValues: { phrase: '', acknowledged: false as unknown as true, totpCode: '' },
  });
  const values = form.watch();
  const ready =
    values.phrase.trim() === SELF_EXCLUSION_CONFIRM_PHRASE &&
    values.acknowledged === true &&
    (!needsCode || SELF_EXCLUSION_CODE_PATTERN.test((values.totpCode ?? '').trim()));

  const submit = form.handleSubmit(async (v) => {
    if (!choice) return;
    try {
      await exclude.mutateAsync({
        duration: choice,
        confirm: true,
        phrase: v.phrase.trim(),
        acknowledged: true,
        ...(needsCode && v.totpCode ? { totpCode: v.totpCode.trim() } : {}),
      });
      toast({
        type: 'success',
        title: 'Self-exclusion is active',
        description: 'Your balance stays withdrawable.',
      });
    } catch (e) {
      if (e instanceof ApiRequestError && e.code === 'STEP_UP_LOCKED') {
        // Never a dead end: a break needs no code and starts at once.
        form.setError('totpCode', {
          message: `${e.message}. You can take a cooling-off break right now without a code, or use a backup code later.`,
        });
      } else if (e instanceof ApiRequestError && e.code.startsWith('STEP_UP')) {
        form.setError('totpCode', { message: e.message });
      } else {
        form.setError('root', { message: errorText(e) });
      }
    }
  });

  if (state.exclusion.active && state.exclusion.kind === 'self_exclusion') {
    return <ActiveSelfExclusion state={state} balances={balances.data} />;
  }

  const left = (
    <Card padding="l" className="gap-5 rounded-xl" tabIndex={-1} ref={topRef}>
      <Progress step={step} />
      {step === 1 && (
        <>
          <div className="flex items-center gap-3">
            <IconTile icon={ShieldCheck} tone="danger" />
            <h2 className="flex-1 text-h4">Self-exclusion</h2>
            <DemoBadge size="s" />
          </div>
          {state.exclusion.active && (
            <NoteBox icon={PauseCircle} tone="info">
              You are on a break until{' '}
              {state.exclusion.endsAt ? dateTime(state.exclusion.endsAt) : ''}. Self-exclusion can
              extend it, never shorten it.
            </NoteBox>
          )}
          <p className="text-body-s text-text-secondary">
            Block your account from all gambling for a long period. Unlike a break, self-exclusion
            can’t be reversed early. Choose how long:
          </p>
          <OptionRows
            name="exclusion-period"
            value={choice}
            onChange={setChoice}
            options={LONG.map((o) => {
              const e = o.end(now);
              return {
                value: o.d,
                title: label(o.d),
                hint: o.hint ?? `Ends ${e ? formatDateUTC(e) : ''}`,
              };
            })}
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button size="l" disabled={!choice} onClick={() => go(2)}>
              Continue
            </Button>
            <Button size="l" variant="ghost" asChild>
              <Link href={`${RG_BASE}/cooling-off`}>Take a shorter break instead</Link>
            </Button>
          </div>
        </>
      )}
      {step === 2 && choice && (
        <>
          <h2 className="text-h4">What changes for {label(choice).toLowerCase()}</h2>
          <ul className="flex flex-col gap-3">
            {[
              [
                'Games and the Global Pool close',
                'No new bets or entries anywhere on GLOBAL POOL.',
              ],
              ['Deposits close', 'Deposit addresses are hidden for the whole period.'],
              ['Your balance stays yours', 'Withdraw your available balance at any time.'],
              [
                'Entries you already hold',
                'They stay in their round; any prize is credited and withdrawable.',
              ],
              ['All marketing stops', 'No offers, emails, push messages or VIP contact.'],
              [
                'No early reversal',
                end
                  ? `It ends ${dateTime(end.toISOString())}; reopening needs your request.`
                  : 'Permanent: reopening needs a support review after at least 5 years.',
              ],
            ].map(([t, b]) => (
              <li key={t} className="flex items-start gap-3">
                <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-muted" />
                <span className="flex flex-col">
                  <span className="text-body-s-strong">{t}</span>
                  <span className="text-body-s text-text-secondary">{b}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="l"
              onClick={() => go(1)}
              leadingIcon={<ArrowLeft aria-hidden />}
            >
              Back
            </Button>
            <div className="flex-1" />
            <Button size="l" onClick={() => go(3)}>
              Continue
            </Button>
          </div>
        </>
      )}
      {step === 3 && choice && (
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <h2 className="text-h4">Confirm self-exclusion for {label(choice).toLowerCase()}</h2>
          <div className="rounded-lg bg-surface-raised px-4">
            <KV label="Period" value={label(choice)} demo={false} />
            <KV label="Starts" value="As soon as you confirm" demo={false} />
            <KV
              label="Ends"
              value={end ? dateTime(end.toISOString()) : 'Permanent (at least 5 years)'}
              demo={false}
            />
            <KV
              label="Early reversal"
              value="Not possible"
              valueClassName="text-text-warning"
              demo={false}
              divider={false}
            />
          </div>
          {needsCode ? (
            <Field
              label="Authenticator code"
              helper="Your account has no password (you sign in with Privy), so we confirm it is you with your 2FA code. Lost your phone? One of your backup codes works too."
              error={form.formState.errors.totpCode?.message}
            >
              <Input
                size="l"
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={9}
                placeholder="6-digit code or ABCD-1234"
                {...form.register('totpCode')}
              />
            </Field>
          ) : (
            <NoteBox icon={ShieldCheck} tone="info">
              Two-factor authentication is off, so no code is needed — the typed confirmation below
              is enough. Never share your login with anyone.
            </NoteBox>
          )}
          <Field
            label={`Type ${SELF_EXCLUSION_CONFIRM_PHRASE} to confirm`}
            helper="Capital letters, with the hyphen."
            error={
              form.formState.errors.phrase?.message && values.phrase
                ? form.formState.errors.phrase.message
                : undefined
            }
          >
            <Input
              size="l"
              autoComplete="off"
              spellCheck={false}
              placeholder={SELF_EXCLUSION_CONFIRM_PHRASE}
              {...form.register('phrase')}
            />
          </Field>
          <CheckboxField
            checked={values.acknowledged === true}
            onCheckedChange={(c) =>
              form.setValue('acknowledged', (c === true) as true, { shouldValidate: true })
            }
            label={`I understand this cannot be reversed${end ? ` before ${formatDateUTC(end)}` : ''}.`}
          />
          {form.formState.errors.root && (
            <p role="alert" className="text-body-s text-text-danger">
              {form.formState.errors.root.message}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="l"
              onClick={() => go(2)}
              leadingIcon={<ArrowLeft aria-hidden />}
            >
              Back
            </Button>
            <div className="flex-1" />
            <Button
              type="submit"
              variant="danger"
              size="l"
              disabled={!ready}
              loading={exclude.isPending}
            >
              Self-exclude{' '}
              {choice === 'permanent' ? 'permanently' : `for ${label(choice).toLowerCase()}`}
            </Button>
          </div>
          <p className="text-caption text-text-tertiary">
            The button unlocks when {needsCode ? 'your code (or a backup code) is entered, ' : ''}
            the phrase matches and the box is ticked. Leaving this page changes nothing.
          </p>
        </form>
      )}
    </Card>
  );

  const right =
    step === 1 ? (
      <>
        <Card padding="l" className="gap-4">
          <h2 className="text-h5">Not sure you need this long?</h2>
          <p className="text-body-s text-text-secondary">
            There is no wrong choice — pick what feels right today. These shorter options also work:
          </p>
          <AltOption
            icon={PauseCircle}
            title="Cooling-off: 24 hours to 30 days"
            body="A short pause with the same protections."
            href={`${RG_BASE}/cooling-off`}
            cta="Take a break"
          />
          <AltOption
            icon={SlidersHorizontal}
            title="Lower your limits"
            body="Lower deposit, participation or time limits — applies at once."
            href={`${RG_BASE}/deposit-limits`}
            cta="Review limits"
          />
        </Card>
        <Card padding="l" className="gap-2">
          <h2 className="text-body-m-strong">Want to block other sites too?</h2>
          <p className="text-body-s text-text-secondary">
            Self-exclusion here covers this GLOBAL POOL account. If you have another GLOBAL POOL
            account, exclude it too — support can help. Your national gambling regulator may run a
            register that covers every licensed operator, and blocking software can add another
            layer.
          </p>
        </Card>
      </>
    ) : (
      <>
        <MoneyCard
          balances={balances.data}
          title={step === 2 ? 'What happens to your money' : 'When you confirm'}
        />
        <ChangesCard />
      </>
    );

  return (
    <div className="grid grid-cols-1 items-start gap-6 laptop:grid-cols-[440px_minmax(0,1fr)] desktop:grid-cols-[520px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">{left}</div>
      <div className="flex min-w-0 flex-col gap-6">
        {right}
        <HelpResources />
      </div>
    </div>
  );
}

function AltOption({
  icon,
  title,
  body,
  href,
  cta,
}: {
  icon: typeof PauseCircle;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface-raised p-4 tablet:flex-row tablet:items-center">
      <IconTile icon={icon} className="bg-surface-default" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-body-s-strong">{title}</p>
        <p className="text-body-s text-text-secondary">{body}</p>
      </div>
      <Button
        variant="secondary"
        size="s"
        asChild
        className="min-h-11 self-start tablet:min-h-8 tablet:self-center"
      >
        <Link href={href}>{cta}</Link>
      </Button>
    </div>
  );
}

type Reopen = NonNullable<RgStateView['exclusion']['reopen']>;

const LIMIT_LINK: Record<Reopen['missingLimits'][number], { label: string; href: string }> = {
  deposit: { label: 'Set a deposit limit', href: `${RG_BASE}/deposit-limits` },
  loss: { label: 'Set a loss limit', href: `${RG_BASE}/participation-limits` },
};

/**
 * The period is over, but nothing reopens automatically (server-enforced): ask → 24 h cool-down → deposit + loss
 * limits → confirm. Neutral, never a nudge to come back; extending the self-exclusion stays possible at any time.
 */
function ReopenCard({ reopen }: { reopen: Reopen }) {
  const request = useRgMutation(rgApi.requestReopen);
  const confirm = useRgMutation(rgApi.confirmReopen);
  const fail = (title: string) => (e: unknown) =>
    toast({ type: 'error', title, description: errorText(e) });
  return (
    <Card padding="l" className="gap-4">
      <div className="flex items-center gap-3">
        <IconTile icon={CalendarDays} tone="default" />
        <h2 className="flex-1 text-h5">Your self-exclusion period has ended</h2>
      </div>
      <p className="text-body-s text-text-secondary">
        It ended {dateTime(reopen.endedAt)}. Your account stays closed to play and deposits until
        you ask to reopen it — nothing reopens automatically.
      </p>
      {reopen.status === 'awaiting_request' && (
        <>
          <p className="text-body-s text-text-secondary">
            If you ask, a 24-hour cool-down follows. Then you set a deposit limit and a loss limit
            before you can play again. You can also simply leave it closed.
          </p>
          <Button
            variant="secondary"
            size="l"
            className="self-start"
            loading={request.isPending}
            onClick={() => request.mutate(undefined, { onError: fail('Request not sent') })}
          >
            Ask to reopen my account
          </Button>
        </>
      )}
      {reopen.status === 'cooling_down' && (
        <NoteBox icon={PauseCircle} tone="info">
          Reopening requested{reopen.requestedAt ? ` ${dateTime(reopen.requestedAt)}` : ''}. The
          24-hour cool-down ends {reopen.availableAt ? dateTime(reopen.availableAt) : 'soon'};
          nothing changes before then.
        </NoteBox>
      )}
      {reopen.status === 'ready' && (
        <>
          {reopen.missingLimits.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-body-s text-text-secondary">Limits first — still to set:</p>
              <div className="flex flex-wrap gap-2">
                {reopen.missingLimits.map((l) => (
                  <Button key={l} variant="secondary" size="s" asChild>
                    <Link href={LIMIT_LINK[l].href}>{LIMIT_LINK[l].label}</Link>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <NoteBox icon={CircleCheck} tone="success">
              Your deposit and loss limits are set.
            </NoteBox>
          )}
          <Button
            variant="secondary"
            size="l"
            className="self-start"
            disabled={reopen.missingLimits.length > 0}
            loading={confirm.isPending}
            onClick={() =>
              confirm.mutate(undefined, {
                onSuccess: () => toast({ type: 'success', title: 'Your account is open again' }),
                onError: fail('Not reopened'),
              })
            }
          >
            Reopen my account
          </Button>
        </>
      )}
    </Card>
  );
}

function ActiveSelfExclusion({
  state,
  balances,
}: {
  state: RgStateView;
  balances?: WalletBalancesView;
}) {
  const e = state.exclusion;
  return (
    <div className="grid grid-cols-1 items-start gap-6 laptop:grid-cols-[440px_minmax(0,1fr)] desktop:grid-cols-[520px_minmax(0,1fr)]">
      <Card padding="l" className="gap-5 rounded-xl">
        <div className="flex items-center gap-3">
          <IconTile icon={ShieldCheck} tone="info" />
          <h2 className="flex-1 text-h4">Self-exclusion active</h2>
          <DemoBadge size="s" />
        </div>
        <div className="rounded-lg bg-surface-raised px-4">
          <KV label="Period" value={label(e.duration ?? '')} demo={false} />
          <KV label="Started" value={e.startsAt ? dateTime(e.startsAt) : '—'} demo={false} />
          <KV label="Ends" value={e.endsAt ? dateTime(e.endsAt) : 'Permanent'} demo={false} />
          <KV
            label="Early reversal"
            value="Not possible"
            valueClassName="text-text-warning"
            demo={false}
            divider={false}
          />
        </div>
        <Button variant="secondary" size="l" asChild>
          <Link href="/support">Get support</Link>
        </Button>
      </Card>
      <div className="flex min-w-0 flex-col gap-6">
        {e.reopen && <ReopenCard reopen={e.reopen} />}
        <WithdrawCard balances={balances} title="Available to withdraw now" />
        <Card padding="l" className="gap-5">
          <h2 className="text-h5">What happens next</h2>
          <Bullet
            icon={Mail}
            title="Confirmation sent to your email"
            body={`With your end date and how to reach support.${e.startsAt ? ` Sent ${dateTime(e.startsAt)}.` : ''}`}
          />
          <Bullet
            icon={CalendarDays}
            title={e.endsAt ? `On ${formatDateUTC(e.endsAt)}` : 'Permanent'}
            body="Your account stays closed until you ask to reopen it. We will not contact you to come back."
          />
        </Card>
        <HelpResources />
      </div>
    </div>
  );
}
