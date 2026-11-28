/**
 * Cross-module states (ERR-01 empty · ERR-02 errors · ERR-03 loading): the API client never surfaces raw transport
 * text and never hangs (timeout), errors are described per kind (offline, timeout, 429 + Retry-After, maintenance,
 * 5xx, validation), queries do not retry 4xx, the shared ErrorState always offers a next step, module error panels
 * use it, and the shell shows "—" instead of an endless skeleton when its data failed.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QueryState } from '@/components/account/primitives';
import { QueryErrorPanel } from '@/components/admin-a/primitives';
import { RestrictedIndex } from '@/components/auth/restricted';
import { QueryError as AdminBQueryError } from '@/components/admin-b/primitives';
import { QueryError as PoolQueryError } from '@/components/pool/parts';
import { QueryError as RgQueryError } from '@/components/rg-history/page-shell';
import { AppShellFrame, shellValue } from '@/components/shell/app-shell';
import { ErrorState } from '@/components/ui/error-state';
import { SecurityWarning, securityWarningCopy } from '@/components/ui/security-warning';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryError as WalletQueryError } from '@/components/wallet/wallet-ui';
import {
  ApiNetworkError,
  ApiRequestError,
  ApiTimeoutError,
  apiRequest,
  isOutcomeUnknown,
} from '@/lib/api/client';
import { authKeys, type AccountStatus } from '@/lib/api/auth';
import { describeError, shouldRetryQuery, writeErrorText } from '@/lib/api/errors';
import { parseRetryAfter, statusMessage } from '@/lib/api/transport';
import { AuthContext } from '@/lib/auth/context';
import type { AuthContextValue } from '@/lib/auth/types';
import { ApiError, apiGet } from '@/lib/data/source';
import { isWrongNetwork } from '@/lib/wallet/injected';

const RAW =
  /Failed to fetch|Bad Gateway|HTTP_ERROR|signal is aborted|<html|TypeError|\[object|undefined/;

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.useRealTimers();
});

function mockFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  globalThis.fetch = vi.fn(impl) as unknown as typeof fetch;
}

const envelope = (code: string, message: string, statusCode: number, extra: object = {}) =>
  new Response(
    JSON.stringify({ error: { code, message, statusCode, requestId: 'req-1', ...extra } }),
    {
      status: statusCode,
      headers: { 'content-type': 'application/json' },
    },
  );

describe('API client — transport failures (ERR-02)', () => {
  it('a request that never reaches the API throws ApiNetworkError with readable copy (not "Failed to fetch")', async () => {
    mockFetch(() => Promise.reject(new TypeError('Failed to fetch')));
    const err = await apiRequest('/wallet/balances').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiNetworkError);
    expect((err as Error).message).not.toMatch(RAW);
    expect((err as Error).message).toMatch(/couldn’t reach GLOBAL POOL/);
    // a write whose request never got an answer may have been applied → retry with the same key
    expect(isOutcomeUnknown(err)).toBe(true);
  });

  it('a hung request times out with ApiTimeoutError instead of loading forever', async () => {
    mockFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('signal is aborted without reason', 'AbortError')),
          );
        }),
    );
    const err = await apiRequest('/wallet/balances', { timeoutMs: 30 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiTimeoutError);
    expect((err as Error).message).not.toMatch(RAW);
    expect(isOutcomeUnknown(err)).toBe(true);
    // the public data fetcher (homepage / pool SSR prefetch) times out the same way
    const err2 = await apiGet('/pool/rounds/current', { timeoutMs: 30 }).catch((e: unknown) => e);
    expect(err2).toBeInstanceOf(ApiTimeoutError);
  });

  it("re-throws the caller's own abort unchanged (TanStack Query cancellation)", async () => {
    mockFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          // like the real fetch: an already-aborted signal rejects at once
          if (init.signal?.aborted) reject(new DOMException('aborted', 'AbortError'));
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    const controller = new AbortController();
    const pending = apiRequest('/me', { signal: controller.signal }).catch((e: unknown) => e);
    controller.abort();
    const err = await pending;
    expect((err as Error).name).toBe('AbortError');
  });

  it('a proxy error page without the envelope never leaks its HTML or status text', async () => {
    mockFetch(() =>
      Promise.resolve(
        new Response('<html><title>502 Bad Gateway</title></html>', {
          status: 502,
          statusText: 'Bad Gateway',
          headers: { 'content-type': 'text/html' },
        }),
      ),
    );
    const err = (await apiRequest('/wallet/balances').catch((e: unknown) => e)) as ApiRequestError;
    expect(err).toBeInstanceOf(ApiRequestError);
    expect(err.status).toBe(502);
    expect(err.message).not.toMatch(RAW);
    expect(err.message).toBe(statusMessage(502));
    const err2 = (await apiGet('/pool/rounds/current').catch((e: unknown) => e)) as ApiError;
    expect(err2).toBeInstanceOf(ApiError);
    expect(err2.message).not.toMatch(RAW);
  });

  it('keeps the envelope message and exposes Retry-After seconds on a 429', async () => {
    mockFetch(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests — please slow down',
              statusCode: 429,
            },
          }),
          { status: 429, headers: { 'content-type': 'application/json', 'retry-after': '20' } },
        ),
      ),
    );
    const err = (await apiRequest('/history/transactions').catch(
      (e: unknown) => e,
    )) as ApiRequestError;
    expect(err.code).toBe('RATE_LIMITED');
    expect(err.details?.retryAfterSeconds).toBe(20);
    const d = describeError(err);
    expect(d.kind).toBe('rate-limited');
    expect(d.retryAfterSeconds).toBe(20);
    expect(d.description).toContain('20 s');
  });

  it('a 503 maintenance envelope keeps its message and is described as maintenance', async () => {
    mockFetch(() =>
      Promise.resolve(
        envelope('SERVICE_UNAVAILABLE', 'Deposits is temporarily paused', 503, {
          details: { flag: 'deposits.enabled' },
        }),
      ),
    );
    const err = await apiRequest('/deposits/address').catch((e: unknown) => e);
    const d = describeError(err);
    expect(d.kind).toBe('maintenance');
    expect(d.description).toContain('Deposits is temporarily paused');
    expect(d.reference).toBe('req-1');
  });

  it('parses Retry-After as seconds or an HTTP date', () => {
    expect(parseRetryAfter('15')).toBe(15);
    expect(parseRetryAfter(new Date(Date.now() + 30_000).toUTCString())).toBeGreaterThanOrEqual(29);
    expect(parseRetryAfter('soon')).toBeUndefined();
    expect(parseRetryAfter(null)).toBeUndefined();
  });
});

describe('describeError — the ERR-02 matrix', () => {
  const req = (
    status: number,
    code: string,
    message: string,
    extra: Partial<ApiRequestError> = {},
  ) => new ApiRequestError(status, '/x', message, code, 'req-9', extra.issues, extra.details);

  it.each([
    [new ApiNetworkError('/x'), 'network', true],
    [new ApiTimeoutError('/x', 20_000), 'timeout', true],
    [req(429, 'RATE_LIMITED', 'Too many requests — please slow down'), 'rate-limited', true],
    [req(503, 'SERVICE_UNAVAILABLE', 'Deposits is temporarily paused'), 'maintenance', true],
    [req(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.'), 'server', true],
    [req(502, 'HTTP_ERROR', statusMessage(502)), 'server', true],
    [req(504, 'HTTP_ERROR', statusMessage(504)), 'timeout', true],
    [req(404, 'NOT_FOUND', 'Cannot GET /pool/rounds/99'), 'not-found', false],
    [req(403, 'FORBIDDEN', 'Missing permission'), 'forbidden', false],
    [req(401, 'UNAUTHENTICATED', 'Session expired'), 'unauthenticated', false],
    [
      req(400, 'VALIDATION_FAILED', 'Request validation failed', {
        issues: [{ path: ['amount'], message: 'Amount must be at most 1,000,000.00' }],
      }),
      'validation',
      false,
    ],
    [req(422, 'INSUFFICIENT_FUNDS', 'Not enough Available balance'), 'client', false],
    [new TypeError('Failed to fetch'), 'network', true],
    ['weird', 'unknown', true],
  ] as const)('%s → %s', (err, kind, retryable) => {
    const d = describeError(err, 'your balances');
    expect(d.kind).toBe(kind);
    expect(d.retryable).toBe(retryable);
    expect(`${d.title} ${d.description}`).not.toMatch(RAW);
    expect(d.description.length).toBeGreaterThan(10);
  });

  it('keeps human API messages (business 4xx, maintenance) and the request id as reference', () => {
    const d = describeError(req(503, 'SERVICE_UNAVAILABLE', 'Deposits is temporarily paused'));
    expect(d.description).toContain('Deposits is temporarily paused.');
    expect(d.description).toContain('safe');
    expect(d.reference).toBe('req-9');
    expect(
      describeError(req(422, 'INSUFFICIENT_FUNDS', 'Not enough Available balance')).description,
    ).toBe('Not enough Available balance');
    // "Cannot GET /…" (Nest's 404 text) is not shown to players
    expect(
      describeError(req(404, 'NOT_FOUND', 'Cannot GET /pool/rounds/99')).description,
    ).not.toContain('Cannot GET');
  });

  it('a 429 without Retry-After still enforces a short wait', () => {
    const d = describeError(req(429, 'RATE_LIMITED', 'Too many requests'));
    expect(d.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe('writeErrorText — failed writes never claim "nothing was changed" when the outcome is unknown', () => {
  const UNKNOWN = 'We couldn’t confirm whether it was applied.';
  it.each([
    new ApiNetworkError('/responsible-gaming/self-exclusion'),
    new ApiTimeoutError('/responsible-gaming/limits', 20_000),
    new ApiRequestError(
      502,
      '/x',
      statusMessage(502),
      'HTTP_ERROR',
      undefined,
      undefined,
      undefined,
    ),
    new ApiRequestError(409, '/x', 'In progress', 'CONFLICT', undefined, undefined, undefined),
  ])('%s → readable text + the honest "couldn’t confirm" sentence', (err) => {
    const t = writeErrorText(err, UNKNOWN);
    expect(t.endsWith(UNKNOWN)).toBe(true);
    expect(t).not.toMatch(/nothing was (changed|saved)/i);
    expect(t).not.toMatch(RAW);
  });

  it('a definite refusal keeps the API message; a 400 shows the field issue', () => {
    expect(
      writeErrorText(
        new ApiRequestError(
          422,
          '/x',
          'Limit can only be lowered right now',
          'RG_LIMIT',
          'r',
          undefined,
          undefined,
        ),
        UNKNOWN,
      ),
    ).toBe('Limit can only be lowered right now');
    expect(
      writeErrorText(
        new ApiRequestError(
          400,
          '/x',
          'Request validation failed',
          'VALIDATION_FAILED',
          'r',
          [{ path: ['amount'], message: 'Amount must be at most 1,000,000.00' }],
          undefined,
        ),
        UNKNOWN,
      ),
    ).toBe('Amount must be at most 1,000,000.00');
  });
});

describe('query retry policy', () => {
  it('retries transient failures once, never 4xx / 429 / 503 / timeouts', () => {
    expect(shouldRetryQuery(0, new ApiNetworkError('/x'))).toBe(true);
    // a timeout already waited 20 s — a second wait would double the skeleton time (ERR-03)
    expect(shouldRetryQuery(0, new ApiTimeoutError('/x', 1))).toBe(false);
    expect(
      shouldRetryQuery(
        0,
        new ApiRequestError(500, '/x', 'm', 'INTERNAL_ERROR', undefined, undefined, undefined),
      ),
    ).toBe(true);
    expect(shouldRetryQuery(1, new ApiNetworkError('/x'))).toBe(false);
    for (const status of [400, 401, 403, 404, 409, 422, 429, 503])
      expect(
        shouldRetryQuery(
          0,
          new ApiRequestError(status, '/x', 'm', 'X', undefined, undefined, undefined),
        ),
      ).toBe(false);
  });
});

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <TooltipProvider>{node}</TooltipProvider>
    </QueryClientProvider>,
  );

describe('<ErrorState> and the module error panels', () => {
  it('offline: readable title, Try again, no raw text', () => {
    const html = render(
      <ErrorState
        error={new ApiNetworkError('/x')}
        onRetry={() => undefined}
        what="your balances"
      />,
    );
    expect(html).toContain('You seem to be offline');
    expect(html).toContain('Try again');
    expect(html).toContain('data-error-kind="network"');
    expect(html).not.toMatch(RAW);
  });

  it('429: the retry button counts down Retry-After and is disabled meanwhile', () => {
    const err = new ApiRequestError(
      429,
      '/x',
      'Too many requests',
      'RATE_LIMITED',
      'req-2',
      undefined,
      {
        retryAfterSeconds: 20,
      },
    );
    const html = render(<ErrorState error={err} onRetry={() => undefined} />);
    expect(html).toContain('Try again in 20 s');
    expect(html).toMatch(/<button[^>]*disabled/);
    expect(html).toContain('Ref req-2');
  });

  it('non-retryable errors (404) show no Try again', () => {
    const err = new ApiRequestError(
      404,
      '/x',
      'Round not found',
      'NOT_FOUND',
      undefined,
      undefined,
      undefined,
    );
    expect(render(<ErrorState error={err} onRetry={() => undefined} />)).not.toContain('Try again');
  });

  it.each([
    ['wallet', (e: unknown) => <WalletQueryError error={e} onRetry={() => undefined} />],
    ['pool', (e: unknown) => <PoolQueryError error={e} onRetry={() => undefined} />],
    ['rg-history', (e: unknown) => <RgQueryError error={e} onRetry={() => undefined} />],
    [
      'admin-a',
      (e: unknown) => <QueryErrorPanel error={e} onRetry={() => undefined} what="players" />,
    ],
    ['admin-b', (e: unknown) => <AdminBQueryError error={e} onRetry={() => undefined} />],
    [
      'account',
      (e: unknown) => (
        <QueryState
          query={{ isPending: false, isError: true, error: e, refetch: () => undefined }}
          label="your limits"
        >
          <p>content</p>
        </QueryState>
      ),
    ],
  ])(
    '%s panel: offline / timeout / 502 never show raw text and always offer Try again',
    (_m, panel) => {
      for (const err of [
        new ApiNetworkError('/x'),
        new ApiTimeoutError('/x', 20_000),
        new ApiRequestError(
          502,
          '/x',
          statusMessage(502),
          'HTTP_ERROR',
          undefined,
          undefined,
          undefined,
        ),
      ]) {
        const html = render(panel(err));
        expect(html).not.toMatch(RAW);
        expect(html).toContain('Try again');
        expect(html).toContain('role="alert"');
      }
    },
  );
});

describe('shell figures: loading vs failed (ERR-03 — no endless skeleton)', () => {
  it('shellValue: value · null while loading · false when the request failed', () => {
    expect(shellValue({ data: { available: '12.00' }, isError: false }, (d) => d.available)).toBe(
      '12.00',
    );
    expect(
      shellValue({ data: undefined, isError: false }, (d: { available: string }) => d.available),
    ).toBeNull();
    expect(
      shellValue({ data: undefined, isError: true }, (d: { available: string }) => d.available),
    ).toBe(false);
    // a failed refetch keeps the last good value
    expect(shellValue({ data: { available: '3.00' }, isError: true }, (d) => d.available)).toBe(
      '3.00',
    );
    // no round yet → 0.00, not a skeleton
    expect(
      shellValue(
        { data: null, isError: false },
        (r: { poolBalance: string } | null) => r?.poolBalance ?? '0.00',
      ),
    ).toBe('0.00');
  });

  it('the shell renders "couldn’t be loaded" instead of skeletons for a failed balance and pool amount', () => {
    const html = render(
      <AppShellFrame
        auth="member"
        member={{
          handle: '@x',
          initials: 'X',
          available: false,
          notifications: 0,
          activeEntries: 0,
          demo: true,
        }}
        pathname="/wallet"
        onSignIn={() => undefined}
        onSignUp={() => undefined}
        onSignOut={() => undefined}
        poolAmount={false}
      >
        <p>page</p>
      </AppShellFrame>,
    );
    expect(html).toContain('Available balance couldn’t be loaded');
    expect(html).toContain('Pool amount couldn’t be loaded');
    expect(html).not.toContain('data-slot="skeleton"');
  });
});

describe('ERR-07 security warnings library', () => {
  const kinds = [
    'wrong-network',
    'new-address',
    'new-device',
    'suspicious-login',
    'phishing',
    'anti-phishing',
    'unverified-contract',
  ] as const;

  it.each(kinds)('%s: readable title + next step, never raw / undefined text', (kind) => {
    const html = render(<SecurityWarning kind={kind} />);
    const copy = securityWarningCopy({ kind });
    expect(copy.title.length).toBeGreaterThan(8);
    expect(copy.body.length).toBeGreaterThan(40);
    expect(html).toContain(`data-security-warning="${kind}"`);
    expect(`${copy.title} ${copy.body}`).not.toMatch(/undefined|null|NaN|\[object/);
    // security warnings are never dismissible
    expect(html).not.toContain('aria-label="Dismiss"');
  });

  it('security kinds are announced as alerts; context values are used', () => {
    expect(render(<SecurityWarning kind="wrong-network" currentChainId={1} />)).toMatch(
      /role="alert"[^>]*>.*chain ID 1\..*Arbitrum Sepolia/s,
    );
    const unlocks = '2026-11-29T10:00:00.000Z';
    expect(
      securityWarningCopy({ kind: 'new-address', address: '0x12…ab', unlocksAt: unlocks }),
    ).toMatchObject({ title: '0x12…ab is cooling down' });
    expect(securityWarningCopy({ kind: 'new-address', unlocksAt: unlocks }).body).toContain(
      '29 Nov 2026',
    );
    expect(securityWarningCopy({ kind: 'anti-phishing', code: 'AURORA-27' }).title).toBe(
      'Your anti-phishing code: AURORA-27',
    );
    expect(securityWarningCopy({ kind: 'anti-phishing', code: null }).title).toBe(
      'Set an anti-phishing code',
    );
    expect(
      securityWarningCopy({ kind: 'unverified-contract', tokenLabel: 'tUSDT on Arbitrum Sepolia' })
        .title,
    ).toBe('Only tUSDT on Arbitrum Sepolia is credited');
    // no dark patterns / bypass hints: never suggests skipping a protection or a VPN
    for (const kind of kinds)
      expect(securityWarningCopy({ kind }).body).not.toMatch(
        /\bVPN\b|proxy|skip the|hurry|act now/i,
      );
  });

  it('wrong network only for the member’s own linked wallet connected on another chain', () => {
    const mine = '0xAbC0000000000000000000000000000000000001';
    const st = (chainId: number | null, accounts: string[]) => ({ chainId, accounts });
    expect(isWrongNetwork(st(1, [mine.toLowerCase()]), mine)).toBe(true);
    expect(isWrongNetwork(st(421614, [mine.toLowerCase()]), mine)).toBe(false);
    // extension installed but not connected to this site / another address / no linked wallet / unknown chain
    expect(isWrongNetwork(st(1, []), mine)).toBe(false);
    expect(isWrongNetwork(st(1, ['0x9999999999999999999999999999999999999999']), mine)).toBe(false);
    expect(isWrongNetwork(st(1, [mine.toLowerCase()]), null)).toBe(false);
    expect(isWrongNetwork(st(null, [mine.toLowerCase()]), mine)).toBe(false);
  });

  it('the shell shows the wrong-network state (topbar button ≥ 768 + banner < 768) with Switch', () => {
    const html = render(
      <AppShellFrame
        auth="member"
        member={{
          handle: '@x',
          initials: 'X',
          available: '1.00',
          notifications: 0,
          activeEntries: 0,
          demo: true,
        }}
        pathname="/wallet"
        onSignIn={() => undefined}
        onSignUp={() => undefined}
        onSignOut={() => undefined}
        wrongNetwork
        onSwitchNetwork={() => undefined}
      >
        <p>page</p>
      </AppShellFrame>,
    );
    expect(html).toContain('data-security-warning="wrong-network"');
    expect(html).toContain('Switch to Arbitrum');
    expect(html).toContain('Wrong network');
  });
});

describe('/restricted index (ERR-03: never an endless skeleton)', () => {
  const authValue = (status: AuthContextValue['status']): AuthContextValue => ({
    mode: 'mock',
    status,
    user: null,
    signIn: () => undefined,
    signUp: () => undefined,
    signOut: () => Promise.resolve(),
    getAccessToken: () => Promise.resolve(null),
  });
  const renderIndex = (status: AuthContextValue['status'], seed?: (qc: QueryClient) => void) => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retryOnMount: false, staleTime: Infinity, retry: false } },
    });
    seed?.(qc);
    return renderToStaticMarkup(
      <QueryClientProvider client={qc}>
        <AuthContext.Provider value={authValue(status)}>
          <RestrictedIndex />
        </AuthContext.Provider>
      </QueryClientProvider>,
    );
  };

  it('guest → sign-in prompt, no skeleton', () => {
    const html = renderIndex('guest');
    expect(html).toContain('Sign in to see your account status');
    expect(html).not.toContain('data-slot="skeleton"');
  });

  it('failed account status → ErrorState with Try again, no skeleton', () => {
    const html = renderIndex('member', (qc) => {
      qc.getQueryCache()
        .build(qc, { queryKey: authKeys.accountStatus })
        .setState({
          status: 'error',
          error: new ApiNetworkError('/auth/account-status'),
          errorUpdatedAt: Date.now(),
          fetchStatus: 'idle',
        });
    });
    expect(html).toContain('You seem to be offline');
    expect(html).toContain('Try again');
    expect(html).not.toContain('data-slot="skeleton"');
    expect(html).not.toMatch(RAW);
  });

  it('account still onboarding → link to finish setup, no skeleton', () => {
    const html = renderIndex('member', (qc) =>
      qc.setQueryData<Partial<AccountStatus>>(authKeys.accountStatus, { gate: 'onboarding' }),
    );
    expect(html).toContain('Finish setting up your account');
    expect(html).toContain('href="/onboarding?next=/restricted"');
    expect(html).not.toContain('data-slot="skeleton"');
  });

  it('while the status is loading for a member it is a (temporary) skeleton', () => {
    expect(renderIndex('member')).toContain('data-slot="skeleton"');
  });
});
