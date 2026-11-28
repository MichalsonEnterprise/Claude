'use client';

import { CLIENT_SEED_PATTERN, sha256Hex, type CoinSide } from '@gp/shared/fair';
import { formatCount, formatDateTimeUTC } from '@gp/shared/format';
import { formatAmount } from '@gp/shared/money';
import {
  BookOpen,
  CircleCheck,
  CircleX,
  Code2,
  History,
  KeyRound,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import {
  CopyValue,
  CreditsAmount,
  KitChip,
  SeedLine,
  GAMES_ROUTES,
  shortHash,
  verifyInBrowser,
} from '@/components/games/kit';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Field, Input, InputControl, InputGroup } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import {
  classifyGameError,
  gamesApi,
  useBetVerification,
  useGameBets,
  useRotateSeed,
  useSeeds,
  type BetVerification,
} from '@/lib/api/games';
import { cn } from '@/lib/utils';

import { CoinFace } from './coin';
import { CoinflipSubpage } from './coinflip-pages';
import {
  HOUSE_EDGE,
  MULTIPLIER,
  SLUG,
  normaliseFlipSearch,
  payoutOnWin,
  sideLabel,
  sideOfU32,
  u32Fraction,
  u32Hex,
  type CoinflipBet,
} from './coinflip-math';
import { COINFLIP_ROUTES } from './routes';

const CARD =
  'flex min-w-0 flex-col gap-4 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:p-6';

function CardTitle({
  icon: Icon,
  title,
  sub,
  aside,
}: {
  icon: LucideIcon;
  title: string;
  sub?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0 text-icon-brand" />
      <div className="flex min-w-0 flex-col">
        <h2 className="text-h5 text-text-primary">{title}</h2>
        {sub && <p className="text-caption text-text-tertiary">{sub}</p>}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        {aside ?? <DemoBadge size="s" />}
      </div>
    </div>
  );
}

/** First 4 bytes of HMAC block 0 as an integer (display / code sample only — the side comes from verifyBet()). */
function u32OfBlock(blockHex: string | null): number | null {
  if (!blockHex || blockHex.length < 8) return null;
  const n = Number.parseInt(blockHex.slice(0, 8), 16);
  return Number.isSafeInteger(n) ? n : null;
}

function safeSha(s: string): string {
  try {
    return sha256Hex(s);
  } catch {
    return '';
  }
}

