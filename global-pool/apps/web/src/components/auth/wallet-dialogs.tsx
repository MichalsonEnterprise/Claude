'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  Check,
  CircleCheck,
  CircleX,
  Clock,
  ExternalLink,
  FileText,
  Globe,
  KeyRound,
  LogOut,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import QRCode from 'qrcode';
import * as React from 'react';

import { ROUTES } from '@/components/shell/nav-config';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DemoBadge } from '@/components/ui/demo-badge';
import { authApi } from '@/lib/api/auth';
import { useAuthCore } from '@/lib/auth/context';
import {
  AuthFlowError,
  type WalletConnection,
  type WalletProviderId,
  type WalletSignatureRequest,
} from '@/lib/auth/types';
import { shortAddress } from '@/lib/auth/wallet-message';
import { cn } from '@/lib/utils';

import { AuthModal, Callout, IconTile, KeyValue, KeyValueBox, Note, NumStep, Pane, PaneHeader, Point } from './auth-ui';
import { formatCountdown, formatUtcDateTime, formatUtcTime, useNow } from './format';
import { WALLET_PROVIDERS, WalletMark, WalletProviderList } from './wallet-providers';

/** Networks a wallet may be on for deposits / withdrawals (MVP: Arbitrum Sepolia; mainnet Arbitrum listed). */
export const SUPPORTED_CHAIN_IDS = [421614, 42161];
const CHAIN_NAME: Record<number, string> = { 421614: 'Arbitrum Sepolia', 42161: 'Arbitrum One' };
const QR_TTL_MS = 5 * 60_000;

export type ConnectState =
  | { step: 'list' }
  | { step: 'qr'; provider: WalletProviderId; expiresAt: number }
  | { step: 'connecting'; provider: WalletProviderId }
  | { step: 'rejected'; provider: WalletProviderId; message: string }
  | { step: 'wrong-network'; conn: WalletConnection }
  | { step: 'success'; conn: WalletConnection };

export type VerifyState =
  | { step: 'request'; conn: WalletConnection; request: WalletSignatureRequest | null; signing: boolean }
  | { step: 'success'; conn: WalletConnection; request: WalletSignatureRequest; signature: string; at: string }
  | { step: 'rejected'; conn: WalletConnection }
  | { step: 'expired'; conn: WalletConnection; request: WalletSignatureRequest };

interface WalletFlowValue {
  /** AUTH-09: open the connect-wallet modal (then AUTH-10 verification). */
  openConnect: () => void;
  /** AUTH-10: verify ownership of an already connected wallet. */
  openVerify: (conn: WalletConnection) => void;
}

const WalletFlowContext = React.createContext<WalletFlowValue | null>(null);

/** `const { openConnect } = useWalletConnect()` — connect + verify a self-custody wallet (members only). */
export function useWalletConnect(): WalletFlowValue {
  const ctx = React.useContext(WalletFlowContext);
  if (!ctx) throw new Error('useWalletConnect must be used inside <AuthProvider>');
  return ctx;
}

export function WalletFlowProvider({ children }: { children: React.ReactNode }) {
  const [connect, setConnect] = React.useState<ConnectState | null>(null);
  const [verify, setVerify] = React.useState<VerifyState | null>(null);
  const value = React.useMemo<WalletFlowValue>(
    () => ({
      openConnect: () => {
        setVerify(null);
        setConnect({ step: 'list' });
      },
      openVerify: (conn) => {
        setConnect(null);
        setVerify({ step: 'request', conn, request: null, signing: false });
      },
    }),
    [],
  );
  return (
    <WalletFlowContext.Provider value={value}>
      {children}
      <ConnectWalletDialog
        state={connect}
        onStateChange={setConnect}
        onVerify={(conn) => {
          setConnect(null);
          setVerify({ step: 'request', conn, request: null, signing: false });
        }}
      />
      <VerifyWalletDialog state={verify} onStateChange={setVerify} />
    </WalletFlowContext.Provider>
  );
}

// ── shared bits ───────────────────────────────────────────────────────────────────────────────

function providerName(id: WalletProviderId) {
  return WALLET_PROVIDERS.find((p) => p.id === id)?.name ?? 'Wallet';
}

function SeedNotice() {
  return (
    <Callout tone="success" icon={ShieldCheck} title="We never ask for your seed phrase">
      Connecting a wallet never moves funds.
    </Callout>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-status-success-tint px-2.5 py-1 text-label-s text-text-success">
      <Check aria-hidden className="size-3.5" /> {children}
    </span>
  );
}

