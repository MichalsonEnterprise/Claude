'use client';

import { formatAmount } from '@gp/shared/money';
import { CircleAlert, Coins, Info, Percent, ReceiptText, RotateCcw, Trash2, Undo2, Wallet, X } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { CreditsAmount, GAMES_ROUTES } from '@/components/games/kit';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { cn } from '@/lib/utils';

import {
  RULES,
  colorOf,
  covers,
  paysOf,
  returnsOf,
  spotLabel,
  type Slip,
  type SlipBet,
  type SlipProblem,
} from './roulette-math';

const ORD = ['1st', '2nd', '3rd'];

/** Left marker of a slip row: the number tile, a colour swatch, or a short tag. */
export function SpotMarker({ bet, className }: { bet: Pick<SlipBet, 'type' | 'numbers'>; className?: string }) {
  const base = 'flex h-6 min-w-8 shrink-0 items-center justify-center rounded-sm px-1 text-label-s tabular-nums';
  if (bet.type === 'straight') {
    const n = bet.numbers![0]!;
    const c = colorOf(n);
    return (
      <span
        aria-hidden
        className={cn(
          base,
          'font-bold text-ink-50',
          c === 'red' ? 'bg-status-danger-strong' : c === 'black' ? 'border border-border-strong bg-ink-950' : 'bg-green-500 text-ink-950',
          className,
        )}
      >
        {n}
      </span>
    );
  }
  if (bet.type === 'red' || bet.type === 'black')
    return (
      <span
        aria-hidden
        className={cn(base, bet.type === 'red' ? 'bg-status-danger-strong' : 'border border-border-strong bg-ink-950', className)}
      />
    );
  const tag: Record<string, string> = {
    split: 'SPL',
    street: bet.numbers?.[0] === 0 ? 'TRIO' : 'STR',
    corner: bet.numbers?.[0] === 0 ? '0–3' : 'COR',
    line: 'LINE',
    dozen: ORD[(bet.numbers?.[0] ?? 1) - 1]!,
    column: `C${bet.numbers?.[0] ?? 1}`,
    odd: 'ODD',
    even: 'EVEN',
    low: '1–18',
    high: '19–36',
  };
  return (
    <span aria-hidden className={cn(base, 'border border-border-default bg-surface-raised text-[11px] text-text-secondary', className)}>
      {tag[bet.type]}
    </span>
  );
}

export interface BetSlipProps {
  slip: Slip;
  /** Bets are locked (spin in progress / reconnecting). */
  locked?: boolean;
  balance: string | null;
  chip: string;
  problems: SlipProblem[];
  total: string;
  maxPayout: { amount: string; pockets: number[] };
  onRemove: (key: string) => void;
  onUndo: () => void;
  onClear: () => void;
  onRepeat: () => void;
  canUndo: boolean;
  /** Total of the last spun bets (Repeat) or null. */
  repeatTotal: string | null;
  /** Primary action (Spin …) rendered inside the slip. */
  cta?: React.ReactNode;
  /** Notice under the totals (limits, balance, refusals). */
  notice?: React.ReactNode;
  className?: string;
  /** Hide the header (bottom sheet has its own title). */
  bare?: boolean;
}

