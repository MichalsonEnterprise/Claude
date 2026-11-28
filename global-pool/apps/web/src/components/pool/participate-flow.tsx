'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ENTRY_PRICE, MAX_ENTRIES_PER_PURCHASE, PLATFORM_FEE_PER_ENTRY } from '@gp/shared/fees';
import {
  formatCount,
  formatDateTimeUTC,
  formatRoundNumber,
  formatTimeUTC,
} from '@gp/shared/format';
import { formatUSDT, money } from '@gp/shared/money';
import { enterRoundSchema } from '@gp/shared/schemas';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  CircleCheck,
  CircleSlash,
  Download,
  ExternalLink,
  Lock,
  Minus,
  Percent,
  Plus,
  Ticket,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { regulatoryFromError } from '@/components/compliance/regulatory-copy';
import { RegulatoryNotice } from '@/components/compliance/regulatory-state';
import { EntryTicket } from '@/components/home/art';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox';
import { DemoBadge } from '@/components/ui/demo-badge';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { InfoTooltip } from '@/components/ui/tooltip';
import { ApiRequestError, isOutcomeUnknown, newIdempotencyKey } from '@/lib/api/client';
import {
  enterRound,
  type EntryPurchaseResult,
  type PoolRoundView,
  type RgLimitView,
} from '@/lib/api/pool';
import { invalidatePlayerFinancials } from '@/lib/api/player-cache';
import { MQ, useMediaQuery } from '@/lib/hooks/use-media-query';
import { cn } from '@/lib/utils';

import { approxPercent, checkParticipation, oddsAfter, type ParticipationCheck } from './logic';
import { Callout, KV, LicenceCard, Meter, POOL_ROUTES, Steps, errorMessage } from './parts';

// ── form (RHF + zod; entries rule shared with the API) ────────────────────────────────────────

const previewSchema = enterRoundSchema.pick({ entries: true }).extend({
  consent: z.boolean().refine((v) => v, {
    error: 'Tick the box to confirm you understand entries are final.',
  }),
});
type PreviewForm = z.infer<typeof previewSchema>;

type Phase =
  | { kind: 'preview' }
  | { kind: 'pending'; entries: number }
  | {
      kind: 'success';
      result: EntryPurchaseResult;
      /** Snapshot at submit time (queries refetch after the purchase). */
      myEntriesBefore: number;
      limitsBefore: RgLimitView[] | null;
    }
  | { kind: 'closed'; entries: number }
  /** `unknown`: no definite answer (network drop, 5xx, still processing) — the purchase may have gone through. */
  | { kind: 'error'; entries: number; error: unknown; unknown: boolean };

/** One purchase intent: its idempotency key is reused on every retry of the same intent. */
interface Intent {
  entries: number;
  key: string;
  /** Set while the last attempt has no definite answer: the intent is locked until one arrives. */
  unknownError?: unknown;
}

export interface ParticipateFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  round: PoolRoundView;
  /** Player's entries already in this round (for odds). */
  myEntries: number;
  available: string | null;
  limits: RgLimitView[] | null;
  /**
   * State of the RG limits query behind `limits` (default 'ready'). While 'loading' / 'error' the modal never claims
   * "No participation limit set" and Confirm stays disabled (limits are enforced server-side either way).
   */
  limitsStatus?: 'loading' | 'error' | 'ready';
  onRetryLimits?: () => void;
  /** Wallet on the wrong network (GP-02 state). Entries are paid from the platform balance, so this only blocks. */
  wrongNetwork?: boolean;
  initialEntries?: number;
}

/**
 * GP-02 participation preview → GP-03 pending → GP-04 receipt (desktop dialog, mobile bottom sheet), plus the
 * GP-13 "round closed before your entries were placed" outcome. One idempotency key per intent (entries count),
 * reused on retry; the API enforces balance, round window and RG limits in one DB transaction. When an attempt gets
 * no definite answer the outcome is unknown: the modal says so (never "nothing was charged"), locks the entries
 * count and retries with the same key, so the purchase can never be booked twice.
 */