function WalletRow({ conn, badge, demo }: { conn: WalletConnection; badge?: React.ReactNode; demo: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised py-3 pr-4 pl-3">
      <WalletMark id={conn.provider} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-label-m text-text-primary">{providerName(conn.provider)}</span>
        <span className="flex items-center gap-1.5 font-mono text-mono-s text-text-secondary">
          {shortAddress(conn.address)} {demo && <DemoBadge size="xs" />}
        </span>
      </div>
      {badge ?? (
        <span className="text-caption text-text-tertiary">{CHAIN_NAME[conn.chainId] ?? `Chain ID ${conn.chainId}`}</span>
      )}
    </div>
  );
}

function ActionsRow({ left, right }: { left?: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-border-subtle pt-5 tablet:flex-row tablet:items-center">
      <div className="flex flex-col tablet:mr-auto">{left}</div>
      <div className="flex flex-col-reverse gap-3 tablet:flex-row">{right}</div>
    </div>
  );
}

export function DemoQr({ value, size = 168 }: { value: string; size?: number }) {
  const [svg, setSvg] = React.useState<string | null>(null);
  React.useEffect(() => {
    let alive = true;
    void QRCode.toString(value, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0f1111', light: '#ffffff' } }).then((s) => {
      if (alive) setSvg(s);
    });
    return () => {
      alive = false;
    };
  }, [value]);
  return (
    <div
      className="shrink-0 rounded-lg bg-white p-3"
      style={{ width: size + 24, height: size + 24 }}
      role="img"
      aria-label="QR code"
      // qrcode renders a static SVG string (no user input reaches the markup besides the encoded value).
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}

// ── AUTH-09 connect ───────────────────────────────────────────────────────────────────────────

