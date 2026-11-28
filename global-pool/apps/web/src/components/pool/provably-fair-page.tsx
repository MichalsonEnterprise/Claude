'use client';

import { formatCount, formatDateUTC, formatRoundNumber } from '@gp/shared/format';
import { formatUSDT } from '@gp/shared/money';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  CircleCheck,
  CircleX,
  Dices,
  FileCode2,
  Info,
  KeyRound,
  Lock,
  ShieldCheck,
  Sparkles,
  Ticket,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { CardsChipsArt, DicePairArt } from '@/components/home/art';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Field, Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getRound, getVerification } from '@/lib/api/pool';
import { mockVerifierSample } from '@/lib/data/mock-home';
import { verifyDiceRoll, type DiceVerification } from '@/lib/fairness/dice';
import { cn } from '@/lib/utils';

import { verifyDraw, type VerifyReport } from './logic';
import {
  Callout,
  CardHeading,
  KV,
  LicenceCard,
  POOL_ROUTES,
  PoolPageHeader,
  QueryError,
  RiskLine,
  Steps,
  cardCls,
  errorMessage,
} from './parts';
import { useRounds } from './use-pool';

// ── forms (RHF + zod) ─────────────────────────────────────────────────────────────────────────

const HEX64 = /^[0-9a-fA-F]{64}$/;
const seedSchema = z.object({
  serverSeed: z.string().trim().min(1, { error: 'Paste the revealed server seed' }),
  serverSeedHash: z
    .string()
    .trim()
    .regex(HEX64, { error: 'The commitment is a 64-character hex SHA-256 hash' }),
  clientSeed: z.string().trim().min(1, { error: 'Paste your client seed' }),
  nonce: z.coerce.number({ error: 'Nonce is a whole number' }).int().min(0),
  recordedRoll: z
    .string()
    .trim()
    .regex(/^\d{1,2}\.\d{2}$/, { error: 'Recorded roll looks like 73.21' }),
});
type SeedForm = z.input<typeof seedSchema>;

const roundSchema = z.object({
  round: z.coerce
    .number({ error: 'Enter a round number, e.g. 1247' })
    .int()
    .min(1, { error: 'Enter a round number, e.g. 1247' }),
});
type RoundForm = z.input<typeof roundSchema>;

/**
 * PUB-07 Provably Fair: explainer for both mechanisms + a verifier with two modes —
 * Originals bet (seed commit–reveal, recomputed with WebCrypto) and Global Pool draw (VRF word → winners,
 * recomputed with @gp/contracts/verify). States: empty (default, nothing pre-filled) · verified · failed.
 */
export function ProvablyFairPage() {
  return (
    <div className="flex flex-col gap-8 pb-4">
      <PoolPageHeader
        crumbs={[{ label: 'Lobby', href: '/' }, { label: 'Provably Fair' }]}
        title="Provably Fair"
        description="Every Global Pool draw and every Originals bet can be re-checked by you, in your browser, without trusting GLOBAL POOL."
      />
      <Hero />
      <Explainers />
      <section aria-labelledby="verifier-title" className="flex flex-col gap-4">
        <h2 id="verifier-title" className="text-h4 text-text-primary">
          Verify a result
        </h2>
        <Tabs defaultValue="seeds" className="flex flex-col gap-4">
          <TabsList variant="segmented" className="w-full tablet:w-fit">
            <TabsTrigger value="seeds">Originals bet · seeds</TabsTrigger>
            <TabsTrigger value="vrf">Global Pool draw · VRF</TabsTrigger>
          </TabsList>
          <TabsContent value="vrf">
            <VrfVerifier />
          </TabsContent>
          <TabsContent value="seeds">
            <SeedVerifier />
          </TabsContent>
        </Tabs>
      </section>
      <Faq />
      <LicenceCard />
      <RiskLine>
        You can lose your stake. Fairness checks prove the result was not changed — they don’t make
        winning more likely.{' '}
        <Link href={POOL_ROUTES.rg} className="text-text-brand hover:underline">
          Responsible gaming
        </Link>
      </RiskLine>
    </div>
  );
}