export function ParticipateFlow(props: ParticipateFlowProps) {
  const { open, onOpenChange, round } = props;
  const desktop = useMediaQuery(MQ.tablet, true);
  const qc = useQueryClient();
  const [phase, setPhase] = React.useState<Phase>({ kind: 'preview' });
  const intent = React.useRef<Intent | null>(null);

  React.useEffect(() => {
    if (!open) return;
    // Re-opening after an unanswered attempt shows that attempt again (same entries, same key) — not a fresh form.
    const pending = intent.current;
    setPhase(
      pending?.unknownError !== undefined
        ? { kind: 'error', entries: pending.entries, error: pending.unknownError, unknown: true }
        : { kind: 'preview' },
    );
  }, [open]);

  const refreshAfterWrite = () => {
    void qc.invalidateQueries({ queryKey: ['pool'] });
    // other modules' views of the same balances / limits / history
    void invalidatePlayerFinancials(qc);
  };

  const submit = async (requested: number) => {
    // An unanswered attempt is retried as the SAME intent (entries + key) until a definite answer arrives.
    const entries = intent.current?.unknownError !== undefined ? intent.current.entries : requested;
    if (!intent.current || intent.current.entries !== entries)
      intent.current = { entries, key: newIdempotencyKey() };
    const attempt = { entries, key: intent.current.key };
    setPhase({ kind: 'pending', entries });
    const before = { myEntriesBefore: props.myEntries, limitsBefore: props.limits };
    try {
      const result = await enterRound(round.id, entries, attempt.key);
      intent.current = null;
      setPhase({ kind: 'success', result, ...before });
      refreshAfterWrite();
    } catch (err) {
      if (isOutcomeUnknown(err)) {
        intent.current = { ...attempt, unknownError: err ?? new Error('No response') };
        setPhase({ kind: 'error', entries, error: err, unknown: true });
        refreshAfterWrite();
        return;
      }
      // A definite answer: the intent is no longer locked (same key is still reused for the same count).
      intent.current = attempt;
      const code = err instanceof ApiRequestError ? err.code : null;
      if (code === 'ROUND_NOT_OPEN') {
        intent.current = null;
        setPhase({ kind: 'closed', entries });
        void qc.invalidateQueries({ queryKey: ['pool'] });
        return;
      }
      if (code === 'INSUFFICIENT_FUNDS' || code === 'RG_LIMIT_EXCEEDED') {
        intent.current = null;
        void invalidatePlayerFinancials(qc);
      }
      setPhase({ kind: 'error', entries, error: err, unknown: false });
    }
  };

  const title =
    phase.kind === 'success'
      ? 'Entries confirmed'
      : phase.kind === 'pending'
        ? `Confirming ${formatCount(phase.entries)} ${phase.entries === 1 ? 'entry' : 'entries'}…`
        : phase.kind === 'closed'
          ? `Round ${formatRoundNumber(round.number)} closed before your entries were placed`
          : 'Confirm your entries';
  const sub =
    phase.kind === 'success'
      ? `Global Pool · Round ${formatRoundNumber(round.number)} · reference ${phase.result.reference}`
      : phase.kind === 'closed'
        ? `Entries closed at ${formatTimeUTC(round.closesAt, { seconds: true })}. Nothing was charged.`
        : `Global Pool · Round ${formatRoundNumber(round.number)} · closes ${formatDateTimeUTC(round.closesAt)}`;

  const body = (
    <>
      {(phase.kind === 'preview' || phase.kind === 'error') && (
        <PreviewStep
          {...props}
          error={phase.kind === 'error' ? phase.error : null}
          unknownOutcome={phase.kind === 'error' && phase.unknown}
          defaultEntries={phase.kind === 'error' ? phase.entries : (props.initialEntries ?? 1)}
          onCancel={() => onOpenChange(false)}
          onSubmit={submit}
          desktop={desktop}
        />
      )}
      {phase.kind === 'pending' && (
        <PendingStep
          round={round}
          entries={phase.entries}
          onClose={() => onOpenChange(false)}
          desktop={desktop}
        />
      )}
      {phase.kind === 'success' && (
        <SuccessStep
          round={round}
          result={phase.result}
          myEntriesBefore={phase.myEntriesBefore}
          limits={phase.limitsBefore}
          onClose={() => onOpenChange(false)}
          desktop={desktop}
        />
      )}
      {phase.kind === 'closed' && (
        <ClosedStep
          round={round}
          entries={phase.entries}
          available={props.available}
          onClose={() => onOpenChange(false)}
          desktop={desktop}
        />
      )}
    </>
  );

  const icon =
    phase.kind === 'success' ? (
      <CircleCheck aria-hidden className="size-5 text-text-success" />
    ) : phase.kind === 'closed' ? (
      <CircleSlash aria-hidden className="size-5 text-text-warning" />
    ) : (
      <Ticket aria-hidden className="size-5 text-text-gold" />
    );

  const header = (
    TitleC: typeof DialogTitle | typeof SheetTitle,
    DescC: typeof DialogDescription | typeof SheetDescription,
  ) => (
    <div className="flex items-start gap-4 border-b border-border-subtle px-4 pt-2 pb-5 tablet:px-6 tablet:pt-6">
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-md',
          phase.kind === 'success'
            ? 'bg-status-success-tint'
            : phase.kind === 'closed'
              ? 'bg-status-warning-tint'
              : 'bg-accent-gold-tint',
        )}
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 pr-10">
        <div className="flex flex-wrap items-center gap-2">
          <TitleC className="text-h5 tablet:text-h4">{title}</TitleC>
          {round.isDemo && <DemoBadge size="s" />}
        </div>
        <DescC>{sub}</DescC>
      </div>
    </div>
  );

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="m" className="tablet:max-h-[calc(100dvh-48px)]">
          {header(DialogTitle, DialogDescription)}
          {body}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh]">
        {header(SheetTitle, SheetDescription)}
        {body}
      </SheetContent>
    </Sheet>
  );
}