export function ConnectWalletDialog({
  state,
  onStateChange,
  onVerify,
}: {
  state: ConnectState | null;
  onStateChange: (s: ConnectState | null) => void;
  onVerify: (conn: WalletConnection) => void;
}) {
  const core = useAuthCore();
  const now = useNow(1000);
  const close = () => onStateChange(null);
  const demo = core.mode === 'mock';

  const run = async (provider: WalletProviderId) => {
    onStateChange({ step: 'connecting', provider });
    try {
      const res = await core.wallet.connect(provider);
      if ('external' in res) {
        onStateChange(null);
        return;
      }
      if (!SUPPORTED_CHAIN_IDS.includes(res.chainId)) onStateChange({ step: 'wrong-network', conn: res });
      else onStateChange({ step: 'success', conn: res });
    } catch (err) {
      onStateChange({
        step: 'rejected',
        provider,
        message: err instanceof AuthFlowError ? err.message : 'The connection was cancelled.',
      });
    }
  };

  const choose = (provider: WalletProviderId) => {
    if (demo && (provider === 'walletconnect' || provider === 'ledger' || provider === 'trust')) {
      onStateChange({ step: 'qr', provider, expiresAt: Date.now() + QR_TTL_MS });
      return;
    }
    void run(provider);
  };

  const s = state ?? { step: 'list' as const };
  return (
    <AuthModal open={state !== null} onOpenChange={(o) => !o && close()} title="Connect a wallet" size="m">
      <Pane onClose={close} top={s.step !== 'list' && s.step !== 'success' ? (
        <button type="button" onClick={() => onStateChange({ step: 'list' })} className="inline-flex min-h-11 items-center gap-2 text-label-m text-text-secondary hover:text-text-primary">
          ← All wallets
        </button>
      ) : undefined}>
        {s.step === 'list' && (
          <>
            <PaneHeader icon={Wallet} title="Connect a wallet">
              Use a self-custody wallet to deposit, withdraw and verify ownership. Entries are always paid from your
              platform balance.
            </PaneHeader>
            <p className="text-overline font-semibold tracking-[0.08em] text-text-tertiary uppercase">Choose a wallet</p>
            <WalletProviderList onChoose={choose} mockAlwaysAvailable={demo} />
            <SeedNotice />
            <p className="text-caption text-text-tertiary">
              By connecting you confirm you are 18+ and located in a permitted jurisdiction. Terms and Privacy Policy
              apply.
            </p>
          </>
        )}
        {s.step === 'qr' && (
          <>
            <PaneHeader title={`Scan with ${providerName(s.provider)}`}>
              Open your wallet app, tap “Scan” and point the camera at this code. On this phone? Use “Open wallet
              app” instead.
            </PaneHeader>
            <div className="flex flex-col items-center gap-5 tablet:flex-row tablet:items-start">
              <DemoQr value={`wc:globalpool-demo@2?relay-protocol=irn&symKey=${s.expiresAt.toString(16)}`} />
              <ol className="flex flex-col gap-3.5">
                <NumStep n={1} state="now" title="Scan the code">It only shares your public address</NumStep>
                <NumStep n={2} state="next" title="Approve in your wallet">No funds move, no gas</NumStep>
                <NumStep n={3} state="next" title="Verify ownership">A free signed message</NumStep>
              </ol>
            </div>
            <p className="flex items-center gap-2 text-caption text-text-secondary">
              <Clock aria-hidden className="size-4 text-icon-muted" />
              {s.expiresAt > now ? `Connection link expires in ${formatCountdown(s.expiresAt - now)}` : 'This code expired — go back and choose the wallet again.'}
              {demo && <DemoBadge size="xs" />}
            </p>
            <SeedNotice />
            {demo && (
              <Button variant="secondary" size="l" onClick={() => void run(s.provider)} disabled={s.expiresAt <= now}>
                DEV MOCK: simulate the wallet scanning this code
              </Button>
            )}
          </>
        )}
        {s.step === 'connecting' && (
          <>
            <PaneHeader icon={RefreshCw} title={`Approve in ${providerName(s.provider)}`}>
              Your wallet is asking you to connect to GLOBAL POOL. It can see your address and ask you to sign
              messages — it can never move funds without your approval.
            </PaneHeader>
            <div role="status" className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised px-4 py-3.5">
              <WalletMark id={s.provider} />
              <div className="flex flex-1 flex-col gap-0.5">
                <p className="text-body-s-strong text-text-primary">Waiting for you to tap Connect…</p>
                <p className="text-caption text-text-tertiary">Check the wallet extension or app.</p>
              </div>
              <RefreshCw aria-hidden className="size-5 animate-spin text-icon-brand" />
            </div>
            <SeedNotice />
            <ActionsRow right={<Button variant="ghost" size="l" onClick={() => onStateChange({ step: 'list' })}>Cancel</Button>} />
          </>
        )}
        {s.step === 'rejected' && (
          <>
            <PaneHeader icon={CircleX} tone="danger" title="Connection declined">
              {s.message} Nothing was shared and no fees were charged.
            </PaneHeader>
            <Callout tone="info" title="Want to try again?">
              Make sure the wallet is unlocked and on Arbitrum, then choose it again.
            </Callout>
            <ActionsRow
              left={<Button variant="ghost" size="l" onClick={() => onStateChange({ step: 'list' })}>Choose another wallet</Button>}
              right={<Button size="l" leadingIcon={<RefreshCw />} onClick={() => void run(s.provider)}>Try again</Button>}
            />
          </>
        )}
        {s.step === 'wrong-network' && (
          <>
            <PaneHeader icon={TriangleAlert} tone="warning" title="Switch network">
              Your wallet is on chain ID {s.conn.chainId}. Deposits and withdrawals only work on Arbitrum. Switching is
              free and no funds move — your wallet will ask you to approve it.
            </PaneHeader>
            <WalletRow conn={s.conn} demo={demo} badge={<StatusBadge status="restricted" label={`Unsupported · chain ID ${s.conn.chainId}`} size="s" />} />
            <Note icon={Globe}>Supported now: Arbitrum (Sepolia testnet in this DEMO). BNB Chain, Polygon, Ethereum and Solana are coming soon.</Note>
            <ActionsRow
              left={<Button variant="ghost" size="l" leadingIcon={<LogOut />} onClick={close}>Disconnect</Button>}
              right={
                <Button
                  size="l"
                  leadingIcon={<ArrowLeftRight />}
                  onClick={async () => {
                    try {
                      const conn = await core.wallet.switchToArbitrum(s.conn);
                      onStateChange({ step: 'success', conn });
                    } catch (err) {
                      onStateChange({ step: 'rejected', provider: s.conn.provider, message: err instanceof Error ? err.message : 'Switch declined.' });
                    }
                  }}
                >
                  Switch to Arbitrum
                </Button>
              }
            />
          </>
        )}
        {s.step === 'success' && (
          <>
            <PaneHeader icon={CircleCheck} tone="success" title="Wallet connected">
              {providerName(s.conn.provider)} {shortAddress(s.conn.address)} on {CHAIN_NAME[s.conn.chainId] ?? 'Arbitrum'}.
              Verify ownership before your first withdrawal.
            </PaneHeader>
            <WalletRow conn={s.conn} demo={demo} badge={<StatusBadge status="pending" label="Ownership pending" size="s" />} />
            <Point icon={KeyRound} title="Verify ownership — free">
              You sign a short message. It’s not a transaction, costs no gas and can’t move funds.
            </Point>
            <ActionsRow
              left={<Button variant="ghost" size="l" onClick={close}>Later</Button>}
              right={<Button size="l" leadingIcon={<ShieldCheck />} onClick={() => onVerify(s.conn)}>Verify ownership</Button>}
            />
          </>
        )}
      </Pane>
    </AuthModal>
  );
}

