'use client';

import { formatRoundNumber } from '@gp/shared/format';
import {
  BookOpen,
  Check,
  CircleCheck,
  CircleX,
  Copy,
  ExternalLink,
  Hash,
  Loader2,
  Lock,
  Pencil,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { ChainMark } from '@/components/brand/chain-mark';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ROUTES } from '@/components/shell/nav-config';
import { useDrawRandomness, useVerifierSample } from '@/lib/data/hooks';
import type { VerifierSample } from '@/lib/data/types';
import { verifyDiceRoll, type DiceVerification } from '@/lib/fairness/dice';
import { cn } from '@/lib/utils';

import { useHomeView } from './home-context';
import { HomeSection, SectionHeader } from './primitives';

const card = 'rounded-xl border border-border-subtle bg-surface-default';
const monoBox =
  'rounded-md border bg-surface-raised px-3 py-2.5 font-mono text-[12px] leading-[18px] break-all text-text-primary';

function Explainer() {
  return (
    <article className={cn(card, 'flex flex-col gap-4 p-6')}>
      <p className="text-overline tracking-[0.08em] text-text-brand uppercase">
        Don’t trust — verify
      </p>
      <h3 className="text-h3 text-text-primary">Every draw and every bet can be checked by you</h3>
      <p className="text-body-m text-text-secondary">
        Global Pool winners are picked by Chainlink VRF on Arbitrum: a random number delivered with
        an on-chain proof. Originals use a server-seed commitment — we publish the seed hash before
        you play and reveal the seed afterwards, so you can recompute every result.
      </p>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button asChild>
          <Link href={ROUTES.provablyFair}>
            <ShieldCheck aria-hidden /> Verify a draw
          </Link>
        </Button>
        <Button variant="ghost" asChild>
          <a href="https://docs.chain.link/vrf" target="_blank" rel="noreferrer">
            How Chainlink VRF works <ExternalLink aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </Button>
      </div>
    </article>
  );
}

