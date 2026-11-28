'use client';

import { blackjack, sha256Hex } from '@gp/shared/fair';
import { formatAmount } from '@gp/shared/money';
import {
  BookOpen,
  CircleCheck,
  CircleX,
  Download,
  ExternalLink,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { CopyValue, GAMES_ROUTES, SeedDisplay, verifyInBrowser } from '@/components/games/kit';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Field, Input, InputControl, InputGroup } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import {
  classifyGameError,
  useBetVerification,
  useRotateSeed,
  type BetVerification,
} from '@/lib/api/games';
import { twentyOneApi, useBjHands, type BjBetView, type BjOutcome } from '@/lib/api/twenty-one';
import { cn } from '@/lib/utils';

import { BjSubpage } from './bj-chrome';
import { SLUG, describeHand, resultSummary, shoeSlots } from './bj-math';
import { PlayingCard } from './cards';
import { BJ_ROUTES } from './routes';

const CARD = 'flex min-w-0 flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-6';

function safeSha(s: string): string {
  try {
    return sha256Hex(s);
  } catch {
    return '';
  }
}

const short = (h: string, a = 10, b = 6) => (h.length > a + b + 1 ? `${h.slice(0, a)}…${h.slice(-b)}` : h);

/** Build the shoe prefix in the browser from the (possibly edited) seeds — the same Shoe the server deals from. */
function shoePrefix(seed: { serverSeed: string; clientSeed: string; nonce: number }, n: number): string[] {
  try {
    const shoe = new blackjack.Shoe(seed);
    return Array.from({ length: n }, (_, i) => shoe.cardAt(i));
  } catch {
    return [];
  }
}