// ── AUTH-10 verify ownership ──────────────────────────────────────────────────────────────────

function MessageBox({ request, expired = false, demo }: { request: WalletSignatureRequest; expired?: boolean; demo: boolean }) {
  return (
    <div className={cn('flex flex-col gap-2.5 rounded-md border bg-bg-secondary px-4 pt-3.5 pb-4', expired ? 'border-border-subtle' : 'border-border-default')}>
      <div className="flex flex-wrap items-center gap-2">
        <FileText aria-hidden className="size-4 text-icon-muted" />
        <span className="flex-1 text-label-s text-text-secondary">{expired ? 'Expired message' : 'Message you’ll sign'}</span>
        {expired ? (
          <StatusBadge status="expired" label={`Expired ${formatUtcTime(request.expiresAt)}`} size="s" />
        ) : (
          <span className="text-caption text-text-tertiary">Issued by GLOBAL POOL</span>
        )}
        {demo && <DemoBadge size="xs" />}
      </div>
      <pre className={cn('font-mono text-mono-s whitespace-pre-wrap break-all', expired ? 'text-text-tertiary' : 'text-text-primary')}>
        {request.message}
      </pre>
    </div>
  );
}

/** Neutral mock of a wallet extension prompt (DEMO / DEV MOCK only — not GLOBAL POOL UI). */
function DemoWalletPopup({
  conn,
  request,
  onSign,
  onReject,
  busy,
}: {
  conn: WalletConnection;
  request: WalletSignatureRequest;
  onSign: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  return (
    <section
      aria-label="DEMO wallet signature request"
      className="flex flex-col gap-3.5 rounded-lg border border-border-strong bg-surface-raised p-4 shadow-elevation-3"
    >
      <div className="flex items-center gap-2.5">
        <WalletMark id={conn.provider} />
        <div className="flex flex-1 flex-col">
          <span className="text-label-m text-text-primary">{providerName(conn.provider)}</span>
          <span className="font-mono text-mono-s text-text-tertiary">Account 1 · {shortAddress(conn.address)}</span>
        </div>
        <DemoBadge size="xs" label="Mock wallet" />
      </div>
      <p className="text-h5 text-text-primary">Signature request</p>
      <pre className="max-h-32 overflow-y-auto rounded-md border border-border-subtle bg-bg-secondary p-3 font-mono text-mono-s whitespace-pre-wrap break-all text-text-primary">
        {request.message}
      </pre>
      <Note icon={ShieldCheck} tone="info">Signing is free. This is not a transaction and can’t move funds.</Note>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onReject} disabled={busy}>
          Reject
        </Button>
        <Button onClick={onSign} loading={busy}>
          Sign
        </Button>
      </div>
    </section>
  );
}

