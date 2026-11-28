/**
 * Transport-level helpers shared by `apiRequest()` (src/lib/api/client.ts) and the public data fetchers
 * (`apiGet()` in src/lib/data/source.ts). Server-safe (no window access) and dependency-free, so both can import it.
 *
 * - Every request has a timeout (`DEFAULT_API_TIMEOUT_MS`, 20 s; `NEXT_PUBLIC_API_TIMEOUT_MS` overrides it at
 *   build time). Without one, a hung API kept skeletons on screen forever (ERR-02 / ERR-03).
 * - A request that never got a response throws `ApiNetworkError`; one that ran out of time throws
 *   `ApiTimeoutError`. Both carry player-readable messages — never "Failed to fetch" or "signal is aborted".
 *   A caller's own abort (e.g. TanStack Query cancelling a query) is re-thrown unchanged.
 * - `statusMessage()` gives readable copy for error responses without the shared error envelope (a proxy's
 *   "502 Bad Gateway" HTML page), so raw status text never reaches the UI.
 */

export const DEFAULT_API_TIMEOUT_MS = (() => {
  const raw = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? '20000');
  return Number.isFinite(raw) && raw >= 0 ? raw : 20_000;
})();

/** The request never got an answer (API down, offline, DNS / CORS / proxy failure). */
export class ApiNetworkError extends Error {
  constructor(
    readonly path: string,
    options?: { cause?: unknown },
  ) {
    super('We couldn’t reach GLOBAL POOL. Check your connection and try again.', options);
    this.name = 'ApiNetworkError';
  }
}

/** The API did not answer within the timeout. For writes the outcome is unknown (see `isOutcomeUnknown`). */
export class ApiTimeoutError extends Error {
  constructor(
    readonly path: string,
    readonly timeoutMs: number,
  ) {
    super('The server is taking too long to answer. Please try again in a moment.');
    this.name = 'ApiTimeoutError';
  }
}

/** Readable copy for an error status that came without the shared error envelope. */
export function statusMessage(status: number): string {
  if (status === 401) return 'Your session has ended. Please sign in again.';
  if (status === 403) return 'You don’t have access to this.';
  if (status === 404) return 'We couldn’t find what you were looking for.';
  if (status === 408 || status === 504)
    return 'The server is taking too long to answer. Please try again in a moment.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status === 503) return 'This service is temporarily unavailable. Please try again later.';
  if (status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
  return 'The request couldn’t be completed. Please try again.';
}

/** `Retry-After` (seconds or an HTTP date) → whole seconds from now, or undefined. */
export function parseRetryAfter(
  value: string | null | undefined,
  now: number = Date.now(),
): number | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const at = Date.parse(trimmed);
  if (Number.isNaN(at)) return undefined;
  return Math.max(0, Math.ceil((at - now) / 1000));
}

// ── reachability (drives the shells' connection banner — src/lib/api/connectivity.ts) ──────────────────────
type ReachabilityListener = (reachable: boolean) => void;
const reachabilityListeners = new Set<ReachabilityListener>();

/** Called with `false` when a request got no answer (network / timeout) and `true` when any response arrived. */
export function onApiReachability(listener: ReachabilityListener): () => void {
  reachabilityListeners.add(listener);
  return () => reachabilityListeners.delete(listener);
}

function report(reachable: boolean): void {
  for (const l of reachabilityListeners) l(reachable);
}

export interface TimedResponse {
  res: Response;
  /** The whole body, read inside the same timeout. */
  text: string;
}

/**
 * `fetch` + body read under one timeout. Throws `ApiTimeoutError` / `ApiNetworkError` (see above); re-throws the
 * caller's own abort reason unchanged. `timeoutMs` 0 disables the timeout.
 */
export async function fetchText(
  url: string,
  init: RequestInit & { path: string; timeoutMs?: number },
): Promise<TimedResponse> {
  const { path, timeoutMs = DEFAULT_API_TIMEOUT_MS, signal: callerSignal, ...rest } = init;
  const controller = new AbortController();
  let timedOut = false;
  const onCallerAbort = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) controller.abort(callerSignal.reason);
  else callerSignal?.addEventListener('abort', onCallerAbort, { once: true });
  const timer =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : undefined;
  try {
    const res = await fetch(url, { ...rest, signal: controller.signal });
    const text = await res.text();
    report(true);
    return { res, text };
  } catch (err) {
    if (timedOut) {
      report(false);
      throw new ApiTimeoutError(path, timeoutMs);
    }
    if (callerSignal?.aborted) throw err;
    report(false);
    throw new ApiNetworkError(path, { cause: err });
  } finally {
    if (timer) clearTimeout(timer);
    callerSignal?.removeEventListener('abort', onCallerAbort);
  }
}
