'use client';

import { CHAIN_DISPLAY_ORDER, CHAINS, type ChainKey } from '@gp/shared/chains';
import { formatDateTimeUTC, formatTimeUTC } from '@gp/shared/format';
import { formatUSDT, gt, isUSDTAmount, isZero, lt, money, roundDown } from '@gp/shared/money';
import { isSolanaAddress, isValidAddressForChain } from '@gp/shared/schemas';
import type { PrecheckCheck } from '@gp/shared/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  CircleCheck,
  CircleX,
  Clock,
  History,
  KeyRound,
  Lock,
  Minus,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { ACCOUNT_ROUTES } from '@/components/account/nav';
import { ChainMark, TokenMark } from '@/components/brand/chain-mark';
import { AddressChip } from '@/components/domain/address-chip';
import { AddressInput } from '@/components/domain/address-input';
import { Amount } from '@/components/domain/amount';
import { AmountInput } from '@/components/domain/amount-input';
import { Alert } from '@/components/ui/alert';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckboxField } from '@/components/ui/checkbox';
import { DemoBadge } from '@/components/ui/demo-badge';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ApiRequestError,
  isOutcomeUnknown,
  newIdempotencyKey,
  writeOutcome,
  type WriteOutcome,
} from '@/lib/api/client';
import { failedQueries } from '@/lib/api/errors';
import {
  useAccountGate,
  useBalances,
  useInvalidateWallet,
  useLinkedWallets,
  useMe,
  useWalletStatus,
  useWithdrawal,
  walletApi,
  type LinkedWallet,
  type WithdrawalPrecheck,
} from '@/lib/api/wallet';
import { cn } from '@/lib/utils';

import { AccountPauseNotice, accountPause, type AccountPause } from './account-pause';
import { AddAddressModal } from './addresses';
import { InsufficientFundsModal, MaintenanceModal, WalletStatusBanners } from './banners';
import { BalanceBreakdown } from './balance-breakdown';
import {
  FlowFooter,
  FlowHeading,
  FlowShell,
  NextButton,
  OptionRow,
  type FlowStep,
} from './flow-shell';
import { WalletOverview } from './overview';
import { stepUpError, TwoFactorField } from './two-factor';
import { WithdrawalOutcome, phaseOf } from './withdrawal-status';
import { KeyValueList, SectionTitle, WALLET_ROUTES } from './wallet-ui';

const STEPS: FlowStep[] = [
  { key: 'asset', label: 'Asset' },
  { key: 'network', label: 'Network' },
  { key: 'address', label: 'Address' },
  { key: 'amount', label: 'Amount' },
  { key: 'fees', label: 'Fees' },
  { key: 'risk', label: 'Risk check' },
  { key: '2fa', label: '2FA' },
  { key: 'pending', label: 'Pending' },
  { key: 'done', label: 'Done' },
];
type StepKey =
  'asset' | 'network' | 'address' | 'amount' | 'fees' | 'risk' | '2fa' | 'pending' | 'done';
const IDX: Record<StepKey, number> = {
  asset: 0,
  network: 1,
  address: 2,
  amount: 3,
  fees: 4,
  risk: 5,
  '2fa': 6,
  pending: 7,
  done: 8,
};
const ETA: Record<ChainKey, string> = {
  arbitrum: '~1 min',
  bnb: '~1 min',
  polygon: '~3 min',
  ethereum: '~5 min',
  solana: '~1 min',
};

interface Draft {
  network: ChainKey;
  address: string;
  amount: string;
  confirmed: boolean;
  /** One key per withdrawal intent, created at the review step and reused on retries. */
  idempotencyKey: string | null;
}
const EMPTY: Draft = {
  network: 'arbitrum',
  address: '',
  amount: '',
  confirmed: false,
  idempotencyKey: null,
};
const DRAFT_KEY = 'gp.withdrawDraft';

