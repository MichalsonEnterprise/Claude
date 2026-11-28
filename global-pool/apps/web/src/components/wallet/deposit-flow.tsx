'use client';

import { CHAIN_DISPLAY_ORDER, CHAINS, MVP_CHAIN_ID, type ChainKey } from '@gp/shared/chains';
import { formatDateTimeUTC, formatTimeUTC } from '@gp/shared/format';
import { add, formatUSDT, gte, isUSDTAmount, lt, money, sub } from '@gp/shared/money';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowDownToLine,
  ArrowRight,
  CircleCheck,
  Clock,
  Copy,
  FlaskConical,
  History,
  LifeBuoy,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  Ticket,
  TriangleAlert,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { ChainMark, TokenMark } from '@/components/brand/chain-mark';
import { Amount } from '@/components/domain/amount';
import { sanitizeAmount } from '@/components/domain/amount-input';
import { NetworkPill } from '@/components/domain/network-pill';
import { Alert } from '@/components/ui/alert';
import { AgeBadge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DemoBadge } from '@/components/ui/demo-badge';
import { Field, InputControl, InputGroup } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/sonner';
import { ApiRequestError, newIdempotencyKey } from '@/lib/api/client';
import {
  useBalances,
  useCurrentRound,
  useDeposit,
  useDepositAddress,
  useInvalidateWallet,
  useRg,
  useWalletStatus,
  walletApi,
  walletKeys,
  type DepositView,
} from '@/lib/api/wallet';
import { publicEnv } from '@/lib/env';
import { statePreviewEnabled } from '@/lib/home-preview';
import { cn } from '@/lib/utils';

import { DepositLimitModal, MaintenanceModal, WalletStatusBanners, depositLimit } from './banners';
import {
  FlowFooter,
  FlowHeading,
  FlowShell,
  NextButton,
  OptionRow,
  type FlowStep,
} from './flow-shell';
import { WalletOverview } from './overview';
import { AddressQr } from './qr-code';
import { StatusTimeline } from './timeline';
import { TxHash } from './tx-detail';
import {
  ConfirmationBar,
  ConfirmationRing,
  KeyValueList,
  SectionTitle,
  WALLET_ROUTES,
  chainName,
} from './wallet-ui';