function Hero() {
  return (
    <section
      className={cn(cardCls, 'relative overflow-hidden rounded-2xl p-5 tablet:p-8 laptop:p-10')}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] overflow-hidden laptop:block"
      >
        <div className="absolute -top-16 right-[-100px] h-[170%] w-[300px] -rotate-[24deg] bg-accent-gold-tint-strong" />
        <div className="absolute -top-16 right-[230px] h-[170%] w-[26px] -rotate-[24deg] bg-brand" />
        <DicePairArt className="absolute top-8 right-16 w-44" />
        <CardsChipsArt className="absolute right-[150px] bottom-4 w-52" />
      </div>
      <div className="relative flex max-w-[620px] flex-col gap-4">
        <p className="flex items-center gap-2 text-overline text-text-brand uppercase">
          <ShieldCheck aria-hidden className="size-4" /> Verifiable by anyone
        </p>
        <h2 className="text-h3 text-text-primary tablet:text-h2">
          Nobody — including GLOBAL POOL — can choose or change a result.
        </h2>
        <p className="text-body-m text-text-secondary">
          Global Pool winners come from a random word delivered with a cryptographic proof
          (Chainlink VRF). Originals results come from a server seed committed before you bet. Paste
          the published values below and the checks run locally — nothing is sent to us.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" asChild leadingIcon={<ShieldCheck aria-hidden />}>
            <a href="#verifier-title">Open the verifier</a>
          </Button>
          <Button variant="secondary" asChild>
            <Link href={POOL_ROUTES.history}>Recent draws</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ── Global Pool draw ──────────────────────────────────────────────────────────────────────────

function VrfVerifier() {
  const recent = useRounds({ pageSize: 4, status: ['settled', 'cancelled'] });
  const form = useForm<RoundForm>({
    resolver: zodResolver(roundSchema),
    defaultValues: { round: '' },
  });
  const [result, setResult] = React.useState<
    | { kind: 'idle' }
    | { kind: 'loading'; round: number }
    | { kind: 'done'; round: number; report: VerifyReport }
    | { kind: 'error'; round: number; message: string }
  >({ kind: 'idle' });

  const run = async (n: number) => {
    setResult({ kind: 'loading', round: n });
    try {
      const [bundle, round] = await Promise.all([getVerification(n), getRound(n)]);
      setResult({ kind: 'done', round: n, report: verifyDraw(bundle, round) });
    } catch (err) {
      setResult({ kind: 'error', round: n, message: errorMessage(err) });
    }
  };

  return (
    <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <section className={cn(cardCls, 'flex flex-col gap-4 p-5 tablet:p-6')}>
        <CardHeading
          icon={<Ticket aria-hidden className="size-5 text-icon-gold" />}
          title="Check a Global Pool draw"
          sub="Enter a round number. The page fetches its public verification data and re-derives the 13 winners in your browser."
        />
        <form
          className="flex flex-col gap-3 tablet:flex-row tablet:items-start"
          noValidate
          onSubmit={form.handleSubmit((v) => run(Number(v.round)))}
        >
          <Field
            label="Round number"
            error={form.formState.errors.round?.message}
            hideLabel
            className="flex-1"
          >
            <Input
              inputMode="numeric"
              placeholder="Round number, e.g. 1247"
              {...form.register('round')}
            />
          </Field>
          <Button type="submit" variant="primary" size="l" loading={result.kind === 'loading'}>
            Verify draw
          </Button>
        </form>
        {result.kind === 'idle' && (
          <Callout tone="info" icon={<Info />} title="Where to find the values">
            Every round page lists its request ID and random word. The full report (with your own
            random word, entry lookup and downloadable data) is on each round’s verify page.
          </Callout>
        )}
        {result.kind === 'loading' && <Skeleton className="h-28 w-full" />}
        {result.kind === 'error' && (
          <Callout
            tone="danger"
            icon={<CircleX />}
            title={`Couldn’t check round ${formatRoundNumber(result.round)}`}
          >
            {result.message}
          </Callout>
        )}
        {result.kind === 'done' && <VrfResult round={result.round} report={result.report} />}
      </section>
      <section className={cn(cardCls, 'flex flex-col gap-3 p-5 tablet:p-6')}>
        <CardHeading title="Recent draws" demo={recent.data?.items.some((r) => r.isDemo)} as="h3" />
        {recent.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : recent.isError ? (
          <QueryError
            error={recent.error}
            onRetry={() => void recent.refetch()}
            title="We couldn’t load recent draws"
            className="border-0 p-0"
          />
        ) : recent.data.items.length === 0 ? (
          <p className="text-body-s text-text-secondary">
            No completed draws yet — settled and cancelled rounds appear here.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {recent.data.items.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="flex flex-col">
                  <span className="text-label-m text-text-primary">
                    Round {formatRoundNumber(r.number)}
                  </span>
                  <span className="text-caption text-text-tertiary">
                    {formatDateUTC(r.closesAt)} ·{' '}
                    {r.status === 'cancelled'
                      ? 'cancelled — no draw'
                      : `${formatUSDT(r.poolBalance)} pool`}
                  </span>
                </span>
                {r.status === 'settled' ? (
                  <Button variant="ghost" size="s" onClick={() => void run(r.number)}>
                    Check
                  </Button>
                ) : (
                  <Link
                    href={POOL_ROUTES.round(r.number)}
                    className="text-label-s text-text-secondary hover:underline"
                  >
                    Refunds
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function VrfResult({ round, report }: { round: number; report: VerifyReport }) {
  if (report.state === 'unavailable')
    return (
      <Callout
        tone="info"
        icon={<Info />}
        title={`Round ${formatRoundNumber(round)} can’t be verified yet`}
      >
        {report.reason}
      </Callout>
    );
  const graded = report.checks.filter((c) => c.status !== 'info');
  const passed = graded.filter((c) => c.status === 'passed').length;
  const ok = report.state === 'verified';
  return (
    <div
      aria-live="polite"
      className={cn(
        'flex flex-col gap-3 rounded-lg border p-4',
        ok
          ? 'border-border-success bg-status-success-tint'
          : 'border-border-danger bg-status-danger-tint',
      )}
    >
      <p
        className={cn(
          'flex items-center gap-2 text-label-l',
          ok ? 'text-text-success' : 'text-text-danger',
        )}
      >
        {ok ? (
          <CircleCheck aria-hidden className="size-5" />
        ) : (
          <CircleX aria-hidden className="size-5" />
        )}
        {ok
          ? `Verified — ${passed} / ${graded.length} checks passed`
          : `Check failed — ${passed} / ${graded.length} checks passed`}
      </p>
      <ul className="flex flex-col gap-1 text-body-s text-text-secondary">
        {report.checks.map((c) => (
          <li key={c.id} className="flex items-start gap-2">
            {c.status === 'passed' ? (
              <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-text-success" />
            ) : c.status === 'failed' ? (
              <CircleX aria-hidden className="mt-0.5 size-4 shrink-0 text-text-danger" />
            ) : (
              <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-text-info" />
            )}
            {c.title}
          </li>
        ))}
      </ul>
      <Button variant="secondary" asChild className="self-start">
        <Link href={POOL_ROUTES.verify(round)}>
          Open the full report <ArrowRight aria-hidden />
        </Link>
      </Button>
    </div>
  );
}

// ── Originals seeds ───────────────────────────────────────────────────────────────────────────

function SeedVerifier() {
  const form = useForm<SeedForm>({
    resolver: zodResolver(seedSchema),
    defaultValues: {
      serverSeed: '',
      serverSeedHash: '',
      clientSeed: '',
      nonce: '',
      recordedRoll: '',
    },
  });
  const [state, setState] = React.useState<
    | { kind: 'empty' }
    | { kind: 'done'; v: DiceVerification; hash: string }
    | { kind: 'error'; message: string }
  >({
    kind: 'empty',
  });
  const sample = mockVerifierSample();

  const onSubmit = form.handleSubmit(async (raw) => {
    const v = seedSchema.parse(raw);
    try {
      const res = await verifyDiceRoll(v);
      setState({ kind: 'done', v: res, hash: v.serverSeedHash.toLowerCase() });
    } catch (err) {
      setState({ kind: 'error', message: errorMessage(err) });
    }
  });

  const e = form.formState.errors;
  return (
    <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <section className={cn(cardCls, 'flex flex-col gap-4 p-5 tablet:p-6')}>
        <CardHeading
          icon={<Dices aria-hidden className="size-5 text-icon-brand" />}
          title="Check an Originals bet"
          sub="Pool Dice: SHA-256(server seed) must equal the commitment shown before the bet, and HMAC-SHA256(server seed, client seed:nonce) gives the roll."
          action={
            <Button
              variant="ghost"
              size="s"
              type="button"
              onClick={() => {
                form.reset({
                  serverSeed: sample.serverSeed,
                  serverSeedHash: sample.serverSeedHash,
                  clientSeed: sample.clientSeed,
                  nonce: String(sample.nonce),
                  recordedRoll: sample.recordedRoll,
                });
                setState({ kind: 'empty' });
              }}
            >
              Load DEMO bet
            </Button>
          }
        />
        <form className="grid gap-3 tablet:grid-cols-2" noValidate onSubmit={onSubmit}>
          <Field
            label="Server seed (revealed)"
            error={e.serverSeed?.message}
            className="tablet:col-span-2"
          >
            <Input
              className="font-mono"
              spellCheck={false}
              autoComplete="off"
              {...form.register('serverSeed')}
            />
          </Field>
          <Field
            label="Server seed hash (commitment)"
            error={e.serverSeedHash?.message}
            className="tablet:col-span-2"
          >
            <Input
              className="font-mono"
              spellCheck={false}
              autoComplete="off"
              {...form.register('serverSeedHash')}
            />
          </Field>
          <Field label="Client seed" error={e.clientSeed?.message}>
            <Input
              className="font-mono"
              spellCheck={false}
              autoComplete="off"
              {...form.register('clientSeed')}
            />
          </Field>
          <Field label="Nonce" error={e.nonce?.message}>
            <Input inputMode="numeric" {...form.register('nonce')} />
          </Field>
          <Field label="Recorded roll" error={e.recordedRoll?.message}>
            <Input inputMode="decimal" placeholder="73.21" {...form.register('recordedRoll')} />
          </Field>
          <div className="flex items-end">
            <Button
              type="submit"
              variant="primary"
              size="l"
              block
              loading={form.formState.isSubmitting}
            >
              Verify bet
            </Button>
          </div>
        </form>
        {state.kind === 'error' && (
          <Callout tone="danger" icon={<CircleX />} title="Couldn’t run the check">
            {state.message}
          </Callout>
        )}
      </section>
      <SeedResult state={state} />
    </div>
  );
}

function SeedResult({
  state,
}: {
  state:
    | { kind: 'empty' }
    | { kind: 'done'; v: DiceVerification; hash: string }
    | { kind: 'error'; message: string };
}) {
  if (state.kind !== 'done')
    return (
      <section className={cn(cardCls, 'flex flex-col gap-3 p-5 tablet:p-6')}>
        <CardHeading title="Where to find the values" as="h3" />
        <ol className="flex list-decimal flex-col gap-2 pl-5 text-body-s text-text-secondary">
          <li>
            Open the bet in your game history: it shows the server seed hash (commitment) shown
            before you played.
          </li>
          <li>Rotate your seed pair to reveal the server seed of finished bets.</li>
          <li>Copy your client seed and the bet’s nonce, then the recorded roll.</li>
        </ol>
        <p className="text-caption text-text-tertiary">
          Games run as non-monetary simulations in this DEMO build.
        </p>
      </section>
    );
  const { v, hash } = state;
  const same = [...v.computedHash].filter((c, i) => c === hash[i]).length;
  const ok = v.hashMatches && v.resultMatches;
  return (
    <section
      aria-live="polite"
      className={cn(
        'flex flex-col gap-3 rounded-xl border p-5 tablet:p-6',
        ok
          ? 'border-border-success bg-status-success-tint'
          : 'border-border-danger bg-status-danger-tint',
      )}
    >
      <p
        className={cn(
          'flex items-center gap-2 text-h5',
          ok ? 'text-text-success' : 'text-text-danger',
        )}
      >
        {ok ? (
          <CircleCheck aria-hidden className="size-5" />
        ) : (
          <CircleX aria-hidden className="size-5" />
        )}
        {ok
          ? 'Verified — the bet matches its commitment'
          : v.hashMatches
            ? 'Roll mismatch'
            : 'Failed — hash mismatch'}
      </p>
      <dl className="flex flex-col gap-2">
        <KV
          label="Commitment"
          value={v.hashMatches ? 'Matches' : `${same} / 64 characters match`}
          valueClassName={v.hashMatches ? 'text-text-success' : 'text-text-danger'}
        />
        <KV
          label="Computed hash"
          value={
            <span className="font-mono text-mono-s break-all">{v.computedHash.slice(0, 16)}…</span>
          }
        />
        <KV
          label="Computed roll"
          value={v.roll}
          valueClassName={v.resultMatches ? 'text-text-success' : 'text-text-danger'}
        />
      </dl>
      {!ok && (
        <p className="text-body-s text-text-secondary">
          Most mismatches are paste errors (an extra space or a missing character). If the values
          come straight from your history and still fail,{' '}
          <Link href="/support" className="text-text-brand hover:underline">
            report the bet
          </Link>
          .
        </p>
      )}
    </section>
  );
}

// ── explainers + FAQ ──────────────────────────────────────────────────────────────────────────

function Explainers() {
  return (
    <section aria-labelledby="how-title" className="flex flex-col gap-4">
      <h2 id="how-title" className="text-h4 text-text-primary">
        How it works
      </h2>
      <div className="grid gap-4 laptop:grid-cols-2">
        <article id="vrf" className={cn(cardCls, 'flex flex-col gap-4 p-5 tablet:p-6')}>
          <CardHeading
            icon={<Sparkles aria-hidden className="size-5 text-icon-gold" />}
            title="Global Pool · Chainlink VRF"
          />
          <Steps
            steps={[
              {
                id: '1',
                state: 'done',
                title: 'Round closes at 20:00:00 UTC',
                description: 'The entry list freezes; nothing is added or removed after close.',
              },
              {
                id: '2',
                state: 'done',
                title: 'Randomness is requested',
                description: 'A request ID is recorded for the round right after close.',
              },
              {
                id: '3',
                state: 'done',
                title: 'VRF returns a random word + proof',
                description: 'The coordinator verifies the proof on-chain before the word is used.',
              },
              {
                id: '4',
                state: 'done',
                title: '13 winners are derived and settled',
                description:
                  'GLOBAL_POOL_WINNERS_V1 maps the word to 13 distinct entries; prizes go to Owed.',
              },
            ]}
          />
          <p className="text-caption text-text-tertiary">
            candidate_k = keccak256(abi.encode(domain, roundId, randomWord, k)); reject values below
            2²⁵⁶ mod N; index = candidate mod N; skip duplicates.
          </p>
        </article>
        <article className={cn(cardCls, 'flex flex-col gap-4 p-5 tablet:p-6')}>
          <CardHeading
            icon={<KeyRound aria-hidden className="size-5 text-icon-brand" />}
            title="Originals · seed commit–reveal"
          />
          <Steps
            steps={[
              {
                id: '1',
                state: 'done',
                title: 'We commit first',
                description:
                  'You see SHA-256(server seed) before you bet — the seed can’t change afterwards.',
              },
              {
                id: '2',
                state: 'done',
                title: 'You add your client seed',
                description:
                  'Your client seed and a nonce per bet are mixed in, so we can’t predict your bets.',
              },
              {
                id: '3',
                state: 'done',
                title: 'The result is computed',
                description: 'HMAC-SHA256(server seed, client seed:nonce) → roll 0.00–99.99.',
              },
              {
                id: '4',
                state: 'done',
                title: 'We reveal the seed',
                description: 'After rotation, anyone can recompute every bet made with it.',
              },
            ]}
          />
          <p className="flex items-center gap-2 text-caption text-text-tertiary">
            <Lock aria-hidden className="size-3.5" /> Games run as non-monetary simulations in this
            DEMO build.
          </p>
        </article>
      </div>
    </section>
  );
}

const FAQ: [string, string][] = [
  [
    'Can GLOBAL POOL pick or change winners?',
    'No. Winners come only from the random word and the frozen entry list. There is no admin control that sets results, and every round publishes the data needed to recompute it.',
  ],
  [
    'Does verifying a draw improve my chances?',
    'No. Verification proves a result was not altered. Every qualifying entry has the same chance, and you can lose your stake.',
  ],
  [
    'Why is the DEMO build labelled “mock VRF”?',
    'This testnet build uses a deterministic mock randomness provider (word = keccak256("GP_MOCK_VRF:" + request ID)) so draws are reproducible offline. The verifier checks that rule too. Production rounds use Chainlink VRF v2.5 on Arbitrum.',
  ],
  [
    'What happens if a round doesn’t meet its minimums?',
    'It is cancelled at close, no randomness is requested and every stake goes back to its owner’s Owed balance.',
  ],
];

function Faq() {
  return (
    <section aria-labelledby="pf-faq" className="flex flex-col gap-3">
      <h2 id="pf-faq" className="flex items-center gap-2 text-h4 text-text-primary">
        <FileCode2 aria-hidden className="size-5 text-icon-muted" /> Questions
      </h2>
      <div className={cn(cardCls, 'divide-y divide-border-subtle')}>
        {FAQ.map(([q, a]) => (
          <details key={q} className="group px-5 py-1">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-label-l text-text-primary">
              {q}
              <span
                aria-hidden
                className="text-icon-muted transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="pb-4 text-body-s text-text-secondary">{a}</p>
          </details>
        ))}
      </div>
      <p className="text-caption text-text-tertiary">
        {formatCount(13)} prizes per round · values are DEMO where marked <DemoBadge size="xs" />
      </p>
    </section>
  );
}