function Verifier({ v, onRevealed }: { v: BetVerification; onRevealed: () => void }) {
  const bet = v.bet as unknown as BjBetView;
  const rotate = useRotateSeed(SLUG);
  const [edit, setEdit] = React.useState<{ serverSeed: string; clientSeed: string; nonce: string } | null>(null);
  React.useEffect(() => {
    setEdit(
      v.verify.serverSeed
        ? { serverSeed: v.verify.serverSeed, clientSeed: v.verify.clientSeed, nonce: String(v.verify.nonce) }
        : null,
    );
  }, [v.verify.serverSeed, v.verify.clientSeed, v.verify.nonce]);
  const nonceNum = edit && /^\d{1,9}$/.test(edit.nonce) ? Number(edit.nonce) : null;
  const seedIn = edit && nonceNum !== null ? { serverSeed: edit.serverSeed.trim(), clientSeed: edit.clientSeed.trim(), nonce: nonceNum } : null;
  const check = React.useMemo(() => (seedIn ? verifyInBrowser(v, seedIn) : null), [v, seedIn?.serverSeed, seedIn?.clientSeed, seedIn?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps
  const recomputed = (check?.result?.outcome ?? null) as BjOutcome | null;
  const hashOfInput = edit ? safeSha(edit.serverSeed.trim()) : '';
  const dealt = (bet.outcome.position) ?? 4;
  const order = React.useMemo(() => (seedIn ? shoePrefix(seedIn, Math.min(312, dealt + 2)) : []), [seedIn?.serverSeed, seedIn?.clientSeed, seedIn?.nonce, dealt]); // eslint-disable-line react-hooks/exhaustive-deps
  const slots = shoeSlots(order, recomputed ?? bet.outcome, order.length);

  const reveal = async () => {
    try {
      await rotate.mutateAsync(undefined);
      onRevealed();
      toast({ type: 'success', title: 'Seed pair rotated', description: 'The server seed is revealed — re-creating your shoe.' });
    } catch (err) {
      toast({ type: 'error', title: 'Could not rotate seeds', description: classifyGameError(err).message });
    }
  };

  const download = () => {
    const data = {
      hand: bet.ref,
      game: 'twenty-one',
      rulesVersion: v.verify.rulesVersion,
      currency: 'DEMO',
      cashValue: false,
      serverSeedHash: v.verify.serverSeedHash,
      serverSeed: v.verify.serverSeed,
      clientSeed: v.verify.clientSeed,
      nonce: v.verify.nonce,
      stake: v.verify.stake,
      params: v.verify.params,
      stream: v.verify.stream,
      library: v.verify.library,
      recorded: { payout: bet.payout, net: bet.net, outcome: bet.outcome },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `twenty-one_${bet.ref}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (bet.status !== 'settled') {
    return (
      <section className={CARD}>
        <h2 className="text-h4 text-text-primary">Verify a result</h2>
        <p className="text-body-s text-text-secondary">
          Hand {bet.ref} is still in play. Finish it first — a hand is verified once it is settled and its seed pair is
          rotated.
        </p>
        <Button asChild className="w-fit">
          <Link href={BJ_ROUTES.play}>Back to the table</Link>
        </Button>
      </section>
    );
  }

  return (
    <>
      <section aria-labelledby="bj-verify" className={cn(CARD, check?.matches ? 'border-border-brand' : check ? 'border-border-danger' : '')} data-testid="bj-verifier">
        <div className="flex items-start gap-3">
          <ShieldCheck aria-hidden className="mt-1 size-5 shrink-0 text-icon-brand" />
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 id="bj-verify" className="text-h4 text-text-primary">
              Verify a result
            </h2>
            <p className="text-caption text-text-tertiary">Recompute any Twenty-One hand — runs in your browser</p>
          </div>
          <DemoBadge size="s" />
        </div>

        {!v.revealed || !edit ? (
          <>
            <div className="flex items-start gap-3 rounded-lg border border-status-info bg-status-info-tint p-4">
              <Lock aria-hidden className="mt-0.5 size-5 shrink-0 text-text-info" />
              <div className="flex flex-col gap-2 text-body-s">
                <p className="text-body-s-strong text-text-primary">The server seed of this pair is still secret.</p>
                <p className="text-text-secondary">
                  Rotate your seed pair to reveal it. Then hand {bet.ref} — and every other hand dealt with this pair — can
                  be re-created card by card here.
                </p>
                <Button size="s" variant="secondary" className="w-fit min-h-11 tablet:min-h-9" onClick={() => void reveal()} loading={rotate.isPending} leadingIcon={<RefreshCw aria-hidden />}>
                  Rotate seeds & reveal
                </Button>
              </div>
            </div>
            <Field label="Server seed hash (committed before the deal)">
              <InputGroup size="l">
                <InputControl value={v.verify.serverSeedHash} readOnly className="font-mono text-mono-s" />
                <Lock aria-hidden className="size-4 text-icon-muted" />
              </InputGroup>
            </Field>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <Field label="Client seed">
                <Input value={v.verify.clientSeed} readOnly className="font-mono" />
              </Field>
              <Field label="Nonce">
                <Input value={String(v.verify.nonce)} readOnly className="font-mono" />
              </Field>
            </div>
            <p className="text-body-s text-text-secondary">Recorded result: {resultSummary(bet.outcome)} · {describeHand(bet.outcome)}</p>
          </>
        ) : (
          <>
            <Field label="Server seed (revealed)">
              <InputGroup size="l" state={check?.commitmentValid ? 'success' : 'error'}>
                <InputControl
                  value={edit.serverSeed}
                  onChange={(e) => setEdit({ ...edit, serverSeed: e.target.value })}
                  className="font-mono text-mono-s"
                  spellCheck={false}
                  autoComplete="off"
                  aria-label="Server seed (revealed)"
                />
                <CopyValue value={edit.serverSeed} label="Copy server seed" />
              </InputGroup>
            </Field>
            <Field label="Server seed hash (committed before the bet)">
              <InputGroup size="l">
                <InputControl value={v.verify.serverSeedHash} readOnly className="font-mono text-mono-s" aria-label="Server seed hash" />
                <Lock aria-hidden className="size-4 text-icon-muted" />
              </InputGroup>
            </Field>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <Field label="Client seed">
                <Input value={edit.clientSeed} onChange={(e) => setEdit({ ...edit, clientSeed: e.target.value })} className="font-mono" spellCheck={false} autoComplete="off" />
              </Field>
              <Field label="Nonce" error={nonceNum === null ? 'Whole number' : undefined}>
                <Input value={edit.nonce} inputMode="numeric" onChange={(e) => setEdit({ ...edit, nonce: e.target.value.replace(/\D/g, '') })} className="font-mono" />
              </Field>
            </div>

            <div className="flex flex-col gap-3 rounded-lg bg-bg-secondary p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-col">
                  <span className="text-caption text-text-tertiary">SHA-256(revealed seed)</span>
                  <span className="font-mono text-mono-s text-text-primary">{short(hashOfInput, 12, 8)}</span>
                </div>
                {check?.commitmentValid ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border-brand px-2 py-0.5 text-caption text-text-brand">
                    <CircleCheck aria-hidden className="size-3.5" /> Matches commitment
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border-danger px-2 py-0.5 text-caption text-text-danger">
                    <CircleX aria-hidden className="size-3.5" /> Doesn’t match
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-end justify-between gap-2 border-t border-border-subtle pt-3">
                <div className="flex flex-col">
                  <span className="text-caption text-text-tertiary">Computed result</span>
                  <span className="text-h4 text-text-primary" data-testid="bj-computed">
                    {recomputed ? resultSummary(recomputed) : (check?.error ?? '—')}
                  </span>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-caption text-text-tertiary">Recorded for {bet.ref}</span>
                  <span className="text-body-s-strong text-text-primary">
                    {resultSummary(bet.outcome)} · {formatAmount(bet.net, { sign: 'always' })} DEMO
                  </span>
                </div>
              </div>
            </div>

            {check?.matches ? (
              <div role="status" className="flex items-start gap-3 rounded-lg border border-border-brand bg-brand-tint-subtle p-4" data-testid="bj-verified">
                <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-icon-brand" />
                <div className="flex flex-col gap-1">
                  <p className="text-body-s-strong text-text-brand">Verified — the shoe was fixed before you bet</p>
                  <p className="text-caption text-text-secondary">
                    The revealed seed hashes to the commitment shown before hand {bet.ref}, and HMAC-SHA256(server seed,
                    client seed:nonce) re-creates the shoe and the recorded result: {describeHand(recomputed ?? bet.outcome)}.
                  </p>
                </div>
              </div>
            ) : (
              <div role="alert" className="flex items-start gap-3 rounded-lg border border-border-danger bg-status-danger-tint p-4" data-testid="bj-verify-failed">
                <CircleX aria-hidden className="mt-0.5 size-5 shrink-0 text-text-danger" />
                <div className="flex flex-col gap-1">
                  <p className="text-body-s-strong text-text-primary">Verification failed — these inputs don’t re-create {bet.ref}</p>
                  <p className="text-caption text-text-secondary">
                    {check?.error ??
                      `Most mismatches come from a server seed of another pair or a changed nonce. ${bet.ref} used client seed ${v.verify.clientSeed} and nonce ${v.verify.nonce}.`}
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                className="min-h-11"
                onClick={() => setEdit({ serverSeed: v.verify.serverSeed!, clientSeed: v.verify.clientSeed, nonce: String(v.verify.nonce) })}
                leadingIcon={<ShieldCheck aria-hidden />}
              >
                Verify again
              </Button>
              <Link href={GAMES_ROUTES.provablyFair} className="ml-auto inline-flex min-h-11 items-center gap-1.5 text-label-m text-text-brand hover:underline">
                <BookOpen aria-hidden className="size-4" /> How verification works
              </Link>
            </div>
          </>
        )}
      </section>

      {v.revealed && edit && (
        <section aria-labelledby="bj-shoe" className={CARD} data-testid="bj-shoe-order">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="bj-shoe" className="text-h4 text-text-primary">
              Shoe order · hand {bet.ref}
            </h2>
            <DemoBadge size="s" />
            <span className="ml-auto text-caption text-text-tertiary">First {order.length} of 312 cards</span>
          </div>
          <ol className="flex flex-wrap gap-3">
            {slots.map((s) => (
              <li key={s.position} className="flex w-[64px] flex-col items-center gap-1.5">
                <PlayingCard code={s.card} size="s" dim={s.position >= dealt} />
                <span className={cn('text-center text-[11px] leading-tight', s.position >= dealt ? 'text-text-tertiary' : 'text-text-secondary')}>
                  #{s.position + 1} · {s.position >= dealt ? 'not dealt' : (s.role ?? '—')}
                </span>
              </li>
            ))}
          </ol>
          {check?.matches ? (
            <div className="flex items-start gap-2 rounded-lg bg-brand-tint-subtle p-3 text-caption text-text-secondary">
              <CircleCheck aria-hidden className="mt-px size-4 shrink-0 text-icon-brand" />
              <span>
                <strong className="text-text-primary">Recomputed result matches the recorded hand.</strong>{' '}
                {describeHand(recomputed ?? bet.outcome)} → {resultSummary(bet.outcome)} · {formatAmount(bet.net, { sign: 'always' })} DEMO
              </span>
            </div>
          ) : null}
        </section>
      )}

      <section className={CARD}>
        <h2 className="text-h4 text-text-primary">Verify it yourself</h2>
        <p className="text-body-s text-text-secondary">
          Use any HMAC-SHA256 tool with the seeds and nonce above, or the open verification code in @gp/shared/fair. Seeds
          rotate only when you ask — rotating reveals the old server seed so past hands can be checked.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="min-h-11" onClick={download} leadingIcon={<Download aria-hidden />}>
            Download hand data (JSON)
          </Button>
          <Button variant="ghost" asChild className="min-h-11" trailingIcon={<ExternalLink aria-hidden />}>
            <Link href={GAMES_ROUTES.provablyFair}>Algorithm documentation</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function HowShoeIsBuilt({ nonce }: { nonce: number | null }) {
  const steps: [string, string][] = [
    ['Commit', 'Before your hand we publish the SHA-256 hash of the server seed. Changing the seed afterwards would break this hash.'],
    [
      'Combine',
      `Server seed, your client seed and the nonce${nonce !== null ? ` (${nonce} for this hand)` : ''} go into HMAC-SHA256 to make a stream of numbers.`,
    ],
    ['Shuffle', 'That stream drives a Fisher–Yates shuffle of all 312 cards (6 decks). Same inputs always give the same shoe.'],
    ['Deal', 'Cards come off the top in a fixed order: you, dealer up-card, you, dealer hole card, then any hits and the dealer’s draws.'],
  ];
  return (
    <section aria-labelledby="bj-how-shoe" className={CARD}>
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-lg bg-brand-tint text-icon-brand">
          <ShieldCheck aria-hidden className="size-5" />
        </span>
        <h2 id="bj-how-shoe" className="text-h4 text-text-primary">
          How a Twenty-One shoe is built
        </h2>
      </div>
      <ol className="flex flex-col gap-4">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-tint text-label-s text-text-brand">{i + 1}</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-body-m-strong text-text-primary">{t}</span>
              <span className="text-body-s text-text-secondary">{d}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** BJ-08 — load a hand (`?bet=<id>` or hand ID / nonce), rotate & reveal, re-create the shoe in the browser. */
export function BjFairnessPage() {
  const params = useSearchParams();
  const router = useRouter();
  const latest = useBjHands(1, 5);
  const firstSettled = latest.data?.items.find((b) => b.status === 'settled');
  const betId = params.get('bet') ?? firstSettled?.id ?? null;
  const v = useBetVerification(betId);
  const [lookup, setLookup] = React.useState('');
  const [looking, setLooking] = React.useState(false);
  const [lookupError, setLookupError] = React.useState<string | null>(null);

  const find = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = lookup.trim().toUpperCase();
    if (!/^(BJ-?)?\d{1,9}$/.test(s)) {
      setLookupError('Use a hand ID like BJ-40517 or a nonce like 417.');
      return;
    }
    setLooking(true);
    setLookupError(null);
    try {
      const page = await twentyOneApi.hands(1, 1, { search: s });
      const hit = page.items[0];
      if (!hit) setLookupError(`No Twenty-One hand ${s} in your account.`);
      else router.replace(BJ_ROUTES.verify(hit.id), { scroll: false });
    } catch (err) {
      setLookupError(classifyGameError(err).message);
    } finally {
      setLooking(false);
    }
  };

  return (
    <BjSubpage tab="fairness" crumb="Fairness">
      <div className="grid gap-5 laptop:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] tablet:gap-6">
        <div className="flex min-w-0 flex-col gap-5 tablet:gap-6">
          <form onSubmit={(e) => void find(e)} className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:flex-row tablet:items-end tablet:p-5">
            <Field label="Game" className="tablet:w-40">
              <Input size="l" value="Twenty-One" readOnly aria-readonly />
            </Field>
            <Field label="Round ID" error={lookupError ?? undefined} className="flex-1">
              <InputGroup size="l">
                <Search aria-hidden className="size-4 text-icon-muted" />
                <InputControl
                  value={lookup}
                  onChange={(e) => {
                    setLookup(e.target.value.slice(0, 16));
                    setLookupError(null);
                  }}
                  placeholder={(v.data?.bet.ref) ?? 'BJ-40517'}
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Hand ID or nonce"
                />
              </InputGroup>
            </Field>
            <Button type="submit" variant="secondary" size="l" loading={looking} className="min-h-12">
              Load hand
            </Button>
          </form>
          {!betId && !latest.isPending ? (
            <section className={CARD}>
              <h2 className="text-h4 text-text-primary">Verify a result</h2>
              <p className="text-body-s text-text-secondary">
                No settled hands yet. Play Twenty-One and come back — every hand’s shoe can be re-created here from the seeds.
              </p>
              <Button asChild className="w-fit">
                <Link href={BJ_ROUTES.play}>Play Twenty-One</Link>
              </Button>
            </section>
          ) : v.isError ? (
            <section className={CARD} role="alert">
              <h2 className="text-h4 text-text-primary">Verify a result</h2>
              <p className="text-body-s text-text-danger">{classifyGameError(v.error).message}</p>
            </section>
          ) : !v.data ? (
            <Skeleton className="h-[520px] w-full rounded-xl" />
          ) : (
            <Verifier v={v.data} onRevealed={() => void v.refetch()} />
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-5 tablet:gap-6">
          <HowShoeIsBuilt nonce={v.data?.verify.nonce ?? null} />
          <SeedDisplay slug={SLUG} />
        </div>
      </div>
    </BjSubpage>
  );
}