/** Game/Bet Slip (Figma 23:16674): Empty · Filled · Over limit · Locked. DEMO credits only — Fees 0.00. */
export function BetSlip({
  slip,
  locked = false,
  balance,
  chip,
  problems,
  total,
  maxPayout,
  onRemove,
  onUndo,
  onClear,
  onRepeat,
  canUndo,
  repeatTotal,
  cta,
  notice,
  className,
  bare = false,
}: BetSlipProps) {
  const overKeys = new Map(problems.flatMap((p) => (p.kind === 'spot_above_max' ? [[p.key, p.over] as const] : [])));
  const blocked = problems.some((p) => p.kind === 'spot_above_max' || p.kind === 'table_max' || p.kind === 'max_spots');
  const winners = maxPayout.pockets.length
    ? slip.filter((b) => covers(b).includes(maxPayout.pockets[0]!)).map((b) => spotLabel(b).split(' · ')[0])
    : [];
  const actionCls = 'min-h-11 flex-1 tablet:min-h-10';

  return (
    <section
      aria-labelledby="bet-slip-title"
      data-testid="bet-slip"
      className={cn('flex min-w-0 flex-col gap-4', !bare && 'rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-5', className)}
    >
      {!bare && (
        <div className="flex items-start gap-2.5">
          <ReceiptText aria-hidden className="mt-0.5 size-5 shrink-0 text-icon-muted" />
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 id="bet-slip-title" className="text-h5 text-text-primary">
              Bet slip
            </h2>
            <p className="text-caption text-text-tertiary">Pool Roulette · single zero</p>
          </div>
          <span
            className={cn(
              'inline-flex h-6 items-center rounded-full px-2 text-label-s',
              slip.length ? 'bg-brand-tint text-text-brand' : 'bg-surface-raised text-text-tertiary',
            )}
          >
            {slip.length} {slip.length === 1 ? 'bet' : 'bets'}
          </span>
          <DemoBadge size="xs" />
        </div>
      )}
      {bare && <h2 id="bet-slip-title" className="sr-only">Bet slip</h2>}

      {slip.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-border-default px-4 py-6 text-center">
          <Coins aria-hidden className="size-6 text-icon-muted" />
          <p className="text-body-s-strong text-text-primary">No bets yet</p>
          <p className="text-caption text-text-tertiary">
            Pick a chip, then tap a number or an outside bet on the table. Your bets appear here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Bets on this spin">
          {slip.map((b) => {
            const over = overKeys.get(b.key);
            return (
              <li
                key={b.key}
                data-testid={`slip-${b.key}`}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3',
                  over ? 'border-border-danger bg-status-danger-tint' : 'border-transparent bg-surface-raised',
                )}
              >
                <SpotMarker bet={b} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body-s-strong text-text-primary">{spotLabel(b)}</span>
                  <span className={cn('text-caption', over ? 'text-text-danger' : 'text-text-tertiary')}>
                    {over
                      ? `Max ${formatAmount(RULES.maxPerSpot)} per spot · reduce by ${formatAmount(over)}`
                      : `Pays ${paysOf(b.type)} · returns ${formatAmount(returnsOf(b.type, b.amount).toFixed(2))}`}
                  </span>
                </div>
                <span className={cn('text-number-s tabular-nums', over ? 'text-text-danger' : 'text-text-primary')}>
                  {formatAmount(b.amount)}
                </span>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onRemove(b.key)}
                  aria-label={`Remove ${spotLabel(b)} (${b.amount} DEMO)`}
                  className="-mr-1.5 flex size-11 shrink-0 items-center justify-center rounded-md text-icon-muted hover:bg-surface-hover hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus disabled:opacity-40 tablet:size-8"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="s" className={actionCls} disabled={locked || !canUndo} onClick={onUndo} leadingIcon={<Undo2 aria-hidden />}>
          Undo
        </Button>
        <Button variant="secondary" size="s" className={actionCls} disabled={locked || slip.length === 0} onClick={onClear} leadingIcon={<Trash2 aria-hidden />}>
          Clear
        </Button>
        <Button
          variant="secondary"
          size="s"
          className={actionCls}
          disabled={locked || !repeatTotal}
          onClick={onRepeat}
          leadingIcon={<RotateCcw aria-hidden />}
          aria-label={repeatTotal ? `Repeat last bets (${repeatTotal} DEMO)` : 'Repeat last bets'}
        >
          Repeat
        </Button>
      </div>
      <p className="-mt-2 text-right text-caption text-text-tertiary">
        {slip.length ? `Chip: ${formatAmount(chip)}` : repeatTotal ? `Last ${formatAmount(repeatTotal)}` : `Chip: ${formatAmount(chip)}`}
      </p>

      <dl className="flex flex-col gap-3 border-t border-border-subtle pt-4">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-body-s-strong text-text-primary">Total stake</dt>
          <dd className={cn('text-number-s', blocked ? 'text-text-danger' : 'text-text-primary')} data-testid="slip-total">
            <CreditsAmount value={total} />
          </dd>
        </div>
        <Row
          label="Max potential payout"
          sub={
            blocked
              ? 'Fix the highlighted bet first'
              : maxPayout.pockets.length
                ? `If ${maxPayout.pockets.length === 1 ? maxPayout.pockets[0] : `${maxPayout.pockets[0]} (or ${maxPayout.pockets.length - 1} more)`} wins (${winners.join(' + ')})`
                : 'Add a bet to see the payout'
          }
          value={!blocked && maxPayout.pockets.length ? <CreditsAmount value={maxPayout.amount} className="text-text-success" /> : '—'}
        />
        <Row label="House edge" sub="European single zero · RTP 97.30%" value={<><Percent aria-hidden className="size-3.5 text-icon-muted" /> 2.70%</>} />
        <Row
          label="Limits"
          sub={`Per spot · table max ${formatAmount(RULES.tableMax)} per spin`}
          value={`${formatAmount(RULES.minPerSpot)} – ${formatAmount(RULES.maxPerSpot)}`}
        />
        <Row
          label="Available"
          value={
            balance === null ? (
              '—'
            ) : (
              <>
                <Wallet aria-hidden className="size-3.5 text-icon-muted" />
                <CreditsAmount value={balance} />
              </>
            )
          }
        />
        <Row label="Fees" value={<CreditsAmount value="0.00" />} sub="No fee on game bets (the 0.05 USDT fee is Global Pool only)" />
      </dl>

      {notice}
      {cta}

      <div className="flex items-start gap-2 rounded-lg bg-surface-raised p-3 text-caption text-text-secondary">
        <CircleAlert aria-hidden className="mt-px size-4 shrink-0 text-icon-muted" />
        <p>
          <strong className="text-body-s-strong text-text-primary">You can lose your stake.</strong> Bets are final once the
          wheel spins. 18+ · only where permitted ·{' '}
          <Link href={GAMES_ROUTES.lossLimits} className="text-text-brand underline-offset-4 hover:underline">
            Set limits
          </Link>
        </p>
      </div>
    </section>
  );
}

function Row({ label, sub, value }: { label: string; sub?: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="flex min-w-0 flex-col">
        <span className="text-body-s text-text-secondary">{label}</span>
        {sub && <span className="text-caption text-text-tertiary">{sub}</span>}
      </dt>
      <dd className="flex shrink-0 items-center gap-1.5 text-body-s-strong text-text-primary tabular-nums">{value}</dd>
    </div>
  );
}

/** Compact "If the ball lands on…" card (outcome preview) — pockets grouped by net result. */
export function InfoLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-caption text-text-tertiary">
      <Info aria-hidden className="mt-px size-3.5 shrink-0" />
      {children}
    </p>
  );
}
