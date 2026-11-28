/**
 * Wallet module API wrappers (WAL-01…24): balances, status/limits, transactions, deposits, withdrawals, whitelist.
 * All calls go through the shared `apiRequest()` client. Money is a decimal string end to end (never a float).
 * Financial writes carry an `idempotencyKey` created once per user intent (`newIdempotencyKey()`).
 */
import type { ChainKey } from '@gp/shared/chains';
import type { TxStatus, TxType, WithdrawalStatus } from '@gp/shared/enums';
import type { WalletStatus, WithdrawalPrecheck } from '@gp/shared/types';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { useAuth } from '@/lib/auth';

import { apiRequest } from './client';

export type { WalletStatus, WithdrawalPrecheck };

// ── view types (shapes of the API responses) ───────────────────────────────────────────────────

export interface BalanceItem {
  label: string;
  amount: string;
  reference: string;
}

export interface WalletBalances {
  currency: 'USDT';
  available: string;
  locked: string;
  pending: string;
  owed: string;
  total: string;
  breakdown: {
    lockedWithdrawals: string;
    lockedEntries: string;
    locked: BalanceItem[];
    pending: BalanceItem[];
    owed: BalanceItem[];
  };
}

export interface LifetimeTotals {
  deposits: string;
  withdrawals: string;
  entries: number;
  platformFeesPaid: string;
  rewards: string;
}

export interface TxView {
  /** Public reference (DP-…, WD-…, EP-…). */
  id: string;
  uuid: string;
  type: TxType;
  status: TxStatus;
  withdrawalStatus?: WithdrawalStatus;
  direction: 'in' | 'out';
  network: ChainKey | null;
  amount: string;
  networkFee: string | null;
  platformFee: string;
  netAmount: string;
  addressDisplay: string | null;
  txHash: string | null;
  txHashDisplay: string | null;
  confirmations: { current: number; required: number } | null;
  description: string;
  statusDetail: string | null;
  roundId: string | null;
  createdAt: string;
  completedAt: string | null;
  isDemo: boolean;
}

export interface TxTimelineStep {
  label: string;
  status: string;
  at: string;
}