// ── GP-02 preview ─────────────────────────────────────────────────────────────────────────────

function PreviewStep({
  round,
  myEntries,
  available,
  limits,
  limitsStatus = 'ready',
  onRetryLimits,
  wrongNetwork,
  defaultEntries,
  error,
  unknownOutcome,
  onCancel,
  onSubmit,
  desktop,
}: ParticipateFlowProps & {
  defaultEntries: number;
  error: unknown;
  /** The last attempt got no definite answer: entries are locked to that attempt and Confirm retries it. */
  unknownOutcome: boolean;
  onCancel: () => void;
  onSubmit: (entries: number) => Promise<void>;
  desktop: boolean;
}) {
  const form = useForm<PreviewForm>({
    resolver: zodResolver(previewSchema),
    defaultValues: { entries: defaultEntries, consent: false },
    mode: 'onChange',
  });
  const entriesRaw = useWatch({ control: form.control, name: 'entries' });
  const consent = useWatch({ control: form.control, name: 'consent' });
  const entries =
    Number.isInteger(entriesRaw) && entriesRaw >= 1
      ? Math.min(entriesRaw, MAX_ENTRIES_PER_PURCHASE)
      : 1;
  const check = checkParticipation({ entries, available, limits });
  const odds = oddsAfter(round, myEntries, entries);
  const serverCode = error instanceof ApiRequestError ? error.code : null;
  const regulatory = regulatoryFromError(error);
  const blocked =
    check.insufficient ||
    check.limitReached ||
    limitsStatus !== 'ready' ||
    Boolean(wrongNetwork) ||
    !form.formState.isValid;
  const entryWord = (n: number) => (n === 1 ? 'entry' : 'entries');

  const Body = desktop ? DialogBody : SheetBody;
  const Footer = desktop ? DialogFooter : SheetFooter;

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      noValidate
      onSubmit={form.handleSubmit((v) => onSubmit(v.entries))}
    >
      <Body className="flex flex-col gap-4">
        {wrongNetwork && (
          <Callout
            tone="warning"
            icon={<TriangleAlert />}
            title="Your wallet is on the wrong network"
          >
            Switch your wallet to Arbitrum Sepolia (testnet) to confirm. Entries are still paid from
            your platform balance — there is no on-chain payment from your wallet.
          </Callout>
        )}
        {unknownOutcome && (
          <Callout tone="warning" icon={<TriangleAlert />} title="We couldn’t confirm your entries">
            <p>
              The connection dropped before GLOBAL POOL answered, so your {formatCount(entries)}{' '}
              {entryWord(entries)} ({formatUSDT(check.quote.total)}) may already be placed. Check{' '}
              <Link href={POOL_ROUTES.entries} className="text-text-brand hover:underline">
                My entries
              </Link>{' '}
              before you buy again. Trying again re-sends this same purchase, so it can’t be charged
              twice.
            </p>
            {error instanceof ApiRequestError && error.requestId ? (
              <span className="block font-mono text-mono-s text-text-tertiary">
                Ref {error.requestId}
              </span>
            ) : null}
          </Callout>
        )}
        {/* ERR-05: a regulatory refusal (region, self-exclusion / break) gets the shared notice with its next step. */}
        {error !== null && !unknownOutcome && regulatory && (
          <RegulatoryNotice kind={regulatory.kind} ctx={regulatory.ctx} />
        )}
        {error !== null &&
          !unknownOutcome &&
          !regulatory &&
          serverCode !== 'INSUFFICIENT_FUNDS' &&
          serverCode !== 'RG_LIMIT_EXCEEDED' && (
            <Callout tone="danger" icon={<TriangleAlert />} title="Your entries were not placed">
              {errorMessage(error)} Nothing was charged.
              {error instanceof ApiRequestError && error.requestId ? (
                <span className="block font-mono text-mono-s text-text-tertiary">
                  Ref {error.requestId}
                </span>
              ) : null}
            </Callout>
          )}

        {/* entries stepper */}
        <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-raised p-4">
          <div className="flex flex-col gap-0.5">
            <label htmlFor="pool-entries" className="text-label-l text-text-primary">
              Entries
            </label>
            <p id="pool-entries-hint" className="text-caption text-text-tertiary">
              {ENTRY_PRICE} USDT per entry · max {formatCount(MAX_ENTRIES_PER_PURCHASE)} per
              purchase
            </p>
          </div>
          <Controller
            control={form.control}
            name="entries"
            render={({ field, fieldState }) => (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="l"
                  className="size-11 px-0"
                  aria-label="One entry fewer"
                  disabled={unknownOutcome || entries <= 1}
                  onClick={() => field.onChange(Math.max(1, entries - 1))}
                >
                  <Minus aria-hidden />
                </Button>
                <input
                  id="pool-entries"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  aria-describedby="pool-entries-hint"
                  aria-invalid={fieldState.invalid || undefined}
                  readOnly={unknownOutcome}
                  className="h-11 w-20 rounded-md border border-border-default bg-bg-base text-center text-h4 text-text-primary tabular-nums outline-none focus-visible:border-border-focus focus-visible:ring-2 focus-visible:ring-border-focus/40"
                  value={Number.isNaN(field.value) ? '' : String(field.value)}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                    field.onChange(digits === '' ? Number.NaN : Number(digits));
                  }}
                  onBlur={field.onBlur}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="l"
                  className="size-11 px-0"
                  aria-label="One more entry"
                  disabled={unknownOutcome || entries >= MAX_ENTRIES_PER_PURCHASE}
                  onClick={() => field.onChange(Math.min(MAX_ENTRIES_PER_PURCHASE, entries + 1))}
                >
                  <Plus aria-hidden />
                </Button>
              </div>
            )}
          />
        </div>
        {form.formState.errors.entries && (
          <p role="alert" className="-mt-2 text-caption text-text-danger">
            {form.formState.errors.entries.message}
          </p>
        )}

        {/* line items (platform fee is its own line, separate from the network fee) */}
        <dl
          className="flex flex-col gap-3 rounded-lg bg-surface-raised p-4"
          aria-label="Cost breakdown"
        >
          <KV
            label="Entries"
            hint={`${formatCount(entries)} × ${ENTRY_PRICE} USDT`}
            value={formatUSDT(check.quote.entryAmount)}
            valueClassName="text-body-l"
          />
          <KV
            label={
              <span className="inline-flex items-center gap-1">
                Platform fee
                <InfoTooltip label="What is the platform fee?">
                  0.05 USDT per qualifying entry. It pays for running GLOBAL POOL and is never added
                  to the prize pool.
                </InfoTooltip>
              </span>
            }
            hint={`${formatCount(entries)} × ${PLATFORM_FEE_PER_ENTRY} USDT per qualifying entry · not added to the pool`}
            value={formatUSDT(check.quote.platformFee)}
            valueClassName="text-body-l"
          />
          <KV
            label="Network fee"
            hint="Entries are paid from your platform balance — no on-chain transaction"
            value={formatUSDT(check.quote.networkFee)}
            valueClassName="text-body-l"
          />
          <div className="border-t border-border-default pt-3">
            <KV
              label={<span className="text-label-l text-text-primary">Total</span>}
              value={formatUSDT(check.quote.total)}
              valueClassName="text-h4"
            />
          </div>
          {available !== null && (
            <KV
              label="Available after"
              hint={`From ${formatUSDT(available)} Available`}
              value={
                check.insufficient ? (
                  <span className="text-text-danger">Short by {formatUSDT(check.shortBy!)}</span>
                ) : (
                  <span className="inline-flex items-center gap-2 text-text-success">
                    {formatUSDT(check.availableAfter!)}
                  </span>
                )
              }
              valueClassName="text-body-l"
            />
          )}
        </dl>

        {(check.insufficient || serverCode === 'INSUFFICIENT_FUNDS') && (
          <Callout tone="danger" icon={<Wallet />} title="Not enough Available balance">
            <p>
              {check.shortBy
                ? `You need ${formatUSDT(check.shortBy)} more to buy ${formatCount(entries)} ${entries === 1 ? 'entry' : 'entries'}.`
                : 'Your Available balance changed. Check it and try again.'}{' '}
              Locked and Owed funds can’t be used for entries.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="s" variant="secondary" asChild>
                <Link href={POOL_ROUTES.deposit}>Deposit</Link>
              </Button>
              {check.maxAffordable !== null && check.maxAffordable > 0 && (
                <Button
                  size="s"
                  variant="ghost"
                  type="button"
                  onClick={() =>
                    form.setValue('entries', Math.min(check.maxEntries, check.maxAffordable!), {
                      shouldValidate: true,
                    })
                  }
                >
                  Reduce to {formatCount(Math.min(check.maxEntries, check.maxAffordable))}
                </Button>
              )}
            </div>
          </Callout>
        )}

        {/* odds disclosure (exact, prizes drawn without replacement) */}
        <div className="flex items-start gap-3 rounded-lg border border-border-subtle p-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-status-info-tint text-text-info">
            <Percent aria-hidden className="size-4" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-2 text-label-l text-text-primary">
              Your odds {round.isDemo && <DemoBadge size="xs" />}
            </p>
            <p className="text-body-m text-text-primary">
              Your {formatCount(odds.myEntries)} {odds.myEntries === 1 ? 'entry' : 'entries'} of{' '}
              {formatCount(odds.totalEntries)} → {approxPercent(odds.firstPrizePercent)} chance of
              1st prize, {approxPercent(odds.anyPrizePercent)} chance of any prize
            </p>
            <p className="text-caption text-text-tertiary">
              {odds.prizes} prizes per round. Odds change as entries are added until the round
              closes at {formatTimeUTC(round.closesAt)}.
            </p>
          </div>
        </div>

        <LimitCheck
          check={check}
          status={limitsStatus}
          onRetry={onRetryLimits}
          serverError={serverCode === 'RG_LIMIT_EXCEEDED' ? error : null}
          onReduce={(n) => form.setValue('entries', n, { shouldValidate: true })}
        />

        <LicenceCard />

        <p className="flex items-start gap-2 text-body-s text-text-primary">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-text-warning" />
          <span>
            You can lose your stake. Outcomes are decided by Chainlink VRF.{' '}
            <Link
              href={POOL_ROUTES.fairness}
              className="inline-flex items-center gap-1 text-text-brand hover:underline"
            >
              How draws are verified <ExternalLink aria-hidden className="size-3.5" />
            </Link>
          </span>
        </p>

        <Controller
          control={form.control}
          name="consent"
          render={({ field }) => (
            <CheckboxField
              checked={field.value}
              onCheckedChange={(v) => field.onChange(v === true)}
              label="I understand entries are final once confirmed and I accept the Global Pool rules."
            />
          )}
        />
      </Body>
      <Footer className={cn(desktop ? 'tablet:justify-stretch' : 'flex-col-reverse')}>
        <Button
          type="button"
          variant="secondary"
          size="l"
          onClick={onCancel}
          className={cn(desktop && 'tablet:w-auto')}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="gold"
          size="l"
          className="flex-1"
          disabled={blocked || !consent}
          aria-describedby={!consent ? 'pool-consent-hint' : undefined}
        >
          {unknownOutcome
            ? desktop
              ? `Try again · ${formatCount(entries)} ${entryWord(entries)} · ${formatUSDT(check.quote.total)}`
              : `Try again · ${formatUSDT(check.quote.total)}`
            : desktop
              ? `Confirm ${formatCount(entries)} ${entryWord(entries)} · ${formatUSDT(check.quote.total)}`
              : `Confirm · ${formatUSDT(check.quote.total)}`}
        </Button>
        {!consent && (
          <p id="pool-consent-hint" className="sr-only">
            Tick the confirmation box to enable this button.
          </p>
        )}
      </Footer>
    </form>
  );
}

