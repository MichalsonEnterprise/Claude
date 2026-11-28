'use client';

import type { CoinSide } from '@gp/shared/fair';
import { formatAmount, money } from '@gp/shared/money';
import { useQueryClient } from '@tanstack/react-query';
import { BookOpen, ChevronRight, Coins, Info, LogIn, RotateCcw, ShieldCheck, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import {
  AutoPlayPanel,
  CreditsAmount,
  DemoCreditsChip,
  EMPTY_AUTO_DRAFT,
  GAME_MOTION,
  GameLayout,
  KitChip,
  KvRow,
  MobileBetBar,
  MoreGamesRail,
  PanelNotice,
  ResultBanner,
  SeedDisplay,
  StakeRiskNote,
  VerifyDrawer,
  BetAmountField,
  insufficientCopy,
  parseStake,
  stakeProblem,
  stakeProblemMessage,
  useAutoPlay,
  useBetRunner,
  useGameGate,
  useReducedMotion,
  type AutoPlayDraft,
} from '@/components/games/kit';
import { holdRealityCheck } from '@/components/rg-history/reality-check';
import { AgeBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Skeleton } from '@/components/ui/skeleton';
import { authKeys } from '@/lib/api/auth';
import { gameKeys, useGameBets, usePlaceBet, useResetCredits, useSeeds } from '@/lib/api/games';
import { rgKeys } from '@/lib/api/rg-history';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';

import { SideDisc } from './coin';
import {
  HOUSE_EDGE,
  INFO,
  MULTIPLIER,
  SLUG,
  WIN_CHANCE,
  describeFlipOutcome,
  landedCounts,
  other,
  payoutOnWin,
  sideLabel,
  type CoinflipBet,
} from './coinflip-math';
import { CoinflipStage, type FlipPhase } from './coinflip-stage';
import { COINFLIP_ROUTES } from './routes';

/** CF-02 flip duration (motion token coin-flip = 1600 ms). Reduced motion = instant reveal. */
const FLIP_MS = GAME_MOTION.coinFlip;

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
    !!el.closest('[role="dialog"]')
  );
}