function DrawRandomnessCard() {
  const { scenario } = useHomeView();
  const draw = useDrawRandomness(scenario);
  const d = draw.data;
  return (
    <article className={cn(card, 'flex flex-col gap-5 p-6')}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-h5 text-text-primary">Draw randomness</h3>
          <p className="flex items-center gap-1.5 text-caption text-text-tertiary">
            <ChainMark chain="arbitrum" size={14} /> Chainlink VRF · {d?.network ?? 'Arbitrum One'}{' '}
            · Round {d ? formatRoundNumber(d.roundNumber) : '…'}
          </p>
        </div>
        <span className="flex items-center gap-2">
          <StatusBadge status="confirmed" label="Settled" />
          {d?.isDemo && <DemoBadge size="s" />}
        </span>
      </header>
      {d ? (
        <ol className="flex flex-col">
          {d.steps.map((s, i) => (
            <li key={s.id} className="relative flex gap-4 pb-5 last:pb-0">
              {i < d.steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute top-7 bottom-1 left-[11px] w-0.5 bg-brand/60"
                />
              )}
              <span className="relative flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-tint">
                <Check aria-hidden className="size-3.5 text-icon-brand" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-label-m text-text-primary">{s.title}</span>
                  <span className="font-mono text-[12px] text-text-secondary">{s.meta}</span>
                </p>
                <p className="text-body-s text-text-secondary">{s.description}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <Skeleton className="h-56 w-full" />
      )}
      <div className="flex flex-col gap-3 rounded-lg bg-bg-secondary p-3 tablet:flex-row tablet:items-center">
        <div className="px-1">
          <p className="text-caption text-text-tertiary">VRF request ID</p>
          <p className="text-caption text-text-secondary">{d?.network ?? 'Arbitrum One'}</p>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-3 rounded-md border border-border-default bg-surface-raised px-3 py-2 tablet:ml-auto tablet:flex-none">
          <span className="flex items-center gap-2 font-mono text-[12px] text-text-primary">
            <Hash aria-hidden className="size-3.5 text-icon-muted" />
            {d?.requestIdDisplay ?? '…'}
          </span>
          <CopyButton value={d?.requestIdDisplay ?? ''} label="Copy VRF request ID" />
          <span aria-hidden className="h-4 w-px bg-border-default" />
          <span className="inline-flex items-center gap-1 text-caption text-text-brand">
            View on explorer <ExternalLink aria-hidden className="size-3.5" />
            <span className="sr-only">(available once the request is on-chain)</span>
          </span>
          {d?.isDemo && <DemoBadge size="xs" />}
        </div>
      </div>
      <p className="flex items-start gap-2 text-caption text-text-tertiary">
        <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-icon-brand" />
        The result comes only from verifiable VRF randomness — it can’t be chosen or edited by
        anyone.
      </p>
    </article>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? 'Copied' : label}
      title={label}
      disabled={!value}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex size-7 items-center justify-center rounded-sm text-icon-muted hover:bg-surface-hover hover:text-icon-default"
    >
      {copied ? (
        <Check aria-hidden className="size-3.5 text-icon-brand" />
      ) : (
        <Copy aria-hidden className="size-3.5" />
      )}
    </button>
  );
}

type VerifyState =
  | { status: 'idle' | 'running' }
  | { status: 'done'; result: DiceVerification }
  | { status: 'error'; message: string };

function Verifier({ sample }: { sample: VerifierSample }) {
  const [clientSeed, setClientSeed] = React.useState(sample.clientSeed);
  const [nonce, setNonce] = React.useState(String(sample.nonce));
  const [state, setState] = React.useState<VerifyState>({ status: 'idle' });

  const run = React.useCallback(async () => {
    setState({ status: 'running' });
    try {
      const result = await verifyDiceRoll({
        serverSeed: sample.serverSeed,
        serverSeedHash: sample.serverSeedHash,
        clientSeed: clientSeed.trim(),
        nonce: Number.parseInt(nonce, 10) || 0,
        recordedRoll: sample.recordedRoll,
      });
      setState({ status: 'done', result });
    } catch (e) {
      setState({
        status: 'error',
        message: e instanceof Error ? e.message : 'Verification failed',
      });
    }
  }, [sample, clientSeed, nonce]);

  // Verify once on mount with the recorded inputs (runs in the browser — nothing is sent anywhere).
  const ran = React.useRef(false);
  React.useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void run();
  }, [run]);

  const r = state.status === 'done' ? state.result : null;
  const ok = r ? r.hashMatches && r.resultMatches : false;
  const win = r ? Number(r.roll) > Number(sample.target.over) : false;

  return (
    <article
      aria-labelledby="verifier-title"
      className="flex flex-col gap-4 rounded-xl border border-border-success/60 bg-surface-default p-5 tablet:p-6"
    >
      <header className="flex items-start gap-3">
        <ShieldCheck aria-hidden className="mt-0.5 size-5 text-icon-brand" />
        <div className="min-w-0 flex-1">
          <h3 id="verifier-title" className="text-h5 text-text-primary">
            Verify a result
          </h3>
          <p className="text-caption text-text-tertiary">
            Recompute any Originals round — runs in your browser
          </p>
        </div>
        {sample.isDemo && <DemoBadge size="s" />}
      </header>

      <div className="grid gap-3 tablet:grid-cols-2">
        <div className="flex flex-col gap-1.5 text-label-s text-text-secondary">
          <span id="verifier-game-label">Game</span>
          <Select value={sample.gameSlug}>
            <SelectTrigger aria-labelledby="verifier-game-label">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={sample.gameSlug}>{sample.game}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="flex flex-col gap-1.5 text-label-s text-text-secondary">
          Round ID
          <input
            readOnly
            value={sample.roundId}
            className="h-10 rounded-md border border-border-default bg-surface-raised px-3 font-mono text-[12px] text-text-primary outline-none focus-visible:border-border-focus"
          />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-label-s text-text-secondary">Server seed (revealed)</p>
        <div className={cn(monoBox, 'flex items-start gap-2 border-border-success/70')}>
          <span className="flex-1">
            {sample.serverSeed.slice(0, 32)}
            <br />
            {sample.serverSeed.slice(32)}
          </span>
          <CopyButton value={sample.serverSeed} label="Copy server seed" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-label-s text-text-secondary">
          Server seed hash (committed before the bet)
        </p>
        <div className={cn(monoBox, 'flex items-start gap-2 border-border-default')}>
          <span className="flex-1">
            {sample.serverSeedHash.slice(0, 32)}
            <br />
            {sample.serverSeedHash.slice(32)}
          </span>
          <Lock aria-label="Committed" className="mt-0.5 size-3.5 shrink-0 text-icon-muted" />
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
        <label className="flex flex-col gap-1.5 text-label-s text-text-secondary">
          Client seed
          <span className="flex h-12 items-center gap-2 rounded-md border border-border-default bg-surface-raised px-3 focus-within:border-border-focus">
            <input
              value={clientSeed}
              onChange={(e) => setClientSeed(e.target.value)}
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent font-mono text-[12px] text-text-primary outline-none"
            />
            <Pencil aria-hidden className="size-3.5 text-icon-muted" />
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-label-s text-text-secondary">
          Nonce
          <input
            inputMode="numeric"
            value={nonce}
            onChange={(e) => setNonce(e.target.value.replace(/\D/g, '').slice(0, 9))}
            className="h-12 rounded-md border border-border-default bg-surface-raised px-3 font-mono text-[12px] text-text-primary outline-none focus-visible:border-border-focus"
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 rounded-lg bg-bg-secondary p-4" aria-live="polite">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-caption text-text-tertiary">SHA-256(revealed seed)</p>
            <p className="font-mono text-[12px] text-text-primary">
              {r ? `${r.computedHash.slice(0, 16)}…${r.computedHash.slice(-9)}` : '…'}
            </p>
          </div>
          {r ? (
            <span
              className={cn(
                'inline-flex h-6 items-center gap-1 rounded-full px-2 text-[12px] font-medium',
                r.hashMatches
                  ? 'bg-status-success-tint text-text-success'
                  : 'bg-status-danger-tint text-text-danger',
              )}
            >
              {r.hashMatches ? <Check className="size-3.5" /> : <CircleX className="size-3.5" />}
              {r.hashMatches ? 'Matches commitment' : 'Does not match'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-caption text-text-tertiary">
              <Loader2 className="size-3.5 animate-spin" /> Checking…
            </span>
          )}
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-border-subtle pt-3">
          <div>
            <p className="text-caption text-text-tertiary">Computed result</p>
            <p className="text-[24px] leading-8 font-semibold text-text-primary tabular-nums">
              Roll {r ? r.roll : '…'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-caption text-text-tertiary">Recorded for {sample.roundId}</p>
            <p className="text-body-m text-text-primary">
              Roll {sample.recordedRoll} ·{' '}
              {Number(sample.recordedRoll) > Number(sample.target.over) ? 'Win' : 'Loss'}
            </p>
          </div>
        </div>
      </div>

      {state.status === 'error' ? (
        <p className="rounded-lg border border-border-danger/60 bg-status-danger-tint p-3 text-body-s text-text-danger">
          {state.message}
        </p>
      ) : r ? (
        <div
          className={cn(
            'flex gap-2.5 rounded-lg border p-3',
            ok
              ? 'border-border-success/60 bg-status-success-tint'
              : 'border-status-warning/50 bg-status-warning-tint',
          )}
        >
          {ok ? (
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-text-success" />
          ) : (
            <CircleX aria-hidden className="mt-0.5 size-4 shrink-0 text-text-warning" />
          )}
          <div>
            <p className={cn('text-label-m', ok ? 'text-text-success' : 'text-text-warning')}>
              {ok
                ? 'Verified — the result was fixed before you bet'
                : 'Different inputs — this is not the recorded bet'}
            </p>
            <p className="text-caption text-text-secondary">
              {ok
                ? `The revealed seed hashes to the commitment shown before round ${sample.roundId}, and HMAC-SHA256(server seed, client seed:nonce) reproduces roll ${r.roll} — the recorded result${win ? ' (roll over ' + sample.target.over + ', win)' : ''}.`
                : `With these inputs the roll is ${r.roll}. Restore client seed ${sample.clientSeed} and nonce ${sample.nonce} to reproduce the recorded result.`}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
        <Button
          size="l"
          leadingIcon={<ShieldCheck aria-hidden />}
          loading={state.status === 'running'}
          onClick={() => void run()}
        >
          Verify again
        </Button>
        <Link
          href={`${ROUTES.provablyFair}#how`}
          className="inline-flex items-center gap-1.5 text-label-s text-text-brand hover:underline"
        >
          <BookOpen aria-hidden className="size-4" /> How verification works
        </Link>
      </div>
    </article>
  );
}

/** H7 Provably fair: explainer + VRF stepper | in-browser verifier (real SHA-256 / HMAC recomputation). */
export function FairnessSection() {
  const sample = useVerifierSample();
  return (
    <HomeSection id="provably-fair">
      <SectionHeader
        id="provably-fair-title"
        title="Provably fair"
        action={
          <Button variant="secondary" size="s" asChild>
            <Link href={ROUTES.provablyFair}>Open verifier</Link>
          </Button>
        }
      />
      <div className="grid gap-4 laptop:grid-cols-[minmax(0,600fr)_minmax(0,520fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <Explainer />
          <DrawRandomnessCard />
        </div>
        {sample.data ? (
          <Verifier sample={sample.data} />
        ) : (
          <Skeleton className="h-[760px] rounded-xl" />
        )}
      </div>
    </HomeSection>
  );
}