const STEPS: FlowStep[] = [
  { key: 'network', label: 'Network' },
  { key: 'token', label: 'Token' },
  { key: 'address', label: 'Address' },
  { key: 'qr', label: 'QR' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmation', label: 'Confirmation' },
  { key: 'done', label: 'Done' },
];
type StepKey = 'network' | 'token' | 'address' | 'qr' | 'pending' | 'confirmation' | 'done';
const STEP_INDEX: Record<StepKey, number> = {
  network: 0,
  token: 1,
  address: 2,
  qr: 3,
  pending: 4,
  confirmation: 5,
  done: 6,
};

/** Safety re-check of the displayed address (the HD address itself is permanent). */
const ADDRESS_SESSION_MS = 30 * 60_000;
/** A deposit still confirming after this long is shown as delayed (with honest next steps). */
const DELAYED_AFTER_MS = 10 * 60_000;

type Preview = 'wrong-network' | 'expired' | 'delayed' | null;

function useNow(intervalMs = 1000): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** EIP-1193 wallet chain check (no permission prompt): `eth_chainId` of an injected wallet, if any. */
function useInjectedChainId(): number | null {
  const [chainId, setChainId] = React.useState<number | null>(null);
  React.useEffect(() => {
    const eth = (
      window as unknown as {
        ethereum?: {
          request: (a: { method: string }) => Promise<string>;
          on?: (e: string, cb: (c: string) => void) => void;
          removeListener?: (e: string, cb: (c: string) => void) => void;
        };
      }
    ).ethereum;
    if (!eth) return;
    const set = (hex: string) => setChainId(Number.parseInt(hex, 16));
    eth
      .request({ method: 'eth_chainId' })
      .then(set)
      .catch(() => undefined);
    eth.on?.('chainChanged', set);
    return () => eth.removeListener?.('chainChanged', set);
  }, []);
  return chainId;
}

async function switchToArbitrumSepolia() {
  const eth = (
    window as unknown as {
      ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
    }
  ).ethereum;
  if (!eth) return;
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${MVP_CHAIN_ID.toString(16)}` }],
    });
  } catch {
    toast({
      type: 'error',
      title: 'Couldn’t switch the network',
      description: 'Switch to Arbitrum Sepolia in your wallet app.',
    });
  }
}

/** WAL-03…09 Deposit flow (+ MOB-06 bottom sheet on mobile). State lives in the URL (?step, ?ref). */
export function DepositFlow() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const ref = sp.get('ref');
  const rawStep = sp.get('step') as StepKey | null;
  const preview: Preview = statePreviewEnabled ? (sp.get('preview') as Preview) : null;
  const network: ChainKey = 'arbitrum';
  const step: StepKey = ref
    ? rawStep && ['pending', 'confirmation', 'done'].includes(rawStep)
      ? rawStep
      : 'pending'
    : rawStep && STEP_INDEX[rawStep] !== undefined && STEP_INDEX[rawStep] <= 4
      ? rawStep
      : 'network';

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

  const deposit = useDeposit(ref);
  const failed = deposit.data?.status === 'rejected';
  // Auto-advance once the deposit is credited (pending → confirmation).
  React.useEffect(() => {
    if (step === 'pending' && deposit.data?.status === 'credited') go('confirmation');
  }, [deposit.data?.status, go, step]);

  const context =
    ref && deposit.data
      ? `${deposit.data.reference} · ${formatUSDT(deposit.data.amount)}`
      : `Test USDT on ${CHAINS[network].testnet.name}`;

  return (
    <FlowShell
      title="Deposit USDT"
      description="Add test USDT from any wallet in 7 short steps. GLOBAL POOL charges no deposit fee — you only pay the sender network fee in your wallet."
      headerActions={
        <div className="hidden items-center gap-3 tablet:flex">
          <Button asChild variant="ghost" leadingIcon={<History />}>
            <Link href={`${WALLET_ROUTES.history}?type=deposit`}>Deposit history</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={WALLET_ROUTES.withdraw}>Withdraw</Link>
          </Button>
        </div>
      }
      flow="Deposit"
      steps={STEPS}
      current={step === 'done' && failed ? 6 : STEP_INDEX[step]}
      error={failed}
      context={context}
      background={<WalletOverview />}
      side={<DepositSide step={step} network={network} deposit={deposit.data} />}
    >
      {step === 'network' && <NetworkStep onNext={() => go('token')} />}
      {step === 'token' && (
        <TokenStep network={network} onBack={() => go('network')} onNext={() => go('address')} />
      )}
      {(step === 'address' || step === 'qr') && (
        <AddressStep
          network={network}
          variant={step}
          preview={preview}
          onBack={() => go(step === 'qr' ? 'address' : 'token')}
          onQr={() => go('qr')}
          onSent={() => go('pending')}
          onDetected={(r) => go('pending', { ref: r })}
        />
      )}
      {step === 'pending' && !ref && (
        <WaitingStep
          network={network}
          onBack={() => go('address')}
          onDetected={(r) => go('pending', { ref: r })}
        />
      )}
      {step === 'pending' && ref && (
        <PendingStep
          deposit={deposit.data}
          loading={deposit.isPending}
          error={deposit.error}
          preview={preview}
          onNew={() => go('network', { ref: null })}
        />
      )}
      {step === 'confirmation' && ref && (
        <ConfirmationStep deposit={deposit.data} onNext={() => go('done')} />
      )}
      {step === 'done' && ref && (
        <DoneStep deposit={deposit.data} onNew={() => go('network', { ref: null })} />
      )}
    </FlowShell>
  );
}

// ── step 1 · network (WAL-03) ──────────────────────────────────────────────────────────────────

function NetworkStep({ onNext }: { onNext: () => void }) {
  const [selected, setSelected] = React.useState<ChainKey | null>('arbitrum');
  const status = useWalletStatus();
  const balances = useBalances();
  const rg = useRg();
  const isNew = balances.data && money(balances.data.total).isZero();
  const paused = status.data && !status.data.depositsEnabled;
  return (
    <>
      <FlowHeading title="Choose a network">
        Pick the network your wallet or exchange will send from. The sender and GLOBAL POOL must use
        the same network, otherwise funds can be lost.
      </FlowHeading>
      <WalletStatusBanners status={status.data} rg={rg.data} context="deposit" />
      {isNew && (
        <Alert type="info" title="First deposit? Set a deposit limit first (optional)">
          Limits help you stay in control and are checked on our side for every deposit. You can
          lower them any time; raising one takes 24 h.{' '}
          <Link href="/responsible-gaming" className="text-text-brand underline">
            Set a limit
          </Link>
        </Alert>
      )}
      <div role="radiogroup" aria-label="Deposit network" className="flex flex-col gap-2">
        {CHAIN_DISPLAY_ORDER.map((k) => {
          const c = CHAINS[k];
          return (
            <OptionRow
              key={k}
              name="deposit-network"
              value={k}
              selected={selected === k}
              disabled={!c.enabled}
              onSelect={() => setSelected(k)}
              icon={<ChainMark chain={k} size={32} />}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {c.enabled ? c.testnet.name : c.name}
                  {c.enabled ? (
                    <StatusBadge status="live" label="Live · testnet" />
                  ) : (
                    <StatusBadge status="neutral" label="Coming soon" />
                  )}
                </span>
              }
              subtitle={`${c.usdtStandard} · ${c.confirmationsLabel} confirmations · min ${formatUSDT(c.minDeposit)}`}
              aside={
                c.enabled ? (
                  <>
                    <NetworkPill
                      chain={k}
                      status={c.health === 'operational' ? 'operational' : 'congested'}
                      size="s"
                      showStatusLabel
                      className="hidden tablet:inline-flex"
                    />
                  </>
                ) : (
                  <span className="text-caption text-text-tertiary">Not available yet</span>
                )
              }
            />
          );
        })}
      </div>
      <p className="flex gap-2 text-caption text-text-tertiary">
        <ShieldCheck aria-hidden className="size-4 shrink-0" />
        DEMO / testnet build: only Arbitrum Sepolia test USDT is accepted. Never send real funds.
      </p>
      <FlowFooter
        note={!selected ? 'Choose a network to continue' : undefined}
        primary={
          <NextButton disabled={!selected || Boolean(paused)} onClick={onNext}>
            Continue
          </NextButton>
        }
      />
    </>
  );
}

// ── step 2 · token (WAL-04) ────────────────────────────────────────────────────────────────────

function TokenStep({
  network,
  onBack,
  onNext,
}: {
  network: ChainKey;
  onBack: () => void;
  onNext: () => void;
}) {
  const c = CHAINS[network];
  return (
    <>
      <FlowHeading title="Choose the token">
        GLOBAL POOL balances are in USDT. On {c.testnet.name} we accept the platform’s test USDT
        only.
      </FlowHeading>
      <div role="radiogroup" aria-label="Token" className="flex flex-col gap-2">
        <OptionRow
          name="deposit-token"
          value="usdt"
          selected
          onSelect={() => undefined}
          icon={<TokenMark size={32} />}
          title={
            <span className="flex flex-wrap items-center gap-2">
              USDT · {c.testnet.tokenLabel} <DemoBadge size="xs" />
            </span>
          }
          subtitle={`${c.usdtStandard} on ${c.testnet.name} · ${c.usdtDecimals} decimals · testnet token, no real value`}
          aside={
            <span className="text-caption text-text-tertiary">1 USDT = 1.00 balance unit</span>
          }
        />
        <OptionRow
          name="deposit-token"
          value="other"
          selected={false}
          disabled
          onSelect={() => undefined}
          icon={<span className="size-8 rounded-full bg-surface-pressed" aria-hidden />}
          title="Other tokens (USDC, ETH, …)"
          subtitle="Not supported — tokens other than test USDT are not credited."
        />
      </div>
      <Alert type="warning" title="Send only test USDT">
        Other tokens sent to your deposit address can’t be credited automatically. Recovery is not
        guaranteed.
      </Alert>
      <FlowFooter
        onBack={onBack}
        primary={<NextButton onClick={onNext}>Show deposit address</NextButton>}
      />
    </>
  );
}

// ── steps 3–4 · address + QR (WAL-05 / WAL-06) ────────────────────────────────────────────────

function useSessionStart(key: string | number): number {
  const [at, setAt] = React.useState(() => Date.now());
  React.useEffect(() => setAt(Date.now()), [key]);
  return at;
}

/** Poll the deposit list and report a deposit that appeared after `since` (detected on-chain by the watcher). */
function useNewDepositWatcher(since: number, onDetected: (ref: string) => void, enabled = true) {
  const known = React.useRef<Set<string> | null>(null);
  const q = useQuery({
    queryKey: ['wallet', 'deposits', 'watch', since],
    queryFn: ({ signal }) => walletApi.deposits(signal),
    refetchInterval: 5_000,
    enabled,
  });
  React.useEffect(() => {
    const items = q.data?.items;
    if (!items) return;
    if (!known.current) {
      known.current = new Set(items.map((d) => d.reference));
      return;
    }
    const fresh = items.find(
      (d) => !known.current!.has(d.reference) && new Date(d.detectedAt).getTime() >= since - 60_000,
    );
    if (fresh) onDetected(fresh.reference);
  }, [q.data, onDetected, since]);
}

function AddressStep({
  network,
  variant,
  preview,
  onBack,
  onQr,
  onSent,
  onDetected,
}: {
  network: ChainKey;
  variant: 'address' | 'qr';
  preview: Preview;
  onBack: () => void;
  onQr: () => void;
  onSent: () => void;
  onDetected: (ref: string) => void;
}) {
  const c = CHAINS[network];
  const addr = useDepositAddress(network);
  const now = useNow();
  const issuedAt = addr.dataUpdatedAt || now;
  const expired = preview === 'expired' || now - issuedAt > ADDRESS_SESSION_MS;
  const left = Math.max(0, ADDRESS_SESSION_MS - (now - issuedAt));
  const walletChain = useInjectedChainId();
  const wrongNetwork =
    preview === 'wrong-network' || (walletChain !== null && walletChain !== MVP_CHAIN_ID);
  const since = useSessionStart(network);
  useNewDepositWatcher(since, onDetected, !expired);
  const [amount, setAmount] = React.useState('');
  const belowMin = amount !== '' && isUSDTAmount(amount) && lt(amount, c.minDeposit);
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    if (!addr.data) return;
    try {
      await navigator.clipboard.writeText(addr.data.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast({
        type: 'error',
        title: 'Copy failed',
        description: 'Select the address and copy it manually.',
      });
    }
  };

  if (addr.isError) {
    const paused =
      addr.error instanceof ApiRequestError && addr.error.code === 'SERVICE_UNAVAILABLE';
    return (
      <>
        <FlowHeading title="We couldn’t load your deposit address" />
        <Alert
          type={paused ? 'maintenance' : 'security'}
          title={paused ? 'Deposits are paused for maintenance' : 'Something went wrong'}
        >
          {addr.error.message}
        </Alert>
        <FlowFooter
          onBack={onBack}
          primary={
            <NextButton onClick={() => void addr.refetch()} icon={<RefreshCw />}>
              Try again
            </NextButton>
          }
        />
      </>
    );
  }

  return (
    <>
      <FlowHeading title={variant === 'qr' ? 'Scan to send' : 'Send USDT to this address'}>
        {variant === 'qr'
          ? 'Scan the code with your wallet app. We detect the transfer automatically — no need to paste a transaction hash.'
          : 'Copy the address or scan the code with your wallet. We detect the transfer automatically — no need to paste a transaction hash.'}
      </FlowHeading>
      {wrongNetwork && (
        <Alert
          type="security"
          title="Your wallet is on a different network"
          actions={
            <Button variant="secondary" size="s" onClick={() => void switchToArbitrumSepolia()}>
              Switch to {c.testnet.name}
            </Button>
          }
        >
          Switch your wallet to {c.testnet.name} before you send. A transfer on another network
          can’t be credited and may be lost.
        </Alert>
      )}
      <Alert type="warning" title={`Send only ${c.testnet.tokenLabel} on ${c.testnet.name}.`}>
        Other tokens or networks may be lost. TESTNET / DEMO — never send real funds.
      </Alert>

      <Card variant="raised" padding="m" className="gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-body-m-strong text-text-primary">Deposit USDT</p>
            <p className="text-caption text-text-secondary">
              Send only {c.testnet.tokenLabel} on {c.testnet.name} to this address.
            </p>
          </div>
          <DemoBadge size="s" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NetworkPill chain={network} size="s" showStatusLabel status="operational" />
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border-default px-2.5 text-caption">
            <TokenMark size={16} /> USDT · {c.testnet.tokenLabel}
          </span>
          <span className="text-caption text-text-tertiary">
            {addr.data?.confirmations ?? c.confirmations} confirmations · min{' '}
            {formatUSDT(c.minDeposit)}
          </span>
        </div>
        <div className={cn('flex flex-col gap-4', variant === 'address' && 'tablet:flex-row')}>
          <div className="relative self-center tablet:self-start">
            <AddressQr
              value={addr.data?.address ?? null}
              size={variant === 'qr' ? 240 : 168}
              masked={expired}
              label={`QR code of your ${c.testnet.name} deposit address`}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="text-overline text-text-tertiary uppercase">
              Your {c.testnet.name} deposit address
            </p>
            {addr.data ? (
              <p
                className={cn(
                  'rounded-md border border-border-subtle bg-bg-secondary p-3 font-mono text-mono-m break-all text-text-primary',
                  expired && 'blur-sm select-none',
                )}
                aria-hidden={expired}
                data-testid="deposit-address"
              >
                {addr.data.address}
              </p>
            ) : (
              <Skeleton className="h-16 w-full" />
            )}
            {expired ? (
              <div className="flex flex-col gap-2">
                <Alert type="warning" title="Address session expired">
                  For your safety we re-check the address after 30 minutes. Your address doesn’t
                  change — refresh to show it again before sending.
                </Alert>
                <Button
                  variant="secondary"
                  leadingIcon={<RefreshCw />}
                  onClick={() => void addr.refetch()}
                  className="self-start"
                >
                  Refresh address
                </Button>
              </div>
            ) : (
              <>
                <Button
                  variant="secondary"
                  leadingIcon={<Copy />}
                  onClick={copy}
                  disabled={!addr.data}
                  className="self-start"
                >
                  {copied ? 'Copied' : 'Copy address'}
                </Button>
                <span role="status" aria-live="polite" className="sr-only">
                  {copied ? 'Address copied' : ''}
                </span>
                <p className="inline-flex items-center gap-2 self-start rounded-md bg-bg-secondary px-3 py-2 text-caption text-text-secondary">
                  <Clock aria-hidden className="size-4" /> Address session valid{' '}
                  <span className="font-mono text-text-primary tabular-nums">
                    {String(Math.floor(left / 60_000)).padStart(2, '0')}:
                    {String(Math.floor((left % 60_000) / 1000)).padStart(2, '0')}
                  </span>
                </p>
                <p className="text-caption text-text-tertiary">
                  Check the first and last characters after pasting. The address is yours
                  permanently; the session only limits how long we show it without a re-check.
                </p>
              </>
            )}
          </div>
        </div>
      </Card>

      {variant === 'qr' && (
        <Field
          label="Amount you plan to send (optional)"
          helper={
            belowMin
              ? undefined
              : `Only a reminder for you — the QR code contains the address only. Minimum ${formatUSDT(c.minDeposit)}.`
          }
          error={
            belowMin
              ? `Below the ${formatUSDT(c.minDeposit)} minimum — top up ${formatUSDT(sub(c.minDeposit, amount).toFixed(2))} or send ${formatUSDT(c.minDeposit)} or more.`
              : undefined
          }
        >
          <InputGroup size="m">
            <InputControl
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(sanitizeAmount(e.target.value, 2))}
            />
            <span className="text-label-m text-text-secondary">USDT</span>
          </InputGroup>
        </Field>
      )}

      {variant === 'address' && (
        <div className="flex flex-col gap-2 rounded-lg border border-status-warning/30 bg-status-warning-tint p-4">
          <p className="flex items-center gap-2 text-label-m text-text-warning">
            <TriangleAlert aria-hidden className="size-4" /> Before you send
          </p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-body-s text-text-secondary marker:text-text-warning">
            <li>
              Only send {c.testnet.tokenLabel} on {c.testnet.name}. Other tokens or networks can’t
              be credited.
            </li>
            <li>
              Minimum deposit {formatUSDT(c.minDeposit)}. Smaller amounts may not be credited
              automatically.
            </li>
            <li>
              Credited after {addr.data?.confirmations ?? c.confirmations} network confirmations —
              usually under a minute on Arbitrum.
            </li>
            <li>Deposits sent on the wrong network may be lost permanently.</li>
          </ul>
        </div>
      )}

      {variant === 'qr' && (
        <div
          className="flex items-center gap-3 rounded-md border border-border-subtle bg-bg-secondary p-3"
          role="status"
        >
          <RefreshCw
            aria-hidden
            className="size-4 animate-spin text-icon-muted [animation-duration:2.4s]"
          />
          <p className="text-body-s text-text-secondary">
            Waiting for your transfer — we check the network every few seconds.
          </p>
        </div>
      )}

      <DemoSimulate network={network} onCreated={onDetected} />

      <FlowFooter
        onBack={onBack}
        secondary={
          variant === 'address' ? (
            <Button
              variant="secondary"
              size="l"
              leadingIcon={<Send />}
              onClick={onSent}
              disabled={expired}
              className="w-full tablet:w-auto"
            >
              I’ve sent USDT
            </Button>
          ) : undefined
        }
        primary={
          variant === 'address' ? (
            <NextButton onClick={onQr} disabled={expired} icon={<QrCode />}>
              Show QR code
            </NextButton>
          ) : (
            <NextButton onClick={onSent} disabled={expired} icon={<Send />}>
              I’ve sent USDT
            </NextButton>
          )
        }
      />
    </>
  );
}

/** Clearly-labelled DEMO control: simulate a test-USDT transfer to your address (dev / DEMO builds only). */
function DemoSimulate({
  network,
  onCreated,
}: {
  network: ChainKey;
  onCreated: (ref: string) => void;
}) {
  const [amount, setAmount] = React.useState('100.00');
  const key = React.useRef<string | null>(null);
  const [limitOpen, setLimitOpen] = React.useState(false);
  const [maintenance, setMaintenance] = React.useState<string | null>(null);
  const rg = useRg();
  const invalidate = useInvalidateWallet();
  const sim = useMutation({
    mutationFn: () => {
      key.current ??= newIdempotencyKey();
      return walletApi.simulateDeposit({
        network,
        amount,
        idempotencyKey: key.current,
        mode: 'progressive',
      });
    },
    onSuccess: (d) => {
      key.current = null;
      void invalidate();
      onCreated(d.reference);
    },
    onError: (e) => {
      key.current = null;
      if (e instanceof ApiRequestError && e.code === 'RG_LIMIT_EXCEEDED') setLimitOpen(true);
      else if (e instanceof ApiRequestError && e.code === 'SERVICE_UNAVAILABLE')
        setMaintenance(e.message);
      else toast({ type: 'error', title: 'DEMO simulation failed', description: e.message });
    },
  });
  if (!publicEnv.demoMode) return null;
  const valid = isUSDTAmount(amount) && gte(amount, CHAINS[network].minDeposit);
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-dashed border-status-warning bg-status-warning-tint/60 p-4"
      data-testid="demo-simulate"
    >
      <p className="flex items-center gap-2 text-label-m text-text-warning">
        <FlaskConical aria-hidden className="size-4" /> DEMO control — simulate a testnet deposit
      </p>
      <p className="text-caption text-text-secondary">
        Records a simulated test-USDT transfer to your address with 0 / 20 confirmations, using the
        same ledger postings as a real deposit. Nothing happens on-chain and nothing has real value.
      </p>
      <div className="flex flex-col gap-2 tablet:flex-row tablet:items-end">
        <Field
          label="Simulated amount"
          className="tablet:w-48"
          error={!valid ? `Minimum ${formatUSDT(CHAINS[network].minDeposit)}` : undefined}
        >
          <InputGroup size="m">
            <InputControl
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(sanitizeAmount(e.target.value, 2))}
            />
            <span className="text-label-m text-text-secondary">USDT</span>
          </InputGroup>
        </Field>
        <Button
          variant="secondary"
          leadingIcon={<FlaskConical />}
          loading={sim.isPending}
          disabled={!valid}
          onClick={() => sim.mutate()}
        >
          Simulate testnet deposit
        </Button>
      </div>
      <DepositLimitModal
        open={limitOpen}
        onOpenChange={setLimitOpen}
        limit={depositLimit(rg.data)}
        attempted={amount}
      />
      <MaintenanceModal
        open={maintenance !== null}
        onOpenChange={(o) => !o && setMaintenance(null)}
        what="Deposits"
        message={maintenance ?? undefined}
      />
    </div>
  );
}

// ── step 5 · waiting / pending (WAL-07) ────────────────────────────────────────────────────────

function WaitingStep({
  network,
  onBack,
  onDetected,
}: {
  network: ChainKey;
  onBack: () => void;
  onDetected: (ref: string) => void;
}) {
  const since = useSessionStart(network);
  useNewDepositWatcher(since, onDetected);
  return (
    <>
      <FlowHeading title="Waiting for your transfer">
        As soon as your transaction appears on {CHAINS[network].testnet.name} it shows up here with
        its confirmations. Transfers from exchanges can take a few minutes to be broadcast.
      </FlowHeading>
      <div
        className="flex items-center gap-3 rounded-md border border-border-subtle bg-bg-secondary p-4"
        role="status"
      >
        <RefreshCw
          aria-hidden
          className="size-5 animate-spin text-icon-muted [animation-duration:2.4s]"
        />
        <p className="text-body-s text-text-secondary">
          Checking the network every few seconds — you can leave this page; we’ll notify you.
        </p>
      </div>
      <DemoSimulate network={network} onCreated={onDetected} />
      <FlowFooter
        onBack={onBack}
        backLabel="Back to address"
        primary={
          <Button asChild size="l" variant="secondary">
            <Link href={WALLET_ROUTES.overview}>Go to wallet</Link>
          </Button>
        }
      />
    </>
  );
}

function PendingStep({
  deposit,
  loading,
  error,
  preview,
  onNew,
}: {
  deposit: DepositView | undefined;
  loading: boolean;
  error: Error | null;
  preview: Preview;
  onNew: () => void;
}) {
  const now = useNow(5_000);
  const balances = useBalances();
  if (loading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (error || !deposit) {
    return (
      <>
        <FlowHeading title="We couldn’t find this deposit" />
        <Alert type="security">{error?.message ?? 'Unknown deposit reference.'}</Alert>
        <FlowFooter primary={<NextButton onClick={onNew}>Start a new deposit</NextButton>} />
      </>
    );
  }
  if (deposit.status === 'rejected') return <FailedDeposit deposit={deposit} onNew={onNew} />;
  const c = deposit.confirmations;
  const delayed =
    preview === 'delayed' || now - new Date(deposit.detectedAt).getTime() > DELAYED_AFTER_MS;
  const availableAfter = balances.data
    ? add(balances.data.available, deposit.amount).toFixed(2)
    : null;
  return (
    <>
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-status-info-tint text-text-info"
        >
          <Clock className="size-6" />
        </span>
        <FlowHeading title={delayed ? 'Taking longer than usual' : 'Deposit detected'}>
          {delayed
            ? `Your transaction is on ${chainName(deposit.network)}, but confirmations are slower than usual. Nothing is lost — it’s credited automatically once it reaches ${c.required} confirmations.`
            : `We’ve seen your transaction on ${chainName(deposit.network)}. It’s credited to your balance after ${c.required} confirmations.`}
        </FlowHeading>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Amount value={deposit.amount} className="text-number-l" />
        <span className="flex items-center gap-2">
          <StatusBadge status="pending" label="Pending" size="m" />
          {deposit.isDemo && <DemoBadge size="s" />}
        </span>
      </div>
      {delayed && (
        <Alert
          type="warning"
          title="Delayed — no action needed"
          actions={
            <Button asChild variant="ghost" size="s" leadingIcon={<LifeBuoy />}>
              <Link href="/support">Contact support</Link>
            </Button>
          }
        >
          If it’s still pending after 60 minutes, contact support with reference {deposit.reference}
          . Please don’t send the same amount again.
        </Alert>
      )}
      <div
        className="flex items-center gap-3 rounded-lg border border-border-subtle bg-bg-secondary p-4"
        aria-live="polite"
      >
        <ConfirmationRing current={c.current} required={c.required} size={52} />
        <div className="min-w-0 flex-1">
          <p className="text-body-m-strong">
            {c.current} / {c.required} confirmations
          </p>
          <p className="text-caption text-text-tertiary">
            {chainName(deposit.network)} · {deposit.reference} · updates every few seconds
          </p>
          <ConfirmationBar current={c.current} required={c.required} className="mt-2" />
        </div>
      </div>
      <Card variant="raised" padding="m" className="gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-body-m-strong">Deposit {deposit.reference}</p>
            <p className="text-caption text-text-tertiary">
              {formatUSDT(deposit.amount)} · {chainName(deposit.network)} ·{' '}
              {formatDateTimeUTC(deposit.detectedAt)}
            </p>
          </div>
          <StatusBadge status="processing" label="Confirming" />
        </div>
        <StatusTimeline
          items={[
            {
              id: 'sub',
              title: 'Submitted',
              detail: `Detected on ${chainName(deposit.network)}`,
              time: formatTimeUTC(deposit.detectedAt),
              state: 'done',
            },
            {
              id: 'conf',
              title: 'Confirming',
              detail: `${c.current} / ${c.required} confirmations`,
              state: 'current',
              extra: <ConfirmationBar current={c.current} required={c.required} />,
            },
            {
              id: 'cred',
              title: 'Credited',
              detail: `Shown as Pending until ${c.required} confirmations`,
              state: 'todo',
            },
          ]}
        />
        {deposit.txHash && (
          <div className="flex flex-col gap-2 border-t border-border-subtle pt-3">
            <p className="text-caption text-text-tertiary">Transaction hash</p>
            <TxHash hash={deposit.txHash} network={deposit.network} demo={deposit.isDemo} />
          </div>
        )}
      </Card>
      <KeyValueList
        className="rounded-lg border border-border-subtle bg-bg-secondary px-4"
        rows={[
          {
            label: 'Pending balance now',
            value: <span className="text-text-info">+{formatUSDT(deposit.amount)}</span>,
          },
          {
            label: `Available after ${c.required} / ${c.required}`,
            value: availableAfter ? formatUSDT(availableAfter) : '—',
          },
        ]}
      />
      <DemoAdvance deposit={deposit} />
      <p className="text-caption text-text-tertiary">
        You can close this page — we’ll notify you in the app as soon as it’s credited.
      </p>
      <FlowFooter
        secondary={
          <Button variant="secondary" size="l" onClick={onNew} className="w-full tablet:w-auto">
            Make another deposit
          </Button>
        }
        primary={
          <Button asChild size="l" trailingIcon={<ArrowRight />} className="w-full tablet:w-auto">
            <Link href={WALLET_ROUTES.overview}>Go to wallet</Link>
          </Button>
        }
      />
    </>
  );
}

/** DEMO only: add simulated block confirmations (the real watcher does this from the chain). */
function DemoAdvance({ deposit }: { deposit: DepositView }) {
  const [auto, setAuto] = React.useState(false);
  const invalidate = useInvalidateWallet();
  const adv = useMutation({
    mutationFn: (n: number) => walletApi.advanceDeposit(deposit.reference, n),
    onSuccess: () => void invalidate(),
    onError: (e) => {
      setAuto(false);
      toast({ type: 'error', title: 'DEMO control failed', description: e.message });
    },
  });
  const { mutate, isPending } = adv;
  React.useEffect(() => {
    if (!auto) return;
    const t = window.setInterval(() => {
      if (!isPending) mutate(2);
    }, 2_500);
    return () => window.clearInterval(t);
  }, [auto, isPending, mutate]);
  if (!publicEnv.demoMode || !deposit.isDemo) return null;
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-dashed border-status-warning bg-status-warning-tint/60 p-4"
      data-testid="demo-advance"
    >
      <p className="flex items-center gap-2 text-label-m text-text-warning">
        <FlaskConical aria-hidden className="size-4" /> DEMO control — simulated blocks
      </p>
      <p className="text-caption text-text-secondary">
        On a real network each new block adds a confirmation. Here you can add simulated
        confirmations; the deposit is credited by the same ledger posting once it reaches{' '}
        {deposit.confirmations.required}.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="s" loading={isPending} onClick={() => mutate(5)}>
          Add 5 confirmations
        </Button>
        <Button
          variant={auto ? 'primary' : 'ghost'}
          size="s"
          aria-pressed={auto}
          onClick={() => setAuto((a) => !a)}
        >
          {auto ? 'Stop auto-advance' : 'Auto-advance'}
        </Button>
      </div>
    </div>
  );
}

function FailedDeposit({ deposit, onNew }: { deposit: DepositView; onNew: () => void }) {
  return (
    <>
      <FlowHeading title="Deposit not credited">
        This transfer could not be credited. If funds left your wallet, support can investigate with
        the reference below.
      </FlowHeading>
      <Alert type="security" title="Failed — not credited">
        {deposit.reference} · {formatUSDT(deposit.amount)} on {chainName(deposit.network)}. Your
        balance is unchanged.
      </Alert>
      {deposit.txHash && (
        <TxHash hash={deposit.txHash} network={deposit.network} demo={deposit.isDemo} />
      )}
      <FlowFooter
        secondary={
          <Button asChild variant="secondary" size="l" leadingIcon={<LifeBuoy />}>
            <Link href="/support">Contact support</Link>
          </Button>
        }
        primary={<NextButton onClick={onNew}>Start a new deposit</NextButton>}
      />
    </>
  );
}

// ── step 6 · confirmation (WAL-08) ─────────────────────────────────────────────────────────────

function ConfirmationStep({
  deposit,
  onNext,
}: {
  deposit: DepositView | undefined;
  onNext: () => void;
}) {
  const balances = useBalances();
  const round = useCurrentRound();
  if (!deposit || !balances.data) {
    return <Skeleton className="h-64 w-full" />;
  }
  const b = balances.data;
  const c = deposit.confirmations;
  const credited = deposit.status === 'credited';
  return (
    <>
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-status-success-tint text-text-success"
        >
          <CircleCheck className="size-6" />
        </span>
        <FlowHeading title={credited ? 'Deposit credited' : 'Almost there'}>
          {credited
            ? `${formatUSDT(deposit.amount)} reached ${c.current} / ${c.required} confirmations and moved from Pending to Available.`
            : 'Waiting for the last confirmations…'}
        </FlowHeading>
      </div>
      <div className="overflow-hidden rounded-lg border border-border-subtle">
        <table className="w-full text-body-s">
          <caption className="sr-only">Balance before and after this deposit</caption>
          <thead className="bg-bg-secondary text-caption text-text-tertiary">
            <tr>
              <th scope="col" className="px-4 py-2 text-left font-medium">
                Balance
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Before
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                After
              </th>
            </tr>
          </thead>
          <tbody>
            {[
              [
                'Available',
                sub(b.available, deposit.amount).toFixed(2),
                b.available,
                'text-balance-available',
              ],
              [
                'Pending',
                add(b.pending, deposit.amount).toFixed(2),
                b.pending,
                'text-balance-pending',
              ],
              ['Total', b.total, b.total, 'text-text-primary'],
            ].map(([label, before, after, cls]) => (
              <tr key={label} className="border-t border-border-subtle">
                <th scope="row" className="px-4 py-3 text-left font-normal text-text-secondary">
                  {label}
                </th>
                <td className="px-4 py-3 text-right tabular-nums text-text-tertiary">
                  {formatUSDT(before!, { symbol: false })}
                </td>
                <td className={cn('px-4 py-3 text-right font-medium tabular-nums', cls)}>
                  {formatUSDT(after!, { symbol: false })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {round.data && round.data.status === 'open' && (
        <Card variant="gold" padding="m" className="gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-body-m-strong text-text-primary">
              <Ticket aria-hidden className="size-5 text-icon-gold" /> Global Pool round{' '}
              {round.data.numberLabel} is open
            </p>
            <AgeBadge />
          </div>
          <p className="text-body-s text-text-secondary">
            Closes {formatDateTimeUTC(round.data.closesAt)}. Entry{' '}
            {formatUSDT(round.data.entryPrice)} + platform fee{' '}
            {formatUSDT(round.data.platformFeePerEntry)} per entry (its own line) · network fee
            0.00. You can lose your stake — only enter with money you can afford to lose.
          </p>
          <Button asChild variant="gold" size="s" className="self-start">
            <Link href="/pool">View the round</Link>
          </Button>
        </Card>
      )}
      <FlowFooter
        primary={
          <NextButton onClick={onNext} disabled={!credited}>
            See receipt
          </NextButton>
        }
      />
    </>
  );
}

// ── step 7 · done (WAL-09) ─────────────────────────────────────────────────────────────────────

function DoneStep({ deposit, onNew }: { deposit: DepositView | undefined; onNew: () => void }) {
  if (!deposit) return <Skeleton className="h-64 w-full" />;
  if (deposit.status === 'rejected') return <FailedDeposit deposit={deposit} onNew={onNew} />;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusBadge status="confirmed" label="Credited" size="m" />
        {deposit.creditedAt && (
          <span className="text-caption text-text-tertiary">
            Credited {formatDateTimeUTC(deposit.creditedAt)}
          </span>
        )}
      </div>
      <FlowHeading title="Deposit successful">
        Your USDT is in your Available balance and ready to use.
      </FlowHeading>
      <div className="flex items-center gap-2">
        <Amount value={deposit.amount} tone="signed" className="text-number-l" />
        {deposit.isDemo && <DemoBadge size="s" />}
      </div>
      <Card variant="raised" padding="m" className="gap-1">
        <p className="flex items-center gap-2 text-body-m-strong">
          Receipt · RC-{deposit.reference.replace('DP-', '')}{' '}
          {deposit.isDemo && <DemoBadge size="xs" />}
        </p>
        <KeyValueList
          rows={[
            { label: 'Reference', value: deposit.reference },
            { label: 'Amount', value: formatUSDT(deposit.amount) },
            {
              label: 'Network',
              value: `${CHAINS[deposit.network].testnet.name} · ${CHAINS[deposit.network].usdtStandard}`,
            },
            {
              label: 'Confirmations',
              value: `${deposit.confirmations.current} / ${deposit.confirmations.required}`,
            },
            { label: 'GLOBAL POOL deposit fee', value: formatUSDT('0.00') },
            { label: 'Credited to', value: 'Available balance' },
            { label: 'Detected', value: formatDateTimeUTC(deposit.detectedAt) },
            ...(deposit.creditedAt
              ? [{ label: 'Credited', value: formatDateTimeUTC(deposit.creditedAt) }]
              : []),
          ]}
        />
        {deposit.txHash && (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-caption text-text-tertiary">Transaction hash</p>
            <TxHash hash={deposit.txHash} network={deposit.network} demo={deposit.isDemo} />
          </div>
        )}
      </Card>
      <FlowFooter
        secondary={
          <Button
            variant="secondary"
            size="l"
            leadingIcon={<ArrowDownToLine />}
            onClick={onNew}
            className="w-full tablet:w-auto"
          >
            Deposit again
          </Button>
        }
        primary={
          <Button asChild size="l" className="w-full tablet:w-auto">
            <Link href={WALLET_ROUTES.overview}>Back to wallet</Link>
          </Button>
        }
      />
    </>
  );
}

// ── side summary ───────────────────────────────────────────────────────────────────────────────

function DepositSide({
  step,
  network,
  deposit,
}: {
  step: StepKey;
  network: ChainKey;
  deposit: DepositView | undefined;
}) {
  const c = CHAINS[network];
  const rg = useRg();
  const dep = depositLimit(rg.data);
  const recent = useQuery({
    queryKey: walletKeys.deposits(),
    queryFn: ({ signal }) => walletApi.deposits(signal),
  });
  const pct =
    dep && !money(dep.limit).isZero()
      ? Math.min(100, money(dep.used).div(dep.limit).times(100).toNumber())
      : 0;
  return (
    <>
      <Card radius="xl" padding="l" className="gap-2">
        <SectionTitle
          demo
          action={
            deposit ? (
              <StatusBadge
                status={
                  deposit.status === 'credited'
                    ? 'confirmed'
                    : deposit.status === 'rejected'
                      ? 'failed'
                      : 'pending'
                }
                label={
                  deposit.status === 'credited'
                    ? 'Credited'
                    : deposit.status === 'rejected'
                      ? 'Failed'
                      : 'Pending'
                }
              />
            ) : undefined
          }
        >
          {deposit ? `Deposit ${deposit.reference}` : 'Deposit details'}
        </SectionTitle>
        <KeyValueList
          rows={[
            ...(deposit ? [{ label: 'Amount', value: formatUSDT(deposit.amount) }] : []),
            {
              label: 'Network',
              value: (
                <span className="inline-flex items-center gap-1.5">
                  <ChainMark chain={network} size={16} /> {c.testnet.name}
                </span>
              ),
            },
            { label: 'Token', value: `USDT · ${c.testnet.tokenLabel}` },
            {
              label: 'Confirmations to credit',
              value: deposit
                ? `${deposit.confirmations.current} / ${deposit.confirmations.required}`
                : String(c.confirmations),
            },
            { label: 'Minimum deposit', value: formatUSDT(c.minDeposit) },
            { label: 'Sender network fee', value: 'paid in your wallet' },
            { label: 'GLOBAL POOL deposit fee', value: formatUSDT('0.00') },
            { label: 'Credited to', value: 'Available balance' },
          ]}
        />
        {step === 'network' && (
          <p className="text-caption text-text-tertiary">Step {STEP_INDEX[step] + 1} of 7</p>
        )}
      </Card>
      <Card radius="xl" padding="l" className="gap-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-h5">
            <ShieldCheck aria-hidden className="size-5 text-icon-brand" /> Deposit limit
          </h2>
          <AgeBadge />
        </div>
        {dep ? (
          <>
            <p className="flex flex-wrap items-baseline gap-1.5 text-body-s text-text-secondary">
              <span className="text-number-s text-text-primary">
                {formatUSDT(dep.used, { symbol: false })}
              </span>{' '}
              of {formatUSDT(dep.limit)} used this {dep.period} <DemoBadge size="xs" />
            </p>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-surface-pressed"
              role="meter"
              aria-label="Deposit limit used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
            {dep.pendingIncrease && (
              <p className="text-caption text-text-tertiary">
                Increase to {formatUSDT(dep.pendingIncrease.amount)} applies after the 24 h
                cool-down ({formatDateTimeUTC(dep.pendingIncrease.effectiveAt)}).
              </p>
            )}
          </>
        ) : (
          <p className="text-body-s text-text-secondary">
            No deposit limit set. Limits are optional and enforced on our side.
          </p>
        )}
        <Button
          asChild
          variant="ghost"
          size="s"
          trailingIcon={<ArrowRight />}
          className="self-start"
        >
          <Link href="/responsible-gaming">Manage limits</Link>
        </Button>
      </Card>
      <Card radius="xl" padding="l" className="gap-3">
        <SectionTitle
          demo
          action={
            <Button asChild variant="ghost" size="s">
              <Link href={`${WALLET_ROUTES.history}?type=deposit`}>View all</Link>
            </Button>
          }
        >
          Recent deposits
        </SectionTitle>
        {recent.data ? (
          recent.data.items.length === 0 ? (
            <p className="text-body-s text-text-secondary">No deposits yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recent.data.items.slice(0, 3).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 text-body-s">
                  <span className="min-w-0">
                    <span className="block truncate text-text-primary">
                      {d.reference} · {chainName(d.network)}
                    </span>
                    <span className="text-caption text-text-tertiary">
                      {formatDateTimeUTC(d.detectedAt)} · {d.confirmations.current} /{' '}
                      {d.confirmations.required}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <Amount value={d.amount} tone="signed" className="text-body-s-strong" />
                    <StatusBadge
                      status={
                        d.status === 'credited'
                          ? 'confirmed'
                          : d.status === 'rejected'
                            ? 'failed'
                            : 'processing'
                      }
                      label={
                        d.status === 'credited'
                          ? 'Credited'
                          : d.status === 'rejected'
                            ? 'Failed'
                            : 'Confirming'
                      }
                    />
                  </span>
                </li>
              ))}
            </ul>
          )
        ) : (
          <Skeleton className="h-16 w-full" />
        )}
      </Card>
      <Card radius="xl" padding="l" className="gap-2">
        <h2 className="text-h5">Deposit not showing up?</h2>
        <p className="text-body-s text-text-secondary">
          Exchanges can hold withdrawals for a few minutes before broadcasting. Once your
          transaction is on-chain we detect it automatically — no need to contact us before 60
          minutes.
        </p>
        <Button asChild variant="ghost" size="s" leadingIcon={<LifeBuoy />} className="self-start">
          <Link href="/support">Contact support</Link>
        </Button>
      </Card>
    </>
  );
}
