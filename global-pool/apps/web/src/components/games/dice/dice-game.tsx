'use client';

import { fairGame, type DiceCondition, type DiceOutcome, type DiceParams } from '@gp/shared/fair';
import { formatAmount, money } from '@gp/shared/money';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Dice5, Link2, LogIn, Minus, Plus, RotateCcw } from 'lucide-react';
import * as React from 'react';

import {
  AutoPlayPanel,
  BeforeYouBet,
  BetAmountField,
  BetHistory,
  BetPanel,
  CreditsAmount,
  EMPTY_AUTO_DRAFT,
  GAME_MOTION,
  GameLayout,
  HowItWorksCard,
  MobileBetBar,
  MoreGamesRail,
  PanelNotice,
  RecentResults,
  ResultBanner,
  SeedDisplay,
  VerifyDrawer,
  insufficientCopy,
  parseStake,
  payoutPreview,
  profitPreview,
  stakeProblem,
  stakeProblemMessage,
  useAutoPlay,
  useBetRunner,
  useGameGate,
  useReducedMotion,
  type AutoPlayDraft,
  type HistoryColumn,
} from '@/components/games/kit';
import { Button } from '@/components/ui/button';
import { Field, InputControl, InputGroup } from '@/components/ui/input';
import { authKeys } from '@/lib/api/auth';
import { gameKeys, useResetCredits, usePlaceBet, useSeeds, type GameBetView } from '@/lib/api/games';
import { rgKeys } from '@/lib/api/rg-history';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

import {
  chanceString,
  clampTargetH,
  conditionLabel,
  fromHundredths,
  multiplierOf,
  targetFromChanceInput,
  targetFromMultiplierInput,
  targetProblem,
  targetProblemMessage,
  targetRange,
  toHundredths,
} from './dice-math';
import type { RollMarker } from './dice-slider';
import { DiceStage, type DiceStagePhase } from './dice-stage';

const SLUG = 'pool-dice';
const INFO = fairGame(SLUG)!;
/** DI-03 roll animation (motion tokens: slow 400 + deliberate 700 → 800 ms with the ease-out tail). */
const ROLL_MS = GAME_MOTION.deliberate + 100;

export type DiceBet = GameBetView<Record<string, unknown> & DiceParams, Record<string, unknown> & DiceOutcome>;

const describe = (o: Record<string, unknown>) => {
  const d = o as unknown as DiceOutcome;
  if (typeof d.roll !== 'string') return JSON.stringify(o);
  const cmp = d.condition === 'over' ? (d.win ? '≥' : '<') : d.win ? '<' : '≥';
  return `${d.roll} ${cmp} ${d.target} → ${d.win ? 'Win' : 'Lose'} · ${d.multiplier}×`;
};

const COLUMNS: HistoryColumn<DiceBet>[] = [
  {
    id: 'target',
    header: 'Target',
    cell: (b) => (
      <span className="inline-flex items-center gap-1 text-text-secondary">
        {b.outcome.condition === 'under' ? <ChevronDown aria-hidden className="size-3.5" /> : <ChevronUp aria-hidden className="size-3.5" />}
        {conditionLabel(b.outcome.condition, b.outcome.target)}
      </span>
    ),
  },
  { id: 'chance', header: 'Win chance', align: 'right', cell: (b) => `${b.outcome.winChance}%` },
  {
    id: 'roll',
    header: 'Roll',
    cell: (b) => (
      <span className="inline-flex items-center gap-1.5 tabular-nums">
        <span className="text-text-primary">{b.outcome.roll}</span>
        <span className={cn('text-caption', b.win ? 'text-text-brand' : 'text-text-danger')}>{b.win ? 'Win' : 'Lose'}</span>
      </span>
    ),
  },
];

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    tag === 'BUTTON' ||
    tag === 'A' ||
    el.isContentEditable ||
    el.getAttribute('role') === 'radio' ||
    el.getAttribute('role') === 'dialog' ||
    !!el.closest('[role="dialog"]')
  );
}