/** Per-tab draft so a reload keeps the unsent withdrawal (never the 2FA code). */
function useDraft(): [Draft, (patch: Partial<Draft>) => void, () => void] {
  const [draft, setDraft] = React.useState<Draft>(EMPTY);
  React.useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(DRAFT_KEY);
      if (raw) setDraft({ ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) });
    } catch {
      /* storage unavailable */
    }
  }, []);
  const update = React.useCallback((patch: Partial<Draft>) => {
    setDraft((d) => {
      const next = { ...d, ...patch };
      try {
        window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  const reset = React.useCallback(() => {
    setDraft(EMPTY);
    try {
      window.sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  }, []);
  return [draft, update, reset];
}

const short = (a: string) => (a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a);

/** WAL-10…19 Withdraw flow (9 steps) + MOB-07 bottom sheet on mobile. */
export function WithdrawFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const ref = sp.get('ref');
  const [draft, update, reset] = useDraft();
  const balances = useBalances();
  const status = useWalletStatus();
  const withdrawal = useWithdrawal(ref);
  // Q19: an AML hold (withdrawals_frozen) is said up front — not discovered as a missing quote at the amount step.
  const gate = useAccountGate();
  const hold = ref ? null : accountPause(gate.data, 'withdrawals');

  let step: StepKey = (sp.get('step') as StepKey | null) ?? 'asset';
  if (IDX[step] === undefined) step = 'asset';
  if (ref)
    step =
      withdrawal.data &&
      ['confirmed', 'failed', 'rejected', 'cancelled'].includes(withdrawal.data.status)
        ? 'done'
        : 'pending';
  // Guard: steps after "address" need the earlier answers (e.g. after a reload in a new tab).
  if (!ref && IDX[step] > IDX.address && !draft.address) step = 'address';
  if (!ref && IDX[step] > IDX.amount && !draft.amount) step = 'amount';

  const go = React.useCallback(
    (next: StepKey, extra: Record<string, string | null> = {}) => {
      const q = new URLSearchParams(sp.toString());
      q.set('step', next);
      for (const [k, v] of Object.entries(extra)) {
        if (v === null) q.delete(k);
        else q.set(k, v);
      }
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
      document.querySelector('[data-flow-body]')?.scrollTo({ top: 0 });
      if (window.innerWidth >= 768) window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [pathname, router, sp],
  );

  const failed = withdrawal.data ? phaseOf(withdrawal.data) === 'failed' : false;
  const context = draft.address
    ? `USDT on ${CHAINS[draft.network].name} → ${short(draft.address)}`
    : 'USDT from your Available balance';

  return (
    <FlowShell
      title="Withdraw USDT"
      description="Send USDT from your Available balance to an external wallet in a few short steps. GLOBAL POOL charges no withdrawal fee — you only pay the network fee, shown before you confirm."
      headerActions={
        <div className="hidden items-center gap-3 tablet:flex">
          <Button asChild variant="ghost" leadingIcon={<History />}>
            <Link href={`${WALLET_ROUTES.history}?type=withdrawal`}>Withdrawal history</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={WALLET_ROUTES.deposit}>Deposit</Link>
          </Button>
        </div>
      }
      flow="Withdraw"
      steps={STEPS}
      current={IDX[step]}
      error={step === 'done' && failed}
      context={context}
      background={<WalletOverview />}
      side={<WithdrawSide draft={draft} step={step} />}
    >
      {!ref && <WalletStatusBanners status={status.data} rg={undefined} context="withdraw" />}
      {/* Q19: the hold is said on every step; nothing can be reviewed or confirmed while it applies. */}
      {hold && IDX[step] <= IDX.amount && (
        <AccountPauseNotice pause={hold} action="withdrawals" />
      )}
      {hold && IDX[step] > IDX.amount && <WithdrawalHold hold={hold} />}
      {step === 'asset' && (
        <AssetStep
          available={balances.data?.available}
          failure={balances.isError && !balances.data ? balances : undefined}
          onNext={() => go('network')}
        />
      )}
      {step === 'network' && (
        <NetworkStep
          value={draft.network}
          onChange={(network) => update({ network, address: '' })}
          onBack={() => go('asset')}
          onNext={() => go('address')}
        />
      )}
      {step === 'address' && (
        <AddressStep
          network={draft.network}
          value={draft.address}
          onChange={(address) => update({ address, idempotencyKey: null, confirmed: false })}
          onBack={() => go('network')}
          onNext={() => go('amount')}
        />
      )}
      {step === 'amount' && (
        <AmountStep
          draft={draft}
          hold={hold}
          onChange={(amount) => update({ amount, idempotencyKey: null, confirmed: false })}
          onBack={() => go('address')}
          onNext={() => go('fees')}
        />
      )}
      {!hold && step === 'fees' && (
        <FeesStep
          draft={draft}
          onConfirm={(confirmed) => update({ confirmed })}
          onBack={() => go('amount')}
          onNext={() => {
            if (!draft.idempotencyKey) update({ idempotencyKey: newIdempotencyKey() });
            go('risk');
          }}
        />
      )}
      {!hold && step === 'risk' && (
        <RiskStep
          draft={draft}
          onBack={() => go('fees')}
          onNext={() => go('2fa')}
          onEdit={(s) => go(s)}
        />
      )}
      {!hold && step === '2fa' && (
        <TwoFactorStep
          draft={draft}
          ensureKey={() => {
            const k = draft.idempotencyKey ?? newIdempotencyKey();
            if (!draft.idempotencyKey) update({ idempotencyKey: k });
            return k;
          }}
          onBack={() => go('risk')}
          onSubmitted={(reference) => {
            reset();
            go('pending', { ref: reference });
          }}
          onEdit={(s) => go(s)}
        />
      )}
      {(step === 'pending' || step === 'done') &&
        ref &&
        (withdrawal.data ? (
          <WithdrawalOutcome w={withdrawal.data} />
        ) : withdrawal.isError ? (
          <Alert type="security" title="We couldn’t load this withdrawal">
            {withdrawal.error.message}
          </Alert>
        ) : (
          <Skeleton className="h-80 w-full" />
        ))}
      {(step === 'pending' || step === 'done') &&
        ref &&
        withdrawal.data &&
        phaseOf(withdrawal.data) !== 'processing' && (
          <Button variant="ghost" className="self-start" onClick={() => router.replace(pathname)}>
            Start a new withdrawal
          </Button>
        )}
    </FlowShell>
  );
}

/** Q19: withdrawals are on hold for this account — the reason, the case reference and the way forward. */
function WithdrawalHold({ hold }: { hold: AccountPause }) {
  return (
    <>
      <FlowHeading title="Withdrawals are on hold">
        Nothing has been sent and nothing was deducted. Your balance stays in your account.
      </FlowHeading>
      <AccountPauseNotice pause={hold} action="withdrawals" />
      <FlowFooter
        primary={
          <Button asChild size="l" variant="secondary">
            <Link href={`${WALLET_ROUTES.history}?type=withdrawal`}>Withdrawal history</Link>
          </Button>
        }
      />
    </>
  );
}

/** A restriction refusal (`403 FORBIDDEN details.restriction`, e.g. withdrawals_frozen) as an account pause. */
function restrictionPause(err: unknown): AccountPause | null {
  if (!(err instanceof ApiRequestError) || err.code !== 'FORBIDDEN') return null;
  const r = (err.details as { restriction?: unknown } | undefined)?.restriction;
  return r === 'withdrawals_frozen' || r === 'account_suspended'
    ? { kind: 'restriction', restriction: r, reference: null }
    : null;
}

/**
 * Withdrawal errors raised after the idempotency-key lookup (KYC / limit / cool-down checks, the ledger lock): as the
 * answer to a retry they prove the earlier attempt with the same key was not committed (R41b). Anything else on a
 * retry of an unanswered attempt (429, 401, policy 403, a wrong code…) says nothing about it.
 */
export const WITHDRAWAL_DEFINITE_CODES = [
  'INSUFFICIENT_FUNDS',
  'KYC_REQUIRED',
  'VALIDATION_FAILED',
  'ADDRESS_NOT_WHITELISTED',
] as const;

// ── step 1 · asset (WAL-10) ────────────────────────────────────────────────────────────────────

function AssetStep({
  available,
  failure,
  onNext,
}: {
  available: string | undefined;
  /** Balances failed with nothing cached: an error with Try again instead of an endless skeleton (ERR-03). */
  failure?: { error: unknown; refetch: () => unknown; isFetching: boolean };
  onNext: () => void;
}) {
  const empty = available !== undefined && isZero(available);
  return (
    <>
      <FlowHeading title="What do you want to withdraw?">
        Only your Available balance can be withdrawn. Locked, Pending and Owed funds become
        withdrawable once they settle.
      </FlowHeading>
      <div role="radiogroup" aria-label="Asset" className="flex flex-col gap-2">
        <OptionRow
          name="asset"
          value="usdt"
          selected
          onSelect={() => undefined}
          icon={<TokenMark size={32} />}
          title="USDT · Tether USD"
          subtitle="Your platform balance — withdrawable now"
          aside={
            available !== undefined ? (
              <span className="flex items-center gap-1.5">
                <Amount value={available} className="text-body-s-strong" />
                <DemoBadge size="xs" />
              </span>
            ) : failure ? (
              <span className="text-caption text-text-tertiary">—</span>
            ) : (
              <Skeleton className="h-4 w-24" />
            )
          }
        />
      </div>
      {failure && (
        <ErrorState
          variant="inline"
          error={failure.error}
          onRetry={() => void failure.refetch()}
          retrying={failure.isFetching}
          what="your Available balance"
          note="Nothing has been sent."
        />
      )}
      {empty && (
        <Alert
          type="info"
          title="Nothing to withdraw yet"
          actions={
            <Button asChild size="s" variant="secondary">
              <Link href={WALLET_ROUTES.deposit}>Deposit</Link>
            </Button>
          }
        >
          Your Available balance is 0.00 USDT.
        </Alert>
      )}
      <FlowFooter
        note="You can review everything before anything is sent"
        primary={
          <NextButton onClick={onNext} disabled={available === undefined || empty}>
            Continue
          </NextButton>
        }
      />
    </>
  );
}

// ── step 2 · network (WAL-11) ──────────────────────────────────────────────────────────────────

function NetworkStep({
  value,
  onChange,
  onBack,
  onNext,
}: {
  value: ChainKey;
  onChange: (n: ChainKey) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <FlowHeading title="Choose the network">
        Use the same network as the receiving wallet or exchange. The network fee is deducted from
        the amount — GLOBAL POOL adds no fee.
      </FlowHeading>
      <div role="radiogroup" aria-label="Withdrawal network" className="flex flex-col gap-2">
        {CHAIN_DISPLAY_ORDER.map((k) => {
          const c = CHAINS[k];
          return (
            <OptionRow
              key={k}
              name="withdraw-network"
              value={k}
              selected={value === k}
              disabled={!c.enabled}
              onSelect={() => onChange(k)}
              icon={<ChainMark chain={k} size={32} />}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {c.enabled ? c.testnet.name : c.name}
                  {!c.enabled && <StatusBadge status="neutral" label="Coming soon" />}
                </span>
              }
              subtitle={`${c.usdtStandard} · ${ETA[k]} · ${c.enabled ? c.healthLabel : 'not available yet'}`}
              aside={
                <>
                  <span className="text-body-s-strong tabular-nums">
                    {formatUSDT(c.typicalNetworkFee)}
                  </span>
                  <span className="text-caption text-text-tertiary">network fee</span>
                </>
              }
            />
          );
        })}
      </div>
      <Alert type="info" title="Match the network">
        The receiving wallet must support USDT on {CHAINS[value].testnet.name}. Sending on the wrong
        network can lose your funds and can’t be reversed.
      </Alert>
      <FlowFooter onBack={onBack} primary={<NextButton onClick={onNext}>Continue</NextButton>} />
    </>
  );
}

// ── step 3 · address (WAL-12) ──────────────────────────────────────────────────────────────────

function FormatChecks({ network, value }: { network: ChainKey; value: string }) {
  const evm = CHAINS[network].family === 'evm';
  const v = value.trim();
  const checks = evm
    ? [
        { ok: v.startsWith('0x'), label: 'Starts with 0x' },
        { ok: /^0x[0-9a-fA-F]{40}$/.test(v), label: '40 hexadecimal characters after 0x' },
        { ok: v !== '' && isValidAddressForChain(network, v), label: 'Checksum verified (EIP-55)' },
      ]
    : [{ ok: isSolanaAddress(v), label: 'Base58, 32–44 characters' }];
  return (
    <ul
      className="flex flex-col gap-1.5 rounded-md border border-border-subtle bg-bg-secondary p-3"
      aria-label="Address format checks"
    >
      {checks.map((c) => (
        <li
          key={c.label}
          className={cn(
            'flex items-center gap-2 text-caption',
            v === '' ? 'text-text-tertiary' : c.ok ? 'text-text-success' : 'text-text-danger',
          )}
        >
          {v === '' ? (
            <Minus aria-hidden className="size-4" />
          ) : c.ok ? (
            <CircleCheck aria-hidden className="size-4" />
          ) : (
            <CircleX aria-hidden className="size-4" />
          )}
          {c.label}
          <span className="sr-only">
            {v === '' ? '(not checked yet)' : c.ok ? '(passed)' : '(failed)'}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AddressStep({
  network,
  value,
  onChange,
  onBack,
  onNext,
}: {
  network: ChainKey;
  value: string;
  onChange: (a: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const wallets = useLinkedWallets();
  const [adding, setAdding] = React.useState(false);
  const saved = (wallets.data ?? []).filter((w) => w.whitelisted && w.network === network);
  const match: LinkedWallet | undefined = (wallets.data ?? []).find(
    (w) =>
      w.network === network &&
      w.whitelisted &&
      w.address.toLowerCase() === value.trim().toLowerCase(),
  );
  const [mode, setMode] = React.useState<'saved' | 'new'>(value && !match ? 'new' : 'saved');
  // No saved address on this network yet → start with the new-address field.
  React.useEffect(() => {
    if (wallets.data && saved.length === 0) setMode('new');
  }, [wallets.data, saved.length]);
  const valid = value !== '' && isValidAddressForChain(network, value.trim());
  const looksSolana = CHAINS[network].family === 'evm' && isSolanaAddress(value.trim());
  const cooling = match?.inCooldown;
  const canContinue = valid && !cooling;

  return (
    <>
      <FlowHeading title="Where should we send it?">
        Choose a whitelisted address or paste a new one. Withdrawals to an address you haven’t used
        before get a short manual check.
      </FlowHeading>
      <div role="radiogroup" aria-label="Destination" className="flex flex-col gap-2">
        {wallets.isPending && <Skeleton className="h-16 w-full" />}
        {wallets.isError && !wallets.data && (
          // ERR-02: saved addresses couldn't be loaded — say so (a new address can still be entered below).
          <ErrorState
            variant="inline"
            error={wallets.error}
            onRetry={() => void wallets.refetch()}
            retrying={wallets.isFetching}
            what="your saved addresses"
          />
        )}
        {saved.map((w) => (
          <OptionRow
            key={w.id}
            name="destination"
            value={w.id}
            selected={mode === 'saved' && match?.id === w.id}
            onSelect={() => {
              setMode('saved');
              onChange(w.address);
            }}
            icon={<ChainMark chain={w.network} size={28} />}
            title={
              <span className="flex flex-wrap items-center gap-2">
                {w.label ?? 'Whitelisted address'}
                {w.inCooldown ? (
                  <StatusBadge status="pending" label="Cooling down" />
                ) : (
                  <StatusBadge status="approved" label="Whitelisted" />
                )}
              </span>
            }
            subtitle={
              <span className="font-mono">
                {short(w.address)}
                {w.inCooldown && w.usableForWithdrawalsFrom
                  ? ` · unlocks ${formatDateTimeUTC(w.usableForWithdrawalsFrom)}`
                  : w.whitelistedAt
                    ? ` · since ${formatDateTimeUTC(w.whitelistedAt)}`
                    : ''}
              </span>
            }
            aside={w.isDemo ? <DemoBadge size="xs" /> : undefined}
          />
        ))}
        <OptionRow
          name="destination"
          value="new"
          selected={mode === 'new'}
          onSelect={() => {
            setMode('new');
            onChange('');
          }}
          title="Use a new address"
          subtitle="Paste an address you own on this network"
        />
      </div>

      {mode === 'new' && (
        <>
          <AddressInput
            chain={network}
            value={value}
            onChange={onChange}
            label="Withdrawal address"
            addressStatus={valid ? (match ? 'whitelisted' : undefined) : undefined}
            error={
              looksSolana
                ? `This looks like a Solana address — ${CHAINS[network].testnet.name} addresses start with 0x.`
                : undefined
            }
          />
          <FormatChecks network={network} value={value} />
        </>
      )}

      {looksSolana && (
        <Alert type="security" title="This looks like a Solana address">
          You chose {CHAINS[network].testnet.name}, but {short(value)} is a Solana (SPL) address.
          Paste an address that starts with 0x, or clear the field. Solana withdrawals are coming
          soon.
        </Alert>
      )}
      {match && !cooling && (
        <Alert type="info" title="Whitelisted address — ready to use">
          {match.label ? `Saved as “${match.label}”. ` : ''}Format and checksum verified on{' '}
          {CHAINS[network].testnet.name} — no cool-down applies.
        </Alert>
      )}
      {cooling && match?.usableForWithdrawalsFrom && (
        <Alert type="warning" title="This address is cooling down">
          It unlocks {formatDateTimeUTC(match.usableForWithdrawalsFrom)}. The 24 h cool-down
          protects your balance if someone else gets into your account — support can’t skip it.
          Choose another address to withdraw now.
        </Alert>
      )}
      {valid && !match && mode === 'new' && (
        <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-secondary p-4">
          <p className="text-body-s-strong">New address — choose how to continue</p>
          <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center">
            <Clock aria-hidden className="hidden size-5 shrink-0 text-icon-brand tablet:block" />
            <p className="flex-1 text-caption text-text-secondary">
              <span className="text-text-primary">Withdraw now:</span> the first withdrawal to a new
              destination goes to a routine AML review, usually under 4 h.{' '}
              <span className="text-text-primary">Or save it</span> to your whitelist — usable after
              a 24 h cool-down.
            </p>
            <Button variant="secondary" size="s" onClick={() => setAdding(true)}>
              Add to whitelist
            </Button>
          </div>
        </div>
      )}
      <Alert type="warning" title="Crypto withdrawals can’t be reversed">
        Check the first and last characters after pasting. Clipboard malware can swap addresses.
      </Alert>
      <FlowFooter
        onBack={onBack}
        note={
          !canContinue
            ? cooling
              ? 'Unlocks after the cool-down'
              : 'Choose or paste an address to continue'
            : undefined
        }
        primary={
          <NextButton onClick={onNext} disabled={!canContinue}>
            Continue
          </NextButton>
        }
      />
      <AddAddressModal
        open={adding}
        onOpenChange={setAdding}
        defaultNetwork={network}
        defaultAddress={value}
        onAdded={(w) => {
          setMode('saved');
          onChange(w.address);
        }}
      />
    </>
  );
}

// ── step 4 · amount (WAL-13) ───────────────────────────────────────────────────────────────────

function useQuote(amount: string, network: ChainKey) {
  const ok = isUSDTAmount(amount) && gt(amount, 0) && !amount.endsWith('.');
  return useQuery({
    queryKey: ['wallet', 'quote', network, amount],
    queryFn: ({ signal }) => walletApi.withdrawalQuote(amount, network, signal),
    enabled: ok,
    refetchInterval: 15_000,
    placeholderData: (prev) => prev,
  });
}

/**
 * What the MAX chip fills in: the cap (Available or what is left of today's limit) rounded DOWN to cents, so the
 * filled amount can never exceed it (100.005 → 100.00; half-up rounding would give 100.01 and fail the check).
 */
export function maxFillAmount(max: string): string {
  return roundDown(max, 2).toFixed(2);
}

function AmountStep({
  draft,
  hold,
  onChange,
  onBack,
  onNext,
}: {
  draft: Draft;
  /** Withdrawals are on hold (the notice above the step says why): no review / confirmation. */
  hold: AccountPause | null;
  onChange: (a: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const balances = useBalances();
  const status = useWalletStatus();
  const [shortfall, setShortfall] = React.useState(false);
  const available = balances.data?.available ?? '0.00';
  const s = status.data?.withdrawal;
  const remaining = s?.remainingToday ?? '0.00';
  const min = s?.minWithdrawal ?? CHAINS[draft.network].minWithdrawal;
  const limitReached = s ? isZero(remaining) : false;
  const unchecked = failedQueries(balances, status);
  const quote = useQuote(draft.amount, draft.network);
  const v = draft.amount;
  const valid = v !== '' && isUSDTAmount(v) && !v.endsWith('.');
  const over = valid && balances.data !== undefined && gt(v, available);
  const overLimit = valid && s && gt(v, remaining);
  const below = valid && lt(v, min);
  const quoteFailed = quote.isError && !quote.data;
  const quoteHold = quoteFailed ? restrictionPause(quote.error) : null;
  const ok =
    valid && !over && !overLimit && !below && !quoteFailed && quote.data?.meetsMinimum !== false;
  const max = s && gt(available, remaining) ? remaining : available;
  const chips = ['100.00', '500.00', '1000.00', '5000.00'].filter((c) => !gt(c, max));

  let error: string | undefined;
  if (over) error = `Exceeds your available balance (${formatUSDT(available)})`;
  else if (overLimit) error = `Above what’s left of today’s limit (${formatUSDT(remaining)})`;
  else if (below)
    error = `Below the ${formatUSDT(min)} minimum — enter ${formatUSDT(min)} or more.`;

  return (
    <>
      <FlowHeading title="How much do you want to withdraw?">
        Enter the amount in USDT. The network fee is taken from this amount, so you always see
        exactly what arrives before you confirm.
      </FlowHeading>
      {unchecked.failed && (
        // ERR-02: never read a failed balance / limit as 0.00 — say it couldn't be loaded.
        <ErrorState
          variant="inline"
          error={unchecked.error}
          onRetry={unchecked.retry}
          retrying={unchecked.retrying}
          what="your balance and limits"
          note="Nothing has been sent."
        />
      )}
      {limitReached && s && (
        <Alert type="warning" title="Daily limit reached">
          You’ve withdrawn {formatUSDT(s.usedToday)} today (KYC{' '}
          {status.data?.kycLevel.replace('level_', 'Level ')} limit {formatUSDT(s.dailyLimit)}).
          Withdrawals reopen {formatDateTimeUTC(s.resetsAt)}. Your balance stays in your account.
        </Alert>
      )}
      <AmountInput
        label="Amount to withdraw"
        value={draft.amount}
        onChange={onChange}
        available={available}
        max={max}
        min={min}
        error={error}
        demo
        disabled={limitReached || !balances.data}
        limitsLabel={`Min ${formatUSDT(min, { symbol: false })} · Max ${formatUSDT(s?.dailyLimit ?? '0', { symbol: false })} per day`}
      />
      {over && balances.data && (
        <p className="text-caption text-text-tertiary">
          Pending ({formatUSDT(balances.data.pending)}) and Owed ({formatUSDT(balances.data.owed)})
          become withdrawable once they settle. Funds in active round entries stay Locked until the
          draw.
        </p>
      )}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Quick amounts">
        {chips.map((c) => (
          <Button
            key={c}
            variant={draft.amount === c ? 'secondary' : 'ghost'}
            size="s"
            aria-pressed={draft.amount === c}
            onClick={() => onChange(c)}
            className="border border-border-default"
          >
            {formatUSDT(c, { symbol: false })}
          </Button>
        ))}
        {gt(max, 0) && (
          <Button
            variant="ghost"
            size="s"
            className="border border-border-default"
            onClick={() => onChange(maxFillAmount(max))}
          >
            MAX · {formatUSDT(max, { symbol: false })}
          </Button>
        )}
      </div>
      <ul className="grid grid-cols-1 gap-2 tablet:grid-cols-3">
        {[
          ['Minimum', formatUSDT(min), 'per withdrawal'],
          [
            'Available now',
            balances.data ? formatUSDT(available) : '—',
            'your withdrawable balance',
          ],
          [
            'Left today',
            s ? formatUSDT(remaining) : '—',
            s ? `KYC ${status.data?.kycLevel.replace('level_', 'Level ')} daily limit` : '',
          ],
        ].map(([label, value, hint]) => (
          <li key={label} className="flex flex-col gap-0.5 rounded-md bg-bg-secondary p-3">
            <span className="text-overline text-text-tertiary uppercase">{label}</span>
            <span className="text-body-m-strong tabular-nums">{value}</span>
            <span className="text-caption text-text-tertiary">{hint}</span>
          </li>
        ))}
      </ul>
      <FeeEstimate
        network={draft.network}
        quote={quote.data}
        loading={quote.isFetching}
        updatedAt={quote.dataUpdatedAt}
      />
      {/* Q19: a refused / failed quote is said, never swallowed as "You receive —". */}
      {hold ? null : quoteHold ? (
        <AccountPauseNotice pause={quoteHold} action="withdrawals" />
      ) : quoteFailed ? (
        <ErrorState
          variant="inline"
          error={quote.error}
          onRetry={() => void quote.refetch()}
          retrying={quote.isFetching}
          what="the fee quote"
          note="Nothing has been sent."
        />
      ) : null}
      <p className="flex gap-2 rounded-md bg-bg-secondary p-3 text-caption text-text-secondary">
        <Lock aria-hidden className="size-4 shrink-0" />
        When you confirm with 2FA, the amount moves from Available to Locked until the network
        confirms the transfer. If it fails or is rejected, the full amount returns to Available — no
        fee is charged.
      </p>
      <FlowFooter
        onBack={onBack}
        note="You can still change the amount at step 5"
        primary={
          <NextButton
            disabled={!valid || limitReached || quoteFailed || hold !== null}
            onClick={() => (over ? setShortfall(true) : ok ? onNext() : undefined)}
          >
            Review fees
          </NextButton>
        }
      />
      <InsufficientFundsModal
        open={shortfall}
        onOpenChange={setShortfall}
        available={available}
        required={valid ? v : '0'}
      />
    </>
  );
}

function FeeEstimate({
  network,
  quote,
  loading,
  updatedAt,
}: {
  network: ChainKey;
  quote:
    { amount: string; networkFee: string; platformFee: string; youReceive: string } | undefined;
  loading: boolean;
  updatedAt: number;
}) {
  return (
    <Card variant="sunken" padding="m" className="gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-body-s-strong">
          <Zap aria-hidden className="size-4 text-icon-muted" /> Fee estimate
        </p>
        <DemoBadge size="xs" />
      </div>
      <KeyValueList
        rows={[
          { label: 'Withdrawal amount', value: quote ? formatUSDT(quote.amount) : '—' },
          {
            label: 'Network fee',
            value: quote
              ? `−${formatUSDT(quote.networkFee)}`
              : `≈ ${formatUSDT(CHAINS[network].typicalNetworkFee)}`,
          },
          { label: 'Estimated arrival', value: ETA[network] },
          { label: 'Platform fee', value: formatUSDT(quote?.platformFee ?? '0.00') },
          {
            label: <span className="text-body-m-strong text-text-primary">You receive</span>,
            value: quote ? (
              <Amount value={quote.youReceive} className="text-number-s text-text-success" />
            ) : (
              '—'
            ),
          },
        ]}
      />
      <p className="flex items-center gap-1.5 text-caption text-text-tertiary">
        <RefreshCw aria-hidden className={cn('size-3.5', loading && 'animate-spin')} />
        Estimate refreshes every 15 s
        {updatedAt ? ` · updated ${formatTimeUTC(new Date(updatedAt), { seconds: true })}` : ''}
      </p>
    </Card>
  );
}

// ── step 5 · fees & summary (WAL-14) ───────────────────────────────────────────────────────────

function FeesStep({
  draft,
  onConfirm,
  onBack,
  onNext,
}: {
  draft: Draft;
  onConfirm: (c: boolean) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const quote = useQuote(draft.amount, draft.network);
  const c = CHAINS[draft.network];
  return (
    <>
      <FlowHeading title="Review your withdrawal">
        Check every line before you continue. The amount below is exactly what arrives in your
        wallet after the network fee.
      </FlowHeading>
      <div className="flex flex-col gap-1 rounded-lg border border-border-subtle bg-bg-secondary p-4">
        <p className="text-overline text-text-tertiary uppercase">You receive</p>
        {quote.data ? (
          <Amount value={quote.data.youReceive} className="text-number-l text-text-success" />
        ) : quote.isError ? (
          <span className="text-number-l text-text-tertiary">—</span>
        ) : (
          <Skeleton className="h-10 w-40" />
        )}
        <p className="text-caption text-text-tertiary">
          on {c.testnet.name} at {short(draft.address)}
        </p>
      </div>
      <KeyValueList
        rows={[
          { label: 'Amount', value: formatUSDT(draft.amount) },
          {
            label: 'Network fee',
            value: quote.data ? `−${formatUSDT(quote.data.networkFee)}` : '…',
          },
          // A fee is never shown as 0.00 while the quote is unknown.
          { label: 'Platform fee', value: quote.data ? formatUSDT(quote.data.platformFee) : '…' },
          { label: 'Asset', value: 'USDT · Tether USD' },
          { label: 'Network', value: `${c.testnet.name} · ${c.usdtStandard}` },
          { label: 'Destination', value: <AddressChip address={draft.address} size="s" /> },
          {
            label: 'Estimated arrival',
            value: `${ETA[draft.network]} · up to 4 h if held for AML review`,
          },
        ]}
      />
      {quote.isError && !quote.data && (
        <ErrorState
          variant="inline"
          error={quote.error}
          onRetry={() => void quote.refetch()}
          retrying={quote.isFetching}
          what="the network fee"
          title="We couldn’t get the fee quote"
          note="Nothing has been sent."
        />
      )}
      <Alert type="warning" title="Crypto withdrawals can’t be reversed once sent">
        Make sure the address belongs to you and supports USDT on {c.testnet.name}.
      </Alert>
      <CheckboxField
        checked={draft.confirmed}
        onCheckedChange={(v) => onConfirm(v === true)}
        label="I’ve checked the address and network, and I understand this withdrawal can’t be reversed once sent"
        description="Required to continue — this box is never ticked for you."
      />
      <p className="text-caption text-text-tertiary">
        Next: an automatic risk check (a few seconds), then your authenticator code. Nothing is sent
        until you confirm at step 7.
      </p>
      <FlowFooter
        onBack={onBack}
        note={!draft.confirmed ? 'Tick the box to continue' : undefined}
        primary={
          <NextButton disabled={!draft.confirmed || !quote.data?.meetsMinimum} onClick={onNext}>
            Continue to security check
          </NextButton>
        }
      />
    </>
  );
}

// ── step 6 · risk validation (WAL-15) ──────────────────────────────────────────────────────────

const CHECK_ICON: Record<PrecheckCheck['status'], React.ReactNode> = {
  pass: <CircleCheck aria-hidden className="size-5 text-text-success" />,
  fail: <CircleX aria-hidden className="size-5 text-text-danger" />,
  review: <ScanSearch aria-hidden className="size-5 text-text-warning" />,
  skipped: <Minus aria-hidden className="size-5 text-icon-muted" />,
};
const CHECK_BADGE: Record<PrecheckCheck['status'], React.ReactNode> = {
  pass: <StatusBadge status="approved" label="Passed" />,
  fail: <StatusBadge status="failed" label="Not passed" />,
  review: <StatusBadge status="under_review" label="Manual review" />,
  skipped: <StatusBadge status="neutral" label="Not run yet" />,
};

function RiskStep({
  draft,
  onBack,
  onNext,
  onEdit,
}: {
  draft: Draft;
  onBack: () => void;
  onNext: () => void;
  onEdit: (s: StepKey) => void;
}) {
  const q = useQuery({
    queryKey: ['wallet', 'precheck', draft.network, draft.address, draft.amount],
    queryFn: ({ signal }) =>
      walletApi.precheck(
        { network: draft.network, address: draft.address, amount: draft.amount },
        signal,
      ),
    staleTime: 60_000,
  });
  const p = q.data;
  if (q.isPending) {
    return (
      <>
        <FlowHeading title="Running security checks…">
          Six automatic checks — usually a few seconds.
        </FlowHeading>
        <div className="flex flex-col gap-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </>
    );
  }
  if (q.isError || !p) {
    return (
      <>
        <FlowHeading title="We couldn’t run the security checks" />
        <Alert type="security">{q.error?.message ?? 'Please try again.'}</Alert>
        <FlowFooter
          onBack={onBack}
          primary={
            <NextButton onClick={() => void q.refetch()} icon={<RefreshCw />}>
              Run again
            </NextButton>
          }
        />
      </>
    );
  }
  const passed = p.checks.filter((c) => c.status === 'pass').length;
  return (
    <>
      <RiskHeading p={p} />
      <RiskAlert p={p} onEdit={onEdit} />
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-body-m-strong">
            Security checks —{' '}
            {p.outcome === 'kyc_required'
              ? 'stopped at identity'
              : `${passed} of ${p.checks.length} passed`}
          </h3>
          <span className="text-caption text-text-tertiary">
            Checked {formatDateTimeUTC(p.checkedAt)}
          </span>
        </div>
        <ul className="flex flex-col gap-2">
          {p.checks.map((c) => (
            <li
              key={c.key}
              className="flex items-start gap-3 rounded-md border border-border-subtle bg-bg-secondary p-3"
            >
              {CHECK_ICON[c.status]}
              <div className="min-w-0 flex-1">
                <p className="text-body-s-strong">{c.label}</p>
                <p className="text-caption text-text-tertiary">{c.detail}</p>
              </div>
              <span className="shrink-0">{CHECK_BADGE[c.status]}</span>
            </li>
          ))}
        </ul>
      </div>
      {p.outcome === 'review' && (
        <Alert type="info" title={`Where your ${formatUSDT(p.quote.amount)} is during the review`}>
          It’s held in Locked until the review is done. You can cancel any time before it’s sent,
          and the full amount returns to Available straight away.
        </Alert>
      )}
      <FlowFooter
        onBack={onBack}
        note={
          p.outcome === 'pass'
            ? `Result valid until ${formatTimeUTC(p.validUntil)}`
            : p.outcome === 'review'
              ? 'Review starts after you confirm'
              : p.outcome === 'kyc_required'
                ? 'Available after identity verification'
                : 'Fix the issue to continue'
        }
        primary={
          <NextButton
            disabled={p.outcome === 'blocked' || p.outcome === 'kyc_required'}
            onClick={onNext}
          >
            Continue to 2FA
          </NextButton>
        }
      />
    </>
  );
}

function RiskHeading({ p }: { p: WithdrawalPrecheck }) {
  const title =
    p.outcome === 'pass'
      ? 'Security check passed'
      : p.outcome === 'review'
        ? 'Almost there — this one needs a manual review'
        : p.outcome === 'kyc_required'
          ? 'Verify your identity to withdraw'
          : 'This withdrawal can’t continue yet';
  const body =
    p.outcome === 'pass'
      ? `We ran ${p.checks.length} automatic checks on this withdrawal at ${formatDateTimeUTC(p.checkedAt)}. Everything is clear — confirm it with your authenticator code next.`
      : p.outcome === 'review'
        ? 'You can still confirm now: after 2FA the withdrawal joins a short review queue and is sent as soon as it’s cleared.'
        : p.outcome === 'kyc_required'
          ? 'Withdrawals need a verified identity. Nothing has been sent and your balance stays in Available.'
          : 'Nothing has been sent and your balance has not changed.';
  return <FlowHeading title={title}>{body}</FlowHeading>;
}

function RiskAlert({ p, onEdit }: { p: WithdrawalPrecheck; onEdit: (s: StepKey) => void }) {
  if (p.outcome === 'pass')
    return (
      <Alert type="info" title={`All ${p.checks.length} checks passed`}>
        Nothing for you to do. The result is valid for 15 minutes — until{' '}
        {formatTimeUTC(p.validUntil)} — so confirm with 2FA before then.
      </Alert>
    );
  if (p.outcome === 'review')
    return (
      <Alert type="warning" title={p.reason ?? 'Manual review'}>
        A compliance analyst checks the destination — you don’t need to send documents. We’ll notify
        you when it’s done.
      </Alert>
    );
  if (p.outcome === 'kyc_required')
    return (
      <Alert
        type="warning"
        title="Identity verification is required for withdrawals"
        actions={
          <Button asChild size="s">
            <Link href={ACCOUNT_ROUTES.kycVerify}>Verify identity</Link>
          </Button>
        }
      >
        It takes about 5 minutes. Your balance stays yours while you verify — nothing is frozen.
      </Alert>
    );
  const fix: Partial<Record<string, { label: string; step?: StepKey; href?: string }>> = {
    INSUFFICIENT_FUNDS: { label: 'Change amount', step: 'amount' },
    LIMIT_EXCEEDED: { label: 'Change amount', step: 'amount' },
    BELOW_MINIMUM: { label: 'Change amount', step: 'amount' },
    INVALID_ADDRESS: { label: 'Change address', step: 'address' },
    ADDRESS_COOLDOWN: { label: 'Choose another address', step: 'address' },
    SANCTIONED_DESTINATION: { label: 'Use another address', step: 'address' },
    TWO_FACTOR_REQUIRED: { label: 'Set up 2FA', href: '/account/security' },
  };
  const f = p.code ? fix[p.code] : undefined;
  return (
    <Alert
      type="security"
      title={p.reason ?? 'Blocked'}
      actions={
        f ? (
          f.href ? (
            <Button asChild size="s" variant="secondary" leadingIcon={<KeyRound />}>
              <Link href={f.href}>{f.label}</Link>
            </Button>
          ) : (
            <Button size="s" variant="secondary" onClick={() => onEdit(f.step!)}>
              {f.label}
            </Button>
          )
        ) : undefined
      }
    >
      {p.code === 'SANCTIONED_DESTINATION'
        ? 'Our screening provider flagged this destination, so we can’t send funds to it. For legal reasons we can’t share more detail.'
        : 'Fix the item below and run the checks again.'}
    </Alert>
  );
}

// ── step 7 · two-factor (WAL-16) ───────────────────────────────────────────────────────────────

function TwoFactorStep({
  draft,
  ensureKey,
  onBack,
  onSubmitted,
  onEdit,
}: {
  draft: Draft;
  ensureKey: () => string;
  onBack: () => void;
  onSubmitted: (reference: string) => void;
  onEdit: (s: StepKey) => void;
}) {
  const [code, setCode] = React.useState('');
  const [shortfall, setShortfall] = React.useState(false);
  const [maintenance, setMaintenance] = React.useState<string | null>(null);
  // R41b: once an attempt got no definite answer, a later refusal that says nothing about it keeps this state.
  const [outcome, setOutcome] = React.useState<WriteOutcome | null>(null);
  const unresolved = React.useRef(false);
  const invalidate = useInvalidateWallet();
  const balances = useBalances();
  const me = useMe();
  const submit = useMutation({
    mutationFn: (totpCode: string) =>
      walletApi.requestWithdrawal({
        network: draft.network,
        address: draft.address,
        amount: draft.amount,
        idempotencyKey: ensureKey(),
        totpCode,
      }),
    onSuccess: (w) => {
      unresolved.current = false;
      void invalidate();
      onSubmitted(w.reference);
    },
    onError: (e) => {
      setCode('');
      const o = writeOutcome(e, {
        pendingUnknown: unresolved.current,
        definiteCodes: WITHDRAWAL_DEFINITE_CODES,
      });
      unresolved.current = o === 'unknown';
      setOutcome(o);
      // No definite answer: the request may have been accepted — show the real state (withdrawals, balances).
      if (o !== 'refused') void invalidate();
      if (e instanceof ApiRequestError) {
        if (o === 'refused' && e.code === 'INSUFFICIENT_FUNDS') setShortfall(true);
        if (e.code === 'SERVICE_UNAVAILABLE') setMaintenance(e.message);
      }
    },
  });
  const info = stepUpError(submit.error);
  // Network drop / 5xx / still processing — or a refusal of the retry that says nothing about the earlier attempt:
  // never claim it "wasn't requested". The draft keeps its idempotency key, so confirming again re-sends the SAME
  // request and the API answers with the existing withdrawal if there is one.
  const unknown = Boolean(submit.error) && outcome === 'unknown';
  const alreadyUsed = Boolean(submit.error) && outcome === 'already_used';
  const retryRefusal =
    unknown && !info && submit.error instanceof ApiRequestError && !isOutcomeUnknown(submit.error)
      ? submit.error
      : null;
  const other =
    submit.error &&
    !info &&
    outcome === 'refused' &&
    !(
      submit.error instanceof ApiRequestError &&
      ['INSUFFICIENT_FUNDS', 'SERVICE_UNAVAILABLE'].includes(submit.error.code)
    )
      ? submit.error
      : null;
  const locked = info?.kind === 'locked';
  return (
    <>
      <FlowHeading title={locked ? 'Withdrawals paused for 15 minutes' : 'Confirm it’s you'}>
        {locked
          ? 'Too many incorrect codes were entered, so we paused withdrawals to protect your account. Nothing has been sent.'
          : 'Enter the current code from your authenticator app. It confirms exactly this withdrawal.'}
      </FlowHeading>
      <TwoFactorField
        value={code}
        onChange={setCode}
        error={submit.error}
        focusOnMount
        disabled={submit.isPending}
      />
      {me.data && !me.data.security.twoFactorEnabled && (
        <Alert
          type="security"
          title="Two-factor authentication is off"
          actions={
            <Button asChild size="s" variant="secondary">
              <Link href="/account/security">Set up 2FA</Link>
            </Button>
          }
        >
          Withdrawals need an authenticator code.
        </Alert>
      )}
      {unknown && (
        <Alert
          type="warning"
          title="We couldn’t confirm your withdrawal"
          actions={
            <Button asChild size="s" variant="secondary">
              <Link href={`${WALLET_ROUTES.history}?type=withdrawal`}>Withdrawal history</Link>
            </Button>
          }
        >
          The connection dropped before GLOBAL POOL answered, so this withdrawal may already be
          requested. Check your withdrawal history before you change anything. Enter a new code and
          confirm again to re-send this same request — it can’t be requested twice.
          {retryRefusal && (
            <span className="mt-1 block">
              Your retry didn’t get through: {retryRefusal.message.replace(/[.!?]?$/, '.')} We still
              don’t know whether the first attempt was requested.
            </span>
          )}
        </Alert>
      )}
      {alreadyUsed && (
        <Alert
          type="warning"
          title="This withdrawal was already requested"
          actions={
            <Button asChild size="s" variant="secondary">
              <Link href={`${WALLET_ROUTES.history}?type=withdrawal`}>Withdrawal history</Link>
            </Button>
          }
        >
          GLOBAL POOL already has a request under this confirmation. Check your withdrawal history
          before you start another one.
        </Alert>
      )}
      {other && (
        <Alert
          type="security"
          title="The withdrawal wasn’t requested"
          actions={
            other instanceof ApiRequestError &&
            ['VALIDATION_FAILED', 'ADDRESS_NOT_WHITELISTED', 'KYC_REQUIRED'].includes(
              other.code,
            ) ? (
              <Button
                size="s"
                variant="secondary"
                onClick={() =>
                  onEdit(other.code === 'ADDRESS_NOT_WHITELISTED' ? 'address' : 'amount')
                }
              >
                Edit withdrawal
              </Button>
            ) : undefined
          }
        >
          {other.message}
        </Alert>
      )}
      <KeyValueList
        className="rounded-lg border border-border-subtle bg-bg-secondary px-4"
        rows={[
          { label: 'Withdraw', value: formatUSDT(draft.amount) },
          {
            label: 'To',
            value: <span className="font-mono text-mono-s">{short(draft.address)}</span>,
          },
          { label: 'Network', value: CHAINS[draft.network].testnet.name },
        ]}
      />
      <Alert type="info" title="Crypto withdrawals can’t be reversed once sent">
        You can still cancel from the withdrawal tracker until the transaction is broadcast. Email
        codes are not used in this build — your authenticator code is the second factor.
      </Alert>
      <FlowFooter
        onBack={onBack}
        primary={
          <NextButton
            icon={<Lock />}
            loading={submit.isPending}
            disabled={code.length !== 6 || locked}
            onClick={() => submit.mutate(code)}
          >
            Confirm withdrawal · {formatUSDT(draft.amount)}
          </NextButton>
        }
      />
      <InsufficientFundsModal
        open={shortfall}
        onOpenChange={setShortfall}
        available={balances.data?.available ?? '0.00'}
        required={draft.amount}
      />
      <MaintenanceModal
        open={maintenance !== null}
        onOpenChange={(o) => !o && setMaintenance(null)}
        what="Withdrawals"
        message={maintenance ?? undefined}
      />
    </>
  );
}

// ── side summary ───────────────────────────────────────────────────────────────────────────────

function WithdrawSide({ draft, step }: { draft: Draft; step: StepKey }) {
  const quote = useQuote(draft.amount, draft.network);
  const status = useWalletStatus();
  const balances = useBalances();
  const wallets = useLinkedWallets();
  const me = useMe();
  const s = status.data?.withdrawal;
  const whitelisted = (wallets.data ?? []).filter((w) => w.whitelisted).length;
  const usedAfter =
    s && draft.amount && isUSDTAmount(draft.amount) && IDX[step] <= IDX['2fa']
      ? money(s.usedToday).plus(draft.amount).toFixed(2)
      : s?.usedToday;
  const pct =
    s && usedAfter && !isZero(s.dailyLimit)
      ? Math.min(100, money(usedAfter).div(s.dailyLimit).times(100).toNumber())
      : 0;
  if (IDX[step] >= IDX.pending) {
    return balances.data ? <BalanceBreakdown balances={balances.data} compact /> : null;
  }
  return (
    <>
      <Card radius="xl" padding="l" className="gap-2">
        <SectionTitle
          demo
          action={
            <span className="rounded-full bg-surface-raised px-2 py-0.5 text-caption text-text-tertiary">
              Step {IDX[step] + 1} of 9
            </span>
          }
        >
          Withdrawal summary
        </SectionTitle>
        <KeyValueList
          rows={[
            {
              label: 'Asset',
              value: (
                <span className="inline-flex items-center gap-1.5">
                  <TokenMark size={16} /> USDT · Tether USD
                </span>
              ),
            },
            {
              label: 'Network',
              value:
                IDX[step] >= IDX.network ? (
                  <span className="inline-flex items-center gap-1.5">
                    <ChainMark chain={draft.network} size={16} />{' '}
                    {CHAINS[draft.network].testnet.name}
                  </span>
                ) : (
                  '—'
                ),
            },
            {
              label: 'Destination',
              value: draft.address ? <AddressChip address={draft.address} size="s" /> : '—',
            },
            { label: 'Amount', value: draft.amount ? formatUSDT(draft.amount) : '—' },
            {
              label: 'Network fee',
              value: quote.data
                ? `−${formatUSDT(quote.data.networkFee)}`
                : `≈ ${formatUSDT(CHAINS[draft.network].typicalNetworkFee)}`,
            },
            { label: 'Platform fee', value: formatUSDT('0.00') },
            {
              label: 'You receive',
              value: quote.data ? (
                <Amount value={quote.data.youReceive} className="text-number-s text-text-success" />
              ) : (
                '—'
              ),
            },
          ]}
        />
      </Card>
      <Card radius="xl" padding="l" className="gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-h5">
            <ShieldCheck aria-hidden className="size-5 text-icon-brand" /> Daily withdrawal limit
          </h2>
          {status.data && (
            <StatusBadge
              status={isZero(status.data.withdrawal.dailyLimit) ? 'restricted' : 'approved'}
              label={`KYC ${status.data.kycLevel.replace('level_', 'L').replace('none', '—')}`}
            />
          )}
        </div>
        {s ? (
          <>
            <p className="flex flex-wrap items-baseline gap-1.5 text-body-s text-text-secondary">
              <span className="text-number-s text-text-primary">
                {formatUSDT(usedAfter ?? '0', { symbol: false })}
              </span>{' '}
              of {formatUSDT(s.dailyLimit)} today
              {draft.amount && IDX[step] <= IDX['2fa'] ? ', including this withdrawal' : ''}{' '}
              <DemoBadge size="xs" />
            </p>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-surface-pressed"
              role="meter"
              aria-label="Daily withdrawal limit used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-caption text-text-tertiary">
              Resets {formatDateTimeUTC(s.resetsAt)} · minimum {formatUSDT(s.minWithdrawal)}.
            </p>
          </>
        ) : status.isError ? (
          // ERR-03: a failed status is an error with Try again, never an endless skeleton.
          <ErrorState
            variant="inline"
            error={status.error}
            onRetry={() => void status.refetch()}
            retrying={status.isFetching}
            what="your daily limit"
          />
        ) : (
          <Skeleton className="h-12 w-full" />
        )}
      </Card>
      <Card radius="xl" padding="l" className="gap-3">
        <h2 className="flex items-center gap-2 text-h5">
          <ShieldCheck aria-hidden className="size-5 text-icon-brand" /> Withdrawal protections
        </h2>
        <ul className="flex flex-col gap-2 text-body-s">
          {[
            [
              me.data?.security.twoFactorEnabled ? '2FA on' : '2FA off',
              'Authenticator code at step 7',
              me.data?.security.twoFactorEnabled,
            ],
            [
              'Address whitelist',
              `${whitelisted} saved address${whitelisted === 1 ? '' : 'es'}`,
              whitelisted > 0,
            ],
            ['24 h cool-down', 'For every new whitelisted address', true],
            [
              'Anti-phishing code',
              me.data?.security.antiPhishingCode
                ? `${me.data.security.antiPhishingCode} — in every genuine email`
                : 'Not set',
              Boolean(me.data?.security.antiPhishingCode),
            ],
          ].map(([t, d, ok]) => (
            <li key={String(t)} className="flex items-start justify-between gap-3">
              <span className="flex items-center gap-2 text-text-primary">
                {ok ? (
                  <CircleCheck aria-hidden className="size-4 text-text-success" />
                ) : (
                  <Minus aria-hidden className="size-4 text-icon-muted" />
                )}
                {t}
              </span>
              <span className="text-right text-caption text-text-tertiary">{d}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card radius="xl" padding="l" className="gap-2">
        <h2 className="text-h5">How long does a withdrawal take?</h2>
        <p className="text-body-s text-text-secondary">
          Most withdrawals are sent within minutes. A new destination or a large amount can be held
          for routine AML screening — usually under 4 hours. You can track every step and cancel
          until it’s sent.
        </p>
      </Card>
    </>
  );
}
