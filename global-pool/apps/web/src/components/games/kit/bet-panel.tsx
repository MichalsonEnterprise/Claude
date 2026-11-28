'use client';

import { formatAmount } from '@gp/shared/money';
import { Coins, Info, Play, Square } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Field, InputControl, InputGroup } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { applyPreset, sanitizeStakeInput, type StakeLimits, type StakePreset } from './amount';
import { AUTO_PLAY_MAX_BETS, autoPlayProblems, autoStopMessage, type AutoPlayConfig } from './autoplay';
import { CreditsAmount, KvRow, StakeRiskNote } from './parts';
import { CREDITS_UNIT } from './registry';
import type { AutoPlayState } from './use-auto-play';

/** Bet panel frame (left column ≥ 1024): optional Manual / Auto switch, children, footer. */
export function BetPanel({
  mode,
  onModeChange,
  autoAvailable = true,
  children,
  className,
}: {
  mode?: 'manual' | 'auto';
  onModeChange?: (m: 'manual' | 'auto') => void;
  autoAvailable?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-5', className)}>
      {mode && onModeChange && autoAvailable && (
        <div role="radiogroup" aria-label="Bet mode" className="grid grid-cols-2 gap-1 rounded-md border border-border-subtle bg-bg-secondary p-1">
          {(['manual', 'auto'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              onClick={() => onModeChange(m)}
              className={cn(
                'h-11 rounded-sm text-label-m capitalize text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus tablet:h-9',
                mode === m && 'border border-border-brand bg-brand-tint text-text-brand',
              )}
            >
              {m}
            </button>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Bet amount (DEMO credits) with ½ / 2× / Min / Max presets. Max never exceeds the balance or the table max (no
 * surprise all-in). Amounts are decimal strings — never floats.
 */
export function BetAmountField({
  value,
  onChange,
  limits,
  error,
  disabled = false,
  label = 'Bet amount',
  helper,
}: {
  value: string;
  onChange: (v: string) => void;
  limits: StakeLimits;
  error?: string | null;
  disabled?: boolean;
  label?: string;
  helper?: React.ReactNode;
}) {
  const preset = (p: StakePreset) => onChange(applyPreset(value, p, limits));
  return (
    <Field
      label={label}
      labelAside={
        limits.balance !== null ? (
          <>
            <span className="text-caption text-text-tertiary">Balance</span>
            <CreditsAmount value={limits.balance} className="text-caption text-text-secondary" />
            <DemoBadge size="xs" />
          </>
        ) : undefined
      }
      error={error ?? undefined}
      helper={helper ?? `Min ${formatAmount(limits.min)} · Max ${formatAmount(limits.max)} ${CREDITS_UNIT} per bet`}
      disabled={disabled}
    >
      <InputGroup size="l" className="h-14">
        <Coins aria-hidden className="size-5 shrink-0 text-icon-gold" />
        <InputControl
          value={value}
          inputMode="decimal"
          autoComplete="off"
          onChange={(e) => onChange(sanitizeStakeInput(e.target.value))}
          onBlur={() => {
            if (value && !value.includes('.')) onChange(`${value}.00`);
          }}
          className="text-number-m"
          aria-label={`${label} in DEMO credits`}
        />
        <span className="text-label-m text-text-tertiary">{CREDITS_UNIT}</span>
      </InputGroup>
      <div className="grid grid-cols-4 gap-2">
        {(
          [
            ['half', '½'],
            ['double', '2×'],
            ['min', 'Min'],
            ['max', 'Max'],
          ] as const
        ).map(([p, l]) => (
          <Button
            key={p}
            variant="secondary"
            size="s"
            className="min-h-11 tablet:min-h-9"
            disabled={disabled}
            onClick={() => preset(p)}
            aria-label={p === 'half' ? 'Halve the bet' : p === 'double' ? 'Double the bet' : p === 'min' ? 'Minimum bet' : 'Maximum bet'}
          >
            {l}
          </Button>
        ))}
      </div>
    </Field>
  );
}

/**
 * "Before you bet" summary: published house edge, payout / profit on win, win chance, limits and Fees 0.00 — the
 * 0.05 USDT platform fee is Global Pool only. Always followed by "You can lose your stake".
 */
export function BeforeYouBet({
  houseEdge,
  rows,
  limits,
  className,
}: {
  houseEdge: string;
  rows: { label: string; value: React.ReactNode; tone?: string }[];
  limits: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-col gap-2.5 rounded-lg border border-border-subtle bg-bg-secondary p-4">
        <div className="flex items-center justify-between">
          <p className="text-body-s-strong text-text-primary">Before you bet</p>
          <DemoBadge size="xs" />
        </div>
        <KvRow label="House edge" value={`${houseEdge}%`} />
        {rows.map((r) => (
          <KvRow key={r.label} label={r.label} value={r.value} valueClassName={r.tone} />
        ))}
        <KvRow label="Fees" value={`0.00 ${CREDITS_UNIT}`} />
        <p className="flex items-start gap-1.5 text-caption text-text-tertiary">
          <Info aria-hidden className="mt-px size-3.5 shrink-0" />
          No platform or network fee on game bets — the {houseEdge}% house edge is already in the multiplier.
        </p>
      </div>
      <StakeRiskNote limits={limits} />
    </div>
  );
}

export interface AutoPlayDraft {
  bets: string;
  stopLoss: string;
  stopProfit: string;
  confirmed: boolean;
}

export const EMPTY_AUTO_DRAFT: AutoPlayDraft = { bets: '10', stopLoss: '', stopProfit: '', confirmed: false };

export function draftToConfig(stake: string, d: AutoPlayDraft): AutoPlayConfig {
  return {
    stake,
    bets: /^\d+$/.test(d.bets) ? Number(d.bets) : 0,
    stopLoss: d.stopLoss,
    stopProfit: d.stopProfit ? d.stopProfit : null,
  };
}

/**
 * Auto-play settings: number of bets, REQUIRED stop-loss, optional profit stop and an UNTICKED confirmation. The stake
 * stays constant — auto-play never raises the bet after a loss. Every round is an ordinary bet (all server checks).
 */
export function AutoPlayPanel({
  stake,
  draft,
  onDraftChange,
  auto,
  onStart,
  disabled = false,
  noun = 'bet',
}: {
  stake: string;
  draft: AutoPlayDraft;
  onDraftChange: (d: AutoPlayDraft) => void;
  auto: AutoPlayState & { stop: () => void };
  onStart: (cfg: AutoPlayConfig) => void;
  disabled?: boolean;
  noun?: string;
}) {
  const cfg = draftToConfig(stake, draft);
  const problems = autoPlayProblems(cfg);
  const canStart = !disabled && problems.length === 0 && draft.confirmed && !auto.running;
  const num = (v: string) => sanitizeStakeInput(v);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Number of ${noun}s`} helper={`1–${AUTO_PLAY_MAX_BETS}`} disabled={auto.running || disabled}>
          <InputGroup size="l">
            <InputControl
              value={draft.bets}
              inputMode="numeric"
              onChange={(e) => onDraftChange({ ...draft, bets: e.target.value.replace(/\D/g, '').slice(0, 3) })}
            />
          </InputGroup>
        </Field>
        <Field label="Stop-loss (required)" helper="Stops before this much is lost" disabled={auto.running || disabled}>
          <InputGroup size="l">
            <InputControl
              value={draft.stopLoss}
              inputMode="decimal"
              placeholder="e.g. 20.00"
              onChange={(e) => onDraftChange({ ...draft, stopLoss: num(e.target.value) })}
            />
            <span className="text-label-s text-text-tertiary">{CREDITS_UNIT}</span>
          </InputGroup>
        </Field>
      </div>
      <Field label="Stop on profit (optional)" disabled={auto.running || disabled}>
        <InputGroup size="l">
          <InputControl
            value={draft.stopProfit}
            inputMode="decimal"
            placeholder="Off"
            onChange={(e) => onDraftChange({ ...draft, stopProfit: num(e.target.value) })}
          />
          <span className="text-label-s text-text-tertiary">{CREDITS_UNIT}</span>
        </InputGroup>
      </Field>
      <p className="flex items-start gap-1.5 text-caption text-text-secondary">
        <Info aria-hidden className="mt-px size-3.5 shrink-0" />
        Every {noun} uses the same stake ({formatAmount(stake || '0')} {CREDITS_UNIT}). Auto-play never raises the bet
        after a loss, stops at your stop-loss and stops when you leave the page or a reality check is due.
      </p>
      <CheckboxField
        checked={draft.confirmed}
        onCheckedChange={(v) => onDraftChange({ ...draft, confirmed: v === true })}
        disabled={auto.running || disabled}
        label={`I understand auto-play places up to ${cfg.bets || 0} ${noun}s of ${formatAmount(stake || '0')} DEMO credits automatically and that I can lose my stake.`}
      />
      {auto.running ? (
        <Button variant="danger" size="l" block onClick={auto.stop} leadingIcon={<Square aria-hidden />}>
          Stop auto-play · {auto.progress.placed} of {auto.config?.bets ?? 0}
        </Button>
      ) : (
        <Button size="l" block disabled={!canStart} onClick={() => onStart(cfg)} leadingIcon={<Play aria-hidden />}>
          Start auto-play
        </Button>
      )}
      {!auto.running && problems.length > 0 && (draft.stopLoss || draft.confirmed) && (
        <p className="text-caption text-text-danger" role="status">
          {problems[0]}
        </p>
      )}
      {(auto.running || auto.stopped) && (
        <div className="flex flex-col gap-1 rounded-md bg-bg-secondary p-3 text-caption text-text-secondary" role="status" aria-live="polite">
          <span>
            {auto.running ? 'Running' : autoStopMessage(auto.stopped!)} · {auto.progress.placed} {noun}s · net{' '}
            <CreditsAmount value={auto.progress.net} signed tone="net" />
          </span>
        </div>
      )}
    </div>
  );
}