/** "Recent results · Last 12 flips" (landed sides, newest outlined) + counts; each disc opens the verifier. */
function RecentFlips({ onVerify }: { onVerify: (b: CoinflipBet) => void }) {
  const q = useGameBets<CoinflipBet>(SLUG, 1, 12);
  const items = q.data?.items ?? [];
  const counts = landedCounts(items.map((b) => b.outcome.side));
  return (
    <section
      id="my-bets"
      aria-labelledby="recent-flips"
      className="flex scroll-mt-24 flex-col gap-3 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-5"
    >
      <div className="flex items-start gap-3">
        <Coins aria-hidden className="mt-0.5 size-5 shrink-0 text-icon-muted" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 id="recent-flips" className="text-body-m-strong text-text-primary">
            Recent results
          </h2>
          <p className="text-caption text-text-tertiary">Your last {items.length || 12} flips · newest first</p>
        </div>
        <DemoBadge size="s" className="mt-0.5" />
        <Link
          href={COINFLIP_ROUTES.myFlips}
          className="-mt-2.5 inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap text-label-m text-text-brand underline-offset-4 hover:underline tablet:mt-0 tablet:min-h-0"
        >
          View all <ChevronRight aria-hidden className="size-4" />
        </Link>
      </div>
      {q.isPending ? (
        <Skeleton className="h-9 w-full" />
      ) : items.length ? (
        <ul className="no-scrollbar flex gap-2 overflow-x-auto py-1" aria-label="Your last flips, newest first">
          {items.map((b, i) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onVerify(b)}
                className="flex size-11 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-border-focus"
                aria-label={`${b.ref}: landed ${sideLabel(b.outcome.side)}, ${b.win ? 'win' : 'lose'} — verify`}
              >
                <SideDisc side={b.outcome.side} size={i === 0 ? 36 : 32} newest={i === 0} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body-s text-text-tertiary">No flips yet — your results appear here with the seeds to verify them.</p>
      )}
      <p className="flex items-start gap-1.5 text-caption text-text-tertiary">
        <Info aria-hidden className="mt-px size-3.5 shrink-0" />
        {items.length
          ? `Heads ${counts.heads} · Tails ${counts.tails} — every flip is 50 / 50 before the house edge; a run never makes a side “due”.`
          : 'Every flip is 50 / 50 before the house edge; a run never makes a side “due”.'}
      </p>
    </section>
  );
}

/** "How Double Side works" (published rules, edge, RTP, limits). */
function HowDoubleSideWorks() {
  const steps = [
    `Pick Heads or Tails. Both sides have a ${WIN_CHANCE}% chance on every flip.`,
    `A win pays ${MULTIPLIER}× your bet (house edge ${HOUSE_EDGE}%): 10.00 → 19.60 DEMO. A loss returns nothing.`,
    'The side is fixed by your seed pair and nonce before you flip — check any flip in Fairness.',
  ];
  return (
    <section
      aria-labelledby="how-double-side"
      className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-5"
    >
      <div className="flex items-center gap-2">
        <BookOpen aria-hidden className="size-5 text-icon-brand" />
        <h2 id="how-double-side" className="text-h5 text-text-primary">
          How Double Side works
        </h2>
        <span className="ml-auto text-caption text-text-tertiary">rules {INFO.rulesVersion}</span>
      </div>
      <ol className="flex flex-col gap-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-body-s text-text-secondary">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-raised text-label-s text-text-secondary">
              {i + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-1.5 border-t border-border-subtle pt-3">
        <KvRow label="House edge" value={`${INFO.houseEdgePercent}% · RTP ${INFO.rtpPercent}%`} />
        <KvRow label="Bet limits" value={`${formatAmount(INFO.minBet)} – ${formatAmount(INFO.maxBet)} DEMO per flip`} />
        <KvRow label="Fees" value="0.00 DEMO" />
      </div>
      <p className="flex items-center gap-2 text-caption text-text-tertiary">
        <AgeBadge /> Simulation · DEMO credits only · no cash value · permitted regions only
      </p>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        <Link href={COINFLIP_ROUTES.details} className="inline-flex min-h-11 items-center gap-1.5 text-label-m text-text-primary hover:text-text-brand tablet:min-h-0">
          <BookOpen aria-hidden className="size-4" /> Rules & payouts
        </Link>
        <Link href={COINFLIP_ROUTES.fairness} className="inline-flex min-h-11 items-center gap-1.5 text-label-m text-text-primary hover:text-text-brand tablet:min-h-0">
          <ShieldCheck aria-hidden className="size-4" /> Verify a flip
        </Link>
      </div>
    </section>
  );
}

/** Double Side (CF-01 … CF-06) on the games kit. DEMO credits only — no cash value. */
export function CoinflipGame() {
  const auth = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const gate = useGameGate();
  const seeds = useSeeds(SLUG);
  const place = usePlaceBet<CoinflipBet>(SLUG);
  const reset = useResetCredits();
  const reduced = useReducedMotion();
  const recent = useGameBets<CoinflipBet>(SLUG, 1, 12);

  const [pick, setPick] = React.useState<CoinSide>('heads');
  const [stake, setStake] = React.useState('10.00');
  const [mode, setMode] = React.useState<'manual' | 'auto'>('manual');
  const [draft, setDraft] = React.useState<AutoPlayDraft>(EMPTY_AUTO_DRAFT);
  const [coinSide, setCoinSide] = React.useState<CoinSide>('heads');
  const [flipId, setFlipId] = React.useState(0);
  const [animating, setAnimating] = React.useState(false);
  const [lastBet, setLastBet] = React.useState<CoinflipBet | null>(null);
  /** The last result is still on the stage (cleared when the player changes pick). */
  const [showResult, setShowResult] = React.useState(false);
  const [verifyId, setVerifyId] = React.useState<string | null>(null);
  /** Reality checks only between flips: hold the reminder while the coin is still revealing the settled side. */
  const revealHold = React.useRef<(() => void) | null>(null);
  const endReveal = React.useCallback(() => {
    setAnimating(false);
    revealHold.current?.();
    revealHold.current = null;
  }, []);
  React.useEffect(() => () => revealHold.current?.(), []);

  const balance = gate.credits?.balance ?? null;
  const limits = { min: INFO.minBet, max: INFO.maxBet, balance };
  const sProblem = stakeProblem(stake, limits);
  const stakeOk = parseStake(stake);
  const stakeValid = stakeOk !== null && (sProblem === null || sProblem.kind === 'insufficient');
  const payout = stakeValid && stakeOk ? payoutOnWin(stakeOk) : null;
  const profit = payout && stakeOk ? money(payout).minus(money(stakeOk)).toFixed(2) : null;

  // ── bet runner: one idempotency key per flip; network failures retry with the SAME key ──────────
  const runner = useBetRunner<CoinflipBet>(
    (idempotencyKey) => place.mutateAsync({ stake: stakeOk ?? stake, params: { pick }, idempotencyKey }),
    {
      onSettled: (bet) => {
        setLastBet(bet);
        setShowResult(true);
        if (!reduced) {
          revealHold.current?.();
          revealHold.current = holdRealityCheck();
          setAnimating(true);
        }
        setCoinSide(bet.outcome.side);
        setFlipId((n) => n + 1);
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
  const canBet = gate.gate === 'ok' && sProblem === null && !busy;

  const auto = useAutoPlay(
    async () => {
      const bet = await runner.run();
      if (bet) return { net: bet.net };
      return runner.lastError()?.kind === 'reality_check' ? { stop: 'reality_check' as const } : null;
    },
    reduced ? 400 : FLIP_MS + 500,
  );

  const flip = React.useCallback(() => {
    if (!canBet || auto.running) return;
    setShowResult(false);
    void runner.run();
  }, [canBet, auto.running, runner]);

  const choose = React.useCallback(
    (s: CoinSide) => {
      if (busy || auto.running) return;
      setPick(s);
      setShowResult(false);
      setCoinSide(s);
      if (runner.phase === 'failed') runner.reset();
    },
    [busy, auto.running, runner],
  );

  // Keyboard: H / T pick a side, Space flips (not while typing or in a dialog).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === 'h' || e.key === 'H') choose('heads');
      else if (e.key === 't' || e.key === 'T') choose('tails');
      else if (e.code === 'Space' && mode === 'manual') {
        e.preventDefault();
        flip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [choose, flip, mode]);

  const phase: FlipPhase =
    gate.gate === 'loading' && !gate.credits
      ? 'loading'
      : runner.phase === 'reconnecting'
        ? 'reconnecting'
        : runner.phase === 'placing' || animating
          ? 'flipping'
          : showResult && lastBet
            ? 'settled'
            : 'idle';

  const nextNonce = seeds.data?.active.nonce ?? null;
  const ctaLabel =
    sProblem?.kind === 'above_max'
      ? 'Lower your bet to flip'
      : sProblem?.kind === 'insufficient'
        ? 'Not enough DEMO credits'
        : sProblem?.kind === 'below_min' || sProblem?.kind === 'empty'
          ? 'Enter a bet to flip'
          : runner.phase === 'reconnecting'
            ? 'Reconnecting…'
            : busy
              ? 'Flipping…'
              : `${lastBet ? 'Flip again' : 'Flip'} for ${sideLabel(pick)} · ${formatAmount(stakeOk ?? '0')} DEMO`;

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
        loading={runner.phase === 'placing' || runner.phase === 'reconnecting'}
        onClick={flip}
        leadingIcon={<Coins aria-hidden />}
        data-testid="coinflip-flip"
      >
        {ctaLabel}
      </Button>
    );

  function resetActions() {
    const r = gate.credits?.reset;
    const minOk = balance !== null && money(balance).gte(money(INFO.minBet));
    const instead = balance !== null ? money(balance).toDecimalPlaces(2, 1).toFixed(2) : null;
    return (
      <>
        {minOk && instead && (
          <Button variant="secondary" size="s" className="min-h-11 tablet:min-h-8" onClick={() => setStake(instead)}>
            Bet {formatAmount(instead)} DEMO instead
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

  const e = runner.phase === 'failed' ? runner.error : null;
  const refusal =
    e &&
    (e.kind === 'insufficient' ? (
      <PanelNotice tone="warning" title="Not enough DEMO credits" actions={resetActions()}>
        {insufficientCopy(typeof e.details.available === 'string' ? e.details.available : balance)}
      </PanelNotice>
    ) : e.kind === 'reality_check' ? (
      <PanelNotice title="Time for your reality check">
        Answer the reminder to keep playing — it only appears between flips.
      </PanelNotice>
    ) : (
      <PanelNotice tone={e.kind === 'loss_limit' || e.kind === 'self_excluded' ? 'warning' : 'danger'} title="This flip wasn’t placed">
        {e.message}
        {e.requestId ? ` · ref ${e.requestId}` : ''}
      </PanelNotice>
    ));

  const stakeNotice =
    sProblem?.kind === 'insufficient' && gate.gate === 'ok' ? (
      <PanelNotice tone="warning" title="Not enough DEMO credits for this flip" actions={resetActions()}>
        {insufficientCopy(balance)} Your pick stays on {sideLabel(pick)} and nothing has been charged.
      </PanelNotice>
    ) : sProblem?.kind === 'above_max' ? (
      <PanelNotice
        tone="danger"
        title={`Max bet is ${formatAmount(INFO.maxBet)} DEMO per flip`}
        actions={
          <Button variant="secondary" size="s" className="min-h-11 tablet:min-h-8" onClick={() => setStake(money(INFO.maxBet).toFixed(2))}>
            Set to {formatAmount(INFO.maxBet)} DEMO
          </Button>
        }
      >
        Double Side accepts {formatAmount(INFO.minBet)} – {formatAmount(INFO.maxBet)} DEMO per flip. Your bet is never
        changed for you — lower it or use the button.
      </PanelNotice>
    ) : null;

  const canBetBalance = balance !== null && money(balance).gte(money(INFO.minBet));
  const amountError =
    sProblem && sProblem.kind !== 'empty'
      ? sProblem.kind === 'insufficient' && stakeOk && balance
        ? `Not enough DEMO credits — ${formatAmount(stakeOk)} needed, ${formatAmount(balance)} available. ${
            canBetBalance
              ? `Bet ${formatAmount(money(balance).toDecimalPlaces(2, 1).toFixed(2))} or less, or reset your DEMO credits.`
              : 'Reset your DEMO credits to keep playing.'
          }`
        : sProblem.kind === 'above_max'
          ? `Max bet is ${formatAmount(INFO.maxBet)} DEMO per flip. Set ${formatAmount(INFO.maxBet)} or less to continue.`
          : stakeProblemMessage(sProblem)
      : null;
  const stageLocked = gate.gate !== 'ok';
  const disabledInputs = busy || auto.running || stageLocked;

  // stage copy for the CF-06 stake states (nothing is charged)
  const stageTitle =
    phase === 'idle' && gate.gate === 'ok'
      ? sProblem?.kind === 'insufficient'
        ? 'Not enough DEMO credits for this flip'
        : sProblem?.kind === 'above_max'
          ? 'Bet is above the table maximum'
          : undefined
      : undefined;
  const stageBody =
    stageTitle && sProblem?.kind === 'insufficient' && balance ? (
      <>
        You have <CreditsAmount value={balance} /> available.{' '}
        {canBetBalance ? 'Lower the bet or reset your DEMO credits' : 'Reset your DEMO credits (once per hour) to keep playing'}{' '}
        — your pick stays on {sideLabel(pick)} and nothing has been charged. DEMO credits can’t be bought.
      </>
    ) : stageTitle ? (
      `Double Side accepts ${formatAmount(INFO.minBet)} – ${formatAmount(INFO.maxBet)} DEMO per flip. Your pick stays on ${sideLabel(pick)}.`
    ) : undefined;

  const tiles: { id: string; label: React.ReactNode; value: React.ReactNode; sub: React.ReactNode; tone?: string }[] = [
    { id: 'chance', label: 'Win chance', value: `${WIN_CHANCE}%`, sub: 'Same for Heads and Tails' },
    { id: 'payout', label: 'Payout', value: `${MULTIPLIER}×`, sub: `House edge ${HOUSE_EDGE}% · RTP ${INFO.rtpPercent}%` },
    {
      id: 'profit',
      label: (
        <>
          Profit<span className="hidden tablet:inline"> on win</span>
        </>
      ),
      value: profit ? <CreditsAmount value={profit} signed /> : '—',
      sub: payout ? (
        <>
          You receive <CreditsAmount value={payout} />
        </>
      ) : (
        `Enter a bet within ${formatAmount(INFO.minBet)} – ${formatAmount(INFO.maxBet)} DEMO`
      ),
      tone: profit ? 'text-text-success' : 'text-text-tertiary',
    },
  ];

  const modeSwitch = (
    <div role="radiogroup" aria-label="Bet mode" className="inline-grid grid-cols-2 gap-1 rounded-md border border-border-subtle bg-surface-default p-1">
      {(['manual', 'auto'] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={() => setMode(m)}
          disabled={auto.running}
          className={cn(
            'h-11 min-w-20 rounded-sm px-3 text-label-m capitalize text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-border-focus tablet:h-9',
            mode === m && 'border border-border-brand bg-brand-tint text-text-brand',
          )}
        >
          {m}
        </button>
      ))}
    </div>
  );

  const panel = (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        {modeSwitch}
        {gate.gate !== 'guest' && (
          <DemoCreditsChip
            data={gate.credits}
            loading={gate.gate === 'loading'}
            disabled={busy || auto.running}
            compact
            className="ml-auto hidden min-w-0 tablet:flex"
          />
        )}
      </div>
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] lg:gap-6">
        <BetAmountField
          value={stake}
          onChange={(v) => {
            setStake(v);
            if (runner.phase === 'failed') runner.reset();
          }}
          limits={limits}
          error={amountError}
          disabled={disabledInputs}
          helper={`Min ${formatAmount(INFO.minBet)} · Max ${formatAmount(INFO.maxBet)} DEMO per flip`}
        />
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-label-m text-text-secondary">
              {busy ? 'This flip — locked' : lastBet && phase === 'settled' ? 'Next flip' : 'This flip'}
              <span className="text-text-tertiary"> · {sideLabel(pick)}</span>
            </p>
            <DemoBadge size="s" />
          </div>
          <dl className="grid grid-cols-3 gap-2 tablet:gap-3">
            {tiles.map((t) => (
              <div key={t.id} className="flex min-w-0 flex-col gap-1 rounded-lg border border-border-subtle bg-surface-default p-2.5 tablet:bg-surface-raised tablet:p-3.5">
                <dt className="text-[10px] font-semibold tracking-[0.06em] text-text-tertiary uppercase tablet:text-overline">{t.label}</dt>
                <dd className={cn('text-body-m-strong break-words text-text-primary tablet:text-number-m', t.tone)}>{t.value}</dd>
                <dd className="hidden text-caption text-text-tertiary tablet:block">{t.sub}</dd>
              </div>
            ))}
          </dl>
          <p className="flex items-start gap-1.5 text-caption text-text-tertiary" data-testid="coinflip-fees">
            <Info aria-hidden className="mt-px size-3.5 shrink-0" />
            <span>
              <span className="text-text-secondary">Fees 0.00 DEMO</span> — no platform or network fee on game bets; the{' '}
              {HOUSE_EDGE}% house edge is already in the {MULTIPLIER}× payout.
            </span>
          </p>
        </div>
      </div>

      {mode === 'auto' && (
        <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-default p-4">
          <p className="text-caption text-text-secondary">
            Auto-play calls <strong className="text-text-primary">{sideLabel(pick)}</strong> on every flip ({WIN_CHANCE}% ·{' '}
            {MULTIPLIER}×) with the same stake. Switch to Manual to change the side.
          </p>
          <AutoPlayPanel
            stake={stakeOk ?? ''}
            draft={draft}
            onDraftChange={setDraft}
            auto={auto}
            onStart={(cfg) => void auto.start(cfg)}
            disabled={!canBet && !auto.running}
            noun="flip"
          />
        </div>
      )}

      {stakeNotice ?? refusal}

      <div className="flex flex-col gap-3 laptop:flex-row laptop:items-center laptop:gap-6">
        <StakeRiskNote
          className="laptop:flex-1"
          limits={
            busy && stakeOk
              ? `Stake locked: ${formatAmount(stakeOk)} DEMO. If your connection drops, the flip still settles on the server once and appears in My flips.`
              : lastBet && !lastBet.win && phase === 'settled'
                ? `A loss doesn’t make ${sideLabel(other(lastBet.outcome.side))} “due” — the next flip is still ${WIN_CHANCE}% for either side.`
                : `Min ${formatAmount(INFO.minBet)} · Max ${formatAmount(INFO.maxBet)} DEMO per flip.`
          }
        />
        {mode === 'manual' && (
          <div className="hidden flex-col gap-1.5 tablet:flex laptop:w-[340px] laptop:shrink-0">
            {cta()}
            <p className="text-center text-caption text-text-tertiary">H / T pick a side · Space flips</p>
          </div>
        )}
      </div>
    </div>
  );

  const result =
    phase === 'settled' && lastBet ? (
      <ResultBanner
        bet={lastBet}
        headline={lastBet.win ? undefined : 'No win this flip'}
        detail={
          lastBet.win
            ? `Double Side · landed ${sideLabel(lastBet.outcome.side)} · you picked ${sideLabel(lastBet.outcome.pick)} · ${MULTIPLIER}×`
            : `Double Side · landed ${sideLabel(lastBet.outcome.side)} · you picked ${sideLabel(lastBet.outcome.pick)}`
        }
        onVerify={() => setVerifyId(lastBet.id)}
        className="text-left"
      />
    ) : null;

  const last = (recent.data?.items ?? []).map((b) => b.outcome.side);

  const stage = (
    <CoinflipStage
      phase={phase}
      pick={pick}
      onPick={choose}
      coinSide={coinSide}
      flipId={flipId}
      flipMs={FLIP_MS}
      instant={reduced}
      onFlipEnd={endReveal}
      stake={stakeValid ? stakeOk : null}
      payout={payout}
      nonce={nextNonce}
      serverSeedHash={seeds.data?.active.serverSeedHash ?? null}
      bet={phase === 'flipping' && runner.phase === 'placing' ? null : lastBet}
      last={last}
      locked={disabledInputs}
      title={stageTitle}
      body={stageBody}
      result={result}
    />
  );

  return (
    <>
      <GameLayout
        slug={SLUG}
        title="Double Side"
        mechanic="Coinflip · Heads or Tails"
        icon={Coins}
        gate={gate}
        busy={busy || auto.running}
        arrangement="stacked"
        sessionBarPosition="above"
        panelCredits={false}
        headerChips={
          <>
            <KitChip icon={Coins}>Payout {MULTIPLIER}×</KitChip>
            <KitChip icon={Wallet}>
              Bet {formatAmount(INFO.minBet)} – {formatAmount(INFO.maxBet)} DEMO
            </KitChip>
          </>
        }
        onFairness={() => router.push(COINFLIP_ROUTES.fairness)}
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
                    {sideLabel(pick)} · profit on win <CreditsAmount value={profit} signed tone="net" />
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
        below={<RecentFlips onVerify={(b) => setVerifyId(b.id)} />}
        aside={<HowDoubleSideWorks />}
      >
        <SeedDisplay slug={SLUG} disabled={busy || auto.running} />
        <MoreGamesRail current={SLUG} />
      </GameLayout>
      <VerifyDrawer
        betId={verifyId}
        open={verifyId !== null}
        onOpenChange={(o) => !o && setVerifyId(null)}
        describeOutcome={describeFlipOutcome}
        noun="flip"
        formula="x = first 4 bytes of HMAC-SHA256(server seed, “client seed:nonce:0”) ÷ 2³² — Heads if x < 0.5 (u32 < 2³¹), Tails otherwise. Your pick never changes the side."
      />
    </>
  );
}