function LimitCheck({
  check,
  status,
  onRetry,
  serverError,
  onReduce,
}: {
  check: ParticipationCheck;
  status: 'loading' | 'error' | 'ready';
  onRetry?: () => void;
  serverError: unknown;
  onReduce: (entries: number) => void;
}) {
  const l = check.limit;
  const details =
    serverError instanceof ApiRequestError
      ? (serverError.details as { limit?: string; used?: string } | undefined)
      : undefined;
  // Unknown limits are never shown as "no limit": loading → skeleton, failed → say so (still enforced).
  if (status === 'loading' && !details)
    return (
      <div
        className="flex flex-col gap-2.5 rounded-lg bg-surface-raised p-4"
        aria-busy="true"
        aria-label="Checking your participation limits"
      >
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-2 w-full" />
      </div>
    );
  if (status === 'error' && !details)
    return (
      <Callout tone="warning" icon={<TriangleAlert />} title="We couldn’t load your limits">
        <p>
          Your responsible-gaming limits are still enforced when you confirm. Load them again to see
          how much of your limit is left.
        </p>
        {onRetry && (
          <Button size="s" variant="secondary" type="button" className="mt-2" onClick={onRetry}>
            Try again
          </Button>
        )}
      </Callout>
    );
  if (!l && !details)
    return (
      <Callout tone="info" title="No participation limit set">
        You can set a daily, weekly or monthly limit at any time.{' '}
        <Link href={POOL_ROUTES.rg} className="text-text-brand hover:underline">
          Set a limit
        </Link>
      </Callout>
    );
  const limit = l?.limit ?? details?.limit ?? '0';
  const used = l?.used ?? details?.used ?? '0';
  const after = l?.after ?? money(used).plus(check.quote.total).toFixed(2);
  const exceeded = l?.exceeded ?? true;
  const period = l?.period === 'week' ? 'weekly' : l?.period === 'month' ? 'monthly' : 'daily';
  const kind = l?.type === 'loss' ? 'loss' : 'participation';
  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 rounded-lg p-4',
        exceeded ? 'bg-status-danger-tint' : 'bg-status-success-tint',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-start gap-2 text-body-m text-text-primary">
          {exceeded ? (
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-text-danger" />
          ) : (
            <CircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-text-success" />
          )}
          <span>
            {exceeded
              ? `This would exceed your ${period} ${kind} limit: ${formatUSDT(used, { symbol: false })} + ${formatUSDT(check.quote.total, { symbol: false })} = ${formatUSDT(after, { symbol: false })} of ${formatUSDT(limit)}.`
              : `Within your ${period} ${kind} limit: ${formatUSDT(after, { symbol: false })} of ${formatUSDT(limit)}`}
          </span>
        </p>
        <Link
          href={POOL_ROUTES.rg}
          className="shrink-0 text-label-m text-text-brand hover:underline"
        >
          Manage
        </Link>
      </div>
      <Meter
        value={money(after).div(limit).toNumber()}
        tone={exceeded ? 'danger' : 'brand'}
        label={`${kind} limit used after this purchase`}
      />
      {exceeded && (
        <div className="flex flex-wrap items-center gap-3 text-caption text-text-secondary">
          {l && l.maxEntries > 0 ? (
            <Button
              size="s"
              variant="secondary"
              type="button"
              onClick={() => onReduce(l.maxEntries)}
            >
              Reduce to {formatCount(l.maxEntries)} {l.maxEntries === 1 ? 'entry' : 'entries'}
            </Button>
          ) : (
            <span>No entries fit under your limit until it resets.</span>
          )}
          <span>Limits reset at 00:00 UTC. Increases take effect after a 24 h cool-down.</span>
        </div>
      )}
    </div>
  );
}

