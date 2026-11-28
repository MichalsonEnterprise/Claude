'use client';

import {
  formatCount,
  formatDateTimeUTC,
  formatRoundNumber,
  formatTimeUTC,
} from '@gp/shared/format';
import { formatUSDT, sum, toUSDTString } from '@gp/shared/money';
import {
  ArrowLeft,
  CircleCheck,
  CircleHelp,
  CircleX,
  Clock,
  Code2,
  Database,
  Download,
  Hash,
  Info,
  ListChecks,
  MinusCircle,
  RotateCcw,
  ShieldCheck,
  Ticket,
  Trophy,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Field, Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { PoolVerification } from '@/lib/api/pool';
import { cn } from '@/lib/utils';

import { shortHash, verifyDraw, type VerifyCheck, type VerifyReport } from './logic';
import {
  Callout,
  CardHeading,
  LicenceStrip,
  POOL_ROUTES,
  PoolPageHeader,
  PoolTabs,
  QueryError,
  cardCls,
} from './parts';
import { useMyRoundEntries, useRound, useVerification, useViewer } from './use-pool';

const entryCode = (round: number, seq: number) => `E-${round}-${String(seq).padStart(5, '0')}`;

/**
 * GP-12 Provably fair verification: fetches GET /pool/rounds/:n/verify and re-derives the winners IN THE BROWSER
 * with @gp/contracts/verify (the same code the contract's DrawMath is tested against). Players can paste their own
 * random word — a different value fails the check, which is the point. Nothing is sent to GLOBAL POOL.
 */
export function VerifyPage({ number }: { number: number }) {
  const bundle = useVerification(number);
  const round = useRound(number);
  const { member } = useViewer();
  const mine = useMyRoundEntries(member ? round.data : null);
  const [override, setOverride] = React.useState<string | undefined>(undefined);
  const [draft, setDraft] = React.useState('');
  const [checkedAt, setCheckedAt] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (bundle.data?.randomness?.randomWord) setDraft(bundle.data.randomness.randomWord);
  }, [bundle.data?.randomness?.randomWord]);

  const report: VerifyReport | null = React.useMemo(
    () => (bundle.data ? verifyDraw(bundle.data, round.data ?? null, override) : null),
    [bundle.data, round.data, override],
  );
  React.useEffect(() => {
    if (report) setCheckedAt(new Date().toISOString());
  }, [report]);

  const crumbs = [
    { label: 'Lobby', href: '/' },
    { label: 'Global Pool', href: POOL_ROUTES.hub },
    { label: formatRoundNumber(number), href: POOL_ROUTES.round(number) },
    { label: 'Verify' },
  ];
  const header = (
    <>
      <PoolPageHeader
        crumbs={crumbs}
        title={`Verify round ${formatRoundNumber(number)}`}
        badges={
          report && report.state !== 'unavailable' ? (
            <>
              <StatusBadge
                status={report.state === 'verified' ? 'confirmed' : 'failed'}
                label={report.state === 'verified' ? 'Verified' : 'Check failed'}
                size="m"
              />
              {round.data?.isDemo && <DemoBadge size="s" />}
            </>
          ) : undefined
        }
        actions={
          <>
            <Button variant="ghost" asChild leadingIcon={<CircleHelp aria-hidden />}>
              <Link href={`${POOL_ROUTES.fairness}#vrf`}>How verification works</Link>
            </Button>
            <Button variant="secondary" asChild leadingIcon={<ArrowLeft aria-hidden />}>
              <Link href={POOL_ROUTES.round(number)}>Back to results</Link>
            </Button>
          </>
        }
      />
      <PoolTabs active="fairness" />
    </>
  );

  if (bundle.isPending) {
    return (
      <div className="flex flex-col gap-6" aria-busy="true">
        {header}
        <Skeleton className="h-60 rounded-2xl" />
        <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-[480px] rounded-xl" />
          <Skeleton className="h-[480px] rounded-xl" />
        </div>
      </div>
    );
  }
  if (bundle.isError || !report || !bundle.data) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <QueryError
          error={bundle.error}
          onRetry={() => void bundle.refetch()}
          title="We couldn’t load the verification data"
        />
      </div>
    );
  }

  const b = bundle.data;
  if (report.state === 'unavailable') {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <section className={cn(cardCls, 'flex flex-col gap-4 p-6')}>
          <CardHeading
            icon={<Info aria-hidden className="size-5 text-icon-muted" />}
            title="Nothing to verify yet"
          />
          <p className="max-w-[720px] text-body-m text-text-secondary">{report.reason}</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" asChild>
              <Link href={POOL_ROUTES.round(number)}>Round {formatRoundNumber(number)}</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href={POOL_ROUTES.history}>Find a settled round</Link>
            </Button>
          </div>
        </section>
        <AlgorithmCard bundle={b} />
        <LicenceStrip />
      </div>
    );
  }

  const graded = report.checks.filter((c) => c.status !== 'info');
  const passed = graded.filter((c) => c.status === 'passed').length;
  const verified = report.state === 'verified';
  const r = b.randomness!;
  const recordedWord = r.randomWord ?? '';
  const wordEdited =
    override !== undefined && override.toLowerCase() !== recordedWord.toLowerCase();

  return (
    <div className="flex flex-col gap-6 pb-4">
      {header}

      {/* status panel */}
      <section
        aria-live="polite"
        className={cn(
          'relative overflow-hidden rounded-2xl border p-5 tablet:p-8',
          verified
            ? 'border-border-success bg-status-success-tint'
            : 'border-border-danger bg-status-danger-tint',
        )}
      >
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute -top-10 right-[220px] hidden h-[160%] w-[26px] -rotate-[24deg] laptop:block',
            verified ? 'bg-brand' : 'bg-status-danger',
          )}
        />
        <div className="relative grid gap-6 laptop:grid-cols-[minmax(0,1fr)_220px] laptop:items-center">
          <div className="flex flex-col gap-3">
            <p
              className={cn(
                'flex items-center gap-2 text-overline uppercase',
                verified ? 'text-text-success' : 'text-text-danger',
              )}
            >
              {verified ? (
                <CircleCheck aria-hidden className="size-4" />
              ) : (
                <CircleX aria-hidden className="size-4" />
              )}
              Checked in your browser
              {checkedAt ? ` · ${formatDateTimeUTC(checkedAt).replace(' UTC', '')} UTC` : ''}
            </p>
            <h2 className="text-h3 text-text-primary tablet:text-h2">
              {verified
                ? 'Verified — this draw matches the recorded result.'
                : 'Check failed — these values don’t reproduce the recorded result.'}
            </h2>
            <p className="max-w-[640px] text-body-m text-text-secondary">
              {verified
                ? `The random word, the entry list size and all ${report.winners.length} prizes reproduce exactly from public data. Nobody — including GLOBAL POOL — can choose or change the result.`
                : wordEdited
                  ? 'The random word you entered doesn’t match the recorded fulfilment. Usually a paste error — the recorded result itself hasn’t changed.'
                  : 'The recomputation doesn’t match the stored settlement. Report it — compliance and the auditor are notified.'}
            </p>
            <p className="flex flex-wrap gap-x-5 gap-y-1 text-caption text-text-secondary">
              <span className="inline-flex items-center gap-1.5">
                <Hash aria-hidden className="size-3.5" /> Request {shortHash(r.requestId)}
              </span>
              {r.fulfilledAt && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock aria-hidden className="size-3.5" /> Fulfilled{' '}
                  {formatTimeUTC(r.fulfilledAt, { seconds: true })}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Trophy aria-hidden className="size-3.5" /> {report.winners.length} winners ·{' '}
                {formatUSDT(b.round.pool)}
              </span>
              {r.provider === 'mock' && <span className="text-text-warning">DEV mock VRF</span>}
              {round.data?.isDemo && <DemoBadge size="xs" />}
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 laptop:items-center">
            <p
              className={cn(
                'flex items-center gap-3 text-display-m tabular-nums',
                verified ? 'text-text-success' : 'text-text-danger',
              )}
            >
              <ShieldCheck aria-hidden className="size-10" />
              {passed} / {graded.length}
            </p>
            <p className="text-label-l text-text-secondary">checks passed</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 laptop:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* values */}
          <section className={cn(cardCls, 'flex flex-col gap-4 p-5 tablet:p-6')}>
            <CardHeading
              icon={<Database aria-hidden className="size-5 text-icon-brand" />}
              title="Values used"
              demo={round.data?.isDemo}
              sub="Pre-filled from the round record. Paste a value from the block explorer to check it independently."
            />
            <Field label="Round">
              <Input
                readOnly
                value={`Round ${formatRoundNumber(b.round.number)} · ${b.round.status}${round.data?.settledAt ? ` ${formatDateTimeUTC(round.data.settledAt)}` : ''}`}
              />
            </Field>
            <Field label="Randomness request ID">
              <Input readOnly value={r.requestId} className="font-mono" />
            </Field>
            <Field
              label="Random word (from the fulfilment)"
              error={
                wordEdited && !verified
                  ? `Doesn’t match the recorded fulfilment (…${recordedWord.slice(-8)}).`
                  : undefined
              }
              success={!wordEdited ? 'Matches the recorded fulfilment.' : undefined}
            >
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                className="font-mono"
                state={wordEdited && !verified ? 'error' : !wordEdited ? 'success' : 'default'}
              />
            </Field>
            <Field label="Qualifying entries (entry list size)">
              <Input
                readOnly
                value={`${formatCount(b.round.totalEntries)} entries · ${b.algorithm.entryOrder}`}
              />
            </Field>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                leadingIcon={<RotateCcw aria-hidden />}
                onClick={() => setOverride(draft)}
              >
                Re-run check
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setDraft(recordedWord);
                  setOverride(undefined);
                }}
              >
                Reset to recorded values
              </Button>
            </div>
          </section>

          {/* checks */}
          <section className={cn(cardCls, 'flex flex-col gap-4 p-5 tablet:p-6')}>
            <CardHeading
              icon={<ListChecks aria-hidden className="size-5 text-icon-brand" />}
              title="Checks"
              sub="Run locally in your browser — nothing you paste is sent to GLOBAL POOL."
              action={
                <StatusBadge
                  status={verified ? 'confirmed' : 'failed'}
                  label={`${passed} / ${graded.length} passed`}
                />
              }
            />
            <ol className="flex flex-col gap-3">
              {report.checks.map((c, i) => (
                <CheckRow key={c.id} check={c} index={i + 1} />
              ))}
            </ol>
            {!verified && (
              <Callout tone="info" title="What to do next">
                <ol className="mt-1 flex list-decimal flex-col gap-1 pl-4">
                  <li>Reset to the recorded values and run the checks again.</li>
                  <li>
                    Compare the random word with the fulfilment shown on the round page or the
                    explorer.
                  </li>
                  <li>
                    Still failing with recorded values?{' '}
                    <Link href="/support" className="text-text-brand hover:underline">
                      Report this round
                    </Link>{' '}
                    — you get a case number and the public record stays visible.
                  </li>
                </ol>
              </Callout>
            )}
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <RecomputedWinners
            report={report}
            roundNumber={b.round.number}
            pool={b.round.pool}
            demo={round.data?.isDemo}
          />
          <FindEntries
            report={report}
            roundNumber={b.round.number}
            defaultEntry={mine.data?.firstEntryId ?? ''}
            myEntryIds={mine.data?.entryIds ?? []}
          />
          <section className={cn(cardCls, 'flex flex-col gap-3 p-5')}>
            <CardHeading
              icon={<Code2 aria-hidden className="size-5 text-icon-muted" />}
              title="Verify independently"
              as="h3"
              sub="Don’t want to trust this page? Use the raw data."
            />
            <Button
              variant="secondary"
              leadingIcon={<Download aria-hidden />}
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' }),
                );
                const a = document.createElement('a');
                a.href = url;
                a.download = `global-pool-round-${b.round.number}-verification.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download verification data (JSON)
            </Button>
            <p className="text-caption text-text-tertiary">
              Re-run it with the open-source verifier (
              <span className="font-mono">@gp/contracts/verify</span>,
              <span className="font-mono"> deriveWinners</span> +{' '}
              <span className="font-mono">splitPool</span>) — the same code the contract is tested
              against.
            </p>
            <Link
              href={`${POOL_ROUTES.fairness}#vrf`}
              className="text-label-m text-text-brand hover:underline"
            >
              How the algorithm works
            </Link>
          </section>
        </div>
      </div>
      <AlgorithmCard bundle={b} />
      <LicenceStrip />
    </div>
  );
}