/** Pool Dice (DI-01 … DI-07) on the games kit. DEMO credits only — no cash value. */
export function DiceGame() {
  const auth = useAuth();
  const qc = useQueryClient();
  const gate = useGameGate();
  const seeds = useSeeds(SLUG);
  const place = usePlaceBet<DiceBet>(SLUG);
  const reset = useResetCredits();
  const reduced = useReducedMotion();

  const [condition, setCondition] = React.useState<DiceCondition>('over');
  const [targetH, setTargetH] = React.useState(5050);
  const [targetText, setTargetText] = React.useState<string | null>(null);
  const [chanceText, setChanceText] = React.useState<string | null>(null);
  const [multText, setMultText] = React.useState<string | null>(null);
  const [stake, setStake] = React.useState('10.00');
  const [mode, setMode] = React.useState<'manual' | 'auto'>('manual');
  const [draft, setDraft] = React.useState<AutoPlayDraft>(EMPTY_AUTO_DRAFT);
  const [marker, setMarker] = React.useState<RollMarker | null>(null);
  const [animating, setAnimating] = React.useState(false);
  const [lastBet, setLastBet] = React.useState<DiceBet | null>(null);
  const [verifyId, setVerifyId] = React.useState<string | null>(null);
  const [seedsOpen, setSeedsOpen] = React.useState(false);
  const raf = React.useRef<number | null>(null);

  // ── derived odds ───────────────────────────────────────────────────────────────────────────
  const typedTargetH = targetText !== null ? toHundredths(targetText) : targetH;
  const tProblem = targetProblem(typedTargetH, condition);
  const valid = tProblem === null;
  const chance = valid ? chanceString(targetH, condition) : '—';
  const multiplier = valid ? multiplierOf(targetH, condition) : '—';
  const balance = gate.credits?.balance ?? null;
  const limits = { min: INFO.minBet, max: INFO.maxBet, balance };
  const sProblem = stakeProblem(stake, limits);
  const stakeOk = parseStake(stake);
  const stakeValid = stakeOk !== null && (sProblem === null || sProblem.kind === 'insufficient');
  const payout = valid && stakeValid ? payoutPreview(stakeOk, multiplier) : null;
  const profit = valid && stakeValid ? profitPreview(stakeOk, multiplier) : null;

  // ── bet runner (one idempotency key per roll; network failures retry with the SAME key) ───
  const animateTo = React.useCallback(
    (bet: DiceBet) => {
      const final = toHundredths(bet.outcome.roll) ?? 0;
      const state: RollMarker['state'] = bet.win ? 'win' : 'lose';
      if (raf.current) cancelAnimationFrame(raf.current);
      if (reduced) {
        setMarker({ valueH: final, state });
        setAnimating(false);
        return;
      }
      const from = marker?.valueH ?? targetH;
      const t0 = performance.now();
      setAnimating(true);
      const tick = (now: number) => {
        const k = Math.min(1, (now - t0) / ROLL_MS);
        const eased = 1 - (1 - k) ** 3; // ease-out to the REAL result (no near-miss stops)
        const v = Math.round(from + (final - from) * eased);
        setMarker({ valueH: k >= 1 ? final : v, state: k >= 1 ? state : 'rolling' });
        if (k < 1) raf.current = requestAnimationFrame(tick);
        else {
          raf.current = null;
          setAnimating(false);
        }
      };
      raf.current = requestAnimationFrame(tick);
    },
    [reduced, marker?.valueH, targetH],
  );
  React.useEffect(() => () => void (raf.current && cancelAnimationFrame(raf.current)), []);

  const params: DiceParams = { target: fromHundredths(targetH), condition };
  const runner = useBetRunner<DiceBet>(
    (idempotencyKey) => place.mutateAsync({ stake: stakeOk ?? stake, params: { ...params }, idempotencyKey }),
    {
      onSettled: (bet) => {
        setLastBet(bet);
        animateTo(bet);
      },
      onError: (e) => {
        if (['loss_limit', 'time_limit', 'self_excluded', 'region', 'blocked'].includes(e.kind)) {
          void qc.invalidateQueries({ queryKey: rgKeys.all });
          void qc.invalidateQueries({ queryKey: authKeys.accountStatus });
          void qc.invalidateQueries({ queryKey: gameKeys.credits });
        }
      },
    },
  );

  const busy = runner.busy || animating;
  const canBet = gate.gate === 'ok' && valid && sProblem === null && !busy;

  const auto = useAutoPlay(
    async () => {
      const bet = await runner.run();
      if (bet) return { net: bet.net };
      return runner.lastError()?.kind === 'reality_check' ? { stop: 'reality_check' as const } : null;
    },
    reduced ? 400 : ROLL_MS + 300,
  );

  const roll = React.useCallback(() => {
    if (!canBet || auto.running) return;
    setMarker((m) => (m ? { ...m, state: 'rolling' } : m));
    void runner.run();
  }, [canBet, auto.running, runner]);

  // Space to roll (not while typing / in a dialog); the slider handles its own arrows.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat || isTyping(e.target) || mode !== 'manual') return;
      e.preventDefault();
      roll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [roll, mode]);

  // ── linked inputs: target ↔ win chance ↔ multiplier ───────────────────────────────────────
  const setTarget = (tH: number) => {
    setTargetH(clampTargetH(tH, condition));
    setTargetText(null);
    setChanceText(null);
    setMultText(null);
    if (runner.phase === 'failed') runner.reset();
  };
  const flip = (c: DiceCondition) => {
    if (c === condition) return;
    // Keep the win chance: over 50.50 (49.50 %) ↔ under 49.50 (49.50 %).
    const cH = condition === 'over' ? 10_000 - targetH : targetH;
    setCondition(c);
    setTargetH(clampTargetH(c === 'over' ? 10_000 - cH : cH, c));
    setTargetText(null);
    setChanceText(null);
    setMultText(null);
  };

  const stageLocked = gate.gate !== 'ok';
  const phase: DiceStagePhase =
    gate.gate === 'loading' && !gate.credits
      ? 'loading'
      : runner.phase === 'reconnecting'
        ? 'reconnecting'
        : runner.phase === 'placing'
          ? 'rolling'
          : marker
            ? 'settled'
            : 'idle';

  const nextNonce = seeds.data?.active.nonce ?? null;
  const range = targetRange(condition);
  const condWord = condition === 'over' ? 'over' : 'under';
  const ctaLabel = !valid
    ? `Set a target from ${fromHundredths(range.min)} to roll`
    : sProblem?.kind === 'above_max'
      ? 'Lower your bet to roll'
      : sProblem?.kind === 'insufficient'
        ? 'Not enough DEMO credits'
        : runner.phase === 'reconnecting'
          ? 'Reconnecting…'
          : busy
            ? 'Rolling…'
            : `${lastBet ? 'Roll again' : 'Roll'} ${condWord} ${fromHundredths(targetH)} · ${formatAmount(stakeOk ?? '0')} DEMO`;

  const cta = (className?: string) =>
    gate.gate === 'guest' ? (
      <Button size="l" block className={className} onClick={() => auth.signIn()} leadingIcon={<LogIn aria-hidden />}>
        Sign in to play
      </Button>
    ) : (
      <Button
        size="l"
        block
        className={className}
        disabled={!canBet || auto.running}
        loading={runner.phase === 'placing'}
        onClick={roll}
        leadingIcon={<Dice5 aria-hidden />}
        data-testid="dice-roll"
      >
        {ctaLabel}
      </Button>
    );

  const e = runner.phase === 'failed' ? runner.error : null;
  const refusal =
    e &&
    (e.kind === 'insufficient' ? (
      <PanelNotice tone="warning" title="Not enough DEMO credits" actions={resetActions()}>
        {insufficientCopy(typeof e.details.available === 'string' ? e.details.available : balance)}
      </PanelNotice>
    ) : e.kind === 'reality_check' ? (
      <PanelNotice title="Time for your reality check">
        Answer the reminder to keep playing — it only appears between rolls.
      </PanelNotice>
    ) : (
      <PanelNotice tone={e.kind === 'loss_limit' || e.kind === 'self_excluded' ? 'warning' : 'danger'} title="This roll wasn’t placed">
        {e.message}
        {e.requestId ? ` · ref ${e.requestId}` : ''}
      </PanelNotice>
    ));

  function resetActions() {
    const r = gate.credits?.reset;
    const minOk = balance !== null && money(balance).gte(money(INFO.minBet));
    return (
      <>
        {minOk && (
          <Button variant="secondary" size="s" className="min-h-11 tablet:min-h-8" onClick={() => balance && setStake(money(balance).toDecimalPlaces(2, 1).toFixed(2))}>
            Bet {formatAmount(balance)} instead
          </Button>
        )}
        <Button
          variant="ghost"
          size="s"
          className="min-h-11 tablet:min-h-8"
          disabled={!r?.available || reset.isPending}
          loading={reset.isPending}
          onClick={() => void reset.mutateAsync().then(() => runner.reset())}
          leadingIcon={<RotateCcw aria-hidden />}
        >
          {r?.available ? `Reset to ${formatAmount(r.to)} DEMO` : 'Reset available hourly'}
        </Button>
      </>
    );
  }

  const insufficientBeforeBet =
    sProblem?.kind === 'insufficient' && gate.gate === 'ok' ? (
      <PanelNotice tone="warning" title="Not enough DEMO credits" actions={resetActions()}>
        {insufficientCopy(balance)}
      </PanelNotice>
    ) : sProblem?.kind === 'above_max' ? (
      <PanelNotice
        tone="danger"
        title={`Max bet is ${formatAmount(INFO.maxBet)} DEMO per roll`}
        actions={
          <Button variant="secondary" size="s" className="min-h-11 tablet:min-h-8" onClick={() => setStake(money(INFO.maxBet).toFixed(2))}>
            Set to {formatAmount(INFO.maxBet)} DEMO
          </Button>
        }
      >
        Your bet is never changed for you — lower it or use the button.
      </PanelNotice>
    ) : null;

  const amountError = sProblem && sProblem.kind !== 'empty' ? stakeProblemMessage(sProblem) : null;
  const disabledInputs = busy || auto.running || stageLocked;

  const numberField = (
    id: 'chance' | 'mult',
    label: string,
    value: string,
    text: string | null,
    setText: (v: string | null) => void,
    toTarget: (v: string) => number | null,
    suffix: string,
  ) => (
    <Field label={label} disabled={disabledInputs}>
      <InputGroup size="l">
        <InputControl
          value={text ?? value}
          inputMode="decimal"
          autoComplete="off"
          onChange={(ev) => {
            const v = ev.target.value.replace(/[^\d.]/g, '');
            setText(v);
            const t = toTarget(v);
            if (t !== null && targetProblem(t, condition) === null) setTargetH(t);
          }}
          onBlur={() => setText(null)}
          aria-label={`${label}${id === 'chance' ? ' in percent' : ''}`}
          className="text-number-s"
        />
        <span className="text-label-m text-text-tertiary">{suffix}</span>
      </InputGroup>
    </Field>
  );

  const manualPanel = (
    <div className="flex flex-col gap-5">
      <BetAmountField
        value={stake}
        onChange={(v) => {
          setStake(v);
          if (runner.phase === 'failed') runner.reset();
        }}
        limits={limits}
        error={amountError}
        disabled={disabledInputs}
      />
      <Field label="Direction" disabled={disabledInputs}>
        <div role="radiogroup" aria-label="Direction" className="grid grid-cols-2 gap-1 rounded-md border border-border-subtle bg-bg-secondary p-1">
          {(['over', 'under'] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={condition === c}
              disabled={disabledInputs}
              onClick={() => flip(c)}
              className={cn(
                'inline-flex h-11 items-center justify-center gap-1.5 rounded-sm text-label-m text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus disabled:text-text-disabled tablet:h-10',
                condition === c && 'border border-border-brand bg-brand-tint text-text-brand',
              )}
            >
              {c === 'over' ? <ChevronUp aria-hidden className="size-4" /> : <ChevronDown aria-hidden className="size-4" />}
              Roll {c}
            </button>
          ))}
        </div>
      </Field>
      <Field
        label={condition === 'over' ? 'Roll over' : 'Roll under'}
        labelAside={<span className="text-caption text-text-tertiary">Target {fromHundredths(range.min)} – {fromHundredths(range.max)}</span>}
        error={targetProblemMessage(tProblem, condition) ?? undefined}
        disabled={disabledInputs}
      >
        <InputGroup size="l" className="h-14 pr-1.5">
          <InputControl
            value={targetText ?? fromHundredths(targetH)}
            inputMode="decimal"
            autoComplete="off"
            onChange={(ev) => {
              const v = ev.target.value.replace(/[^\d.]/g, '').slice(0, 5);
              setTargetText(v);
              const t = toHundredths(v);
              if (t !== null && targetProblem(t, condition) === null) {
                setTargetH(t);
                setChanceText(null);
                setMultText(null);
              }
            }}
            onBlur={() => {
              const t = toHundredths(targetText ?? '');
              if (targetText !== null && t !== null && targetProblem(t, condition) === null) setTarget(t);
              else if (targetText !== null && t === null) setTargetText(null);
            }}
            aria-label={`Target — roll ${condition}`}
            className="text-number-m"
            data-testid="dice-target"
          />
          <Button variant="secondary" size="s" className="size-11 px-0 tablet:size-9" aria-label="Lower the target by 1.00" disabled={disabledInputs} onClick={() => setTarget(targetH - 100)}>
            <Minus aria-hidden />
          </Button>
          <Button variant="secondary" size="s" className="size-11 px-0 tablet:size-9" aria-label="Raise the target by 1.00" disabled={disabledInputs} onClick={() => setTarget(targetH + 100)}>
            <Plus aria-hidden />
          </Button>
        </InputGroup>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        {numberField('chance', 'Win chance', chance, chanceText, setChanceText, (v) => targetFromChanceInput(v, condition), '%')}
        {numberField('mult', 'Multiplier', multiplier, multText, setMultText, (v) => targetFromMultiplierInput(v, condition), '×')}
      </div>
      <p className="flex items-start gap-1.5 text-caption text-text-tertiary">
        <Link2 aria-hidden className="mt-px size-3.5 shrink-0" />
        Change any of the three — the other two update instantly. Multiplier = 99 ÷ win chance. The server re-checks them
        when you roll.
      </p>
    </div>
  );

  const panel = (
    <BetPanel mode={mode} onModeChange={setMode}>
      {mode === 'manual' ? (
        manualPanel
      ) : (
        <div className="flex flex-col gap-5">
          <BetAmountField value={stake} onChange={setStake} limits={limits} error={amountError} disabled={disabledInputs} />
          <p className="text-caption text-text-secondary">
            Auto-play rolls {condWord} {fromHundredths(targetH)} ({chance}% · {multiplier}×). Set the target in Manual first.
          </p>
          <AutoPlayPanel
            stake={stakeOk ?? ''}
            draft={draft}
            onDraftChange={setDraft}
            auto={auto}
            onStart={(cfg) => void auto.start(cfg)}
            disabled={!canBet && !auto.running}
            noun="roll"
          />
        </div>
      )}
      <BeforeYouBet
        houseEdge={INFO.houseEdgePercent}
        rows={[
          { label: 'Win chance', value: valid ? `${chance}%` : '—' },
          {
            label: 'Payout on win',
            value: payout ? (
              <>
                <CreditsAmount value={payout} /> ({multiplier}×)
              </>
            ) : (
              '—'
            ),
          },
          { label: 'Profit on win', value: profit ? <CreditsAmount value={profit} signed /> : '—', tone: 'text-text-success' },
          { label: 'Bet limits', value: `${formatAmount(INFO.minBet)} – ${formatAmount(INFO.maxBet)} DEMO` },
        ]}
        limits={`Min ${formatAmount(INFO.minBet)} · Max ${formatAmount(INFO.maxBet)} DEMO per roll.`}
      />
      {insufficientBeforeBet ?? refusal}
      {mode === 'manual' && (
        <div className="hidden flex-col gap-2 tablet:flex">
          {cta()}
          <p className="text-center text-caption text-text-tertiary">
            {lastBet && !lastBet.win
              ? `A loss doesn’t make a win “due” — the next roll is still ${chance}%.`
              : 'Space to roll · ← → moves the target by 1.00 · results settle on the server'}
          </p>
        </div>
      )}
    </BetPanel>
  );

  const result =
    lastBet && marker && marker.state !== 'rolling' && !busy ? (
      <ResultBanner
        bet={lastBet}
        headline={lastBet.win ? undefined : 'No win this roll'}
        detail={
          lastBet.win
            ? `Pool Dice · rolled ${lastBet.outcome.roll} · ${conditionLabel(lastBet.outcome.condition, lastBet.outcome.target).toLowerCase()} · ${lastBet.outcome.multiplier}×`
            : `Pool Dice · rolled ${lastBet.outcome.roll} · you needed ${lastBet.outcome.condition === 'over' ? `${lastBet.outcome.target} or higher` : `below ${lastBet.outcome.target}`}`
        }
        onVerify={() => setVerifyId(lastBet.id)}
      />
    ) : null;

  const stage = (
    <DiceStage
      phase={phase}
      targetH={targetH}
      condition={condition}
      onTargetChange={setTarget}
      valid={valid}
      chance={chance}
      multiplier={multiplier}
      payout={payout}
      marker={marker}
      nextNonce={nextNonce}
      serverSeedHash={seeds.data?.active.serverSeedHash ?? null}
      settledRef={runner.phase === 'reconnecting' ? null : lastBet?.ref}
      disabled={disabledInputs}
      instant={reduced}
      result={result}
    />
  );

  return (
    <>
      <GameLayout
        slug={SLUG}
        title="Pool Dice"
        mechanic="Dice · roll over / under"
        icon={Dice5}
        gate={gate}
        busy={busy || auto.running}
        onFairness={() => setSeedsOpen(true)}
        notice={
          runner.phase === 'reconnecting'
            ? {
                kind: 'reconnecting',
                reconnect: {
                  attempt: runner.attempt,
                  max: runner.maxAttempts,
                  stake: stakeOk ?? undefined,
                  sentAt: runner.sentAt,
                  onRetry: runner.retryNow,
                },
              }
            : undefined
        }
        panel={panel}
        stage={stage}
        mobileBar={
          mode === 'manual' ? (
            <MobileBetBar
              summary={
                profit ? (
                  <>
                    Profit on win <CreditsAmount value={profit} signed tone="net" />
                  </>
                ) : (
                  'Set a valid bet'
                )
              }
            >
              {cta()}
            </MobileBetBar>
          ) : undefined
        }
        below={
          <section className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-5" aria-label="Recent results">
            <RecentResults<DiceBet> slug={SLUG} label={(b) => b.outcome.roll} onSelect={(b) => setVerifyId(b.id)} />
          </section>
        }
        aside={
          <HowItWorksCard
            slug={SLUG}
            intro="Pick a target and roll over or under it. Every roll is a number from 0.00 to 99.99 fixed by your seeds."
            rows={[
              { label: 'Win chance', value: '0.01% – 98.00%' },
              { label: 'Example', value: 'over 50.50 → 49.50% · 2.0000×' },
            ]}
          />
        }
      >
        <div id="my-bets" className="scroll-mt-24">
          <BetHistory<DiceBet>
            slug={SLUG}
            title="My rolls"
            noun="roll"
            columns={COLUMNS}
            summary={(b) => `${conditionLabel(b.outcome.condition, b.outcome.target)} · ${b.outcome.roll} · ${b.outcome.multiplier}×`}
            multiplier={(b) => b.outcome.multiplier}
            onVerify={(b) => setVerifyId(b.id)}
          />
        </div>
        <SeedDisplay slug={SLUG} disabled={busy || auto.running} open={seedsOpen} onOpenChange={setSeedsOpen} />
        <MoreGamesRail current={SLUG} />
      </GameLayout>
      <VerifyDrawer
        betId={verifyId}
        open={verifyId !== null}
        onOpenChange={(o) => !o && setVerifyId(null)}
        describeOutcome={describe}
        noun="roll"
        formula="roll = uniformInt(0, 9999) ÷ 100 on the HMAC-SHA256(server seed, “client seed:nonce:0”) bytes — rejection sampling, no modulo bias."
      />
    </>
  );
}