/** "Verify a result" — commitment → revealed seed → inputs → result recomputed IN THE BROWSER (@gp/shared/fair). */
function Verifier({ v, onRevealed }: { v: BetVerification; onRevealed: () => void }) {
  const bet = v.bet as unknown as CoinflipBet;
  const rotate = useRotateSeed(SLUG);
  const [edit, setEdit] = React.useState<{
    serverSeed: string;
    clientSeed: string;
    nonce: string;
  } | null>(null);
  React.useEffect(() => {
    setEdit(
      v.verify.serverSeed
        ? {
            serverSeed: v.verify.serverSeed,
            clientSeed: v.verify.clientSeed,
            nonce: String(v.verify.nonce),
          }
        : null,
    );
  }, [v.verify.serverSeed, v.verify.clientSeed, v.verify.nonce]);
  const nonceNum = edit && /^\d{1,9}$/.test(edit.nonce) ? Number(edit.nonce) : null;
  const check = React.useMemo(
    () =>
      edit && nonceNum !== null
        ? verifyInBrowser(v, {
            serverSeed: edit.serverSeed.trim(),
            clientSeed: edit.clientSeed.trim(),
            nonce: nonceNum,
          })
        : null,
    [v, edit, nonceNum],
  );
  const edited =
    !!edit &&
    (edit.serverSeed !== v.verify.serverSeed ||
      edit.clientSeed !== v.verify.clientSeed ||
      edit.nonce !== String(v.verify.nonce));
  const computedSide = (check?.result?.outcome as { side?: CoinSide } | undefined)?.side;
  const hashOfInput = edit ? safeSha(edit.serverSeed.trim()) : '';

  const reveal = async () => {
    try {
      await rotate.mutateAsync(undefined);
      onRevealed();
      toast({
        type: 'success',
        title: 'Seed pair rotated',
        description: 'The server seed is revealed — recomputing your flip.',
      });
    } catch (err) {
      toast({
        type: 'error',
        title: 'Could not rotate seeds',
        description: classifyGameError(err).message,
      });
    }
  };

  return (
    <section
      aria-labelledby="verify-title"
      className={cn(
        CARD,
        check?.matches ? 'border-border-brand' : check ? 'border-border-danger' : '',
      )}
    >
      <div className="flex items-start gap-3">
        <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-icon-brand" />
        <div className="flex min-w-0 flex-col">
          <h2 id="verify-title" className="text-h5 text-text-primary">
            Verify a result
          </h2>
          <p className="text-caption text-text-tertiary">
            Recompute flip {bet.ref} — runs in your browser
          </p>
        </div>
        <DemoBadge size="s" className="ml-auto" />
      </div>

      {!v.revealed || !edit ? (
        <>
          <div
            className="flex items-start gap-3 rounded-lg border border-status-info bg-status-info-tint p-4"
            role="status"
          >
            <Lock aria-hidden className="mt-0.5 size-5 shrink-0 text-text-info" />
            <div className="flex flex-col gap-2 text-body-s">
              <p className="text-body-s-strong text-text-primary">
                The server seed of this pair is still secret.
              </p>
              <p className="text-text-secondary">
                Rotate your seed pair to reveal it — then {bet.ref} (and every other flip made with
                the pair) can be recomputed here. Rotating never changes a result: it only reveals
                the seed you were committed to.
              </p>
              <Button
                size="s"
                variant="secondary"
                className="min-h-11 w-fit tablet:min-h-8"
                onClick={() => void reveal()}
                loading={rotate.isPending}
                leadingIcon={<RefreshCw aria-hidden />}
              >
                Rotate seeds & reveal
              </Button>
            </div>
          </div>
          <SeedLine
            label="Server seed hash (committed before the bet)"
            value={v.verify.serverSeedHash}
          />
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <SeedLine label="Client seed" value={v.verify.clientSeed} />
            <SeedLine label="Nonce" value={String(v.verify.nonce)} />
          </div>
          <p className="text-body-s text-text-secondary">
            Recorded for {bet.ref}: {sideLabel(bet.outcome.side)} · {bet.win ? 'Win' : 'Lose'}
          </p>
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
                data-testid="verify-server-seed"
              />
              <CopyValue value={edit.serverSeed} label="server seed" />
            </InputGroup>
          </Field>
          <div className="flex flex-col gap-1">
            <span className="text-caption text-text-tertiary">
              Server seed hash (committed before the bet)
            </span>
            <div className="flex min-h-11 items-center gap-2 rounded-md border border-border-subtle bg-bg-secondary px-3">
              <span className="min-w-0 flex-1 break-all font-mono text-mono-s text-text-primary">
                {v.verify.serverSeedHash}
              </span>
              <Lock
                aria-label="Locked — published before the flip"
                className="size-4 shrink-0 text-icon-muted"
              />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <Field label="Client seed">
              <Input
                size="l"
                value={edit.clientSeed}
                onChange={(e) => setEdit({ ...edit, clientSeed: e.target.value })}
                className="font-mono"
                spellCheck={false}
                autoComplete="off"
              />
            </Field>
            <Field label="Nonce" error={nonceNum === null ? 'Whole number' : undefined}>
              <Input
                size="l"
                value={edit.nonce}
                inputMode="numeric"
                onChange={(e) => setEdit({ ...edit, nonce: e.target.value.replace(/\D/g, '') })}
                className="font-mono"
              />
            </Field>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-secondary p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 flex-col">
                <span className="text-caption text-text-tertiary">SHA-256(revealed seed)</span>
                <span className="font-mono text-mono-s text-text-primary">
                  {shortHash(hashOfInput, 12, 8)}
                </span>
              </div>
              {check?.commitmentValid ? (
                <KitChip icon={CircleCheck} tone="brand">
                  Matches commitment
                </KitChip>
              ) : (
                <KitChip icon={CircleX} tone="danger">
                  Doesn’t match the commitment
                </KitChip>
              )}
            </div>
            <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border-subtle pt-3">
              <div className="flex flex-col">
                <span className="text-caption text-text-tertiary">Computed result</span>
                <span className="text-h3 text-text-primary" data-testid="verify-computed">
                  {computedSide ? sideLabel(computedSide) : '—'}
                </span>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-caption text-text-tertiary">Recorded for {bet.ref}</span>
                <span className="text-body-m-strong text-text-primary">
                  {sideLabel(bet.outcome.side)} · {bet.win ? 'Win' : 'Lose'}
                </span>
              </div>
            </div>
          </div>

          {check?.matches ? (
            <div
              role="status"
              className="flex items-start gap-3 rounded-lg border border-border-brand bg-brand-tint-subtle p-4"
              data-testid="verify-ok"
            >
              <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-icon-brand" />
              <div>
                <p className="text-body-s-strong text-text-brand">
                  Verified — the result was fixed before you bet
                </p>
                <p className="text-body-s text-text-secondary">
                  The revealed seed hashes to the commitment shown before flip {bet.ref}, and
                  HMAC-SHA256(server seed, client seed:nonce:0) reproduces{' '}
                  {sideLabel(bet.outcome.side)} — the recorded result.
                </p>
              </div>
            </div>
          ) : (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-border-danger bg-status-danger-tint p-4"
              data-testid="verify-failed"
            >
              <CircleX aria-hidden className="mt-0.5 size-5 shrink-0 text-text-danger" />
              <div className="flex flex-col gap-1">
                <p className="text-body-s-strong text-text-primary">
                  Verification failed — the inputs don’t reproduce {bet.ref}
                </p>
                <p className="text-body-s text-text-secondary">
                  {check?.error
                    ? check.error
                    : !check?.commitmentValid
                      ? `The pasted server seed hashes to ${shortHash(hashOfInput)}, not the committed ${shortHash(v.verify.serverSeedHash)}${edit.serverSeed.trim().length !== 64 ? ` (${edit.serverSeed.trim().length} characters — a server seed has 64; re-copy it)` : ''}.`
                      : `${bet.ref} used client seed ${v.verify.clientSeed} and nonce ${v.verify.nonce}.`}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() =>
                setEdit({
                  serverSeed: v.verify.serverSeed!,
                  clientSeed: v.verify.clientSeed,
                  nonce: String(v.verify.nonce),
                })
              }
              leadingIcon={edited ? <RefreshCw aria-hidden /> : <ShieldCheck aria-hidden />}
              className="min-h-11 tablet:min-h-10"
            >
              {edited ? `Use the seeds of ${bet.ref}` : 'Verify again'}
            </Button>
            <Link
              href={GAMES_ROUTES.provablyFair}
              className="ml-auto inline-flex min-h-11 items-center gap-1.5 text-label-m text-text-brand hover:underline tablet:min-h-0"
            >
              <BookOpen aria-hidden className="size-4" /> How verification works
            </Link>
          </div>
          <p className="text-caption text-text-tertiary">
            Recomputed with <code className="font-mono">verifyBet()</code> from @gp/shared/fair —
            the same code the server settles with. Server check:{' '}
            {v.matches === null ? 'pending' : v.matches ? 'match' : 'mismatch'}.
          </p>
        </>
      )}
    </section>
  );
}

/** "Verify with your own tools" — the published procedure with this flip's real values. */
function OwnTools({ v }: { v: BetVerification }) {
  const bet = v.bet as unknown as CoinflipBet;
  const seed = v.verify.serverSeed;
  const check = React.useMemo(
    () =>
      seed
        ? verifyInBrowser(v, {
            serverSeed: seed,
            clientSeed: v.verify.clientSeed,
            nonce: v.verify.nonce,
          })
        : null,
    [v, seed],
  );
  const u32 = u32OfBlock(check?.firstBlock ?? null) ?? bet.outcome.u32;
  const lines: [string, string][] = [
    [
      `server_seed = "${seed ? shortHash(seed, 8, 7) : '(secret until you rotate)'}"`,
      '# revealed at rotation',
    ],
    [
      `sha256(server_seed) == "${shortHash(v.verify.serverSeedHash, 8, 8)}"`,
      seed && check?.commitmentValid ? '# ✓ matches commitment' : '# commitment',
    ],
    [`h = HMAC_SHA256(key=server_seed, msg="${v.verify.clientSeed}:${v.verify.nonce}:0")`, ''],
    ['x = int(h[0:8], 16) / 2**32', `# ${u32Hex(u32)} → ${u32Fraction(u32)}`],
    ['side = "Heads" if x < 0.5 else "Tails"', `# → ${sideLabel(sideOfU32(u32))}`],
  ];
  return (
    <section aria-labelledby="own-tools" className={CARD}>
      <div className="flex items-center gap-2">
        <Code2 aria-hidden className="size-5 text-icon-brand" />
        <h2 id="own-tools" className="text-h5 text-text-primary">
          Verify with your own tools
        </h2>
        <DemoBadge size="s" />
      </div>
      <pre className="no-scrollbar overflow-x-auto rounded-lg border border-border-subtle bg-bg-secondary p-4 font-mono text-mono-s leading-6">
        {lines.map(([code, comment], i) => (
          <div key={i} className="whitespace-pre">
            <span
              className={
                i === 1 && check?.commitmentValid
                  ? 'text-text-success'
                  : i === 4
                    ? 'text-text-brand'
                    : 'text-text-primary'
              }
            >
              {code}
            </span>
            {comment && (
              <span className="text-text-tertiary">
                {'  '}
                {comment}
              </span>
            )}
          </div>
        ))}
      </pre>
      <p className="text-caption text-text-tertiary">
        Values of flip {bet.ref} ({v.verify.rulesVersion}). The byte order and mapping are published
        in the rules; they never depend on your bet size or your pick.
      </p>
    </section>
  );
}

/** "Your seeds" — previous pair revealed, new commitment, client seed, nonce, rotate. */
function YourSeeds() {
  const seeds = useSeeds(SLUG);
  const rotate = useRotateSeed(SLUG);
  const [client, setClient] = React.useState('');
  const a = seeds.data?.active;
  const prev = seeds.data?.revealed[0];
  React.useEffect(() => {
    if (a) setClient(a.clientSeed);
  }, [a]);
  const valid = CLIENT_SEED_PATTERN.test(client);
  const act = async (clientSeed?: string) => {
    try {
      const r = await rotate.mutateAsync(clientSeed);
      toast({
        type: 'success',
        title: 'Seed pair rotated',
        description: `Server seed ${shortHash(r.revealed.serverSeed)} revealed — new hash ${shortHash(r.active.serverSeedHash)} committed.`,
      });
    } catch (err) {
      toast({
        type: 'error',
        title: 'Could not change seeds',
        description: classifyGameError(err).message,
      });
    }
  };
  return (
    <section aria-labelledby="your-seeds" className={CARD}>
      <div className="flex items-start gap-3">
        <KeyRound aria-hidden className="mt-0.5 size-5 shrink-0 text-icon-brand" />
        <div className="flex min-w-0 flex-col">
          <h2 id="your-seeds" className="text-h5 text-text-primary">
            Your seeds
          </h2>
          <p className="text-caption text-text-tertiary">Provably fair · Double Side seed pair</p>
        </div>
        <DemoBadge size="s" className="ml-auto" />
      </div>
      {seeds.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : !a ? (
        <p className="text-body-s text-text-secondary">Couldn’t load your seeds.</p>
      ) : (
        <>
          {prev && (
            <div className="flex items-start gap-3 rounded-lg border border-border-brand bg-brand-tint-subtle p-4">
              <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-icon-brand" />
              <div className="flex flex-col gap-0.5">
                <p className="text-body-s-strong text-text-brand">Seed pair rotated</p>
                <p className="text-caption text-text-secondary">
                  The previous server seed is revealed below — use it to verify your last{' '}
                  {prev.bets} bet
                  {prev.bets === 1 ? '' : 's'}. New bets use the new pair from nonce 0.
                </p>
              </div>
            </div>
          )}
          {prev?.serverSeed && (
            <div className="flex flex-col gap-1">
              <SeedLine
                label="Previous server seed (revealed)"
                value={prev.serverSeed}
                display={shortHash(prev.serverSeed, 16, 12)}
              />
              <p className="text-caption text-text-tertiary">
                SHA-256 of this value = the hash you were shown before betting (
                {shortHash(prev.serverSeedHash)}).
              </p>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-2 text-caption text-text-tertiary">
              New server seed (hashed · SHA-256)
              <KitChip tone="brand" className="h-5 px-2 text-[10px]">
                LIVE
              </KitChip>
            </span>
            <SeedLine
              label="Committed server seed hash"
              value={a.serverSeedHash}
              display={shortHash(a.serverSeedHash, 16, 12)}
              className="[&>span:first-child]:sr-only"
            />
            <p className="text-caption text-text-tertiary">
              Committed before your next bet — the unhashed seed stays secret until you rotate.
            </p>
          </div>
          <Field
            label="Client seed"
            helper="Yours to change at any time — it is mixed into every result. Changing it reveals the current server seed."
            error={
              client && !valid ? 'Use 1–64 letters, digits, dot, dash or underscore.' : undefined
            }
          >
            <InputGroup size="l">
              <InputControl
                value={client}
                maxLength={64}
                onChange={(e) => setClient(e.target.value.trim())}
                className="font-mono"
                spellCheck={false}
                autoComplete="off"
              />
              <Button
                variant="secondary"
                size="s"
                className="min-h-11 tablet:min-h-8"
                disabled={!valid || client === a.clientSeed}
                loading={rotate.isPending && rotate.variables !== undefined}
                onClick={() => void act(client)}
              >
                Use
              </Button>
            </InputGroup>
          </Field>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col">
              <span className="text-caption text-text-tertiary">Next nonce</span>
              <span className="font-mono text-h4 text-text-primary">{a.nonce}</span>
              <span className="text-caption text-text-tertiary">
                Resets to 0 with every new pair
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button
                variant="secondary"
                className="min-h-11 tablet:min-h-10"
                onClick={() => void act(undefined)}
                loading={rotate.isPending && rotate.variables === undefined}
                leadingIcon={<RefreshCw aria-hidden />}
              >
                Rotate seed
              </Button>
              {prev?.endedAt && (
                <span className="text-caption text-text-tertiary">
                  Last rotated {formatDateTimeUTC(prev.endedAt)}
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

/** "How a flip is decided" — the five published steps with this flip's numbers. */
function HowDecided({ bet }: { bet: CoinflipBet | null }) {
  const o = bet?.outcome;
  const steps: [string, string][] = [
    ['Commit', 'Before you flip, we show SHA-256 of the server seed. It can’t change afterwards.'],
    [
      'Combine',
      `HMAC-SHA256(server seed, client seed : nonce : 0)${o && bet ? ` — your client seed and nonce ${bet.fairness.nonce} are mixed in` : ''}.`,
    ],
    [
      'Scale',
      o
        ? `First 4 bytes ${u32Hex(o.u32)} = ${formatCount(o.u32)} ÷ 4,294,967,296 = ${u32Fraction(o.u32)}`
        : 'First 4 bytes ÷ 4,294,967,296 = x (between 0 and 1).',
    ],
    [
      'Map',
      `Below 0.5000 → Heads · 0.5000 or above → Tails.${o ? ` Here: ${sideLabel(o.side)}.` : ''}`,
    ],
    [
      'Pay',
      `A correct pick pays ${MULTIPLIER}× (house edge ${HOUSE_EDGE}%).${bet ? ` ${formatAmount(bet.stake)} → ${formatAmount(payoutOnWin(bet.stake))} DEMO.` : ''}`,
    ],
  ];
  return (
    <section aria-labelledby="how-decided" className={CARD}>
      <CardTitle icon={ShieldCheck} title="How a flip is decided" aside={<span />} />
      <ol className="flex flex-col gap-4">
        {steps.map(([t, body], i) => (
          <li key={t} className="flex gap-3">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-label-s',
                i === 3 ? 'bg-brand-tint text-text-brand' : 'bg-surface-raised text-text-secondary',
              )}
            >
              {i + 1}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-body-s-strong text-text-primary">{t}</p>
              <p className="break-words text-body-s text-text-secondary">{body}</p>
            </div>
          </li>
        ))}
      </ol>
      {bet && o && (
        <div className="flex flex-wrap items-center gap-3 border-t border-border-subtle pt-4">
          <CoinFace side={o.side} size={44} />
          <span className="text-body-s-strong text-text-primary">
            Flip {bet.ref} · {sideLabel(o.side)} · {bet.win ? 'Win' : 'Lose'}{' '}
            <CreditsAmount value={bet.net} signed tone="net" />
          </span>
          <DemoBadge size="xs" />
        </div>
      )}
    </section>
  );
}

/** CF-05 — Provably fair: verify a flip in the browser, your seeds, the published procedure with real values. */
export function CoinflipFairnessPage() {
  const params = useSearchParams();
  const router = useRouter();
  const latest = useGameBets<CoinflipBet>(SLUG, 1, 1);
  const betId = params.get('bet') ?? latest.data?.items[0]?.id ?? null;
  const v = useBetVerification(betId);
  const seeds = useSeeds(SLUG);
  const [lookup, setLookup] = React.useState('');
  const [looking, setLooking] = React.useState(false);
  const [lookupError, setLookupError] = React.useState<string | null>(null);
  const prev = seeds.data?.revealed[0];

  const find = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = normaliseFlipSearch(lookup);
    if (!s) {
      setLookupError('Use a flip ID like CF-52107 or a nonce like 418.');
      return;
    }
    setLooking(true);
    setLookupError(null);
    try {
      const page = await gamesApi.bets<CoinflipBet>(SLUG, 1, 1, { search: s });
      const hit = page.items[0];
      if (!hit) setLookupError(`No Double Side flip ${s} in your account.`);
      else router.replace(COINFLIP_ROUTES.verify(hit.id), { scroll: false });
    } catch (err) {
      setLookupError(classifyGameError(err).message);
    } finally {
      setLooking(false);
    }
  };

  const bet = (v.data?.bet as unknown as CoinflipBet | undefined) ?? null;

  return (
    <CoinflipSubpage
      crumb="Fairness"
      title="Provably fair"
      tab="fairness"
      chips={
        <>
          {prev?.endedAt && (
            <KitChip icon={RefreshCw} className="hidden tablet:inline-flex">
              Seed pair rotated {formatDateTimeUTC(prev.endedAt)}
            </KitChip>
          )}
          <DemoBadge size="m" />
        </>
      }
      actions={
        <Button
          variant="secondary"
          asChild
          className="min-h-11 tablet:min-h-10"
          leadingIcon={<History aria-hidden />}
        >
          <Link href={COINFLIP_ROUTES.myFlips}>My flips</Link>
        </Button>
      }
    >
      <div className="grid gap-5 laptop:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] tablet:gap-6">
        <div className="flex min-w-0 flex-col gap-5 tablet:gap-6">
          <form
            onSubmit={(e) => void find(e)}
            className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-default p-4 tablet:flex-row tablet:items-end tablet:p-5"
          >
            <Field label="Game" className="tablet:w-44">
              <Input size="l" value="Double Side" readOnly aria-readonly />
            </Field>
            <Field label="Flip ID or nonce" error={lookupError ?? undefined} className="flex-1">
              <InputGroup size="l">
                <Search aria-hidden className="size-4 text-icon-muted" />
                <InputControl
                  value={lookup}
                  onChange={(e) => {
                    setLookup(e.target.value.slice(0, 16));
                    setLookupError(null);
                  }}
                  placeholder={bet?.ref ?? 'CF-52107'}
                  autoComplete="off"
                  spellCheck={false}
                />
              </InputGroup>
            </Field>
            <Button
              type="submit"
              variant="secondary"
              size="l"
              loading={looking}
              className="min-h-12"
            >
              Load flip
            </Button>
          </form>

          {!betId && !latest.isPending ? (
            <div className={CARD}>
              <CardTitle icon={ShieldCheck} title="Verify a result" />
              <p className="text-body-s text-text-secondary">
                No flips yet. Play Double Side and come back — every flip can be recomputed here
                from the seeds.
              </p>
              <Button asChild className="w-fit">
                <Link href={COINFLIP_ROUTES.play}>Play Double Side</Link>
              </Button>
            </div>
          ) : v.isError ? (
            <div className={CARD} role="alert">
              <CardTitle icon={ShieldCheck} title="Verify a result" />
              <p className="text-body-s text-text-danger">{classifyGameError(v.error).message}</p>
            </div>
          ) : !v.data ? (
            <Skeleton className="h-[520px] w-full rounded-xl" />
          ) : (
            <>
              <Verifier v={v.data} onRevealed={() => void v.refetch()} />
              <OwnTools v={v.data} />
            </>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-5 tablet:gap-6">
          <YourSeeds />
          <HowDecided bet={bet} />
        </div>
      </div>
    </CoinflipSubpage>
  );
}
