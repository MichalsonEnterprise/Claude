'use client';

import { formatAmount, money } from '@gp/shared/money';
import { Check, Info, Play, Repeat, Scale, Target, TrendingDown, TrendingUp } from 'lucide-react';
import * as React from 'react';

import {
  AUTO_PLAY_MAX_BETS,
  BetAmountField,
  CreditsAmount,
  autoPlayProblems,
  parseStake,
  sanitizeStakeInput,
  stakeProblem,
  stakeProblemMessage,
  type AutoPlayConfig,
  type DemoLossLimit,
} from '@/components/games/kit';
import { ResponsiveModal } from '@/components/wallet/responsive-modal';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Field, InputControl, InputGroup } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import {
  AUTO_MAX_ROUNDS,
  HOUSE_EDGE,
  INFO,
  TARGET_PRESETS,
  fmtX,
  parseTarget,
  payoutAt,
  sanitizeTargetInput,
  targetProblem,
  targetProblemMessage,
  winChancePercent,
} from './crash-math';
import { SummaryRow } from './crash-parts';

export interface CrashAutoConfig extends AutoPlayConfig {
  /** Auto cash-out target for every auto round (required). */
  target: string;
}

/**
 * CR-06 Auto-play & auto cash-out: fixed bet (never raised after a loss), REQUIRED auto cash-out target and stop-loss,
 * optional profit stop, up to 100 rounds, and an UNTICKED confirmation every time the dialog opens. Each auto round
 * is an ordinary bet that passes every server check (limits, self-exclusion, reality checks).
 */
