/**
 * Shared typed API client for every module (auth, dashboard, wallet, pool, admin).
 *
 * - Player calls send `Authorization: Bearer <token>` from the registered player token provider
 *   (Privy access token, or the DEV MOCK token exchanged via `POST /auth/dev/token`).
 * - Admin calls use the admin token provider (admin auth is separate from Privy — owner decision #3).
 * - Financial writes pass `idempotencyKey` (sent in the JSON body, per docs/API.md) — create one per user intent with
 *   `newIdempotencyKey()` and reuse it on retries.
 * - Step-up 2FA: pass `stepUpToken` → `X-Step-Up-Token` header.
 * - Errors use the shared envelope `{ error: { code, message, statusCode, requestId, issues, details } }` and are
 *   thrown as `ApiError` (re-exported from the data layer so `instanceof` works everywhere).
 *
 * Do not fork this file per module: add module wrappers in `src/lib/api/<module>.ts` that call `apiRequest`.
 */
import { publicEnv } from '@/lib/env';
import { ApiError } from '@/lib/data/source';

export { ApiError };

export type AuthKind = 'player' | 'admin' | 'none';
type TokenProvider = () => Promise<string | null>;

let playerTokenProvider: TokenProvider = () => Promise.resolve(null);
let adminTokenProvider: TokenProvider = () => Promise.resolve(null);

/** Registered once by the auth provider (player) and by the admin session store (admin). */
export function setPlayerTokenProvider(fn: TokenProvider): void {
  playerTokenProvider = fn;
}
export function setAdminTokenProvider(fn: TokenProvider): void {
  adminTokenProvider = fn;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    statusCode: number;
    requestId?: string;
    issues?: { path: (string | number)[]; message: string }[];
    details?: Record<string, unknown>;
  };
}

/** Extra error data parsed from the envelope (code/requestId/issues/details). */
export class ApiRequestError extends ApiError {
  constructor(
    status: number,
    path: string,
    message: string,
    readonly code: string,
    readonly requestId: string | undefined,
    readonly issues: ApiErrorEnvelope['error']['issues'],
    readonly details: Record<string, unknown> | undefined,
  ) {
    super(status, path, message);
    this.name = 'ApiRequestError';
  }
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** JSON body. For financial writes include `idempotencyKey`. */
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: AuthKind;
  stepUpToken?: string;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

function buildUrl(path: string, query?: ApiRequestOptions['query']): string {
  const url = new URL(path.startsWith('http') ? path : `${publicEnv.apiUrl}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

export async function apiRequest<T>(path: string, opts: ApiRequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, auth = 'player', stepUpToken, signal, headers = {} } = opts;
  const h: Record<string, string> = { accept: 'application/json', ...headers };
  if (body !== undefined) h['content-type'] = 'application/json';
  if (auth !== 'none') {
    const token = await (auth === 'admin' ? adminTokenProvider() : playerTokenProvider());
    if (token) h.authorization = `Bearer ${token}`;
  }
  if (stepUpToken) h['x-step-up-token'] = stepUpToken;

  const res = await fetch(buildUrl(path, query), {
    method,
    headers: h,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
    credentials: 'include',
    signal,
  });

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const json: unknown = text ? safeJson(text) : undefined;

  if (!res.ok) {
    const env = (json as Partial<ApiErrorEnvelope> | undefined)?.error;
    throw new ApiRequestError(
      res.status,
      path,
      env?.message ?? `${res.status} ${res.statusText}`,
      env?.code ?? 'HTTP_ERROR',
      env?.requestId ?? res.headers.get('x-request-id') ?? undefined,
      env?.issues,
      env?.details,
    );
  }
  return json as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Was a failed WRITE possibly applied anyway? True when no definite answer came back: the request never got a
 * response (network drop, CORS / proxy failure, abort → not an `ApiRequestError`), a 5xx / 408 (the server or a
 * proxy may have committed before failing), or 409 CONFLICT (the same idempotency key is still being processed).
 * Only a definite 4xx business / validation error means nothing happened. Retry such an intent with the SAME
 * idempotency key until a definite answer arrives, and never tell the player "nothing was charged" meanwhile.
 */
export function isOutcomeUnknown(err: unknown): boolean {
  if (!(err instanceof ApiRequestError)) return true;
  if (err.status >= 500 || err.status === 408 || err.status === 0) return true;
  return err.status === 409 && err.code === 'CONFLICT';
}

/** One key per user intent (e.g. "confirm 35 entries"); reuse it when retrying the same intent. */
export function newIdempotencyKey(): string {
  return globalThis.crypto.randomUUID();
}