export function VerifyWalletDialog({
  state,
  onStateChange,
}: {
  state: VerifyState | null;
  onStateChange: (s: VerifyState | null) => void;
}) {
  const core = useAuthCore();
  const qc = useQueryClient();
  const now = useNow(1000);
  const demo = core.mode === 'mock';
  const close = () => onStateChange(null);
  const [error, setError] = React.useState<string | null>(null);
  const requested = React.useRef<string | null>(null);

  // Fetch a fresh message (nonce) whenever a request step starts without one.
  React.useEffect(() => {
    if (state?.step !== 'request' || state.request) return;
    const key = `${state.conn.address}:${Date.now()}`;
    requested.current = key;
    void core.wallet
      .prepareSignature(state.conn)
      .then((request) => {
        if (requested.current === key) onStateChange({ ...state, request });
        // Privy: ask the real wallet straight away.
        if (core.mode === 'privy' && requested.current === key) void sign(state.conn, request);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Couldn’t prepare the message.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.step, state?.step === 'request' ? state.request : null]);

  const sign = async (conn: WalletConnection, request: WalletSignatureRequest) => {
    if (Date.now() > Date.parse(request.expiresAt)) {
      onStateChange({ step: 'expired', conn, request });
      return;
    }
    onStateChange({ step: 'request', conn, request, signing: true });
    setError(null);
    try {
      const signature = await core.wallet.sign(conn, request);
      if (Date.now() > Date.parse(request.expiresAt)) {
        onStateChange({ step: 'expired', conn, request });
        return;
      }
      await core.wallet.link(conn, request, signature);
      await authApi.session(); // sync the linked wallet into the API (user_wallets)
      await qc.invalidateQueries({
        predicate: (q) => ['auth', 'me', 'wallet', 'wallets', 'users'].includes(String(q.queryKey[0])),
      });
      onStateChange({ step: 'success', conn, request, signature, at: new Date().toISOString() });
    } catch (err) {
      if (err instanceof AuthFlowError && err.kind === 'rejected') onStateChange({ step: 'rejected', conn });
      else {
        setError(err instanceof Error ? err.message : 'Verification failed.');
        onStateChange({ step: 'request', conn, request, signing: false });
      }
    }
  };

  const s = state;
  const titles = {
    request: 'Sign a message in your wallet',
    success: 'This wallet is now verified',
    rejected: 'You declined the signature',
    expired: 'This sign-in request has expired',
  } as const;

  return (
    <AuthModal open={s !== null} onOpenChange={(o) => !o && close()} title={s ? titles[s.step] : 'Verify wallet'} size="m">
      {s && (
        <Pane onClose={close} top={<span className="sr-only">Verify wallet ownership</span>}>
          {s.step === 'request' && (
            <>
              <PaneHeader icon={KeyRound} overline="Verify ownership · Step 2 of 2" title={titles.request}>
                This proves you control {shortAddress(s.conn.address)}. It’s free — signing a message is not a
                transaction and can’t move funds.
              </PaneHeader>
              <WalletRow conn={s.conn} demo={demo} />
              {s.request ? <MessageBox request={s.request} demo={demo} /> : <div className="h-36 animate-pulse rounded-md bg-surface-default" aria-busy />}
              <div className="flex flex-wrap gap-2">
                <Chip>No transaction</Chip>
                <Chip>No gas · 0.00</Chip>
                <Chip>Can’t move funds</Chip>
              </div>
              {s.request && (
                <div role="status" className="flex items-center gap-3 rounded-md border border-border-subtle bg-surface-raised px-4 py-3">
                  <RefreshCw aria-hidden className={cn('size-5 text-icon-brand', s.signing && 'animate-spin')} />
                  <div className="flex flex-1 flex-col gap-0.5">
                    <p className="text-body-s-strong text-text-primary">
                      Waiting for your signature in {providerName(s.conn.provider)}…
                    </p>
                    <p className="text-caption text-text-tertiary">
                      Expires at {formatUtcTime(s.request.expiresAt)} · {formatCountdown(Date.parse(s.request.expiresAt) - now)} left
                    </p>
                  </div>
                </div>
              )}
              {error && (
                <Callout tone="danger" title="Verification failed">
                  {error}
                </Callout>
              )}
              {demo && s.request && (
                <DemoWalletPopup
                  conn={s.conn}
                  request={s.request}
                  busy={s.signing}
                  onSign={() => void sign(s.conn, s.request!)}
                  onReject={() => onStateChange({ step: 'rejected', conn: s.conn })}
                />
              )}
              <Note icon={ShieldCheck} tone="brand">
                Only sign if the message starts with “GLOBAL POOL wants you to sign in” and comes from this site.
                Never sign anything that asks to approve tokens or send funds.
              </Note>
              <ActionsRow
                left={<Button variant="ghost" size="l" onClick={close}>Cancel</Button>}
                right={
                  !demo && s.request ? (
                    <Button variant="secondary" size="l" leadingIcon={<ExternalLink />} onClick={() => void sign(s.conn, s.request!)} disabled={s.signing}>
                      Open wallet again
                    </Button>
                  ) : null
                }
              />
            </>
          )}
          {s.step === 'success' && (
            <>
              <PaneHeader icon={CircleCheck} tone="success" overline="Wallet verified" title={titles.success}>
                Your signature matched {shortAddress(s.conn.address)}. You can deposit from it now and add it as a
                withdrawal address.
              </PaneHeader>
              <WalletRow conn={s.conn} demo={demo} badge={<StatusBadge status="approved" label="Verified" size="s" />} />
              <KeyValueBox>
                <KeyValue label="Verified" value={formatUtcDateTime(s.at)} demo={demo} />
                <KeyValue label="Signature" value={`${s.signature.slice(0, 6)}…${s.signature.slice(-4)}`} mono demo={demo} />
                <KeyValue label="Nonce" value={`${s.request.nonce.slice(0, 6)}… · used, can’t be reused`} mono />
                <KeyValue label="Transaction" value="None — gas spent 0.00" last />
              </KeyValueBox>
              <Point icon={ArrowDownToLine} title="Deposit USDT from this wallet" tile>
                Send test USDT on Arbitrum Sepolia. Minimum deposit 10.00 USDT.
              </Point>
              <Point icon={ShieldCheck} title="Use it for withdrawals" tile>
                Add it to your whitelist — new withdrawal addresses have a 24-hour cooldown.
              </Point>
              <ActionsRow
                left={<Button variant="ghost" size="l" onClick={close}>Done</Button>}
                right={
                  <>
                    <Button asChild variant="secondary" size="l" onClick={close}>
                      <Link href={ROUTES.wallet}>Add to whitelist</Link>
                    </Button>
                    <Button asChild size="l" leadingIcon={<ArrowDownToLine />} onClick={close}>
                      <Link href={ROUTES.deposit}>Deposit USDT</Link>
                    </Button>
                  </>
                }
              />
            </>
          )}
          {s.step === 'rejected' && (
            <>
              <PaneHeader icon={CircleX} tone="danger" overline="Signature declined" title={titles.rejected}>
                Nothing happened: no transaction was sent and no fees were charged. The wallet stays connected but
                unverified.
              </PaneHeader>
              <WalletRow conn={s.conn} demo={demo} badge={<StatusBadge status="pending" label="Unverified" size="s" />} />
              <Callout tone="info" title="Why we ask for a signature">
                It’s the only way to prove the wallet is yours without moving any funds. Unverified wallets can’t be
                used for withdrawals.
              </Callout>
              <div className="flex flex-col gap-3.5">
                <p className="text-label-m text-text-primary">What you can do</p>
                <Point icon={RefreshCw} title="Try again">
                  We’ll send a fresh message with a new nonce — check it starts with “GLOBAL POOL wants you to sign in”.
                </Point>
                <Point icon={Wallet} title="Use a different wallet">Disconnect this one and connect another.</Point>
                <Point icon={Clock} title="Verify later">
                  You can deposit and play from your balance. Verify any time in Wallet → Connected wallets.
                </Point>
              </div>
              <ActionsRow
                left={<Button variant="ghost" size="l" onClick={close}>Later</Button>}
                right={
                  <Button size="l" leadingIcon={<RefreshCw />} onClick={() => onStateChange({ step: 'request', conn: s.conn, request: null, signing: false })}>
                    Try again
                  </Button>
                }
              />
            </>
          )}
          {s.step === 'expired' && (
            <>
              <PaneHeader icon={Clock} tone="warning" overline="Request expired" title={titles.expired}>
                Each message works once and expires 10 minutes after it’s issued. This one was issued at{' '}
                {formatUtcTime(s.request.issuedAt)} and expired at {formatUtcTime(s.request.expiresAt)}.
              </PaneHeader>
              <WalletRow conn={s.conn} demo={demo} badge={<StatusBadge status="pending" label="Unverified" size="s" />} />
              <MessageBox request={s.request} expired demo={demo} />
              <Callout tone="warning" title="Still see the old request in your wallet?">
                Reject it there. Signing an expired message does nothing — we only accept the newest nonce, once.
              </Callout>
              <ActionsRow
                left={<Button variant="ghost" size="l" onClick={close}>Cancel</Button>}
                right={
                  <Button size="l" leadingIcon={<RefreshCw />} onClick={() => onStateChange({ step: 'request', conn: s.conn, request: null, signing: false })}>
                    Get a new message
                  </Button>
                }
              />
            </>
          )}
        </Pane>
      )}
    </AuthModal>
  );
}

export { IconTile };