// ── GP-03 pending ─────────────────────────────────────────────────────────────────────────────

function PendingStep({
  round,
  entries,
  onClose,
  desktop,
}: {
  round: PoolRoundView;
  entries: number;
  onClose: () => void;
  desktop: boolean;
}) {
  const check = checkParticipation({ entries, available: null, limits: null });
  const Body = desktop ? DialogBody : SheetBody;
  const Footer = desktop ? DialogFooter : SheetFooter;
  return (
    <>
      <Body className="flex flex-col gap-4" aria-busy="true">
        <div className="flex flex-col gap-2 rounded-lg bg-surface-raised p-4 tablet:flex-row tablet:items-center tablet:justify-between">
          <div>
            <p className="text-overline text-text-tertiary uppercase">You pay</p>
            <p className="text-number-l text-text-primary tabular-nums">
              {formatUSDT(check.quote.total)}
            </p>
          </div>
          <div className="flex flex-col text-caption text-text-secondary tablet:items-end">
            <span>
              {formatCount(entries)} × {ENTRY_PRICE} = {formatUSDT(check.quote.entryAmount)}
            </span>
            <span>
              Platform fee {formatCount(entries)} × {PLATFORM_FEE_PER_ENTRY} ={' '}
              {formatUSDT(check.quote.platformFee)}
            </span>
            <span>Network fee {formatUSDT(check.quote.networkFee)}</span>
          </div>
        </div>
        <Steps
          steps={[
            {
              id: 'reserve',
              state: 'current',
              title: 'Checking balance and limits',
              description: `${formatUSDT(check.quote.total)} moves from Available in the same database transaction that records your entries.`,
            },
            {
              id: 'record',
              state: 'current',
              title: `Recording ${formatCount(entries)} ${entries === 1 ? 'entry' : 'entries'} in round ${formatRoundNumber(round.number)}`,
              description:
                'Entry IDs are allocated in sequence. The round’s entry list is committed for the draw at close.',
            },
            {
              id: 'receipt',
              state: 'next',
              title: 'Entry receipt',
              description:
                'Your entry IDs appear here as soon as the purchase is recorded — usually in a second or two.',
            },
          ]}
        />
        <Callout tone="info">
          Round {formatRoundNumber(round.number)} closes at{' '}
          {formatTimeUTC(round.closesAt, { seconds: true })}. Entries recorded before close are in
          the draw. If recording fails, nothing is charged.
        </Callout>
      </Body>
      <Footer>
        <div className={cn('flex w-full gap-3', desktop ? 'flex-row' : 'flex-col-reverse')}>
          <Button type="button" variant="secondary" size="l" className="flex-1" onClick={onClose}>
            Close — we’ll notify you
          </Button>
          <Button type="button" variant="gold" size="l" className="flex-1" loading disabled>
            Confirming {formatCount(entries)} {entries === 1 ? 'entry' : 'entries'}…
          </Button>
        </div>
        <p className="text-caption text-text-tertiary">
          You can lose your stake. Closing this window does not cancel your entries.
        </p>
      </Footer>
    </>
  );
}

