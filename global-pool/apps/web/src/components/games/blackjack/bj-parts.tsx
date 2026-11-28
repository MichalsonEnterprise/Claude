'use client';

import { formatDateTimeUTC, formatTimeUTC } from '@gp/shared/format';
import { formatAmount, money } from '@gp/shared/money';
import {
  ChevronRight,
  CircleCheck,
  CircleX,
  Crown,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { CreditsAmount, KitChip, toneOfNet } from '@/components/games/kit';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBjHands, type BjBetView } from '@/lib/api/twenty-one';
import { cn } from '@/lib/utils';

import {
  INSURANCE_EDGE,
  betTone,
  resultCopy,
  resultSummary,
  totalOf,
  type BetTone,
} from './bj-math';
import { MiniCards } from './cards';
import { BJ_ROUTES } from './routes';

const CARD = 'flex w-full flex-col gap-4 rounded-xl border border-border-subtle bg-surface-overlay p-5 shadow-elevation-4';

/** BJ-03 insurance offer (overlay card on the felt ≥ 768; the same body sits in a bottom sheet below). */
export function InsuranceBody({
  stake,
  canAfford,
  blockedReason,
  busy,
  onAnswer,
  compact = false,
}: {
  /** Insurance stake (half the bet). */
  stake: string;
  canAfford: boolean;
  /** Self-exclusion: stake-adding answers are refused by the server. */
  blockedReason?: string | null;
  busy: boolean;
  onAnswer: (accept: boolean) => void;
  compact?: boolean;
}) {
  const ret = money(stake).times(3).toFixed(2);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-s text-text-secondary">
        The dealer shows an Ace. Insurance is an optional side bet of half your stake. It pays 2:1 if the dealer has
        blackjack; if not, it is lost and your hand plays on as normal.
      </p>
      <dl className="flex flex-col gap-2 rounded-lg bg-bg-secondary p-3">
        <div className="flex items-center justify-between gap-3 text-body-s">
          <dt className="text-text-secondary">Insurance stake</dt>
          <dd className="flex items-center gap-1.5 text-body-s-strong text-text-primary">
            <CreditsAmount value={stake} />
            <DemoBadge size="xs" />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 text-body-s">
          <dt className="text-text-secondary">If the dealer has blackjack</dt>
          <dd className="text-body-s-strong text-text-primary">
            returns <CreditsAmount value={ret} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3 text-body-s">
          <dt className="text-text-secondary">House edge on insurance</dt>
          <dd className="text-body-s-strong text-text-primary">≈{INSURANCE_EDGE}% (6 decks)</dd>
        </div>
      </dl>
      <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-2')}>
        <Button
          variant="secondary"
          size="l"
          className="min-h-12"
          disabled={busy}
          onClick={() => onAnswer(false)}
          data-testid="bj-insurance-no"
        >
          No insurance
        </Button>
        <Button
          variant="secondary"
          size="l"
          className="min-h-12"
          disabled={busy || !canAfford || !!blockedReason}
          onClick={() => onAnswer(true)}
          leadingIcon={<Shield aria-hidden />}
          data-testid="bj-insurance-yes"
        >
          Insure · {formatAmount(stake)} DEMO
        </Button>
      </div>
      {(blockedReason || !canAfford) && (
        <p className="text-caption text-text-warning" role="status">
          {blockedReason ?? `Not enough DEMO credits for the ${formatAmount(stake)} insurance stake — choose No insurance.`}
        </p>
      )}
      <p className="text-caption text-text-tertiary">
        You can lose your stake. Basic strategy declines insurance. The dealer peeks for blackjack as soon as you choose —
        there is no time limit.
      </p>
    </div>
  );
}

export function InsuranceCard(props: React.ComponentProps<typeof InsuranceBody>) {
  return (
    <div role="dialog" aria-modal="false" aria-labelledby="bj-insurance-title" className={cn(CARD, 'max-w-[440px]')}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-status-info-tint text-text-info">
          <Shield aria-hidden className="size-5" />
        </span>
        <h2 id="bj-insurance-title" className="text-h4 text-text-primary">
          Insurance?
        </h2>
      </div>
      <InsuranceBody {...props} />
    </div>
  );
}

const TONE_ICON: Record<BetTone, React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  blackjack: Crown,
  win: CircleCheck,
  push: RotateCcw,
  lose: CircleX,
};