export function AutoPlayDialog({
  open,
  onOpenChange,
  initialStake,
  initialTarget,
  balance,
  nextRoundRef,
  lossLimit,
  onStart,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialStake: string;
  initialTarget: string;
  balance: string | null;
  nextRoundRef: string | null;
  lossLimit: DemoLossLimit | null;
  onStart: (cfg: CrashAutoConfig) => void;
}) {
  const [stake, setStake] = React.useState(initialStake);
  const [target, setTarget] = React.useState(initialTarget);
  const [rounds, setRounds] = React.useState('10');
  const [stopLoss, setStopLoss] = React.useState('');
  const [stopProfit, setStopProfit] = React.useState('');
  const [confirmed, setConfirmed] = React.useState(false);

  // every opening starts from the panel's bet + target and an UNTICKED confirmation
  React.useEffect(() => {
    if (!open) return;
    setStake(initialStake);
    setTarget(initialTarget || '2.00');
    setConfirmed(false);
  }, [open, initialStake, initialTarget]);

  const limits = { min: INFO.minBet, max: INFO.maxBet, balance };
  const sProblem = stakeProblem(stake, limits);
  const stakeOk = parseStake(stake);
  const tProblem = targetProblem(target);
  const targetOk = parseTarget(target);
  const n = /^\d+$/.test(rounds) ? Number(rounds) : 0;
  const cfg: AutoPlayConfig = {
    stake: stakeOk ?? '',
    bets: n,
    stopLoss,
    stopProfit: stopProfit || null,
  };
  const problems = [
    ...(sProblem ? [stakeProblemMessage(sProblem)!] : []),
    ...(tProblem ? [targetProblemMessage(tProblem)!] : []),
    ...autoPlayProblems(cfg).filter((p) => !p.startsWith('Set a bet amount')),
  ];
  const ready = problems.length === 0 && confirmed && !!stakeOk && !!targetOk;
  const most = stakeOk && n > 0 ? money(stakeOk).times(n).toFixed(2) : null;
  const maxLoss = most && stopLoss && /^\d+(\.\d{1,2})?$/.test(stopLoss)
    ? (money(stopLoss).lt(money(most)) ? money(stopLoss) : money(most)).toFixed(2)
    : null;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="m"
      title="Auto-play & auto cash-out"
      description={`Orbit Rush · starts with ${nextRoundRef ? `round ${nextRoundRef}` : 'the next betting window'} · you can stop at any time`}
      footer={
        <div className="flex w-full flex-col gap-3 tablet:flex-row tablet:items-center">
          <p className="text-caption text-text-tertiary tablet:mr-auto">
            {confirmed ? 'Auto rounds use DEMO credits only — no cash value.' : 'Tick the box to start auto-play'}
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" className="min-h-11 flex-1 tablet:flex-none" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              className="min-h-11 flex-1 tablet:flex-none"
              disabled={!ready}
              leadingIcon={<Play aria-hidden />}
              data-testid="autoplay-start"
              onClick={() => {
                if (!ready || !stakeOk || !targetOk) return;
                onStart({ ...cfg, stake: stakeOk, target: targetOk });
                onOpenChange(false);
              }}
            >
              Start auto-play · {n || 0} {n === 1 ? 'round' : 'rounds'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <BetAmountField
          label="Bet per round"
          value={stake}
          onChange={setStake}
          limits={limits}
          error={sProblem && sProblem.kind !== 'empty' ? stakeProblemMessage(sProblem) : null}
          helper={`Min ${formatAmount(INFO.minBet)} · Max ${formatAmount(INFO.maxBet)} DEMO per bet · DEMO credits · no cash value`}
        />
        <div className="flex flex-col gap-2">
          <Field
            label="Auto cash-out at"
            helper={
              targetOk && stakeOk
                ? `Win chance per round ${winChancePercent(targetOk)}% · each win pays ${formatAmount(payoutAt(stakeOk, targetOk))} DEMO`
                : 'Required for auto-play · between 1.01× and 1,000.00×'
            }
            error={tProblem && tProblem !== 'empty' ? targetProblemMessage(tProblem) : undefined}
          >
            <InputGroup size="l">
              <Target aria-hidden className="size-5 shrink-0 text-icon-muted" />
              <InputControl
                value={target}
                inputMode="decimal"
                onChange={(e) => setTarget(sanitizeTargetInput(e.target.value))}
                onBlur={() => targetOk && setTarget(targetOk)}
                aria-label="Auto cash-out multiplier"
              />
              <span className="text-label-m whitespace-nowrap text-text-tertiary">× target</span>
            </InputGroup>
          </Field>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Target presets">
            {TARGET_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTarget(p)}
                aria-pressed={targetOk === p}
                className={cn(
                  'inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-label-m tablet:min-h-9',
                  targetOk === p
                    ? 'border-border-brand bg-brand-tint text-text-brand'
                    : 'border-border-default bg-surface-raised text-text-secondary hover:text-text-primary',
                )}
              >
                {targetOk === p && <Check aria-hidden className="size-4" />}
                {fmtX(p)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 tablet:grid-cols-2">
          <Field label="Number of rounds" helper={`Up to ${AUTO_MAX_ROUNDS} per auto session`}>
            <InputGroup size="l">
              <Repeat aria-hidden className="size-5 shrink-0 text-icon-muted" />
              <InputControl
                value={rounds}
                inputMode="numeric"
                onChange={(e) => setRounds(e.target.value.replace(/\D/g, '').slice(0, 3))}
                aria-label="Number of rounds"
              />
            </InputGroup>
          </Field>
          <Field label="Stop if net loss reaches" helper="Required">
            <InputGroup size="l">
              <TrendingDown aria-hidden className="size-5 shrink-0 text-icon-muted" />
              <InputControl
                value={stopLoss}
                inputMode="decimal"
                placeholder="e.g. 30.00"
                onChange={(e) => setStopLoss(sanitizeStakeInput(e.target.value))}
                aria-label="Stop-loss in DEMO credits"
              />
              <span className="text-label-s text-text-tertiary">DEMO</span>
            </InputGroup>
          </Field>
          <Field label="Stop if net profit reaches" helper="Optional">
            <InputGroup size="l">
              <TrendingUp aria-hidden className="size-5 shrink-0 text-icon-muted" />
              <InputControl
                value={stopProfit}
                inputMode="decimal"
                placeholder="Off"
                onChange={(e) => setStopProfit(sanitizeStakeInput(e.target.value))}
                aria-label="Profit stop in DEMO credits"
              />
              <span className="text-label-s text-text-tertiary">DEMO</span>
            </InputGroup>
          </Field>
          <div className="flex flex-col gap-1 rounded-lg bg-surface-raised p-3">
            <span className="text-caption text-text-tertiary">Bet after a win or loss</span>
            <span className="text-body-s-strong text-text-primary">
              Stays at {stakeOk ? <CreditsAmount value={stakeOk} /> : '—'}
            </span>
            <span className="text-caption text-text-secondary">Auto-play never raises your bet after a loss.</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 rounded-lg border border-border-subtle bg-bg-secondary p-4" data-testid="autoplay-summary">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-body-s-strong text-text-primary">
              <Scale aria-hidden className="size-4 text-icon-muted" /> Before you start
            </p>
            <DemoBadge size="xs" />
          </div>
          <SummaryRow label={`Win chance per round (${targetOk ? fmtX(targetOk) : '—'})`} value={targetOk ? `${winChancePercent(targetOk)}%` : '—'} />
          <SummaryRow
            label="Payout per winning round"
            value={targetOk && stakeOk ? <CreditsAmount value={payoutAt(stakeOk, targetOk)} /> : '—'}
          />
          <SummaryRow
            label={`Most you can stake (${n || 0} × ${stakeOk ? formatAmount(stakeOk) : '—'})`}
            value={most ? <CreditsAmount value={most} /> : '—'}
          />
          <SummaryRow
            label="Most you can lose (stop-loss)"
            value={maxLoss ? <CreditsAmount value={`-${maxLoss}`} /> : 'Set a stop-loss'}
            tone={maxLoss ? 'danger' : 'muted'}
          />
          <SummaryRow label="House edge" value={`${HOUSE_EDGE}%`} />
          <SummaryRow label="Fees" value={<CreditsAmount value="0.00" />} />
          {lossLimit && (
            <SummaryRow
              label={`${lossLimit.period === 'day' ? 'Daily' : lossLimit.period === 'week' ? 'Weekly' : 'Monthly'} loss limit used`}
              value={`${lossLimit.used !== null ? `${formatAmount(lossLimit.used)} / ` : ''}${formatAmount(lossLimit.limit)} DEMO`}
            />
          )}
        </div>

        <p className="flex items-start gap-2 text-caption text-text-secondary">
          <Info aria-hidden className="mt-px size-4 shrink-0 text-text-info" />
          Auto-play also stops if you disconnect, leave the page, a reality check is due, your loss limit is reached, a
          bet isn’t accepted, or you press Stop. Auto cash-out runs on our servers, so it still fires if your connection
          drops mid-round.
        </p>
        {problems.length > 0 && (stopLoss || confirmed) && (
          <p className="text-caption text-text-danger" role="status">
            {problems[0]}
          </p>
        )}
        <CheckboxField
          checked={confirmed}
          onCheckedChange={(v) => setConfirmed(v === true)}
          label="I understand I can lose my stake in every auto round"
          data-testid="autoplay-consent"
        />
        <p className="text-caption text-text-tertiary">
          Up to {AUTO_PLAY_MAX_BETS} rounds · fixed bet · DEMO credits only, no cash value · 18+
        </p>
      </div>
    </ResponsiveModal>
  );
}
