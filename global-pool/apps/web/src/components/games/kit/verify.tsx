'use client';

import {
  blockMessage,
  hmacSha256Hex,
  isFairGameSlug,
  sha256Hex,
  verifyBet,
  type VerifyResult,
} from '@gp/shared/fair';
import { money } from '@gp/shared/money';
import { CircleCheck, CircleX, LifeBuoy, RefreshCw, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { ResponsiveModal } from '@/components/wallet/responsive-modal';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Field, Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import {
  classifyGameError,
  useBetVerification,
  useRotateSeed,
  type BetVerification,
  type GameBetView,
} from '@/lib/api/games';
import { cn } from '@/lib/utils';

import { CreditsAmount } from './parts';
import { GAMES_ROUTES } from './registry';
import { SeedLine, shortHash } from './seeds';

export interface BrowserVerification {
  ok: boolean;
  commitmentValid: boolean;
  result: VerifyResult | null;
  /** Recomputed outcome equals the recorded outcome (every recomputed key) and payout. */
  matches: boolean;
  firstBlock: string | null;
  error: string | null;
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Re-derive a recorded bet IN THE BROWSER with `verifyBet()` from @gp/shared/fair — the very same code the API
 * settles with (no duplicated maths). Inputs may be edited ("verify it yourself").
 */
export function verifyInBrowser(
  v: BetVerification,
  input: { serverSeed: string; clientSeed: string; nonce: number },
): BrowserVerification {
  const slug = v.verify.game;
  if (!isFairGameSlug(slug))
    return { ok: false, commitmentValid: false, result: null, matches: false, firstBlock: null, error: 'Unknown game' };
  try {
    const result = verifyBet({
      slug,
      serverSeed: input.serverSeed,
      serverSeedHash: v.verify.serverSeedHash,
      clientSeed: input.clientSeed,
      nonce: input.nonce,
      stake: v.verify.stake,
      params: v.verify.params,
    });
    const recorded = v.bet.outcome ?? {};
    const outcomeMatches = Object.entries(result.outcome).every(
      ([k, val]) => !(k in recorded) || sameValue(recorded[k], val),
    );
    const payoutMatches = money(result.payout).eq(money(v.bet.payout));
    return {
      ok: true,
      commitmentValid: result.commitmentValid,
      result,
      matches: result.commitmentValid && outcomeMatches && payoutMatches,
      firstBlock: hmacSha256Hex(input.serverSeed, blockMessage(input.clientSeed, input.nonce, 0)),
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      commitmentValid: false,
      result: null,
      matches: false,
      firstBlock: null,
      error: err instanceof Error ? err.message : 'Could not recompute this bet',
    };
  }
}

function Step({
  n,
  title,
  body,
  mono,
  bad = false,
}: {
  n: number;
  title: string;
  body: React.ReactNode;
  mono?: string;
  bad?: boolean;
}) {
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full border text-label-s',
          bad
            ? 'border-border-danger bg-status-danger-tint text-text-danger'
            : 'border-border-brand bg-brand-tint text-text-brand',
        )}
      >
        {n}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="flex items-center gap-1.5 text-body-s-strong text-text-primary">
          {title}
          {bad ? (
            <CircleX aria-label="failed" className="size-4 text-text-danger" />
          ) : (
            <CircleCheck aria-label="passed" className="size-4 text-icon-brand" />
          )}
        </p>
        <div className="text-body-s text-text-secondary">{body}</div>
        {mono && (
          <code className="w-fit max-w-full truncate rounded-sm border border-border-subtle bg-bg-secondary px-2.5 py-1.5 font-mono text-mono-s text-text-primary">
            {mono}
          </code>
        )}
      </div>
    </li>
  );
}

export interface VerifyDrawerProps {
  betId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Short human summary of an outcome ("73.21 ≥ 50.50 → Win · 1.9603×"). */
  describeOutcome?: (outcome: Record<string, unknown>, bet: GameBetView) => string;
  /** How the outcome is derived from the bytes, in one sentence. */
  formula?: string;
  /** Word for one bet ("roll", "flip", "spin", "hand"). */
  noun?: string;
}

/**
 * Provably-fair verify drawer (DI-06): commitment → revealed seed → inputs → result recomputed in the browser with
 * @gp/shared/fair. Editable seeds show the mismatch state. Nothing here can change a result.
 */