export interface TxDetail extends TxView {
  timeline: TxTimelineStep[];
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface TxQuery {
  page?: number;
  pageSize?: number;
  type?: TxType;
  status?: TxStatus;
  network?: ChainKey;
  from?: string;
  to?: string;
}

export interface DepositAddressView {
  network: ChainKey;
  networkName: string;
  chainId: number | null;
  token: string;
  tokenStandard: string;
  address: string;
  minDeposit: string;
  confirmations: number;
  derivationIndex: number;
  testnet: boolean;
  warning: string;
}

export type DepositStatus = 'detected' | 'confirming' | 'credited' | 'rejected';

export interface DepositView {
  id: string;
  reference: string;
  network: ChainKey;
  status: DepositStatus;
  amount: string;
  txHash: string | null;
  toAddress: string;
  confirmations: { current: number; required: number };
  detectedAt: string;
  creditedAt: string | null;
  isDemo: boolean;
  requiredConfirmations?: number;
  simulated?: boolean;
  replayed?: boolean;
}

export interface WithdrawalTimelineStep {
  status: WithdrawalStatus;
  label: string;
  at: string;
}

export interface WithdrawalView {
  id: string;
  reference: string;
  network: ChainKey;
  toAddress: string;
  amount: string;
  networkFee: string;
  platformFee: string;
  youReceive: string;
  status: WithdrawalStatus;
  statusLabel: string;
  flagged: boolean;
  requiresFourEyes: boolean;
  riskLevel: string | null;
  txHash: string | null;
  rejectionReason: string | null;
  failureReason: string | null;
  timeline: WithdrawalTimelineStep[];
  createdAt: string;
  updatedAt: string;
  isDemo: boolean;
  replayed?: boolean;
}

export interface WithdrawalDetail extends WithdrawalView {
  screening: {
    riskLevel: string;
    decision: string | null;
    reason: string | null;
    alertStatus: string;
    checks: { name: string; passed: boolean; detail?: string }[];
  } | null;
}

export interface WithdrawalQuoteView {
  network: ChainKey;
  amount: string;
  networkFee: string;
  platformFee: string;
  youReceive: string;
  minWithdrawal: string;
  meetsMinimum: boolean;
  currency: 'USDT';
}

export interface LinkedWallet {
  id: string;
  network: ChainKey;
  address: string;
  source: string;
  walletClient: string | null;
  label: string | null;
  isPrimary: boolean;
  verified: boolean;
  whitelisted: boolean;
  whitelistedAt: string | null;
  usableForWithdrawalsFrom: string | null;
  inCooldown: boolean;
  isDemo: boolean;
}

export interface MeView {
  publicId: string;
  displayHandle: string;
  displayName: string;
  emailMasked: string;
  kyc: { level: string; status: string; label: string };
  security: { twoFactorEnabled: boolean; antiPhishingCode: string | null };
  isDemo: boolean;
}

export interface RgLimitView {
  /** 'deposit' | 'participation' | 'loss' | … */
  type: string;
  period: string;
  limit: string;
  used: string;
  remaining: string;
  pendingIncrease: { amount: string; effectiveAt: string } | null;
}

export interface CurrentRoundView {
  id: string;
  number: number;
  numberLabel: string;
  status: string;
  statusLabel: string;
  closesAt: string;
  entryPrice: string;
  platformFeePerEntry: string;
  poolBalance: string | null;
  isDemo?: boolean;
}

export interface RgView {
  limits: RgLimitView[];
  selfExclusion: { active: boolean; endsAt: string | null };
}

// ── fetchers ───────────────────────────────────────────────────────────────────────────────────

export const walletApi = {
  balances: (signal?: AbortSignal) => apiRequest<WalletBalances>('/wallet/balances', { signal }),
  lifetime: (signal?: AbortSignal) => apiRequest<LifetimeTotals>('/wallet/lifetime', { signal }),
  status: (signal?: AbortSignal) => apiRequest<WalletStatus>('/wallet/status', { signal }),
  claimOwed: (idempotencyKey: string) =>
    apiRequest<{ claimed: string; replayed: boolean }>('/wallet/owed/claim', {
      method: 'POST',
      body: { idempotencyKey },
    }),
  transactions: (query: TxQuery, signal?: AbortSignal) =>
    apiRequest<Page<TxView>>('/transactions', { query: { ...query }, signal }),
  transaction: (reference: string, signal?: AbortSignal) =>
    apiRequest<TxDetail>(`/transactions/${encodeURIComponent(reference)}`, { signal }),
  depositAddress: (network: ChainKey, signal?: AbortSignal) =>
    apiRequest<DepositAddressView>('/deposits/address', { query: { network }, signal }),
  deposits: (signal?: AbortSignal) =>
    apiRequest<Page<DepositView>>('/deposits', { query: { pageSize: 10 }, signal }),
  deposit: (reference: string, signal?: AbortSignal) =>
    apiRequest<DepositView>(`/deposits/ref/${encodeURIComponent(reference)}`, { signal }),
  /** DEMO only (dev endpoint): simulate a test-USDT transfer to your deposit address. */
  simulateDeposit: (body: {
    network: ChainKey;
    amount: string;
    idempotencyKey: string;
    mode: 'instant' | 'progressive';
  }) => apiRequest<DepositView>('/dev/deposits/simulate', { method: 'POST', body }),
  /** DEMO only: add simulated block confirmations to a progressive DEMO deposit. */
  advanceDeposit: (reference: string, confirmations: number) =>
    apiRequest<DepositView>(`/dev/deposits/${encodeURIComponent(reference)}/confirmations`, {
      method: 'POST',
      body: { confirmations },
    }),
  withdrawalQuote: (amount: string, network: ChainKey, signal?: AbortSignal) =>
    apiRequest<WithdrawalQuoteView>('/withdrawals/quote', { query: { amount, network }, signal }),
  precheck: (q: { network: ChainKey; address: string; amount: string }, signal?: AbortSignal) =>
    apiRequest<WithdrawalPrecheck>('/withdrawals/precheck', { query: q, signal }),
  requestWithdrawal: (
    body: {
      network: ChainKey;
      address: string;
      amount: string;
      idempotencyKey: string;
      totpCode?: string;
    },
    stepUpToken?: string,
  ) => apiRequest<WithdrawalView>('/withdrawals', { method: 'POST', body, stepUpToken }),
  withdrawals: (signal?: AbortSignal) =>
    apiRequest<Page<WithdrawalView>>('/withdrawals', { query: { pageSize: 20 }, signal }),
  withdrawal: (reference: string, signal?: AbortSignal) =>
    apiRequest<WithdrawalDetail>(`/withdrawals/ref/${encodeURIComponent(reference)}`, { signal }),
  cancelWithdrawal: (id: string) =>
    apiRequest<WithdrawalView>(`/withdrawals/${id}/cancel`, { method: 'POST' }),
  /** DEMO only: simulate broadcast + confirmation of a QUEUED withdrawal. */
  simulateWithdrawalConfirm: (id: string) =>
    apiRequest<WithdrawalView>(`/dev/withdrawals/${id}/simulate-confirm`, { method: 'POST' }),
  wallets: (signal?: AbortSignal) => apiRequest<LinkedWallet[]>('/me/wallets', { signal }),
  addWhitelist: (
    body: { network: ChainKey; address: string; label?: string; totpCode?: string },
    stepUpToken?: string,
  ) => apiRequest<LinkedWallet>('/me/wallets/whitelist', { method: 'POST', body, stepUpToken }),
  removeWhitelist: (id: string, body: { totpCode?: string }, stepUpToken?: string) =>
    apiRequest<{ removed: boolean }>(`/me/wallets/${id}/whitelist`, {
      method: 'DELETE',
      body,
      stepUpToken,
    }),
  me: (signal?: AbortSignal) => apiRequest<MeView>('/me', { signal }),
  rg: (signal?: AbortSignal) => apiRequest<RgView>('/responsible-gaming', { signal }),
  currentRound: (signal?: AbortSignal) =>
    apiRequest<CurrentRoundView>('/pool/rounds/current', { auth: 'none', signal }),
};

// ── query keys + hooks ─────────────────────────────────────────────────────────────────────────

export const walletKeys = {
  all: ['wallet'] as const,
  balances: () => ['wallet', 'balances'] as const,
  lifetime: () => ['wallet', 'lifetime'] as const,
  status: () => ['wallet', 'status'] as const,
  transactions: (q: TxQuery) => ['wallet', 'transactions', q] as const,
  transaction: (ref: string) => ['wallet', 'transaction', ref] as const,
  depositAddress: (n: ChainKey) => ['wallet', 'deposit-address', n] as const,
  deposits: () => ['wallet', 'deposits'] as const,
  deposit: (ref: string) => ['wallet', 'deposit', ref] as const,
  withdrawals: () => ['wallet', 'withdrawals'] as const,
  withdrawal: (ref: string) => ['wallet', 'withdrawal', ref] as const,
  wallets: () => ['wallet', 'linked'] as const,
  me: () => ['wallet', 'me'] as const,
  rg: () => ['wallet', 'rg'] as const,
  currentRound: () => ['wallet', 'current-round'] as const,
};

type Opts<T> = Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, 'queryKey' | 'queryFn'>;

/** Player queries run only for signed-in members (guests see the sign-in prompt instead). */
function useMember() {
  const { status } = useAuth();
  return status === 'member';
}

export function useBalances(opts: Opts<WalletBalances> = {}) {
  const member = useMember();
  return useQuery({
    queryKey: walletKeys.balances(),
    queryFn: ({ signal }) => walletApi.balances(signal),
    enabled: member && (opts.enabled ?? true),
    ...opts,
  });
}

export function useLifetime() {
  const member = useMember();
  return useQuery({
    queryKey: walletKeys.lifetime(),
    queryFn: ({ signal }) => walletApi.lifetime(signal),
    enabled: member,
  });
}

export function useWalletStatus() {
  const member = useMember();
  return useQuery({
    queryKey: walletKeys.status(),
    queryFn: ({ signal }) => walletApi.status(signal),
    enabled: member,
  });
}

export function useTransactions(query: TxQuery) {
  const member = useMember();
  return useQuery({
    queryKey: walletKeys.transactions(query),
    queryFn: ({ signal }) => walletApi.transactions(query, signal),
    enabled: member,
    placeholderData: keepPreviousData,
  });
}

export function useTransaction(reference: string | null, opts: { poll?: boolean } = {}) {
  const member = useMember();
  return useQuery({
    queryKey: walletKeys.transaction(reference ?? ''),
    queryFn: ({ signal }) => walletApi.transaction(reference!, signal),
    enabled: member && Boolean(reference),
    refetchInterval: opts.poll ? 5_000 : false,
  });
}

export function useDepositAddress(network: ChainKey | null) {
  const member = useMember();
  return useQuery({
    queryKey: walletKeys.depositAddress(network ?? 'arbitrum'),
    queryFn: ({ signal }) => walletApi.depositAddress(network!, signal),
    enabled: member && Boolean(network),
    staleTime: 5 * 60_000,
  });
}

export function useDeposits() {
  const member = useMember();
  return useQuery({
    queryKey: walletKeys.deposits(),
    queryFn: ({ signal }) => walletApi.deposits(signal),
    enabled: member,
  });
}

/** Polls a deposit every 4 s until it is credited or rejected (confirmations n / N). */
export function useDeposit(reference: string | null) {
  const member = useMember();
  return useQuery({
    queryKey: walletKeys.deposit(reference ?? ''),
    queryFn: ({ signal }) => walletApi.deposit(reference!, signal),
    enabled: member && Boolean(reference),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === 'credited' || s === 'rejected' ? false : 4_000;
    },
  });
}