/** BJ-05 result card: real settled hand only (headline, detail, net, ref · time · Verify). Gold only for 3:2. */
export function ResultCard({ bet, onVerify, className }: { bet: BjBetView; onVerify: () => void; className?: string }) {
  const tone = betTone(bet);
  const copy = resultCopy(bet);
  const Icon = TONE_ICON[tone];
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="bj-result"
      data-ref={bet.ref}
      data-result={tone}
      data-kind={(bet.outcome.hands ?? []).length > 1 ? 'split' : (bet.outcome.hands?.[0]?.result ?? 'lose')}
      className={cn(
        CARD,
        'max-w-[470px] gap-3 p-4',
        tone === 'blackjack' && 'border-border-gold',
        tone === 'win' && 'border-border-brand',
        tone === 'lose' && 'border-border-danger/60',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-full',
            tone === 'blackjack' && 'bg-gold-tint text-icon-gold',
            tone === 'win' && 'bg-brand-tint text-icon-brand',
            tone === 'push' && 'bg-surface-raised text-text-secondary',
            tone === 'lose' && 'bg-status-danger-tint text-text-danger',
          )}
        >
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-body-m-strong text-text-primary">{copy.title}</p>
          <p className="text-caption text-text-secondary">{copy.detail}</p>
        </div>
        <div className="flex flex-col items-end">
          <span
            className={cn(
              'text-number-s whitespace-nowrap',
              tone === 'blackjack' ? 'text-text-gold' : toneOfNet(bet.net),
            )}
          >
            <CreditsAmount value={bet.net} signed />
          </span>
          <span className="text-caption text-text-tertiary">Net {money(bet.net).gte(0) ? 'profit' : 'result'}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border-subtle pt-2 text-caption text-text-tertiary">
        <DemoBadge size="xs" />
        <span>
          Hand {bet.ref} · {formatDateTimeUTC(bet.settledAt ?? bet.createdAt)}
        </span>
        <Button
          variant="link"
          size="s"
          className="ml-auto min-h-11 tablet:min-h-0"
          onClick={onVerify}
          leadingIcon={<ShieldCheck aria-hidden />}
        >
          Verify result
        </Button>
      </div>
    </div>
  );
}

/** BJ-09 connection lost — the hand is held on the server; one key per decision, retried with the same key. */
export function ConnectionCard({
  handRef,
  what,
  attempt,
  max,
  nextInSeconds,
  onRetry,
}: {
  handRef: string | null;
  /** "16 against a dealer 10, bet 10.00 DEMO" */
  what: string | null;
  attempt: number | null;
  max: number;
  nextInSeconds: number | null;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className={cn(CARD, 'max-w-[460px]')} data-testid="bj-connection-lost">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-status-warning-tint text-text-warning">
          <WifiOff aria-hidden className="size-5" />
        </span>
        <h2 className="text-h4 text-text-primary">Connection lost — your hand is safe</h2>
      </div>
      <p className="text-body-s text-text-secondary">
        {handRef
          ? `Hand ${handRef} is held on our server exactly as you left it${what ? `: ${what}` : ''}. Nothing is decided while you are offline.`
          : 'Your deal is sent again with the same request key, so it is dealt at most once whatever happens to your connection.'}
      </p>
      <dl className="flex flex-col gap-2 rounded-lg bg-bg-secondary p-3 text-body-s">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-text-secondary">Reconnecting</dt>
          <dd className="text-body-s-strong text-text-primary">
            {attempt ? `Attempt ${attempt} of ${max}` : 'Waiting for the network'}
            {nextInSeconds !== null ? ` · next try in ${nextInSeconds} s` : ''}
          </dd>
        </div>
        {handRef && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-text-secondary">Hand</dt>
            <dd className="flex items-center gap-1.5 text-body-s-strong text-text-primary">
              {handRef} · waiting for your move <DemoBadge size="xs" />
            </dd>
          </div>
        )}
      </dl>
      <Button variant="secondary" size="l" className="min-h-12" onClick={onRetry} leadingIcon={<RefreshCw aria-hidden />}>
        Retry now
      </Button>
      <p className="text-caption text-text-tertiary">
        Can’t reconnect? Reopen Twenty-One on any device to finish the hand — an open hand stays on the server until you
        finish it, and every decision is checked against the published rules.
      </p>
    </div>
  );
}

const PILL: Record<BetTone, string> = {
  blackjack: 'border-border-gold bg-gold-tint text-text-gold',
  win: 'border-border-brand bg-brand-tint-subtle text-text-brand',
  push: 'border-border-default bg-surface-raised text-text-secondary',
  lose: 'border-border-danger bg-status-danger-tint text-text-danger',
};

/** Result chip (icon + label, never colour alone). */
export function ResultChip({ bet }: { bet: BjBetView }) {
  if (bet.status !== 'settled') return <KitChip>In play</KitChip>;
  const tone = betTone(bet);
  const Icon = TONE_ICON[tone];
  return (
    <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-label-s whitespace-nowrap', PILL[tone])}>
      <Icon aria-hidden className="size-3.5" />
      {resultSummary(bet.outcome)}
    </span>
  );
}