// ── GP-04 receipt ─────────────────────────────────────────────────────────────────────────────

function downloadReceipt(round: PoolRoundView, r: EntryPurchaseResult) {
  const lines = [
    'GLOBAL POOL — entry receipt (DEMO / testnet — no real money)',
    `Reference: ${r.reference}`,
    `Round: ${formatRoundNumber(r.roundNumber)} · Global Pool`,
    `Entry IDs: ${r.firstEntryId} … ${r.lastEntryId} (${r.entries})`,
    `Entries: ${r.entries} × ${r.entryPrice} = ${r.entryAmount} USDT`,
    `Platform fee: ${r.platformFee} USDT (separate from the pool)`,
    `Network fee: ${r.networkFee} USDT`,
    `Total paid: ${r.total} USDT`,
    `Purchased: ${formatDateTimeUTC(r.purchasedAt)}`,
    `Draw: ${formatDateTimeUTC(round.closesAt)} · Chainlink VRF`,
    'You can lose your stake. 18+.',
  ];
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${r.reference}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function SuccessStep({
  round,
  result,
  myEntriesBefore,
  limits,
  onClose,
  desktop,
}: {
  round: PoolRoundView;
  result: EntryPurchaseResult;
  myEntriesBefore: number;
  limits: RgLimitView[] | null;
  onClose: () => void;
  desktop: boolean;
}) {
  const odds = oddsAfter(round, myEntriesBefore, result.entries);
  const limit = checkParticipation({ entries: result.entries, available: null, limits }).limit;
  const Body = desktop ? DialogBody : SheetBody;
  const Footer = desktop ? DialogFooter : SheetFooter;
  return (
    <>
      <Body className="flex flex-col gap-4">
        <div className="flex items-center gap-4 overflow-hidden">
          <EntryTicket
            entryId={result.firstEntryId}
            roundLabel={`Round ${formatRoundNumber(result.roundNumber)}`}
            className="max-w-full shrink-0 scale-90 origin-left tablet:scale-100"
          />
          {desktop && (
            <div className="flex flex-col">
              <span className="text-number-l text-text-primary">
                ×{formatCount(result.entries)}
              </span>
              <span className="text-caption text-text-tertiary">entries in this purchase</span>
            </div>
          )}
        </div>
        <dl className="flex flex-col gap-2.5 rounded-lg bg-surface-raised p-4">
          <KV label="Round" value={`${formatRoundNumber(result.roundNumber)} · Global Pool`} />
          <KV
            label="Entry IDs"
            value={
              <span className="font-mono text-mono-s">
                {result.firstEntryId} … {result.lastEntryId.split('-').at(-1)}
              </span>
            }
          />
          <KV
            label="Reference"
            value={<span className="font-mono text-mono-s">{result.reference}</span>}
          />
          <KV label="Draw" value={formatDateTimeUTC(round.closesAt)} />
          <KV label="Randomness" value="Chainlink VRF · Arbitrum" />
        </dl>
        <dl className="flex flex-col gap-2 rounded-lg border border-border-subtle p-4">
          <KV
            label={`Entries ${formatCount(result.entries)} × ${result.entryPrice}`}
            value={formatUSDT(result.entryAmount)}
          />
          <KV
            label={`Platform fee ${formatCount(result.entries)} × ${PLATFORM_FEE_PER_ENTRY}`}
            value={formatUSDT(result.platformFee)}
          />
          <KV label="Network fee" value={formatUSDT(result.networkFee)} />
          <div className="border-t border-border-subtle pt-2">
            <KV
              label={<span className="text-label-l text-text-primary">You paid</span>}
              value={formatUSDT(result.total)}
              valueClassName="text-h5"
            />
          </div>
          <p className="text-caption text-text-tertiary">You can lose your stake.</p>
        </dl>
        <KV
          label={
            <span className="inline-flex items-center gap-2">
              <Lock aria-hidden className="size-4 text-balance-locked" /> Locked until the draw
            </span>
          }
          value={<span className="text-balance-locked">{formatUSDT(result.entryAmount)}</span>}
        />
        <Callout tone="info" icon={<Percent />}>
          {approxPercent(odds.anyPrizePercent)} chance of any of the {odds.prizes} prizes ·{' '}
          {approxPercent(odds.firstPrizePercent)} chance of 1st with your{' '}
          {formatCount(odds.myEntries)} entries. Results are published with the randomness proof
          after {formatTimeUTC(round.closesAt)}.
        </Callout>
        {limit && (
          <div className="flex flex-col gap-1.5">
            <p className="flex items-center justify-between gap-2 text-caption text-text-tertiary">
              {limit.period === 'day' ? 'Today’s' : 'This period’s'} participation
              <span className="text-label-m text-text-primary">
                {formatUSDT(limit.after, { symbol: false })} / {formatUSDT(limit.limit)}
              </span>
            </p>
            <Meter
              value={money(limit.after).div(limit.limit).toNumber()}
              label="Participation limit used"
            />
          </div>
        )}
        {result.replayed && (
          <p className="text-caption text-text-tertiary">
            This purchase was already recorded — showing the original receipt (no second charge).
          </p>
        )}
      </Body>
      <Footer>
        <div className={cn('flex w-full gap-3', desktop ? 'flex-row' : 'flex-col')}>
          {desktop && (
            <Button
              type="button"
              variant="ghost"
              size="l"
              leadingIcon={<Download aria-hidden />}
              onClick={() => downloadReceipt(round, result)}
            >
              Download receipt
            </Button>
          )}
          <Button type="button" variant="secondary" size="l" className="flex-1" onClick={onClose}>
            Back to Global Pool
          </Button>
          <Button variant="primary" size="l" className="flex-1" asChild>
            <Link href={POOL_ROUTES.entries}>
              View my entries <ArrowRight aria-hidden />
            </Link>
          </Button>
          {!desktop && (
            <Button
              type="button"
              variant="ghost"
              size="l"
              leadingIcon={<Download aria-hidden />}
              onClick={() => downloadReceipt(round, result)}
            >
              Download receipt
            </Button>
          )}
        </div>
      </Footer>
    </>
  );
}

// ── GP-13 round closed before placement ───────────────────────────────────────────────────────

function ClosedStep({
  round,
  entries,
  available,
  onClose,
  desktop,
}: {
  round: PoolRoundView;
  entries: number;
  available: string | null;
  onClose: () => void;
  desktop: boolean;
}) {
  const q = checkParticipation({ entries, available: null, limits: null }).quote;
  const Body = desktop ? DialogBody : SheetBody;
  const Footer = desktop ? DialogFooter : SheetFooter;
  return (
    <>
      <Body className="flex flex-col gap-4">
        <dl className="flex flex-col gap-2.5 rounded-lg bg-surface-raised p-4">
          <KV
            label="Not placed"
            value={`${formatCount(entries)} ${entries === 1 ? 'entry' : 'entries'} in round ${formatRoundNumber(round.number)}`}
          />
          <KV
            label="Would have cost"
            value={`${q.entryAmount} + ${q.platformFee} fee = ${formatUSDT(q.total)}`}
          />
          <KV label="Charged" value={formatUSDT('0')} valueClassName="text-text-success" />
          {available !== null && (
            <KV label="Available balance" value={`${formatUSDT(available)} · unchanged`} />
          )}
        </dl>
        <Callout tone="info">
          The draw for round {formatRoundNumber(round.number)} is running on Chainlink VRF. Results
          appear on the round page as soon as it settles.
        </Callout>
      </Body>
      <Footer>
        <div className={cn('flex w-full gap-3', desktop ? 'flex-row' : 'flex-col-reverse')}>
          <Button type="button" variant="secondary" size="l" className="flex-1" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" size="l" className="flex-1" asChild>
            <Link href={POOL_ROUTES.round(round.number)}>Watch the draw</Link>
          </Button>
        </div>
      </Footer>
    </>
  );
}