const OPEN_WITHDRAWAL: WithdrawalStatus[] = [
  'requested',
  'risk_check',
  'under_review',
  'queued',
  'broadcast',
];

export function useWithdrawals() {
  const member = useMember();
  return useQuery({
    queryKey: walletKeys.withdrawals(),
    queryFn: ({ signal }) => walletApi.withdrawals(signal),
    enabled: member,
  });
}

/** Polls an open withdrawal every 5 s (status tracker, pending step). */
export function useWithdrawal(reference: string | null) {
  const member = useMember();
  return useQuery({
    queryKey: walletKeys.withdrawal(reference ?? ''),
    queryFn: ({ signal }) => walletApi.withdrawal(reference!, signal),
    enabled: member && Boolean(reference),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s && OPEN_WITHDRAWAL.includes(s) ? 5_000 : false;
    },
  });
}

export function useLinkedWallets() {
  const member = useMember();
  return useQuery({
    queryKey: walletKeys.wallets(),
    queryFn: ({ signal }) => walletApi.wallets(signal),
    enabled: member,
  });
}

export function useMe() {
  const member = useMember();
  return useQuery({
    queryKey: walletKeys.me(),
    queryFn: ({ signal }) => walletApi.me(signal),
    enabled: member,
    staleTime: 60_000,
  });
}

export function useRg() {
  const member = useMember();
  return useQuery({
    queryKey: walletKeys.rg(),
    queryFn: ({ signal }) => walletApi.rg(signal),
    enabled: member,
  });
}

export function useCurrentRound(enabled = true) {
  return useQuery({
    queryKey: walletKeys.currentRound(),
    queryFn: ({ signal }) => walletApi.currentRound(signal),
    enabled,
    staleTime: 60_000,
  });
}

/** Invalidate every wallet query after a financial write (balances, history, limits…). */
export function useInvalidateWallet() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: walletKeys.all });
}

export function useClaimOwed() {
  const invalidate = useInvalidateWallet();
  return useMutation({
    mutationFn: (idempotencyKey: string) => walletApi.claimOwed(idempotencyKey),
    onSettled: () => invalidate(),
  });
}