export function VerifyDrawer({
  betId,
  open,
  onOpenChange,
  describeOutcome,
  formula,
  noun = 'bet',
}: VerifyDrawerProps) {
  const q = useBetVerification(open ? betId : null);
  const v = q.data;
  const rotate = useRotateSeed(v?.verify.game ?? '');
  const [edit, setEdit] = React.useState<{ serverSeed: string; clientSeed: string; nonce: string } | null>(null);

  React.useEffect(() => {
    if (v?.verify.serverSeed)
      setEdit({ serverSeed: v.verify.serverSeed, clientSeed: v.verify.clientSeed, nonce: String(v.verify.nonce) });
    else setEdit(null);
  }, [v?.verify.serverSeed, v?.verify.clientSeed, v?.verify.nonce]);

  const nonceNum = edit && /^\d{1,9}$/.test(edit.nonce) ? Number(edit.nonce) : null;
  const check = React.useMemo(
    () =>
      v && edit && nonceNum !== null
        ? verifyInBrowser(v, { serverSeed: edit.serverSeed.trim(), clientSeed: edit.clientSeed.trim(), nonce: nonceNum })
        : null,
    [v, edit, nonceNum],
  );
  const edited =
    !!v && !!edit && (edit.serverSeed !== v.verify.serverSeed || edit.clientSeed !== v.verify.clientSeed || edit.nonce !== String(v.verify.nonce));

  const reveal = async () => {
    try {
      await rotate.mutateAsync(undefined);
      await q.refetch();
    } catch (err) {
      toast({ type: 'error', title: 'Could not rotate seeds', description: classifyGameError(err).message });
    }
  };

  const ref = v?.bet.ref ?? '';
  const outcomeText = (o: Record<string, unknown> | null | undefined) =>
    o && v ? (describeOutcome ? describeOutcome(o, v.bet) : JSON.stringify(o)) : '—';

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      desktop="drawer"
      title={ref ? `Verify ${noun} ${ref}` : `Verify a ${noun}`}
      description={`Check that this ${noun} came from the seeds committed before you bet. Nothing here can change a result — it only recomputes it.`}
    >
      {q.isPending || !v ? (
        q.isError ? (
          <p role="alert" className="text-body-s text-text-danger">
            {classifyGameError(q.error).message}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )
      ) : (
        <div className="flex flex-col gap-5 pb-4">
          <div className="flex flex-wrap items-center gap-2 text-caption text-text-tertiary">
            <span>
              {v.bet.game.name} · nonce {v.verify.nonce} · stake <CreditsAmount value={v.bet.stake} /> · rules{' '}
              {v.verify.rulesVersion}
            </span>
            <DemoBadge size="xs" />
          </div>

          {!v.revealed || !edit ? (
            <>
              <div className="flex items-start gap-3 rounded-lg border border-status-info bg-status-info-tint p-4">
                <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-text-info" />
                <div className="flex flex-col gap-2 text-body-s text-text-primary">
                  <p className="text-body-s-strong">The server seed of this pair is still secret.</p>
                  <p className="text-text-secondary">
                    Rotate your seed pair to reveal it — then this {noun} (and every other bet made with the pair) can be
                    recomputed here.
                  </p>
                  <Button
                    size="s"
                    variant="secondary"
                    className="w-fit min-h-11 tablet:min-h-8"
                    onClick={() => void reveal()}
                    loading={rotate.isPending}
                    leadingIcon={<RefreshCw aria-hidden />}
                  >
                    Rotate seeds & reveal
                  </Button>
                </div>
              </div>
              <SeedLine label="Server seed hash (committed before you bet)" value={v.verify.serverSeedHash} />
              <div className="grid grid-cols-2 gap-3">
                <SeedLine label="Client seed" value={v.verify.clientSeed} />
                <SeedLine label="Nonce" value={String(v.verify.nonce)} />
              </div>
              <p className="text-body-s text-text-secondary">Recorded result: {outcomeText(v.bet.outcome)}</p>
            </>
          ) : (
            <>
              {check?.matches ? (
                <div role="status" className="flex items-start gap-3 rounded-lg border border-border-brand bg-brand-tint-subtle p-4">
                  <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-icon-brand" />
                  <div>
                    <p className="text-body-s-strong text-text-primary">
                      {noun[0]!.toUpperCase() + noun.slice(1)} {ref} verified
                    </p>
                    <p className="text-body-s text-text-secondary">
                      Recomputed in your browser from the revealed seeds: {outcomeText(check.result?.outcome)} — the same
                      as the recorded result.
                    </p>
                  </div>
                </div>
              ) : (
                <div role="alert" className="flex items-start gap-3 rounded-lg border border-border-danger bg-status-danger-tint p-4">
                  <CircleX aria-hidden className="mt-0.5 size-5 shrink-0 text-text-danger" />
                  <div className="flex flex-col gap-2">
                    <p className="text-body-s-strong text-text-primary">
                      The recomputed {noun} doesn’t match the recorded {noun}
                    </p>
                    <p className="text-body-s text-text-secondary">
                      {check?.error
                        ? check.error
                        : `Most mismatches come from pasting a server seed from another seed pair or changing the nonce. ${ref} used client seed ${v.verify.clientSeed} and nonce ${v.verify.nonce}.`}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {edited && (
                        <Button
                          size="s"
                          variant="secondary"
                          className="min-h-11 tablet:min-h-8"
                          onClick={() =>
                            setEdit({
                              serverSeed: v.verify.serverSeed!,
                              clientSeed: v.verify.clientSeed,
                              nonce: String(v.verify.nonce),
                            })
                          }
                          leadingIcon={<RefreshCw aria-hidden />}
                        >
                          Use the seeds from {ref}
                        </Button>
                      )}
                      <Button size="s" variant="ghost" asChild className="min-h-11 tablet:min-h-8">
                        <Link href={GAMES_ROUTES.support}>
                          <LifeBuoy aria-hidden />
                          Contact support
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <ol className="flex flex-col gap-4">
                <Step
                  n={1}
                  title="Commitment published"
                  body="Before your bet we showed the SHA-256 hash of the server seed. It has not changed since."
                  mono={shortHash(v.verify.serverSeedHash, 12, 8)}
                />
                <Step
                  n={2}
                  title="Seed revealed"
                  bad={!check?.commitmentValid}
                  body={
                    check?.commitmentValid
                      ? 'Hashing the revealed server seed gives exactly the committed value.'
                      : `The server seed hashes to ${shortHash(safeSha(edit.serverSeed))}, not the committed ${shortHash(v.verify.serverSeedHash)}.`
                  }
                  mono={shortHash(edit.serverSeed, 12, 8)}
                />
                <Step
                  n={3}
                  title="Your inputs"
                  body={`Client seed and nonce ${edit.nonce} — bet number ${edit.nonce} with this seed pair (counting from 0).`}
                  mono={`${edit.clientSeed} · ${edit.nonce}`}
                />
                <Step
                  n={4}
                  title="Result recomputed"
                  bad={!check?.matches}
                  body={
                    <>
                      {formula ??
                        'HMAC-SHA256(server seed, "client seed:nonce:cursor") gives the bytes the published formula maps to a result.'}{' '}
                      Recorded: {outcomeText(v.bet.outcome)}.
                    </>
                  }
                  mono={check?.result ? outcomeText(check.result.outcome) : (check?.error ?? '—')}
                />
              </ol>

              {check?.firstBlock && (
                <SeedLine label="HMAC block 0 (hex)" value={check.firstBlock} display={shortHash(check.firstBlock, 16, 8)} />
              )}

              <fieldset className="flex flex-col gap-3 rounded-lg border border-border-subtle p-4">
                <legend className="px-1 text-label-m text-text-secondary">Verify it yourself</legend>
                <Field label="Server seed (revealed)">
                  <Input
                    value={edit.serverSeed}
                    onChange={(e) => setEdit({ ...edit, serverSeed: e.target.value })}
                    className="font-mono"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </Field>
                <div className="grid grid-cols-[1fr_120px] gap-3">
                  <Field label="Client seed">
                    <Input
                      value={edit.clientSeed}
                      onChange={(e) => setEdit({ ...edit, clientSeed: e.target.value })}
                      className="font-mono"
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </Field>
                  <Field label="Nonce" error={nonceNum === null ? 'Whole number' : undefined}>
                    <Input
                      value={edit.nonce}
                      inputMode="numeric"
                      onChange={(e) => setEdit({ ...edit, nonce: e.target.value.replace(/\D/g, '') })}
                      className="font-mono"
                    />
                  </Field>
                </div>
                <p className="text-caption text-text-tertiary">
                  Recomputed with <code className="font-mono">verifyBet()</code> from @gp/shared/fair — the same code the
                  server settles with. API check: {v.matches === null ? 'pending' : v.matches ? 'match' : 'mismatch'}.
                </p>
              </fieldset>
            </>
          )}
        </div>
      )}
    </ResponsiveModal>
  );
}

function safeSha(s: string): string {
  try {
    return sha256Hex(s);
  } catch {
    return '';
  }
}