/** "Your recent hands" (BJ-01 lower left): last hands with cards, dealer total, result and net; each row verifies. */
export function RecentHands({ onVerify }: { onVerify: (b: BjBetView) => void }) {
  const q = useBjHands(1, 5);
  const items = q.data?.items ?? [];
  return (
    <section
      id="my-bets"
      aria-labelledby="bj-recent"
      className="flex min-w-0 scroll-mt-24 flex-col gap-3 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-5"
    >
      <div className="flex items-center gap-2">
        <h2 id="bj-recent" className="text-h5 text-text-primary">
          Your recent hands
        </h2>
        <DemoBadge size="s" />
        <Link
          href={BJ_ROUTES.myHands}
          className="ml-auto inline-flex min-h-11 items-center gap-1 text-label-m text-text-primary hover:text-text-brand"
        >
          View all <ChevronRight aria-hidden className="size-4" />
        </Link>
      </div>
      {q.isPending ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : q.isError ? (
        <p className="text-body-s text-text-danger" role="alert">
          Couldn’t load your hands — they are safe on the server. Try again in a moment.
        </p>
      ) : items.length === 0 ? (
        <p className="text-body-s text-text-tertiary">
          No hands yet — your results appear here with the seeds to verify them.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border-subtle">
          {items.map((b) => {
            const hands = b.outcome.hands ?? [];
            const dealer = (b.outcome.dealer ?? []).filter((x): x is string => !!x);
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => b.status === 'settled' && onVerify(b)}
                  disabled={b.status !== 'settled'}
                  aria-label={`${b.ref}: ${b.status === 'settled' ? `${resultSummary(b.outcome)}, net ${formatAmount(b.net, { sign: 'always' })} DEMO — verify` : 'in play'}`}
                  className="flex min-h-12 w-full flex-wrap items-center gap-x-3 gap-y-1 py-2 text-left focus-visible:outline-2 focus-visible:outline-border-focus"
                >
                  <span className="w-[74px] shrink-0 font-mono text-mono-s text-text-tertiary">{b.ref}</span>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    {hands[0] ? <MiniCards cards={hands.length > 1 ? hands.flatMap((h) => h.cards) : hands[0].cards} /> : null}
                    {dealer.length > 0 && (
                      <span className="text-caption whitespace-nowrap text-text-tertiary">
                        vs {dealer.length === 2 && totalOf(dealer).total === 21 ? 'BJ' : totalOf(dealer).total}
                      </span>
                    )}
                  </span>
                  <ResultChip bet={b} />
                  <span className={cn('w-[72px] text-right text-body-m-strong tabular-nums', toneOfNet(b.net))}>
                    {b.status === 'settled' ? formatAmount(b.net, { sign: 'always' }) : '—'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-caption text-text-tertiary">Each hand is independent — past results never change the next shuffle.</p>
    </section>
  );
}

const TABLE_RULES = [
  '6 decks, shuffled before every hand',
  'Dealer stands on soft 17 (S17)',
  'Blackjack pays 3:2 · win pays 1:1',
  'Insurance pays 2:1 when dealer shows an Ace',
  'Double on any first two cards',
  'Split once — split Aces get one card each',
  'No surrender · push returns your stake',
];

/** "Table rules" (BJ-01 lower middle). */
export function TableRulesCard() {
  return (
    <section
      aria-labelledby="bj-table-rules"
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-5"
    >
      <h2 id="bj-table-rules" className="text-h5 text-text-primary">
        Table rules
      </h2>
      <ul className="flex flex-col gap-2.5">
        {TABLE_RULES.map((r) => (
          <li key={r} className="flex gap-2 text-body-s text-text-secondary">
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-icon-brand" />
            {r}
          </li>
        ))}
      </ul>
      <Link
        href={BJ_ROUTES.rules}
        className="inline-flex min-h-11 w-fit items-center gap-1 text-label-m text-text-primary hover:text-text-brand"
      >
        Full rules & payouts <ChevronRight aria-hidden className="size-4" />
      </Link>
    </section>
  );
}

/** Next automatic retry countdown for the connection card (from the runner's backoff). */
export function useRetryIn(active: boolean, attempt: number): number | null {
  const [left, setLeft] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (!active || attempt < 1) {
      setLeft(null);
      return;
    }
    const total = Math.min(8, 2 ** Math.max(0, attempt - 2));
    const started = Date.now();
    setLeft(total);
    const t = window.setInterval(() => {
      const s = Math.max(0, total - Math.floor((Date.now() - started) / 1000));
      setLeft(s);
    }, 250);
    return () => window.clearInterval(t);
  }, [active, attempt]);
  return left;
}

/** Restored-hand banner (BJ-09 "Reconnected — hand restored"). */
export function RestoredBanner({ handRef, at, onDismiss }: { handRef: string; at: string; onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-lg border border-border-brand bg-brand-tint-subtle px-4 py-3"
      data-testid="bj-restored"
    >
      <CircleCheck aria-hidden className="size-5 shrink-0 text-icon-brand" />
      <p className="min-w-0 flex-1 text-body-s text-text-primary">
        <strong className="font-semibold">Reconnected — hand {handRef} restored.</strong>{' '}
        <span className="text-text-secondary">
          It was held on the server exactly as you left it (dealt {formatTimeUTC(at)}). It’s your move.
        </span>
      </p>
      <Button variant="ghost" size="s" className="min-h-11 tablet:min-h-8" onClick={onDismiss}>
        Dismiss
      </Button>
    </div>
  );
}