function CheckRow({ check, index }: { check: VerifyCheck; index: number }) {
  const icon = {
    passed: <CircleCheck aria-hidden className="size-5 text-text-success" />,
    failed: <CircleX aria-hidden className="size-5 text-text-danger" />,
    skipped: <MinusCircle aria-hidden className="size-5 text-icon-muted" />,
    info: <Info aria-hidden className="size-5 text-text-info" />,
  }[check.status];
  const label = { passed: 'Passed', failed: 'Failed', skipped: 'Skipped', info: 'Info' }[
    check.status
  ];
  return (
    <li
      className={cn(
        'flex gap-3 rounded-lg bg-surface-raised p-4',
        check.status === 'failed' && 'ring-1 ring-border-danger',
      )}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-label-l text-text-primary">
            {index}. {check.title}
          </span>
          <span
            className={cn(
              'text-label-m',
              check.status === 'passed' && 'text-text-success',
              check.status === 'failed' && 'text-text-danger',
              check.status === 'info' && 'text-text-info',
              check.status === 'skipped' && 'text-text-tertiary',
            )}
          >
            {label}
          </span>
        </p>
        <p className="text-body-s break-words text-text-secondary">{check.detail}</p>
      </div>
    </li>
  );
}

function RecomputedWinners({
  report,
  roundNumber,
  pool,
  demo,
}: {
  report: VerifyReport;
  roundNumber: number;
  pool: string;
  demo?: boolean;
}) {
  const top = report.winners.slice(0, 3);
  const rest = report.winners.slice(3);
  const allMatch = report.winners.every((w) => w.matches);
  return (
    <section className={cn(cardCls, 'flex flex-col gap-3 p-5')}>
      <CardHeading
        icon={<Trophy aria-hidden className="size-5 text-icon-gold" />}
        title="Recomputed winners"
        demo={demo}
        as="h3"
        sub={
          allMatch
            ? 'Same entries and amounts as the stored settlement.'
            : 'Compared with the stored settlement.'
        }
      />
      <ul className="flex flex-col gap-2">
        {top.map((w) => (
          <li
            key={w.place}
            className="flex items-center gap-3 rounded-lg bg-surface-raised px-3 py-2.5"
          >
            {w.matches ? (
              <CircleCheck aria-label="Matches" className="size-4 shrink-0 text-text-success" />
            ) : (
              <CircleX aria-label="Differs" className="size-4 shrink-0 text-text-danger" />
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-label-m text-text-gold">
                {['1st', '2nd', '3rd'][w.place - 1]}{' '}
                <span className="text-caption text-text-tertiary">
                  {w.handle ? `@${w.handle}` : ''}
                </span>
              </span>
              <span className="font-mono text-mono-s text-text-tertiary">
                {entryCode(roundNumber, w.entrySeq)}
              </span>
            </span>
            <span className="text-label-m text-text-primary tabular-nums">
              {formatUSDT(w.amount, { symbol: false })}
            </span>
          </li>
        ))}
        {rest.length > 0 && (
          <li className="flex items-center gap-3 rounded-lg bg-surface-raised px-3 py-2.5">
            {rest.every((w) => w.matches) ? (
              <CircleCheck aria-label="Matches" className="size-4 shrink-0 text-text-success" />
            ) : (
              <CircleX aria-label="Differs" className="size-4 shrink-0 text-text-danger" />
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-label-m text-text-gold">
                Runner-up × {rest.length}{' '}
                <span className="text-caption text-text-tertiary">{rest.length} entries</span>
              </span>
              <span className="font-mono text-mono-s text-text-tertiary">
                {formatUSDT(rest[0]!.amount, { symbol: false })} each
              </span>
            </span>
            <span className="text-label-m text-text-primary tabular-nums">
              {formatUSDT(sumAmounts(rest.map((w) => w.amount)), { symbol: false })}
            </span>
          </li>
        )}
      </ul>
      <p className="flex items-center justify-between text-caption text-text-tertiary">
        Total
        <span className={cn('text-label-m', allMatch ? 'text-text-success' : 'text-text-danger')}>
          {formatUSDT(sumAmounts(report.winners.map((w) => w.amount)))} ·{' '}
          {allMatch ? `matches the ${formatUSDT(pool)} pool` : 'differs'}
        </span>
      </p>
    </section>
  );
}

function sumAmounts(values: string[]): string {
  return toUSDTString(sum(values));
}

function FindEntries({
  report,
  roundNumber,
  defaultEntry,
  myEntryIds,
}: {
  report: VerifyReport;
  roundNumber: number;
  defaultEntry: string;
  myEntryIds: string[];
}) {
  const [value, setValue] = React.useState(defaultEntry);
  React.useEffect(() => {
    if (defaultEntry) setValue(defaultEntry);
  }, [defaultEntry]);
  const id = value.trim().toUpperCase();
  const m = /^E-(\d+)-(\d{1,6})$/.exec(id);
  const seq = m && Number(m[1]) === roundNumber ? Number(m[2]) : null;
  const hit = seq !== null ? report.winners.find((w) => w.entrySeq === seq) : null;
  const mineWon = myEntryIds.filter((e) => {
    const mm = /-(\d+)$/.exec(e);
    return mm ? report.winners.some((w) => w.entrySeq === Number(mm[1])) : false;
  });
  return (
    <section className={cn(cardCls, 'flex flex-col gap-3 p-5')}>
      <CardHeading
        icon={<Ticket aria-hidden className="size-5 text-icon-brand" />}
        title="Find your entries"
        as="h3"
      />
      <Field label="Entry ID" helper={`Format E-${roundNumber}-00001`}>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`E-${roundNumber}-00001`}
          className="font-mono"
        />
      </Field>
      {id === '' ? null : seq === null ? (
        <p className="text-caption text-text-warning">
          That isn’t an entry ID of round {formatRoundNumber(roundNumber)}.
        </p>
      ) : hit ? (
        <p className="flex items-center gap-2 text-label-m text-text-success">
          <CircleCheck aria-hidden className="size-4" /> Selected — place {hit.place} ·{' '}
          {formatUSDT(hit.amount)}
        </p>
      ) : (
        <p className="flex items-center gap-2 text-label-m text-text-secondary">
          <CircleX aria-hidden className="size-4" /> Not selected in this draw
        </p>
      )}
      {myEntryIds.length > 0 && (
        <p className="text-caption text-text-tertiary">
          You had {formatCount(myEntryIds.length)} entries in round {formatRoundNumber(roundNumber)}{' '}
          ({myEntryIds[0]} … {myEntryIds.at(-1)?.split('-').at(-1)}).{' '}
          {mineWon.length
            ? `${mineWon.length} of them are among the recomputed winners.`
            : 'None were among the recomputed winners.'}
        </p>
      )}
    </section>
  );
}

function AlgorithmCard({ bundle }: { bundle: PoolVerification }) {
  return (
    <section
      className={cn(cardCls, 'flex flex-col gap-3 p-5 tablet:p-6')}
      aria-labelledby="algo-title"
    >
      <CardHeading
        icon={<Code2 aria-hidden className="size-5 text-icon-muted" />}
        title={<span id="algo-title">Winner rule · {bundle.algorithm.name}</span>}
      />
      <pre className="overflow-x-auto rounded-lg bg-bg-base p-4 font-mono text-mono-s whitespace-pre-wrap text-text-secondary">
        {`candidate_k = keccak256(abi.encode(domain, roundId, randomWord, k))   k = 0, 1, 2, …
reject candidate_k < 2^256 mod N        (no modulo bias)
index = candidate_k mod N; skip indices already drawn
rank i = i-th distinct index  ·  entry = seq (index + 1)
prize_r = floor(pool × bps_r / 10000) for r ≥ 2; 1st takes the remainder`}
      </pre>
      <dl className="grid gap-2 text-caption tablet:grid-cols-2">
        <div className="flex flex-col">
          <dt className="text-text-tertiary">Domain</dt>
          <dd className="font-mono break-all text-text-secondary">
            {bundle.algorithm.domain || '—'}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-text-tertiary">Round id used · prize split (bps)</dt>
          <dd className="font-mono text-text-secondary">
            {bundle.algorithm.roundIdUsed} · {bundle.algorithm.prizeSplitBps.join(' / ')}
          </dd>
        </div>
      </dl>
    </section>
  );
}
